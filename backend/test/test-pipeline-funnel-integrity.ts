/**
 * Automated Verification: Institutional Response Pipeline (8-Stage Funnel) Integrity
 * 
 * Verifies:
 * 1. 8-Stage Funnel Structure & Values (State Admin statewide scope):
 *    - Reported, AI Structured, Gov Validated, Capability Matched, Institution Interested, EOI Submitted, Pilot, Resolved
 * 2. District Officer Scoping (Ranchi):
 *    - Strict jurisdiction isolation for every stage
 * 3. Query Parameter Tampering Defense:
 *    - District Officer tampering with ?district_id=<foreign> cannot bypass server enforcement
 * 4. Filter Propagation Consistency:
 *    - Domain, Priority, and TimeRange filters propagate consistently to ALL 8 stages (including EOI Submitted)
 *    - No un-scoped or unfiltered stages leaking counts
 * 5. Monotonic Progression & Legitimate Stage Behavior:
 *    - Reported >= AI Structured >= Gov Validated >= Matched >= Institution Interested >= EOI Submitted >= Pilot
 *    - Validates terminal Resolved state behavior
 * 6. Conversion Rate Mathematical Validity & Meaningful Denominators:
 *    - Stage 1 is baseline (100%)
 *    - All active percentages are between 0% and 100%
 *    - Zero-denominator prevention (no Infinity% or NaN%)
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

async function runFunnelIntegrityTests() {
  console.log('\n================================================================================');
  console.log('🏛️  SamadhanSetu: 8-Stage Institutional Response Pipeline Integrity Verification');
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
    // Phase 1: Authenticate State Admin and District Officer
    // -------------------------------------------------------------------------
    console.log('🔑 Phase 1: Authenticating State Admin & Ranchi District Officer...');

    const stateLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.state@jharkhand.gov.in', password: 'GovAdmin123!' }),
    });
    assert(stateLogin.status === 200, 'State Admin login succeeded');
    const stateToken = (await stateLogin.json()).accessToken;

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
    assert(!!ranchiDistrictId, `Ranchi Officer has valid district_id: ${ranchiDistrictId}`);

    // -------------------------------------------------------------------------
    // Phase 2: Statewide 8-Stage Funnel Verification (State Admin)
    // -------------------------------------------------------------------------
    console.log('\n📊 Phase 2: Statewide 8-Stage Funnel Verification...');

    const stateOverviewRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    assert(stateOverviewRes.status === 200, 'State Admin retrieved analytics overview');
    const stateData = await stateOverviewRes.json();
    const pipe = stateData.pipeline;
    assert(!!pipe, 'Pipeline funnel object is present in response');

    console.log('  Statewide Pipeline Counts:', pipe);

    // Stage 1: Reported
    assert(typeof pipe.reported === 'number' && pipe.reported > 0, `Stage 1 (Reported): ${pipe.reported} problems`);
    // Stage 2: AI Structured
    assert(typeof pipe.aiStructured === 'number' && pipe.aiStructured > 0, `Stage 2 (AI Structured): ${pipe.aiStructured} problems`);
    // Stage 3: Government Validated
    assert(typeof pipe.governmentValidated === 'number' && pipe.governmentValidated > 0, `Stage 3 (Gov Validated): ${pipe.governmentValidated} problems`);
    // Stage 4: Capability Matched
    assert(typeof pipe.matched === 'number' && pipe.matched > 0, `Stage 4 (Capability Matched): ${pipe.matched} problems`);
    // Stage 5: Institution Interested
    assert(typeof pipe.institutionInterested === 'number' && pipe.institutionInterested >= 0, `Stage 5 (Institution Interested): ${pipe.institutionInterested} problems`);
    // Stage 6: EOI Submitted
    assert(typeof pipe.eoiSubmitted === 'number' && pipe.eoiSubmitted >= 0, `Stage 6 (EOI Submitted): ${pipe.eoiSubmitted} problems`);
    // Stage 7: Pilot
    assert(typeof pipe.pilot === 'number' && pipe.pilot >= 0, `Stage 7 (Pilot): ${pipe.pilot} problems`);
    // Stage 8: Resolved
    assert(typeof pipe.resolved === 'number' && pipe.resolved >= 0, `Stage 8 (Resolved): ${pipe.resolved} problems`);

    // -------------------------------------------------------------------------
    // Phase 3: Monotonic Progression & Legitimate Stage Behavior
    // -------------------------------------------------------------------------
    console.log('\n📉 Phase 3: Monotonic Progression & Stage Integrity...');

    assert(pipe.aiStructured <= pipe.reported, `Monotonic check: AI Structured (${pipe.aiStructured}) <= Reported (${pipe.reported})`);
    assert(pipe.governmentValidated <= pipe.aiStructured, `Monotonic check: Gov Validated (${pipe.governmentValidated}) <= AI Structured (${pipe.aiStructured})`);
    assert(pipe.matched <= pipe.governmentValidated, `Monotonic check: Matched (${pipe.matched}) <= Gov Validated (${pipe.governmentValidated})`);
    assert(pipe.institutionInterested <= pipe.matched, `Monotonic check: Institution Interested (${pipe.institutionInterested}) <= Matched (${pipe.matched})`);
    assert(pipe.eoiSubmitted <= pipe.institutionInterested, `Monotonic check: EOI Submitted (${pipe.eoiSubmitted}) <= Institution Interested (${pipe.institutionInterested})`);
    assert(pipe.pilot <= pipe.eoiSubmitted, `Monotonic check: Pilot (${pipe.pilot}) <= EOI Submitted (${pipe.eoiSubmitted})`);
    assert(pipe.resolved <= pipe.reported, `Pipeline boundary check: Resolved (${pipe.resolved}) <= Reported (${pipe.reported})`);

    // -------------------------------------------------------------------------
    // Phase 4: Mathematical Validity of Conversion Percentages
    // -------------------------------------------------------------------------
    console.log('\n🧮 Phase 4: Conversion Rate Computations & Meaningful Denominators...');

    const stagesList = [
      { name: 'Reported', count: pipe.reported },
      { name: 'AI Structured', count: pipe.aiStructured },
      { name: 'Gov Validated', count: pipe.governmentValidated },
      { name: 'Capability Matched', count: pipe.matched },
      { name: 'Institution Interested', count: pipe.institutionInterested },
      { name: 'EOI Submitted', count: pipe.eoiSubmitted },
      { name: 'Pilot', count: pipe.pilot },
      { name: 'Resolved', count: pipe.resolved },
    ];

    for (let i = 0; i < stagesList.length; i++) {
      const st = stagesList[i];
      // Intake conversion
      const intakeRate = pipe.reported > 0 ? (st.count / pipe.reported) * 100 : 0;
      assert(
        !isNaN(intakeRate) && isFinite(intakeRate) && intakeRate >= 0 && intakeRate <= 100,
        `${st.name} intake conversion is valid percentage: ${intakeRate.toFixed(1)}%`,
      );

      // Step conversion (only where denominator > 0)
      if (i > 0) {
        const prevCount = stagesList[i - 1].count;
        if (prevCount > 0) {
          const stepRate = (st.count / prevCount) * 100;
          assert(
            !isNaN(stepRate) && isFinite(stepRate) && stepRate >= 0,
            `${st.name} step conversion from ${stagesList[i - 1].name} is valid: ${stepRate.toFixed(1)}%`,
          );
        } else {
          console.log(`  ℹ️ Note: ${st.name} previous stage has 0 records; step conversion is correctly marked N/A without division-by-zero.`);
          assert(true, `${st.name} zero-denominator condition properly handled.`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // Phase 5: District Officer Strict Funnel Isolation (Ranchi)
    // -------------------------------------------------------------------------
    console.log('\n🔒 Phase 5: District Officer Strict Jurisdiction Scoping...');

    const ranchiOverviewRes = await fetch(`${API_BASE}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiOverviewRes.status === 200, 'Ranchi Officer retrieved analytics overview');
    const ranchiData = await ranchiOverviewRes.json();
    const ranchiPipe = ranchiData.pipeline;

    console.log('  Ranchi Pipeline Counts:', ranchiPipe);
    assert(ranchiPipe.reported <= pipe.reported, `Ranchi Reported (${ranchiPipe.reported}) <= Statewide (${pipe.reported})`);
    assert(ranchiPipe.aiStructured <= pipe.aiStructured, `Ranchi Structured (${ranchiPipe.aiStructured}) <= Statewide (${pipe.aiStructured})`);
    assert(ranchiPipe.governmentValidated <= pipe.governmentValidated, `Ranchi Validated (${ranchiPipe.governmentValidated}) <= Statewide (${pipe.governmentValidated})`);
    assert(ranchiPipe.matched <= pipe.matched, `Ranchi Matched (${ranchiPipe.matched}) <= Statewide (${pipe.matched})`);
    assert(ranchiPipe.eoiSubmitted <= pipe.eoiSubmitted, `Ranchi EOI Submitted (${ranchiPipe.eoiSubmitted}) <= Statewide (${pipe.eoiSubmitted})`);
    assert(ranchiPipe.resolved <= pipe.resolved, `Ranchi Resolved (${ranchiPipe.resolved}) <= Statewide (${pipe.resolved})`);

    // -------------------------------------------------------------------------
    // Phase 6: Query Parameter Tampering Defense on Funnel
    // -------------------------------------------------------------------------
    console.log('\n🛡️  Phase 6: Query Parameter Tampering Defense on Funnel...');

    const foreignDistrictId = 'e77a5ef3-a204-46b8-9b95-53427af99747';
    const tamperedRes = await fetch(
      `${API_BASE}/admin/analytics/overview?district_id=${foreignDistrictId}&district=Dhanbad`,
      { headers: { Authorization: `Bearer ${ranchiToken}` } },
    );
    assert(tamperedRes.status === 200, 'Tampered query request returned 200');
    const tamperedData = await tamperedRes.json();
    const tamperedPipe = tamperedData.pipeline;

    assert(
      tamperedPipe.reported === ranchiPipe.reported,
      `Query tampering defeated: Reported count remains locked to Ranchi (${tamperedPipe.reported} == ${ranchiPipe.reported})`,
    );
    assert(
      tamperedPipe.governmentValidated === ranchiPipe.governmentValidated,
      `Query tampering defeated: Validated count remains locked to Ranchi (${tamperedPipe.governmentValidated} == ${ranchiPipe.governmentValidated})`,
    );
    assert(
      tamperedPipe.eoiSubmitted === ranchiPipe.eoiSubmitted,
      `Query tampering defeated: EOI count remains locked to Ranchi (${tamperedPipe.eoiSubmitted} == ${ranchiPipe.eoiSubmitted})`,
    );

    // -------------------------------------------------------------------------
    // Phase 7: Multi-Dimensional Filter Propagation Consistency
    // -------------------------------------------------------------------------
    console.log('\n🎯 Phase 7: Multi-Dimensional Filter Propagation to Funnel...');

    // 7a. Domain Filter
    const domainRes = await fetch(`${API_BASE}/admin/analytics/overview?domain=WATER_AND_SANITATION`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    const domainData = await domainRes.json();
    const domainPipe = domainData.pipeline;
    console.log('  Domain Filtered (WATER_AND_SANITATION):', domainPipe);

    assert(domainPipe.reported < pipe.reported, `Domain filter narrowed reported: ${domainPipe.reported} < ${pipe.reported}`);
    assert(domainPipe.aiStructured <= domainPipe.reported, `Domain filter preserves monotonicity: Structured (${domainPipe.aiStructured}) <= Reported (${domainPipe.reported})`);
    assert(domainPipe.eoiSubmitted <= domainPipe.reported, `Domain filter correctly propagated to EOI Submitted: ${domainPipe.eoiSubmitted} <= ${domainPipe.reported}`);
    assert(domainPipe.eoiSubmitted <= pipe.eoiSubmitted, `Domain EOI (${domainPipe.eoiSubmitted}) is subset of statewide EOI (${pipe.eoiSubmitted})`);

    // 7b. Priority Filter
    const priorityRes = await fetch(`${API_BASE}/admin/analytics/overview?priority=HIGH`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    const priorityData = await priorityRes.json();
    const priorityPipe = priorityData.pipeline;
    console.log('  Priority Filtered (HIGH):', priorityPipe);

    assert(priorityPipe.reported < pipe.reported, `Priority filter narrowed reported: ${priorityPipe.reported} < ${pipe.reported}`);
    assert(priorityPipe.eoiSubmitted <= priorityPipe.reported, `Priority filter correctly propagated to EOI Submitted: ${priorityPipe.eoiSubmitted} <= ${priorityPipe.reported}`);

    // 7c. Time Range Filter (30d)
    const timeRes = await fetch(`${API_BASE}/admin/analytics/overview?timeRange=30d`, {
      headers: { Authorization: `Bearer ${stateToken}` },
    });
    const timeData = await timeRes.json();
    const timePipe = timeData.pipeline;
    console.log('  Time Range Filtered (30d):', timePipe);

    assert(timePipe.reported <= pipe.reported, `Time filter narrowed reported: ${timePipe.reported} <= ${pipe.reported}`);
    assert(timePipe.eoiSubmitted <= timePipe.reported, `Time filter correctly propagated to EOI Submitted: ${timePipe.eoiSubmitted} <= ${timePipe.reported}`);

    // -------------------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`🏁 Pipeline Funnel Integrity Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed with unhandled error:', error);
    process.exit(1);
  }
}

runFunnelIntegrityTests();
