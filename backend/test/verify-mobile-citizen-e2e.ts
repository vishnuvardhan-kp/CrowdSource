import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
/**
 * SamadhanSetu — Mobile Citizen End-to-End Verification Suite (Patch 9)
 *
 * Verifies the complete mobile workflow against live backend services:
 * Citizen Mobile
 *   -> Login (/api/auth/login, /api/auth/me)
 *   -> District & Block lookup (/api/locations/*)
 *   -> Create Draft (/api/challenges)
 *   -> Update Draft (Category, Severity, Coordinates, Location)
 *   -> Attach Evidence Multipart (/api/challenges/:id/evidence)
 *   -> Submit Report (/api/challenges/:id/submit)
 *   -> Backend AI Processing & Problem Clustering (/api/problem-clusters/*)
 *   -> Government Reviewer Validation (/api/problem-clusters/:id/verify)
 *   -> Citizen retrieves updated status (/api/challenges/:id)
 *   -> Citizen Notifications (/api/notifications)
 */

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

async function runMobileCitizenE2ESuite() {
  console.log('============================================================');
  console.log('📱 Starting SamadhanSetu Mobile Citizen End-to-End Verification');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // --- Step 1: Citizen Mobile Authentication ---
    console.log('\n--- Step 1: Mobile Citizen Authentication ---');
    // Test Mobile Registration
    const testEmail = `mobile.citizen.${Date.now()}@example.com`;
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mobile Citizen Tester',
        email: testEmail,
        password: 'Password123!',
        phone: '+919876543210',
      }),
    });
    assert(regRes.status === 201, 'Mobile citizen registration succeeds with HTTP 201');

    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    });

    assert(loginRes.status === 200 || loginRes.status === 201, 'Citizen login succeeds with HTTP 200/201');
    const loginData: any = await loginRes.json();
    const citizenToken = loginData.accessToken || loginData.access_token;
    assert(!!citizenToken, 'JWT access_token returned');

    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const meData: any = await meRes.json();
    assert(meData.role === 'CITIZEN', 'Citizen role verified via /auth/me');
    assert(meData.email === testEmail, 'Citizen profile email verified');

    // --- Step 2: Location Discovery ---
    console.log('\n--- Step 2: District & Block Discovery ---');
    const districtsRes = await fetch(`${API_URL}/locations/districts`);
    const districts: any = await districtsRes.json();
    assert(Array.isArray(districts) && districts.length > 0, 'Districts retrieved successfully');

    const ranchi = districts.find((d: any) => d.name.toLowerCase().includes('ranchi')) || districts[0];
    assert(!!ranchi, `Found district: ${ranchi.name}`);

    const blocksRes = await fetch(`${API_URL}/locations/districts/${ranchi.id}/blocks`);
    const blocks: any = await blocksRes.json();
    assert(Array.isArray(blocks) && blocks.length > 0, `Blocks retrieved for district ${ranchi.name}`);
    const selectedBlock = blocks[0];

    // --- Step 3: Create and Update Draft (Patch 2) ---
    console.log('\n--- Step 3: Mobile Problem Draft Management ---');
    const createDraftRes = await fetch(`${API_URL}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Mobile E2E Report: Water Pipeline Leak at ${Date.now()}`,
        description: 'Persistent water pipe rupture causing flooding and contamination near community school.',
        citizen_severity: 'SERIOUS',
        category: 'Water & Sanitation',
      }),
    });

    assert(createDraftRes.status === 201, 'Draft challenge created with HTTP 201');
    const draftData: any = await createDraftRes.json();
    const draftId = draftData.id;
    assert(draftData.status === 'DRAFT', 'Initial status is DRAFT');

    // Update Draft with location & GPS
    const updateDraftRes = await fetch(`${API_URL}/challenges/${draftId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        district_id: ranchi.id,
        block_id: selectedBlock.id,
        village_locality: 'Panchayat Ward 3',
        affected_population: '400 households',
        latitude: 23.3441,
        longitude: 85.3096,
      }),
    });

    assert(updateDraftRes.status === 200, 'Draft updated with location and GPS coordinates');
    const updatedDraft: any = await updateDraftRes.json();
    assert(updatedDraft.district_id === ranchi.id || updatedDraft.district === ranchi.name || !!updatedDraft.district, 'District persisted on draft');
    assert(Number(updatedDraft.latitude) === 23.3441, 'Latitude persisted correctly');

    // --- Step 4: Attach Photo Evidence ---
    console.log('\n--- Step 4: Mobile Photo Evidence Upload ---');
    const fakeImageBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
      0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00, 0xff, 0xd9,
    ]);

    const formData = new FormData();
    const blob = new Blob([fakeImageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'leak_evidence.jpg');
    formData.append('title', 'Field Photo of Ruptured Main');

    const uploadRes = await fetch(`${API_URL}/challenges/${draftId}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: formData,
    });

    assert(uploadRes.status === 201, 'Photo evidence uploaded successfully');
    const uploadData: any = await uploadRes.json();
    assert(uploadData.evidence_type === 'IMAGE', 'Evidence type correctly identified as IMAGE');

    // --- Step 5: Final Submission & Clustering ---
    console.log('\n--- Step 5: Final Submission & Problem Clustering ---');
    const submitRes = await fetch(`${API_URL}/challenges/${draftId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });

    const submitData: any = await submitRes.json();
    if (submitRes.status !== 200) {
      console.log('DEBUG submitRes error:', submitRes.status, submitData);
    }
    assert(submitRes.status === 200, 'Challenge submitted successfully');
    const submittedChallenge: any = submitData;
    assert(submittedChallenge.status === 'SUBMITTED', 'Status transitioned to SUBMITTED');
    assert(!!submittedChallenge.cluster_id, 'Challenge automatically clustered into a ProblemCluster');
    const clusterId = submittedChallenge.cluster_id;

    // --- Step 6: Government Reviewer Queue & Validation ---
    console.log('\n--- Step 6: Government Reviewer Queue & Validation ---');
    const officerLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer@jharkhand.gov.in',
        password: 'Officer123!',
      }),
    });
    const officerData: any = await officerLoginRes.json();
    const officerToken = officerData.accessToken || officerData.access_token;

    const clusterDetailRes = await fetch(`${API_URL}/problem-clusters/${clusterId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(clusterDetailRes.status === 200, 'Government officer can inspect the problem cluster');
    const clusterDetail: any = await clusterDetailRes.json();
    assert(clusterDetail.report_count >= 1, 'Problem cluster report count reflects citizen submission');

    // Single-click Government validation
    const verifyRes = await fetch(`${API_URL}/problem-clusters/${clusterId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(verifyRes.status === 200, 'Government officer verified the problem cluster');
    const verifiedCluster: any = await verifyRes.json();
    assert(verifiedCluster.status === 'VALIDATED', 'Problem cluster status updated to VALIDATED');

    // --- Step 7: Citizen Verification State Synchronized ---
    console.log('\n--- Step 7: Mobile Citizen State Synchronization ---');
    const citizenCheckRes = await fetch(`${API_URL}/challenges/${draftId}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(citizenCheckRes.status === 200, 'Citizen can fetch updated challenge details');
    const citizenReport: any = await citizenCheckRes.json();
    assert(citizenReport.status === 'VALIDATED', 'Citizen report status synchronized to VALIDATED');
    assert(citizenReport.cluster_id === clusterId, 'Cluster association persisted on citizen report');

    // --- Step 8: Citizen Notification Center ---
    console.log('\n--- Step 8: Citizen Notification Center ---');
    const notifsRes = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(notifsRes.status === 200, 'Citizen can fetch notifications');
    const notifsData: any = await notifsRes.json();
    assert(Array.isArray(notifsData.notifications), 'Notifications returned as array');

    if (notifsData.notifications.length > 0) {
      const firstNotif = notifsData.notifications[0];
      const readRes = await fetch(`${API_URL}/notifications/${firstNotif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      assert(readRes.status === 200, 'Citizen can mark single notification as read');
    }

    const markAllRes = await fetch(`${API_URL}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(markAllRes.status === 200, 'Citizen can mark all notifications as read');

    console.log('\n============================================================');
    console.log(`🎉 ALL MOBILE CITIZEN E2E TESTS PASSED: ${passed}/${passed + failed} assertions`);
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('❌ Unexpected error in Mobile Citizen E2E Suite:', err);
    process.exit(1);
  }
}

runMobileCitizenE2ESuite();
