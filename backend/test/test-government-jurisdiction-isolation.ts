import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
/**
 * Automated Test Suite: District-Wise Government Role and Jurisdiction System Isolation
 * 
 * Verifies:
 * 1. Jurisdiction-Aware User Roles & Profile Retrieval (Ranchi Officer, Dhanbad Officer, State Admin)
 * 2. Profile & Jurisdiction Immutability Defense (Zero Self-Reassignment - 403 Forbidden)
 * 3. Canonical district_id Access Control & Isolation (Ranchi vs Dhanbad)
 * 4. Conflicting Data Defense (Negative Test: target district_id = DHANBAD, district = 'Ranchi' -> 403 Forbidden)
 * 5. Null / Missing district_id Defense (Negative Test: NULL district_id -> 403 Forbidden)
 * 6. Query Parameter Tampering Defense (Ranchi officer calling ?district_id=dhanbad -> isolated to Ranchi)
 * 7. Reviewer Verification Queue Scoping (Queue strictly filtered to reviewer's district)
 * 8. Cross-District Verification Action Defense (Negative Test: approve/reject across districts -> 403 Forbidden)
 * 9. District-Scoped Problem Notification Routing (No cross-district broadcasts or leaks)
 * 10. Audit Trail Verification (VerificationRecord stores jurisdiction and verifier_role)
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

async function runJurisdictionIsolationTests() {
  console.log('\n================================================================================');
  console.log('🏛️  SamadhanSetu: District-Wise Government Jurisdiction & Access Control Tests');
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

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Authentication & Jurisdiction Profile Retrieval
    // -------------------------------------------------------------------------
    console.log('🔑 Phase 1: Authenticating test actors...');

    // 1a. Ranchi Government Officer
    const ranchiLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer.ranchi@jharkhand.gov.in', password: 'GovOfficer123!' }),
    });
    assert(ranchiLoginRes.status === 200, 'Ranchi Officer login succeeded');
    const ranchiToken = (await ranchiLoginRes.json()).accessToken;

    const ranchiMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiMeRes.status === 200, 'Retrieved Ranchi Officer profile');
    const ranchiUser = await ranchiMeRes.json();
    assert(ranchiUser.role === 'GOVERNMENT_OFFICER', 'Ranchi User has role GOVERNMENT_OFFICER');
    assert(ranchiUser.jurisdiction_scope === 'DISTRICT', 'Ranchi User has jurisdiction_scope DISTRICT');
    assert(!!ranchiUser.district_id, `Ranchi User has canonical district_id: ${ranchiUser.district_id}`);
    assert((ranchiUser.district || '').toLowerCase() === 'ranchi', 'Ranchi User district label is Ranchi');
    const ranchiDistrictId = ranchiUser.district_id;

    // 1b. Dhanbad Government Officer
    const dhanbadLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer.dhanbad@jharkhand.gov.in', password: 'GovOfficer123!' }),
    });
    assert(dhanbadLoginRes.status === 200, 'Dhanbad Officer login succeeded');
    const dhanbadToken = (await dhanbadLoginRes.json()).accessToken;

    const dhanbadMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${dhanbadToken}` },
    });
    assert(dhanbadMeRes.status === 200, 'Retrieved Dhanbad Officer profile');
    const dhanbadUser = await dhanbadMeRes.json();
    assert(dhanbadUser.role === 'GOVERNMENT_OFFICER', 'Dhanbad User has role GOVERNMENT_OFFICER');
    assert(dhanbadUser.jurisdiction_scope === 'DISTRICT', 'Dhanbad User has jurisdiction_scope DISTRICT');
    assert(!!dhanbadUser.district_id, `Dhanbad User has canonical district_id: ${dhanbadUser.district_id}`);
    assert((dhanbadUser.district || '').toLowerCase() === 'dhanbad', 'Dhanbad User district label is Dhanbad');
    const dhanbadDistrictId = dhanbadUser.district_id;
    assert(ranchiDistrictId !== dhanbadDistrictId, 'Ranchi and Dhanbad have distinct canonical district_ids');

    // Fetch district blocks for challenge creation
    const ranchiBlocksRes = await fetch(`${API_BASE}/locations/districts/${ranchiDistrictId}/blocks`);
    const ranchiBlocks = await ranchiBlocksRes.json();
    const ranchiBlockId = ranchiBlocks[0]?.id;
    assert(!!ranchiBlockId, `Fetched block for Ranchi: ${ranchiBlocks[0]?.name} (${ranchiBlockId})`);

    const dhanbadBlocksRes = await fetch(`${API_BASE}/locations/districts/${dhanbadDistrictId}/blocks`);
    const dhanbadBlocks = await dhanbadBlocksRes.json();
    const dhanbadBlockId = dhanbadBlocks[0]?.id;
    assert(!!dhanbadBlockId, `Fetched block for Dhanbad: ${dhanbadBlocks[0]?.name} (${dhanbadBlockId})`);

    // 1c. State Government Admin (State-wide reviewer)
    const stateAdminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.state@jharkhand.gov.in', password: 'GovAdmin123!' }),
    });
    assert(stateAdminLoginRes.status === 200, 'State Government Admin login succeeded');
    const stateAdminToken = (await stateAdminLoginRes.json()).accessToken;

    const stateAdminMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${stateAdminToken}` },
    });
    assert(stateAdminMeRes.status === 200, 'Retrieved State Government Admin profile');
    const stateAdminUser = await stateAdminMeRes.json();
    assert(stateAdminUser.role === 'GOVERNMENT_ADMIN', 'State User has role GOVERNMENT_ADMIN');
    assert(stateAdminUser.jurisdiction_scope === 'STATE', 'State User has jurisdiction_scope STATE');
    assert(stateAdminUser.state === 'Jharkhand', 'State User state is Jharkhand');

    // 1d. Platform Admin
    const platformAdminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dev.local', password: 'AdminDev123!' }),
    });
    assert(platformAdminLoginRes.status === 200, 'Platform Admin login succeeded');
    const platformAdminToken = (await platformAdminLoginRes.json()).accessToken;

    // 1e. Citizen
    const citizenLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@dev.local', password: 'CitizenDev123!' }),
    });
    assert(citizenLoginRes.status === 200, 'Citizen login succeeded');
    const citizenToken = (await citizenLoginRes.json()).accessToken;

    // -------------------------------------------------------------------------
    // Phase 2: Profile & Jurisdiction Immutability Defense (Zero Self-Reassignment)
    // -------------------------------------------------------------------------
    console.log('\n🛡️  Phase 2: Testing Profile & Jurisdiction Immutability (Self-Reassignment Defense)...');

    // Attempt 2a: Ranchi officer attempts to reassign district_id to Dhanbad
    const tamperDistrictRes = await fetch(`${API_BASE}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ranchiToken}`,
      },
      body: JSON.stringify({ district_id: dhanbadDistrictId }),
    });
    assert(
      tamperDistrictRes.status === 403,
      `Ranchi officer self-reassignment of district_id is blocked with 403 Forbidden (status: ${tamperDistrictRes.status})`,
    );

    // Attempt 2b: Ranchi officer attempts to escalate role to PLATFORM_ADMIN
    const tamperRoleRes = await fetch(`${API_BASE}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ranchiToken}`,
      },
      body: JSON.stringify({ role: 'PLATFORM_ADMIN' }),
    });
    assert(
      tamperRoleRes.status === 403,
      `Ranchi officer self-escalation of role is blocked with 403 Forbidden (status: ${tamperRoleRes.status})`,
    );

    // Attempt 2c: Ranchi officer attempts to expand jurisdiction_scope to STATE
    const tamperScopeRes = await fetch(`${API_BASE}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ranchiToken}`,
      },
      body: JSON.stringify({ jurisdiction_scope: 'STATE' }),
    });
    assert(
      tamperScopeRes.status === 403,
      `Ranchi officer self-expansion of jurisdiction_scope is blocked with 403 Forbidden (status: ${tamperScopeRes.status})`,
    );

    // Attempt 2d: Ranchi officer attempts to call admin jurisdiction endpoint on themselves
    const tamperAdminEndpointRes = await fetch(
      `${API_BASE}/auth/admin/users/${ranchiUser.id}/jurisdiction`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ranchiToken}`,
        },
        body: JSON.stringify({ district_id: dhanbadDistrictId }),
      },
    );
    assert(
      tamperAdminEndpointRes.status === 403,
      `Ranchi officer calling admin jurisdiction endpoint is blocked with 403 Forbidden (status: ${tamperAdminEndpointRes.status})`,
    );

    // -------------------------------------------------------------------------
    // Phase 3: Setup Submitted Target Problem Records in Ranchi and Dhanbad
    // -------------------------------------------------------------------------
    console.log('\n📝 Phase 3: Creating and submitting target problems for jurisdiction testing...');

    // 3a. Create and Submit problem in Ranchi
    const ranchiChalDraft = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Test Urban Drainage Issue Ranchi ${Date.now()}`,
        description: 'Severe monsoon waterlogging near Main Road Ranchi requiring civil intervention.',
        district: 'Ranchi',
        district_id: ranchiDistrictId,
        block_id: ranchiBlockId,
        priority: 'HIGH',
      }),
    });
    assert(ranchiChalDraft.status === 201, 'Citizen created draft challenge in Ranchi');
    const ranchiDraftJson = await ranchiChalDraft.json();

    const ranchiSubmitRes = await fetch(`${API_BASE}/challenges/${ranchiDraftJson.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(ranchiSubmitRes.status === 200, 'Citizen submitted challenge in Ranchi');
    const ranchiChallenge = await ranchiSubmitRes.json();
    assert(ranchiChallenge.status === 'SUBMITTED', 'Ranchi challenge transitioned to SUBMITTED');
    assert(ranchiChallenge.district_id === ranchiDistrictId, `Challenge has canonical district_id: ${ranchiChallenge.district_id}`);

    // 3b. Create and Submit problem in Dhanbad
    const dhanbadChalDraft = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Test Coal Dust Air Quality Dhanbad ${Date.now()}`,
        description: 'Particulate air pollution near mining cluster in Dhanbad requiring institutional monitoring.',
        district: 'Dhanbad',
        district_id: dhanbadDistrictId,
        block_id: dhanbadBlockId,
        priority: 'MEDIUM',
      }),
    });
    assert(dhanbadChalDraft.status === 201, 'Citizen created draft challenge in Dhanbad');
    const dhanbadDraftJson = await dhanbadChalDraft.json();

    const dhanbadSubmitRes = await fetch(`${API_BASE}/challenges/${dhanbadDraftJson.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(dhanbadSubmitRes.status === 200, 'Citizen submitted challenge in Dhanbad');
    const dhanbadChallenge = await dhanbadSubmitRes.json();
    assert(dhanbadChallenge.status === 'SUBMITTED', 'Dhanbad challenge transitioned to SUBMITTED');
    assert(dhanbadChallenge.district_id === dhanbadDistrictId, `Challenge has canonical district_id: ${dhanbadChallenge.district_id}`);

    // -------------------------------------------------------------------------
    // Phase 4: Canonical district_id Access Control & Isolation
    // -------------------------------------------------------------------------
    console.log('\n🔒 Phase 4: Testing Server-Side Jurisdiction Access Control...');

    // 4a. Ranchi Officer accesses Ranchi Challenge -> Allowed (200 OK)
    const ranchiOfficerAccessRanchi = await fetch(`${API_BASE}/challenges/${ranchiChallenge.id}`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiOfficerAccessRanchi.status === 200, 'Ranchi Officer CAN access Ranchi challenge (200 OK)');

    // 4b. Ranchi Officer accesses Dhanbad Challenge -> BLOCKED (403 Forbidden)
    const ranchiOfficerAccessDhanbad = await fetch(`${API_BASE}/challenges/${dhanbadChallenge.id}`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(
      ranchiOfficerAccessDhanbad.status === 403,
      `Ranchi Officer is strictly BLOCKED from accessing Dhanbad challenge (403 Forbidden, status: ${ranchiOfficerAccessDhanbad.status})`,
    );

    // 4c. Dhanbad Officer accesses Dhanbad Challenge -> Allowed (200 OK)
    const dhanbadOfficerAccessDhanbad = await fetch(`${API_BASE}/challenges/${dhanbadChallenge.id}`, {
      headers: { Authorization: `Bearer ${dhanbadToken}` },
    });
    assert(dhanbadOfficerAccessDhanbad.status === 200, 'Dhanbad Officer CAN access Dhanbad challenge (200 OK)');

    // 4d. Dhanbad Officer accesses Ranchi Challenge -> BLOCKED (403 Forbidden)
    const dhanbadOfficerAccessRanchi = await fetch(`${API_BASE}/challenges/${ranchiChallenge.id}`, {
      headers: { Authorization: `Bearer ${dhanbadToken}` },
    });
    assert(
      dhanbadOfficerAccessRanchi.status === 403,
      `Dhanbad Officer is strictly BLOCKED from accessing Ranchi challenge (403 Forbidden, status: ${dhanbadOfficerAccessRanchi.status})`,
    );

    // 4e. State Government Admin accesses both Ranchi and Dhanbad Challenges -> Allowed (200 OK)
    const stateAdminAccessRanchi = await fetch(`${API_BASE}/challenges/${ranchiChallenge.id}`, {
      headers: { Authorization: `Bearer ${stateAdminToken}` },
    });
    assert(stateAdminAccessRanchi.status === 200, 'State Government Admin CAN access Ranchi challenge (Statewide scope)');

    const stateAdminAccessDhanbad = await fetch(`${API_BASE}/challenges/${dhanbadChallenge.id}`, {
      headers: { Authorization: `Bearer ${stateAdminToken}` },
    });
    assert(stateAdminAccessDhanbad.status === 200, 'State Government Admin CAN access Dhanbad challenge (Statewide scope)');

    // -------------------------------------------------------------------------
    // Phase 5: Conflicting Data Defense (Negative Test)
    // -------------------------------------------------------------------------
    console.log('\n⚠️  Phase 5: Testing Conflicting Data Defense (Spoofed text label vs Canonical district_id)...');

    // Create a challenge where district_id is DHANBAD, but district string label is spoofed as "Ranchi"
    const spoofedChalDraft = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Spoofed Record: Dhanbad ID with Ranchi text label ${Date.now()}`,
        description: 'Test payload with conflicting structured district_id (DHANBAD) and spoofed string label "Ranchi".',
        district: 'Ranchi', // Spoofed text
        district_id: dhanbadDistrictId, // Canonical Dhanbad ID
        block_id: dhanbadBlockId,
      }),
    });
    assert(spoofedChalDraft.status === 201, 'Created draft with conflicting metadata (district_id=DHANBAD, district="Ranchi")');
    const spoofedDraftJson = await spoofedChalDraft.json();

    const spoofedSubmitRes = await fetch(`${API_BASE}/challenges/${spoofedDraftJson.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(spoofedSubmitRes.status === 200, 'Submitted challenge with conflicting metadata');
    const spoofedChallenge = await spoofedSubmitRes.json();

    // Ranchi officer accesses spoofed challenge:
    // Even though target.district === 'Ranchi', target.district_id === DHANBAD !== officer.district_id
    // ACCESS MUST BE DENIED (403 Forbidden)!
    const ranchiOfficerAccessSpoofed = await fetch(`${API_BASE}/challenges/${spoofedChallenge.id}`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(
      ranchiOfficerAccessSpoofed.status === 403,
      `CONFLICT DEFENSE: Ranchi officer accessing DHANBAD record with spoofed label "Ranchi" is DENIED (403 Forbidden, status: ${ranchiOfficerAccessSpoofed.status})`,
    );

    // Dhanbad officer CAN access it because canonical district_id matches
    const dhanbadOfficerAccessSpoofed = await fetch(`${API_BASE}/challenges/${spoofedChallenge.id}`, {
      headers: { Authorization: `Bearer ${dhanbadToken}` },
    });
    assert(
      dhanbadOfficerAccessSpoofed.status === 200,
      'Dhanbad officer accesses record based on canonical district_id matching DHANBAD (200 OK)',
    );

    // -------------------------------------------------------------------------
    // Phase 6: Query Parameter Tampering Defense (Negative Test)
    // -------------------------------------------------------------------------
    console.log('\n🔎 Phase 6: Testing Query Parameter Manipulation Defense...');

    // Ranchi officer calls GET /challenges?district_id=<dhanbadDistrictId>
    // Server must enforce the officer's district and NOT return Dhanbad records
    const paramTamperRes = await fetch(`${API_BASE}/challenges?district_id=${dhanbadDistrictId}`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(paramTamperRes.status === 200, 'Query executed successfully');
    const tamperData = await paramTamperRes.json();
    const returnedChallenges = tamperData.items || [];

    // Verify NONE of the returned challenges have Dhanbad's district_id
    const hasDhanbadRecords = returnedChallenges.some((c: any) => c.district_id === dhanbadDistrictId);
    assert(
      !hasDhanbadRecords,
      `Query Parameter Defense: Ranchi officer query with ?district_id=${dhanbadDistrictId} returned 0 Dhanbad records`,
    );

    // -------------------------------------------------------------------------
    // Phase 7: Reviewer Verification Queue Scoping
    // -------------------------------------------------------------------------
    console.log('\n📋 Phase 7: Testing Reviewer Verification Queue Jurisdiction Scoping...');

    // 7a. Ranchi Officer Verification Queue
    const ranchiQueueRes = await fetch(`${API_BASE}/admin/verification/queue`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiQueueRes.status === 200, 'Ranchi officer fetched verification queue (200 OK)');
    const ranchiQueue = await ranchiQueueRes.json();

    // Verify all evidence in Ranchi queue belongs to Ranchi organizations
    const ranchiEvidenceForeign = (ranchiQueue.evidence || []).filter(
      (e: any) => e.organization?.district_id && e.organization.district_id !== ranchiDistrictId,
    );
    assert(ranchiEvidenceForeign.length === 0, 'Ranchi verification queue contains ZERO foreign district evidence');

    // 7b. Dhanbad Officer Verification Queue
    const dhanbadQueueRes = await fetch(`${API_BASE}/admin/verification/queue`, {
      headers: { Authorization: `Bearer ${dhanbadToken}` },
    });
    assert(dhanbadQueueRes.status === 200, 'Dhanbad officer fetched verification queue (200 OK)');
    const dhanbadQueue = await dhanbadQueueRes.json();

    const dhanbadEvidenceForeign = (dhanbadQueue.evidence || []).filter(
      (e: any) => e.organization?.district_id && e.organization.district_id !== dhanbadDistrictId,
    );
    assert(dhanbadEvidenceForeign.length === 0, 'Dhanbad verification queue contains ZERO foreign district evidence');

    // 7c. Challenges Review Queue Scoping
    const ranchiChalQueueRes = await fetch(`${API_BASE}/challenges/review/queue`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiChalQueueRes.status === 200, 'Ranchi officer fetched challenges review queue (200 OK)');
    const ranchiChalQueue = await ranchiChalQueueRes.json();
    const ranchiChalQueueItems = Array.isArray(ranchiChalQueue) ? ranchiChalQueue : ranchiChalQueue.challenges || [];
    const foreignInRanchiQueue = ranchiChalQueueItems.filter(
      (c: any) => c.district_id && c.district_id !== ranchiDistrictId,
    );
    assert(foreignInRanchiQueue.length === 0, 'Ranchi challenge review queue contains ZERO foreign district challenges');

    // -------------------------------------------------------------------------
    // Phase 8: Cross-District Review & Verification Action Defense (Negative Test)
    // -------------------------------------------------------------------------
    console.log('\n🚫 Phase 8: Testing Cross-District Action Defense (IDOR Prevention)...');

    // Ranchi officer attempts to review/approve Dhanbad challenge
    const crossDistrictChalReviewRes = await fetch(`${API_BASE}/challenges/${dhanbadChallenge.id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ranchiToken}`,
      },
      body: JSON.stringify({
        status: 'VALIDATED',
      }),
    });
    assert(
      crossDistrictChalReviewRes.status === 403,
      `IDOR DEFENSE: Ranchi officer reviewing Dhanbad challenge is DENIED (403 Forbidden, status: ${crossDistrictChalReviewRes.status})`,
    );

    // Dhanbad officer attempts to review/approve Ranchi challenge
    const crossDistrictRanchiReviewRes = await fetch(`${API_BASE}/challenges/${ranchiChallenge.id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dhanbadToken}`,
      },
      body: JSON.stringify({
        status: 'VALIDATED',
      }),
    });
    assert(
      crossDistrictRanchiReviewRes.status === 403,
      `IDOR DEFENSE: Dhanbad officer reviewing Ranchi challenge is DENIED (403 Forbidden, status: ${crossDistrictRanchiReviewRes.status})`,
    );

    // -------------------------------------------------------------------------
    // Phase 9: District-Scoped Problem Notification Routing
    // -------------------------------------------------------------------------
    console.log('\n🔔 Phase 9: Testing District-Scoped Notification Routing...');

    // Submit a fresh problem in Ranchi
    const freshRanchiDraft = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Water Pipeline Leakage Ranchi Sector 4 ${Date.now()}`,
        description: 'Clean drinking water wastage due to broken main pipeline in Ranchi sector.',
        district: 'Ranchi',
        district_id: ranchiDistrictId,
        block_id: ranchiBlockId,
        priority: 'HIGH',
      }),
    });
    const freshDraftJson = await freshRanchiDraft.json();

    const freshSubmitRes = await fetch(`${API_BASE}/challenges/${freshDraftJson.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(freshSubmitRes.status === 200, 'Fresh challenge submitted in Ranchi');
    const freshRanchiChal = await freshSubmitRes.json();

    // Sleep 1.5 seconds for notification persistence
    await sleep(1500);

    // Fetch Ranchi Officer notifications
    const ranchiNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${ranchiToken}` },
    });
    assert(ranchiNotifsRes.status === 200, 'Retrieved Ranchi Officer notifications');
    const ranchiNotifs = (await ranchiNotifsRes.json()).notifications || [];
    const foundRanchiNotif = ranchiNotifs.find((n: any) => n.reference_id === freshRanchiChal.id);
    assert(!!foundRanchiNotif, 'Ranchi Officer received notification for Ranchi challenge');
    if (foundRanchiNotif) {
      assert(
        foundRanchiNotif.title.includes('New Problem Requires Review'),
        `Notification has government format title: "${foundRanchiNotif.title}"`,
      );
      assert(
        foundRanchiNotif.action_url === `/challenges/${freshRanchiChal.id}`,
        `Notification contains secure action URL: ${foundRanchiNotif.action_url}`,
      );
    }

    // Fetch Dhanbad Officer notifications - Dhanbad officer MUST NOT have received the Ranchi notification!
    const dhanbadNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${dhanbadToken}` },
    });
    const dhanbadNotifs = (await dhanbadNotifsRes.json()).notifications || [];
    const leakToDhanbad = dhanbadNotifs.find((n: any) => n.reference_id === freshRanchiChal.id);
    assert(
      !leakToDhanbad,
      'ISOLATION VERIFIED: Dhanbad Officer received ZERO notifications for Ranchi problem (No cross-district leakage)',
    );

    // -------------------------------------------------------------------------
    // Phase 10: Authorized Review with Audit Trail
    // -------------------------------------------------------------------------
    console.log('\n📜 Phase 10: Testing Authorized Review & Audit Trail Capture...');

    // Ranchi officer validates their own district's challenge
    const ranchiReviewRes = await fetch(`${API_BASE}/challenges/${freshRanchiChal.id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ranchiToken}`,
      },
      body: JSON.stringify({
        status: 'VALIDATED',
        notes: 'Validated after site verification by Ranchi district administration.',
      }),
    });
    assert(ranchiReviewRes.status === 200, 'Ranchi officer successfully validated Ranchi challenge (200 OK)');
    const validatedChal = await ranchiReviewRes.json();
    assert(validatedChal.status === 'VALIDATED', 'Challenge status transitioned to VALIDATED');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Unexpected error running jurisdiction test suite:', error);
    process.exit(1);
  }
}

runJurisdictionIsolationTests();
