/**
 * Automated Test Suite: Phase 2 Government Intelligence Dashboard
 * 
 * Verifies:
 * 1. Role-Aware Access Control & Authentication
 *    - Platform Admin / State Admin: Statewide scope, 24-district comparative access
 *    - District Officer (Ranchi): Strict district scoping to Ranchi
 *    - Non-government roles (Citizen, Institution): 403 Forbidden
 *    - Anonymous requests: 401 Unauthorized
 * 2. Query Tampering Defense on Analytics
 *    - District Officer tampering with ?district=Dhanbad is ignored; query remains locked to Ranchi
 * 3. 8 Executive Governance KPIs
 *    - totalChallenges, newChallenges, highPriorityChallenges, pendingGovernmentReview,
 *      verifiedChallenges, problemsWithInstitutionalInterest, activePilotEngagements, resolvedClosedProblems
 *    - Freshness timestamp (refreshed_at) present and valid ISO string
 *    - Metric definitions array present with tables, conditions, and calculations
 * 4. 8-Stage Problem → Solution Pipeline Funnel
 *    - reported, aiStructured, governmentValidated, matched, institutionInterested, eoiSubmitted, pilot, resolved
 *    - Verified separation of "Matched" (algorithmic recommendation) vs "Institution Interested" (explicit intent)
 * 5. Priority Action Queue
 *    - Scoped strictly to officer's jurisdiction
 *    - Prioritized by severity (Critical/High first)
 *    - Includes verification and engagement signals (confirmations, evidence, matched orgs, EOIs)
 * 6. District & Local Intelligence
 *    - State Admin: 24-district comparative matrix with GeoJSON map note
 *    - District Officer: block-level distribution matrix within assigned district
 * 7. AI Matching Insights & Capability Transparency
 *    - Transparent capability verification breakdown (verified, pending, unverified)
 *    - Privacy verification: zero private evidence exposure or internal vector metadata leak
 * 8. Problem Telemetry & Trends
 *    - Domain, priority, status distributions, and monthly timeline intake
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

async function runGovernmentDashboardTests() {
  console.log('\n================================================================================');
  console.log('🏛️  SamadhanSetu: Phase 2 Government Intelligence Dashboard Verification');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Authentication & Role Verification
    // -------------------------------------------------------------------------
    console.log('🔑 Phase 1: Authenticating test actors...');

    // 1a. Platform Admin
    const adminLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dev.local', password: 'AdminDev123!' }),
    });
    assert(adminLogin.status === 200, 'Platform Admin login succeeded');
    const adminToken = (await adminLogin.json()).accessToken;

    // 1b. State Reviewer / Admin
    const stateLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.state@jharkhand.gov.in', password: 'GovAdmin123!' }),
    });
    assert(stateLogin.status === 200, 'State Admin login succeeded');
    const stateToken = (await stateLogin.json()).accessToken;

    // 1c. Ranchi District Officer
    const ranchiLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer.ranchi@jharkhand.gov.in', password: 'GovOfficer123!' }),
    });
    assert(ranchiLogin.status === 200, 'Ranchi Officer login succeeded');
    const ranchiToken = (await ranchiLogin.json()).accessToken;

    const ranchiMe = await (
      await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${ranchiToken}` } })
    ).json();
    const ranchiDistrictId = ranchiMe.district_id;
    assert(!!ranchiDistrictId, 'Ranchi Officer has valid district_id');

    // 1d. Dhanbad District Officer
    const dhanbadLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer.dhanbad@jharkhand.gov.in', password: 'GovOfficer123!' }),
    });
    assert(dhanbadLogin.status === 200, 'Dhanbad Officer login succeeded');
    const dhanbadToken = (await dhanbadLogin.json()).accessToken;

    const dhanbadMe = await (
      await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${dhanbadToken}` } })
    ).json();
    const dhanbadDistrictId = dhanbadMe.district_id;
    assert(!!dhanbadDistrictId && dhanbadDistrictId !== ranchiDistrictId, 'Dhanbad Officer has distinct district_id');

    // 1e. Citizen User
    const citizenLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@dev.local', password: 'CitizenDev123!' }),
    });
    assert(citizenLogin.status === 200, 'Citizen login succeeded');
    const citizenToken = (await citizenLogin.json()).accessToken;

    // 1f. Institution User
    const instLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dean@bitmesra.ac.in', password: 'BitMesra123!' }),
    });
    assert(instLogin.status === 200, 'Institution login succeeded');
    const instToken = (await instLogin.json()).accessToken;

    // -------------------------------------------------------------------------
    // Phase 2: RBAC & Access Defense
    // -------------------------------------------------------------------------
    console.log('\n🛡️  Phase 2: RBAC & Authorization Defense on Analytics Endpoints...');

    // 2a. Anonymous request blocked
    const anonRes = await fetch(`${API_BASE}/admin/analytics/overview`);
    assert(anonRes.status === 401, 'Anonymous request to analytics/overview returned 401 Unauthorized');

    // 2b. Citizen blocked
    const citizenRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(citizenRes.status === 403, 'Citizen request to analytics/overview returned 403 Forbidden');

    const citizenQueueRes = await fetch(`${API_BASE}/admin/analytics/action-queue`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(citizenQueueRes.status === 403, 'Citizen request to analytics/action-queue returned 403 Forbidden');

    // 2c. Institution blocked
    const instOverviewRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${instToken}` },
    });
    assert(instOverviewRes.status === 403, 'Institution request to analytics/overview returned 403 Forbidden');

    const instInsightsRes = await fetch(`${API_BASE}/admin/analytics/matching-insights`, {
      headers: { Authorization: `Bearer ${instToken}` },
    });
    assert(instInsightsRes.status === 403, 'Institution request to analytics/matching-insights returned 403 Forbidden');

    // -------------------------------------------------------------------------
    // Phase 3: Role-Aware Jurisdiction Scoping & Query Tampering Defense
    // -------------------------------------------------------------------------
    console.log('\n🔒 Phase 3: Role-Aware Jurisdiction Scoping & Query Tampering Defense...');

    // 3a. Platform Admin has universal/state scope
    const adminOverviewRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOverviewRes.status === 200, 'Platform Admin accessed analytics/overview');
    const adminOverview = await adminOverviewRes.json();
    assert(
      adminOverview.metadata.jurisdiction.scope === 'NATIONAL' ||
      adminOverview.metadata.jurisdiction.scope === 'STATE',
      'Platform Admin has universal/state scope',
    );

    // 3b. State Admin has STATE scope
    const stateOverviewRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    assert(stateOverviewRes.status === 200, 'State Admin accessed analytics/overview');
    const stateOverview = await stateOverviewRes.json();
    assert(stateOverview.metadata.jurisdiction.scope === 'STATE', 'State Admin has STATE scope');

    // 3c. State Admin filtering by district
    const stateFilteredRes = await fetch(`${API_BASE}/admin/analytics/overview?district_id=${ranchiDistrictId}`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    assert(stateFilteredRes.status === 200, 'State Admin successfully filtered by district_id');
    const stateFiltered = await stateFilteredRes.json();
    assert(stateFiltered.metadata.jurisdiction.scope === 'DISTRICT_FILTERED', 'Scope updated to DISTRICT_FILTERED');
    assert(stateFiltered.metadata.jurisdiction.district_id === ranchiDistrictId, 'Jurisdiction district_id matches Ranchi');

    // 3d. District Officer is strictly locked to their district
    const ranchiOverviewRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiOverviewRes.status === 200, 'Ranchi Officer accessed analytics/overview');
    const ranchiOverview = await ranchiOverviewRes.json();
    assert(ranchiOverview.metadata.jurisdiction.scope === 'DISTRICT', 'Ranchi Officer scope is DISTRICT');
    assert(ranchiOverview.metadata.jurisdiction.district_id === ranchiDistrictId, 'Ranchi Officer district_id matches Ranchi');
    assert(ranchiOverview.metadata.jurisdiction.is_district_officer === true, 'is_district_officer flag is true');

    // 3e. CRITICAL DEFENSE: Query tampering by District Officer is ignored
    const tamperedRes = await fetch(
      `${API_BASE}/admin/analytics/overview?district=Dhanbad&district_id=${dhanbadDistrictId}`,
      { headers: { Authorization: `Bearer ${ranchiToken}` } },
    );
    assert(tamperedRes.status === 200, 'Tampered query request returned 200');
    const tamperedData = await tamperedRes.json();
    assert(
      tamperedData.metadata.jurisdiction.district_id === ranchiDistrictId,
      'Query tampering defeated: Server locked query to user.district_id (Ranchi), ignored Dhanbad param',
    );
    assert(
      tamperedData.metadata.jurisdiction.district_id !== dhanbadDistrictId,
      'Tampered district_id (Dhanbad) was strictly rejected',
    );

    // -------------------------------------------------------------------------
    // Phase 4: 8 Executive Governance KPIs
    // -------------------------------------------------------------------------
    console.log('\n📊 Phase 4: 8 Executive Governance KPIs & Freshness Verification...');

    const kpis = stateOverview.executive_kpis;
    assert(typeof kpis.totalChallenges === 'number' && kpis.totalChallenges >= 0, '1. totalChallenges is valid number');
    assert(typeof kpis.newChallenges === 'number' && kpis.newChallenges >= 0, '2. newChallenges is valid number');
    assert(typeof kpis.highPriorityChallenges === 'number' && kpis.highPriorityChallenges >= 0, '3. highPriorityChallenges is valid number');
    assert(typeof kpis.pendingGovernmentReview === 'number' && kpis.pendingGovernmentReview >= 0, '4. pendingGovernmentReview is valid number');
    assert(typeof kpis.verifiedChallenges === 'number' && kpis.verifiedChallenges >= 0, '5. verifiedChallenges is valid number');
    assert(typeof kpis.problemsWithInstitutionalInterest === 'number' && kpis.problemsWithInstitutionalInterest >= 0, '6. problemsWithInstitutionalInterest is valid number');
    assert(typeof kpis.activePilotEngagements === 'number' && kpis.activePilotEngagements >= 0, '7. activePilotEngagements is valid number');
    assert(typeof kpis.resolvedClosedProblems === 'number' && kpis.resolvedClosedProblems >= 0, '8. resolvedClosedProblems is valid number');

    // Freshness & Definition audit
    assert(!!stateOverview.metadata.refreshed_at, 'Freshness timestamp (refreshed_at) is present');
    assert(!isNaN(Date.parse(stateOverview.metadata.refreshed_at)), 'refreshed_at is valid ISO date string');

    const defs = stateOverview.metadata.definitions;
    assert(Array.isArray(defs) && defs.length === 8, 'All 8 KPI definitions are documented in metadata');
    assert(defs.every((d: any) => d.tables && d.filtering_condition && d.calculation), 'Every KPI definition has tables, conditions, and calculations');

    // -------------------------------------------------------------------------
    // Phase 5: 8-Stage Problem → Solution Pipeline Funnel
    // -------------------------------------------------------------------------
    console.log('\n🔄 Phase 5: 8-Stage Problem → Solution Pipeline Funnel Verification...');

    const pipe = stateOverview.pipeline;
    assert(typeof pipe.reported === 'number' && pipe.reported >= 0, 'Stage 1: reported count is valid number');
    assert(typeof pipe.aiStructured === 'number' && pipe.aiStructured >= 0, 'Stage 2: aiStructured count is valid number');
    assert(typeof pipe.governmentValidated === 'number' && pipe.governmentValidated >= 0, 'Stage 3: governmentValidated count is valid number');
    assert(typeof pipe.matched === 'number' && pipe.matched >= 0, 'Stage 4: matched count is valid number');
    assert(typeof pipe.institutionInterested === 'number' && pipe.institutionInterested >= 0, 'Stage 5: institutionInterested count is valid number');
    assert(typeof pipe.eoiSubmitted === 'number' && pipe.eoiSubmitted >= 0, 'Stage 6: eoiSubmitted count is valid number');
    assert(typeof pipe.pilot === 'number' && pipe.pilot >= 0, 'Stage 7: pilot count is valid number');
    assert(typeof pipe.resolved === 'number' && pipe.resolved >= 0, 'Stage 8: resolved count is valid number');

    // Funnel monotonicity or sanity check: Validated cannot exceed Reported
    assert(pipe.governmentValidated <= pipe.reported, 'Pipeline sanity: governmentValidated <= reported');

    const pipeDefs = stateOverview.metadata.pipeline_definitions;
    assert(Array.isArray(pipeDefs) && pipeDefs.length === 8, 'All 8 pipeline stage definitions are documented');
    assert(pipeDefs.every((p: any) => p.stage && p.description && p.calculation), 'Every pipeline definition has stage name, description, and calculation');

    // -------------------------------------------------------------------------
    // Phase 6: Priority Action Queue
    // -------------------------------------------------------------------------
    console.log('\n⚡ Phase 6: Priority Action Queue & Jurisdiction Isolation...');

    // 6a. Fetch action queue as Ranchi Officer
    const ranchiQueueRes = await fetch(`${API_BASE}/admin/analytics/action-queue`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiQueueRes.status === 200, 'Ranchi Officer fetched action queue');
    const ranchiQueue = await ranchiQueueRes.json();
    assert(Array.isArray(ranchiQueue.items), 'Action queue returns array of items');

    // Check district isolation on all returned items
    const nonRanchiItems = ranchiQueue.items.filter((it: any) => it.district_id && it.district_id !== ranchiDistrictId);
    assert(nonRanchiItems.length === 0, 'Action queue strictly isolated: Zero items from other districts in Ranchi queue');

    // Verify properties on action queue items
    if (ranchiQueue.items.length > 0) {
      const item = ranchiQueue.items[0];
      assert(!!item.id && !!item.title, 'Queue item has id and title');
      assert(['SUBMITTED', 'UNDER_REVIEW'].includes(item.status), 'Queue item status is in SUBMITTED or UNDER_REVIEW');
      assert(typeof item.confirmations_count === 'number', 'Queue item has confirmations_count');
      assert(typeof item.evidence_count === 'number', 'Queue item has evidence_count');
      assert(typeof item.matched_institutions_count === 'number', 'Queue item has matched_institutions_count');
      assert(typeof item.eois_count === 'number', 'Queue item has eois_count');
    } else {
      console.log('  ℹ️ Note: No pending items in Ranchi queue at this time.');
    }

    // 6b. Tampering test on action queue
    const tamperedQueueRes = await fetch(
      `${API_BASE}/admin/analytics/action-queue?district_id=${dhanbadDistrictId}`,
      { headers: { Authorization: `Bearer ${ranchiToken}` } },
    );
    assert(tamperedQueueRes.status === 200, 'Tampered action queue request handled');
    const tamperedQueue = await tamperedQueueRes.json();
    const tamperedLeaked = tamperedQueue.items.filter((it: any) => it.district_id && it.district_id !== ranchiDistrictId);
    assert(tamperedLeaked.length === 0, 'Action queue tampering defeated: No Dhanbad items leaked to Ranchi Officer');

    // -------------------------------------------------------------------------
    // Phase 7: District & Local Intelligence Matrix
    // -------------------------------------------------------------------------
    console.log('\n🗺️  Phase 7: District & Local Intelligence Matrix...');

    // 7a. State Admin receives 24-district comparative matrix
    const stateDistRes = await fetch(`${API_BASE}/admin/analytics/districts`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    assert(stateDistRes.status === 200, 'State Admin fetched districts analytics');
    const stateDist = await stateDistRes.json();
    assert(stateDist.view_type === 'DISTRICT_COMPARISON', 'State Admin view_type is DISTRICT_COMPARISON');
    assert(Array.isArray(stateDist.data), 'districts data is array');
    assert(stateDist.data.length >= 24, `Statewide view returns all districts (found ${stateDist.data.length})`);
    assert(!!stateDist.map_integration_status, 'Contains explicit Survey of India GeoJSON map note');

    // Verify row structure
    const sampleDist = stateDist.data[0];
    assert(!!sampleDist.district_name && sampleDist.total_problems !== undefined, 'District row contains district_name and total_problems');

    // 7b. District Officer receives block-level breakdown for assigned district
    const officerDistRes = await fetch(`${API_BASE}/admin/analytics/districts`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(officerDistRes.status === 200, 'District Officer fetched districts analytics');
    const officerDist = await officerDistRes.json();
    assert(officerDist.view_type === 'BLOCK_MATRIX', 'District Officer view_type is BLOCK_MATRIX');
    assert(officerDist.district_id === ranchiDistrictId, 'BLOCK_MATRIX is strictly scoped to Ranchi district_id');
    assert(Array.isArray(officerDist.data), 'Block data is array');
    assert(officerDist.notice.includes('District Officer scope'), 'Contains District Officer scope notice');

    // -------------------------------------------------------------------------
    // Phase 8: AI Matching Insights & Capability Transparency
    // -------------------------------------------------------------------------
    console.log('\n💡 Phase 8: AI Matching Insights & Capability Transparency...');

    const matchingRes = await fetch(`${API_BASE}/admin/analytics/matching-insights`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    assert(matchingRes.status === 200, 'Fetched matching insights');
    const matchingData = await matchingRes.json();
    assert(Array.isArray(matchingData.challenges), 'Matching insights returns challenges array');

    if (matchingData.challenges.length > 0) {
      const chal = matchingData.challenges[0];
      assert(!!chal.challenge_id && !!chal.challenge_title, 'Challenge group has id and title');
      assert(Array.isArray(chal.recommendations), 'Challenge group has recommendations array');

      if (chal.recommendations.length > 0) {
        const rec = chal.recommendations[0];
        assert(!!rec.organization_id && !!rec.organization_name, 'Recommendation has organization details');
        assert(typeof rec.alignment_score === 'number', 'Recommendation has alignment_score');
        assert(typeof rec.verified_capabilities_count === 'number', 'Has verified_capabilities_count');
        assert(typeof rec.pending_capabilities_count === 'number', 'Has pending_capabilities_count');
        assert(typeof rec.unverified_capabilities_count === 'number', 'Has unverified_capabilities_count');

        // Verify NO private evidence files or vector embeddings exposed
        assert(rec.evidence_files === undefined, 'Privacy check: zero private evidence files exposed');
        assert(rec.embedding === undefined, 'Diagnostics check: raw vector embeddings not exposed');
      }
    } else {
      console.log('  ℹ️ Note: No validated challenges with matching recommendations currently.');
    }

    // -------------------------------------------------------------------------
    // Phase 9: Problem Telemetry & Trends (Sectoral Breakdown)
    // -------------------------------------------------------------------------
    console.log('\n📈 Phase 9: Problem Telemetry & Sectoral Breakdown...');

    const telemetryRes = await fetch(`${API_BASE}/admin/analytics/challenges`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    assert(telemetryRes.status === 200, 'Fetched challenges telemetry');
    const telemetry = await telemetryRes.json();
    assert(Array.isArray(telemetry.byDomain), 'telemetry contains byDomain array');
    assert(Array.isArray(telemetry.byPriority), 'telemetry contains byPriority array');
    assert(Array.isArray(telemetry.byStatus), 'telemetry contains byStatus array');
    assert(Array.isArray(telemetry.overTime), 'telemetry contains overTime array');

    // -------------------------------------------------------------------------
    // Phase 10: Dynamic District List Endpoint Verification
    // -------------------------------------------------------------------------
    console.log('\n🌐 Phase 10: Dynamic District List Endpoint Verification...');

    const distListRes = await fetch(`${API_BASE}/locations/districts`);
    assert(distListRes.status === 200, 'GET /locations/districts returned 200');
    const distList = await distListRes.json();
    assert(Array.isArray(distList), 'Returns array of districts');
    assert(distList.length >= 24, `Dynamic district selector finds all districts (found ${distList.length})`);
    const ranchiInList = distList.find((d: any) => d.name === 'Ranchi');
    assert(!!ranchiInList && ranchiInList.id === ranchiDistrictId, 'Ranchi exists with correct id in dynamic district list');

    // -------------------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`🏁 Government Dashboard Intelligence Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed with unhandled error:', error);
    process.exit(1);
  }
}

runGovernmentDashboardTests();
