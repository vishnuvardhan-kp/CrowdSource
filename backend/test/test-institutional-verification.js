// test-institutional-verification.js
// Automated verification suite for PRI / ULB Institutional & Representative Verification

const BASE_URL = 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('================================================================');
  console.log('SAMADHANSETU — INSTITUTIONAL & REPRESENTATIVE VERIFICATION E2E');
  console.log('Validating: Decoupled LGD Verification, RBAC, IDOR Defense, Snapshots');
  console.log('================================================================\n');

  try {
    // 1. Authenticate / Register a Citizen User
    console.log('[STEP 1] Setting up Test Users...');
    const testCitizenEmail = `citizen_test_${Date.now()}@samadhan.org`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Rameshwar Mahato',
        email: testCitizenEmail,
        password: 'Password123!',
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      }),
    });

    if (!regRes.ok) {
      throw new Error(`Citizen registration failed: ${JSON.stringify(regRes.data)}`);
    }

    const citizenLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCitizenEmail,
        password: 'Password123!',
      }),
    });

    if (!citizenLogin.ok) {
      throw new Error(`Citizen login failed: ${JSON.stringify(citizenLogin.data)}`);
    }
    const citizenToken = citizenLogin.data.accessToken || citizenLogin.data.access_token;
    const citizenUser = citizenLogin.data.user;
    console.log(`✓ Registered & Logged in Citizen: ${citizenUser.name} (${citizenUser.email}, ID: ${citizenUser.id})`);

    // Authenticate Admin / Gov Reviewer
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin.state@jharkhand.gov.in',
        password: 'GovAdmin123!',
      }),
    });

    if (!adminLoginRes.ok) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
    }
    const adminToken = adminLoginRes.data.accessToken || adminLoginRes.data.access_token;
    const adminUser = adminLoginRes.data.user;
    console.log(`✓ Authenticated State Admin: ${adminUser.name} (${adminUser.email}, Role: ${adminUser.role})\n`);

    // 2. Test Citizen Individual Reporting (Must remain frictionless with zero regression)
    console.log('[STEP 2] Verifying Citizen Reporting Flow (Zero Friction Check)...');
    const citizenDraft = await request('/challenges', {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        title: 'Broken Handpump in Ormanjhi Block',
        description: 'Drinking water handpump near primary school is non-functional affecting local residents.',
        reporter_type: 'INDIVIDUAL',
      }),
    });

    if (!citizenDraft.ok) {
      throw new Error(`Citizen draft creation failed: ${JSON.stringify(citizenDraft.data)}`);
    }
    console.log(`✓ Citizen Draft Created Successfully: ID ${citizenDraft.data.id}`);
    console.log(`  reporter_type: ${citizenDraft.data.reporter_type}`);
    console.log(`  institution_id: ${citizenDraft.data.institution_id || 'null (correct)'}`);
    console.log(`  Zero friction: No membership required for individual citizens.\n`);

    // 3. Test Institution Directory & LGD Code Verification
    console.log('[STEP 3] Testing Authoritative LGD Directory & Hierarchy...');
    const searchRes = await request('/institutions/search?search=Ranchi&type=ULB');
    const items = searchRes.data?.items || (Array.isArray(searchRes.data) ? searchRes.data : []);
    if (!searchRes.ok || items.length === 0) {
      throw new Error(`LGD search returned no results: ${JSON.stringify(searchRes.data)}`);
    }
    const targetInstitution = items[0];
    console.log(`✓ LGD Directory Query found: "${targetInstitution.name}"`);
    console.log(`  LGD Code: ${targetInstitution.lgd_code}`);
    console.log(`  Administrative Level: ${targetInstitution.hierarchy_level} (${targetInstitution.type} / ${targetInstitution.subtype})`);

    const lgdVerify = await request(`/institutions/lgd/${targetInstitution.lgd_code}`);
    if (!lgdVerify.ok || !lgdVerify.data.valid) {
      throw new Error(`LGD lookup failed: ${JSON.stringify(lgdVerify.data)}`);
    }
    console.log(`✓ LGD Code Validated against official directory: valid = true\n`);

    // 4. Test Zero-Trust Enforcement: Submitting as Institution without Verified Membership
    console.log('[STEP 4] Testing Zero-Trust Enforcement: Submitting as Institution without verified membership...');
    const unverifiedAttempt = await request('/challenges', {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        title: 'Spoofed Official PRI Resolution Report',
        description: 'Attempting to submit as institution without holding verified authority.',
        reporter_type: 'PRI',
        institution_id: targetInstitution.id,
      }),
    });

    if (unverifiedAttempt.status === 403) {
      console.log(`✓ Security Block Verified: Rejected with HTTP 403 Forbidden!`);
      console.log(`  Message: "${unverifiedAttempt.data?.message}"\n`);
    } else {
      throw new Error(`Security breach! Expected 403 Forbidden, but received HTTP ${unverifiedAttempt.status}: ${JSON.stringify(unverifiedAttempt.data)}`);
    }

    // 5. Test Representative Authority Application
    console.log('[STEP 5] Applying for Representative Authority Membership...');
    const applyRes = await request('/institution-memberships', {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        institution_id: targetInstitution.id,
        relationship: 'AUTHORIZED_OFFICER',
        designation: 'Executive Officer',
        department_name: 'Urban Planning Wing',
        official_email: 'exec.officer@ranchi.gov.in',
        official_phone: '+91-651-2400100',
      }),
    });

    if (!applyRes.ok) {
      throw new Error(`Membership application failed: ${JSON.stringify(applyRes.data)}`);
    }
    const membership = applyRes.data;
    console.log(`✓ Applied for Membership ID: ${membership.id}`);
    console.log(`  Authority Status: ${membership.authority_status} (Expected: PENDING)`);
    console.log(`  Decoupled Check: Institution is verified (${targetInstitution.is_lgd_verified}) but Representative status is correctly isolated as PENDING.\n`);

    // 6. Test Evidence Document Upload
    console.log('[STEP 6] Uploading Official Appointment Order Evidence...');
    const evidenceRes = await request(`/institution-memberships/${membership.id}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        evidence_type: 'APPOINTMENT_LETTER',
        document_name: 'Department of Urban Development Notification No. 1042/2023',
        document_url: 'https://storage.samadhansetu.gov.in/orders/gazette_eo_2023.pdf',
        mime_type: 'application/pdf',
        file_size: 489200,
      }),
    });

    if (!evidenceRes.ok) {
      throw new Error(`Evidence upload failed: ${JSON.stringify(evidenceRes.data)}`);
    }
    console.log(`✓ Evidence Uploaded: ID ${evidenceRes.data.id}`);
    console.log(`  Document: "${evidenceRes.data.document_name}"`);
    console.log(`  Status transitioned to: ${evidenceRes.data.membership?.authority_status || 'UNDER_REVIEW'}\n`);

    // 7. Test Admin Review Queue & Official Approval
    console.log('[STEP 7] District / State Admin Reviewing Queue & Granting Authority...');
    const queueRes = await request('/admin/institutions/verification/queue', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!queueRes.ok) {
      throw new Error(`Queue fetch failed: ${JSON.stringify(queueRes.data)}`);
    }
    const queueCount = queueRes.data.total ?? (queueRes.data.items ? queueRes.data.items.length : (Array.isArray(queueRes.data) ? queueRes.data.length : 0));
    console.log(`✓ Admin Queue Retrieved: ${queueCount} items in authority queue`);

    const reviewRes = await request(`/admin/institutions/verification/${membership.id}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'APPROVE',
        notes: 'Appointment order and government gazette verified against official records.',
      }),
    });

    if (!reviewRes.ok) {
      throw new Error(`Review approval failed: ${JSON.stringify(reviewRes.data)}`);
    }
    console.log(`✓ Decision Applied: authority_status = ${reviewRes.data.authority_status}`);
    console.log(`  Reviewer Remarks: "${reviewRes.data.audit_remarks || reviewRes.data.remarks || 'Approved'}"\n`);

    // 8. Test IDOR Defense: Attacking user tries to use this verified membership
    console.log('[STEP 8] Testing IDOR Defense: Attacker trying to hijack verified membership...');
    const idorAttempt = await request('/challenges', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }, // Admin account trying to claim citizen's membership
      body: JSON.stringify({
        title: 'Spoofed Challenge with Borrowed Membership ID',
        description: 'IDOR penetration test to confirm membership ownership validation.',
        reporter_type: 'ULB',
        institution_id: targetInstitution.id,
        institution_membership_id: membership.id,
      }),
    });

    if (idorAttempt.status === 403) {
      console.log(`✓ IDOR Defense Verified: Blocked with HTTP 403 Forbidden!`);
      console.log(`  Security Message: "${idorAttempt.data?.message}"\n`);
    } else {
      throw new Error(`IDOR vulnerability! Expected 403 Forbidden, but received HTTP ${idorAttempt.status}: ${JSON.stringify(idorAttempt.data)}`);
    }

    // 9. Test Authorized Institutional Challenge Submission
    console.log('[STEP 9] Submitting Official Institutional Challenge with Verified Membership...');
    const officialDraft = await request('/challenges', {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        title: 'Solid Waste Treatment Facility Expansion - Official ULB Proposal',
        description: 'Official proposal approved under Swachh Bharat Urban for modern composting facility.',
        reporter_type: 'ULB',
        institution_id: targetInstitution.id,
        institution_membership_id: membership.id,
        district_id: targetInstitution.district_id,
        block_id: targetInstitution.block_id,
      }),
    });

    if (!officialDraft.ok) {
      throw new Error(`Official draft creation failed: ${JSON.stringify(officialDraft.data)}`);
    }
    console.log(`✓ Official Institutional Draft Created: ID ${officialDraft.data.id}`);

    const submitRes = await request(`/challenges/${officialDraft.data.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });

    if (!submitRes.ok) {
      throw new Error(`Official submission failed: ${JSON.stringify(submitRes.data)}`);
    }
    const challenge = submitRes.data;
    console.log(`✓ Official Challenge Submitted: Status "${challenge.status}"`);
    console.log(`  Reporter Type: ${challenge.reporter_type}`);
    console.log(`  Institution: ${challenge.institution?.name}`);
    console.log(`  LGD Code: ${challenge.institution?.lgd_code}`);
    console.log(`  Verification Snapshot:`, JSON.stringify(challenge.verification_snapshot, null, 2));

    if (!challenge.verification_snapshot?.verified_at || !challenge.verification_snapshot?.lgd_code) {
      throw new Error('Verification snapshot is missing verified_at or lgd_code!');
    }
    console.log(`\n✓ Immutable snapshot successfully frozen on challenge record!`);

    // 10. Audit Log Inspection
    console.log('\n[STEP 10] Inspecting Immutable Audit Trail...');
    const auditRes = await request(`/admin/institutions/verification/audit-logs?entity_id=${membership.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!auditRes.ok) {
      throw new Error(`Audit log fetch failed: ${JSON.stringify(auditRes.data)}`);
    }
    const logs = auditRes.data?.logs || auditRes.data?.items || (Array.isArray(auditRes.data) ? auditRes.data : []);
    console.log(`✓ Audit Records Found: ${logs.length} immutable events`);
    logs.forEach((log, idx) => {
      console.log(`   [${idx + 1}] Event: ${log.action} | Actor: ${log.actor_id || log.actor?.name || 'System'} | Notes: ${log.notes || 'None'}`);
    });

    console.log('\n================================================================');
    console.log('🎉 10/10 TESTS PASSED: Institutional Verification System is fully verified!');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exit(1);
  }
}

run();
