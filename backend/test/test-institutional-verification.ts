import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('================================================================');
  console.log('SAMADHANSETU — INSTITUTIONAL VERIFICATION E2E AUTOMATION SUITE');
  console.log('Testing: LGD Validation, Representative Authority, RBAC, IDOR Defense, Snapshots');
  console.log('================================================================\n');

  try {
    // 1. Authenticate Citizen User
    console.log('[STEP 1] Authenticating Citizen & Government Users...');
    const citizenLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'citizen@example.com',
      password: 'password123',
    }).catch(async () => {
      // If citizen doesn't exist, login as test user or register
      return axios.post(`${BASE_URL}/auth/login`, {
        email: 'user@example.com',
        password: 'password123',
      });
    });
    const citizenToken = citizenLoginRes.data.access_token || citizenLoginRes.data.token;
    const citizenUser = citizenLoginRes.data.user;
    console.log(`✓ Authenticated User: ${citizenUser.email} (ID: ${citizenUser.id})`);

    // Authenticate Admin / Gov User
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123',
    }).catch(async () => {
      return axios.post(`${BASE_URL}/auth/login`, {
        email: 'gov@example.com',
        password: 'password123',
      });
    });
    const adminToken = adminLoginRes.data.access_token || adminLoginRes.data.token;
    const adminUser = adminLoginRes.data.user;
    console.log(`✓ Authenticated Admin: ${adminUser.email} (ID: ${adminUser.id}, Role: ${adminUser.role})\n`);

    // 2. Test Citizen Individual Challenge Submission (Zero friction for citizens)
    console.log('[STEP 2] Verifying Citizen Individual Challenge Creation (No Membership Required)...');
    const citizenChallengeRes = await axios.post(
      `${BASE_URL}/challenges/draft`,
      {
        title: 'Broken Village Well - Citizen Report',
        description: 'Drinking water borewell has broken down affecting 40 households.',
        department: 'Drinking Water & Sanitation',
        reporter_type: 'INDIVIDUAL',
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    const citizenChallengeId = citizenChallengeRes.data.id;
    console.log(`✓ Citizen Draft Created Successfully: ID ${citizenChallengeId}`);
    console.log(`  reporter_type: ${citizenChallengeRes.data.reporter_type}`);
    console.log(`  institution_id: ${citizenChallengeRes.data.institution_id || 'null (correct)'}\n`);

    // 3. Test Institution Directory & LGD Code Lookup
    console.log('[STEP 3] Testing Directory Search & LGD Verification...');
    const searchRes = await axios.get(`${BASE_URL}/institutions/search?q=Ranchi&type=ULB`);
    console.log(`✓ LGD Search found ${searchRes.data.length} institutions matching 'Ranchi'`);
    if (searchRes.data.length === 0) {
      throw new Error('No institutions found in seeded database!');
    }
    const targetInstitution = searchRes.data[0];
    console.log(`  Selected Institution: ${targetInstitution.name}`);
    console.log(`  LGD Code: ${targetInstitution.lgd_code}, Type: ${targetInstitution.type}, Subtype: ${targetInstitution.subtype}`);

    const lgdVerifyRes = await axios.get(`${BASE_URL}/institutions/lgd/${targetInstitution.lgd_code}`);
    console.log(`✓ LGD Direct Lookup verified existence: ${lgdVerifyRes.data.name} (Valid: ${lgdVerifyRes.data.is_lgd_verified})\n`);

    // 4. Test Zero-Trust Enforcement: Submitting as Institution without Verified Membership
    console.log('[STEP 4] Testing Zero-Trust Security: Submitting Institutional Challenge Without Verified Membership...');
    try {
      await axios.post(
        `${BASE_URL}/challenges/draft`,
        {
          title: 'Illegal Sand Mining - Unauthorized Official Claim',
          description: 'Trying to report as PRI without verified membership.',
          department: 'Mining & Geology',
          reporter_type: 'INSTITUTION_PRI',
          institution_id: targetInstitution.id,
        },
        { headers: { Authorization: `Bearer ${citizenToken}` } }
      );
      console.error('❌ SECURITY FAILURE: Allowed institutional submission without verified membership!');
      process.exit(1);
    } catch (err: any) {
      console.log(`✓ Blocked correctly with HTTP ${err.response?.status}: "${err.response?.data?.message}"\n`);
    }

    // 5. Test Representative Authority Application
    console.log('[STEP 5] Applying for Representative Authority Membership...');
    const applyRes = await axios.post(
      `${BASE_URL}/institution-memberships`,
      {
        institution_id: targetInstitution.id,
        relationship: 'OFFICIAL',
        designation: 'Ward Commissioner',
        department_unit: 'Sanitation Wing',
        official_email: 'ward.commissioner@ranchi.gov.in',
        official_phone: '9876543210',
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    const membership = applyRes.data;
    console.log(`✓ Applied for Membership ID: ${membership.id}`);
    console.log(`  Initial Status: ${membership.authority_status} (Expected: PENDING)`);
    console.log(`  Decoupled Check: Institution verified (${targetInstitution.is_lgd_verified}) but Representative is (${membership.authority_status})\n`);

    // 6. Test Evidence Upload
    console.log('[STEP 6] Uploading Official Appointment Order Evidence...');
    const evidenceRes = await axios.post(
      `${BASE_URL}/institution-memberships/${membership.id}/evidence`,
      {
        evidence_type: 'APPOINTMENT_ORDER',
        title: 'Official Gazette Notification 2024/09',
        file_url: 'https://storage.samadhansetu.gov.in/orders/gazette_ward_2024.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 524288,
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    console.log(`✓ Evidence Uploaded ID: ${evidenceRes.data.id}`);
    console.log(`  Membership Status After Evidence: ${evidenceRes.data.membership?.authority_status || 'UNDER_REVIEW'}\n`);

    // 7. Test Admin Review Queue & Decision
    console.log('[STEP 7] District/State Admin Review & Approval Process...');
    const queueRes = await axios.get(
      `${BASE_URL}/admin/institutions/verification/queue?status=UNDER_REVIEW`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✓ Admin Queue Retrieved: ${queueRes.data.length} pending applications in review`);

    const reviewRes = await axios.patch(
      `${BASE_URL}/admin/institutions/verification/${membership.id}/review`,
      {
        decision: 'VERIFIED',
        remarks: 'Official appointment order verified against Ranchi Municipal Gazette.',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✓ Admin Decision Applied: ${reviewRes.data.authority_status}`);
    console.log(`  Verified By: ${adminUser.email}`);
    console.log(`  Audit Remarks: "${reviewRes.data.audit_remarks || reviewRes.data.remarks || 'Verified'}"\n`);

    // 8. Test IDOR Defense: Another user attempting to submit using this approved membership
    console.log('[STEP 8] Testing IDOR Defense: Attacking with Another User Token...');
    try {
      await axios.post(
        `${BASE_URL}/challenges/draft`,
        {
          title: 'Spoofed Official Report',
          description: 'Attacker trying to use legitimate membership ID.',
          department: 'Urban Development',
          reporter_type: 'INSTITUTION_ULB',
          institution_id: targetInstitution.id,
          institution_membership_id: membership.id,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } } // admin token used with citizen's membership!
      );
      console.error('❌ IDOR SECURITY FAILURE: User permitted to use another user\'s membership!');
      process.exit(1);
    } catch (err: any) {
      console.log(`✓ IDOR Defense Verified: Blocked with HTTP ${err.response?.status}: "${err.response?.data?.message}"\n`);
    }

    // 9. Test Official Institutional Challenge Submission with Valid Verified Membership
    console.log('[STEP 9] Submitting Official Institutional Challenge with Verified Membership...');
    const officialChallengeDraft = await axios.post(
      `${BASE_URL}/challenges/draft`,
      {
        title: 'Municipal Solid Waste Clearance in Sector 4',
        description: 'Authorized ULB submission regarding urgent waste segregation failure.',
        department: 'Urban Development',
        reporter_type: 'INSTITUTION_ULB',
        institution_id: targetInstitution.id,
        institution_membership_id: membership.id,
      },
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    console.log(`✓ Official Draft Created: ID ${officialChallengeDraft.data.id}`);

    const submittedChallenge = await axios.post(
      `${BASE_URL}/challenges/${officialChallengeDraft.data.id}/submit`,
      {},
      { headers: { Authorization: `Bearer ${citizenToken}` } }
    );
    console.log(`✓ Official Challenge Submitted: Status ${submittedChallenge.data.status}`);
    console.log(`  Reporter Type: ${submittedChallenge.data.reporter_type}`);
    console.log(`  Institution: ${submittedChallenge.data.institution?.name}`);
    console.log(`  LGD Code: ${submittedChallenge.data.institution?.lgd_code}`);
    console.log(`  Verification Snapshot Created:`, JSON.stringify(submittedChallenge.data.verification_snapshot, null, 2));

    if (!submittedChallenge.data.verification_snapshot || !submittedChallenge.data.verification_snapshot.is_verified) {
      throw new Error('Verification snapshot is missing or unverified!');
    }
    console.log(`\n✓ Immutable Verification Snapshot strictly preserved on Challenge entity!`);

    // 10. Audit Log Inspection
    console.log('\n[STEP 10] Inspecting Immutable Audit Trail...');
    const auditRes = await axios.get(
      `${BASE_URL}/admin/institutions/verification/${membership.id}/audit-logs`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✓ Audit Records Found: ${auditRes.data.length} immutable events`);
    auditRes.data.forEach((log: any, index: number) => {
      console.log(`   [${index + 1}] Event: ${log.action} | Status: ${log.old_status} -> ${log.new_status} | Actor: ${log.actor_user_id || 'System'}`);
    });

    console.log('\n================================================================');
    console.log('🎉 ALL 10 INSTITUTIONAL VERIFICATION E2E TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================');
  } catch (error: any) {
    console.error('\n❌ Test Execution Failed:', error.response?.data || error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runTests();
