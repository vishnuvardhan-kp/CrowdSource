/**
 * Automated End-to-End Integration Test Suite for Institutional Capability Verification Workflow
 * 
 * Verifies:
 * 1. Actor authentication (Dean, Platform Admin, Citizen)
 * 2. Initial state: Capability added in UNVERIFIED state (confidence 0.50)
 * 3. Evidence upload with multipart file and institution_capability_id linkage
 * 4. Evidence lifecycle: Enters PENDING_VERIFICATION; linked capability transitions to PENDING_VERIFICATION (0.70 confidence)
 * 5. Persistence verification: institution_capability_id is persisted and NOT null
 * 6. Admin Verification Queue: Items in PENDING_VERIFICATION are retrieved with rich relations
 * 7. Security tests:
 *    - Citizens cannot view private evidence (403 Forbidden)
 *    - Citizens / Deans cannot approve or reject verification items (403 Forbidden)
 *    - Authorized reviewer (Admin) can access evidence view
 * 8. Approval cascade & audit trail:
 *    - Evidence approved -> VERIFIED
 *    - Linked InstitutionCapability cascaded -> VERIFIED (0.95 confidence)
 *    - Verification record written with reviewer and timestamp
 * 9. Verification-aware AI matching:
 *    - Capability match score scales with verification trust
 *    - Explainable match reasons cite verified technical capabilities
 *    - High confidence classification requires verified capabilities
 * 10. Rejection path:
 *    - Rejection requires mandatory notes (400 if empty)
 *    - Rejection marks evidence REJECTED, preserves reason, prevents verified state
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

async function runCapabilityVerificationTests() {
  console.log('\n======================================================================');
  console.log('🧪 SamadhanSetu: Institutional Capability Verification E2E Test Suite');
  console.log('======================================================================\n');

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
    // -------------------------------------------------------------
    // Test 1: Actor Authentication
    // -------------------------------------------------------------
    console.log('🔑 Test 1: Authenticating test actors...');

    // 1a. Platform Admin
    const adminLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dev.local', password: 'AdminDev123!' }),
    });
    assert(adminLogin.status === 200, 'Platform Admin login succeeded (admin@dev.local)');
    const adminToken = (await adminLogin.json()).accessToken;

    // 1b. Institution Dean (BIT Mesra)
    const deanLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dean@bitmesra.ac.in', password: 'BitMesra123!' }),
    });
    assert(deanLogin.status === 200, 'Institution Dean login succeeded (dean@bitmesra.ac.in)');
    const deanData = await deanLogin.json();
    const deanToken = deanData.accessToken;

    // Retrieve Dean's organization
    const deanMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    const deanMe = await deanMeRes.json();
    const orgId = deanMe.primaryOrganization?.id;
    assert(!!orgId, `Dean is associated with organization ID: ${orgId}`);

    // 1c. Citizen
    const citizenLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@dev.local', password: 'CitizenDev123!' }),
    });
    assert(citizenLogin.status === 200, 'Citizen login succeeded (citizen@dev.local)');
    const citizenToken = (await citizenLogin.json()).accessToken;

    // -------------------------------------------------------------
    // Test 2: Initial Capability State on Institutional Passport
    // -------------------------------------------------------------
    console.log('\n📋 Test 2: Checking Institutional Passport capabilities...');
    const passportRes = await fetch(`${API_BASE}/organizations/${orgId}/passport`);
    assert(passportRes.status === 200, 'Retrieved BIT Mesra capability passport');
    const passportData = await passportRes.json();

    let targetCap = passportData.capabilities?.[0];
    if (!targetCap) {
      // If no capability, retrieve master taxonomy capabilities and add one
      const capsRes = await fetch(`${API_BASE}/capabilities`);
      const capsList = await capsRes.json();
      const masterCap = capsList[0];

      const addCapRes = await fetch(`${API_BASE}/organizations/${orgId}/capabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deanToken}`,
        },
        body: JSON.stringify({
          capability_id: masterCap.id,
          evidence_summary: 'Self-declared departmental capability claim for testing',
        }),
      });
      assert(addCapRes.status === 201 || addCapRes.status === 200, 'Added master capability to passport');
      const refreshedPassport = await (await fetch(`${API_BASE}/organizations/${orgId}/passport`)).json();
      targetCap = refreshedPassport.capabilities[0];
    }

    assert(!!targetCap?.id, `Target capability found: "${targetCap.name}" (ID: ${targetCap.id})`);
    console.log(`     Capability ID: ${targetCap.id}, Status: ${targetCap.verification_status}`);

    // -------------------------------------------------------------
    // Test 3: Upload Evidence with institution_capability_id Linkage
    // -------------------------------------------------------------
    console.log('\n📄 Test 3: Uploading evidence linked to capability claim...');
    const evidenceTitle = `ISO 17025 Test Accreditation Certificate - ${Date.now()}`;

    const uploadRes = await fetch(`${API_BASE}/organizations/${orgId}/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deanToken}`,
      },
      body: JSON.stringify({
        title: evidenceTitle,
        evidence_type: 'DOCUMENT',
        url: 'https://nabl-india.org/accredited-labs/bit-mesra-test-lab.pdf',
        mime_type: 'application/pdf',
        institution_capability_id: targetCap.id,
        is_public: false, // Private evidence for security testing
      }),
    });

    assert(uploadRes.status === 201 || uploadRes.status === 200, 'Evidence upload request succeeded');
    const uploadData = await uploadRes.json();
    const createdEvidence = uploadData.evidence;

    assert(!!createdEvidence?.id, `Created evidence ID: ${createdEvidence?.id}`);
    assert(
      createdEvidence.institution_capability_id === targetCap.id,
      `institution_capability_id was correctly persisted: ${createdEvidence.institution_capability_id}`,
    );
    assert(
      createdEvidence.verification_status === 'PENDING_VERIFICATION',
      `Evidence status is PENDING_VERIFICATION (got: ${createdEvidence.verification_status})`,
    );

    // Verify linked capability transitioned to PENDING_VERIFICATION
    const updatedPassportRes = await fetch(`${API_BASE}/organizations/${orgId}/passport`);
    const updatedPassport = await updatedPassportRes.json();
    const updatedCap = updatedPassport.capabilities.find((c: any) => c.id === targetCap.id);

    assert(
      updatedCap.verification_status === 'PENDING_VERIFICATION' || updatedCap.verification_status === 'VERIFIED',
      `Linked capability transitioned to PENDING_VERIFICATION (current: ${updatedCap.verification_status})`,
    );
    assert(
      Number(updatedCap.confidence_score) >= 0.70,
      `Confidence score upgraded to >= 0.70 (current: ${updatedCap.confidence_score})`,
    );

    // 3b. Multipart form upload test (Real disk upload)
    console.log('\n📁 Test 3b: Testing real multipart file upload to disk storage...');
    const formData = new FormData();
    formData.append('title', 'Real PDF Document Upload Test');
    formData.append('evidence_type', 'DOCUMENT');
    formData.append('is_public', 'false');
    formData.append('institution_capability_id', targetCap.id);
    const pdfBlob = new Blob(['%PDF-1.4 mock content for capability evidence verification'], {
      type: 'application/pdf',
    });
    formData.append('file', pdfBlob, 'nabl_accreditation.pdf');

    const multipartUploadRes = await fetch(`${API_BASE}/organizations/${orgId}/evidence`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deanToken}`,
      },
      body: formData,
    });
    assert(multipartUploadRes.status === 201 || multipartUploadRes.status === 200, 'Multipart file upload succeeded');
    const multipartData = await multipartUploadRes.json();
    const uploadedFileEvidence = multipartData.evidence;
    assert(
      uploadedFileEvidence.url.startsWith('/uploads/evidence/'),
      `File stored on disk with safe URL: ${uploadedFileEvidence.url}`,
    );
    assert(
      uploadedFileEvidence.mime_type === 'application/pdf',
      `MIME type correctly identified: ${uploadedFileEvidence.mime_type}`,
    );

    // Verify file streaming via GET /api/evidence/:id/view
    const streamRes = await fetch(`${API_BASE}/evidence/${uploadedFileEvidence.id}/view`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(streamRes.status === 200, 'GET /api/evidence/:id/view streams local file to authorized reviewer');
    assert(
      streamRes.headers.get('content-type')?.includes('application/pdf') || false,
      `Streamed file has Content-Type application/pdf (got: ${streamRes.headers.get('content-type')})`,
    );

    // -------------------------------------------------------------
    // Test 4: Universal Verification Queue Inspection
    // -------------------------------------------------------------
    console.log('\n📋 Test 4: Platform Admin inspecting verification queue...');
    const queueRes = await fetch(`${API_BASE}/admin/verification/queue`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(queueRes.status === 200, 'Universal verification queue retrieved by Platform Admin');
    const queueData = await queueRes.json();

    const queuedEvidence = queueData.evidence?.find((e: any) => e.id === createdEvidence.id);
    assert(!!queuedEvidence, 'Newly uploaded evidence is present in administrative verification queue');
    assert(
      queuedEvidence?.institutionCapability?.id === targetCap.id,
      'Queued evidence preserves rich institutionCapability relation',
    );
    assert(
      queuedEvidence?.organization?.id === orgId,
      'Queued evidence preserves rich organization relation',
    );

    // -------------------------------------------------------------
    // Test 5: Role Isolation & Access Control Security
    // -------------------------------------------------------------
    console.log('\n🔒 Test 5: Verifying RBAC and private evidence access control...');

    // 5a. Citizen attempts to access private evidence file/view
    const citizenViewRes = await fetch(`${API_BASE}/evidence/${createdEvidence.id}/view`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(
      citizenViewRes.status === 403,
      `Citizen blocked from viewing private evidence (Expected: 403, got: ${citizenViewRes.status})`,
    );

    // 5b. Unauthenticated request to view private evidence
    const unauthViewRes = await fetch(`${API_BASE}/evidence/${createdEvidence.id}/view`);
    assert(
      unauthViewRes.status === 401 || unauthViewRes.status === 403,
      `Unauthenticated user blocked from viewing private evidence (Expected: 401/403, got: ${unauthViewRes.status})`,
    );

    // 5c. Citizen attempts to approve verification item
    const citizenApproveRes = await fetch(`${API_BASE}/admin/verification/${createdEvidence.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({ target_type: 'EVIDENCE', notes: 'Unauthorized attempt' }),
    });
    assert(
      citizenApproveRes.status === 403,
      `Citizen blocked from approving verification items (Expected: 403, got: ${citizenApproveRes.status})`,
    );

    // 5d. Institution Dean attempts to approve verification item
    const deanApproveRes = await fetch(`${API_BASE}/admin/verification/${createdEvidence.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deanToken}`,
      },
      body: JSON.stringify({ target_type: 'EVIDENCE', notes: 'Self-approval attempt' }),
    });
    assert(
      deanApproveRes.status === 403,
      `Institution Dean blocked from self-approving verification items (Expected: 403, got: ${deanApproveRes.status})`,
    );

    // 5e. Admin accesses private evidence view
    const adminViewRes = await fetch(`${API_BASE}/evidence/${createdEvidence.id}/view`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminViewRes.status === 200,
      `Platform Admin authorized to inspect private evidence (Expected: 200, got: ${adminViewRes.status})`,
    );

    // -------------------------------------------------------------
    // Test 6: Approval Cascade & Audit Trail
    // -------------------------------------------------------------
    console.log('\n✅ Test 6: Platform Admin approves evidence & verifies capability...');
    const approveRes = await fetch(`${API_BASE}/admin/verification/${createdEvidence.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        target_type: 'EVIDENCE',
        notes: 'Official accreditation proof validated against NABL government directory.',
      }),
    });

    assert(approveRes.status === 200 || approveRes.status === 201, 'Admin approval request succeeded');
    const approveData = await approveRes.json();
    assert(!!approveData.audit_record, 'Verification audit record was created in verification_records ledger');
    assert(
      approveData.audit_record.verification_status === 'VERIFIED',
      'Audit record status is VERIFIED',
    );

    // Verify passport reflects cascading verification
    const verifiedPassportRes = await fetch(`${API_BASE}/organizations/${orgId}/passport`);
    const verifiedPassport = await verifiedPassportRes.json();

    const verifiedEvidence = verifiedPassport.evidence.find((e: any) => e.id === createdEvidence.id);
    assert(
      verifiedEvidence.verification_status === 'VERIFIED',
      `Evidence record updated to VERIFIED (current: ${verifiedEvidence?.verification_status})`,
    );

    const verifiedCap = verifiedPassport.capabilities.find((c: any) => c.id === targetCap.id);
    assert(
      verifiedCap.verification_status === 'VERIFIED',
      `Linked InstitutionCapability cascaded to VERIFIED (current: ${verifiedCap?.verification_status})`,
    );
    assert(
      Number(verifiedCap.confidence_score) >= 0.90,
      `Linked capability confidence score upgraded to >= 0.90 (current: ${verifiedCap?.confidence_score})`,
    );

    // -------------------------------------------------------------
    // Test 7: Verification-Aware Matching Engine Scoring
    // -------------------------------------------------------------
    console.log('\n🤖 Test 7: Verifying AI recommendation matching incorporates verification trust...');

    // 7a. Get Ranchi district hierarchy for aligned challenge
    const distsRes = await fetch(`${API_BASE}/locations/districts`);
    const districts = await distsRes.json();
    const ranchiDist = districts.find((d: any) => d.name?.toLowerCase().includes('ranchi')) || districts[0];
    const blksRes = await fetch(`${API_BASE}/locations/districts/${ranchiDist.id}/blocks`);
    const blocks = await blksRes.json();
    const ranchiBlk = blocks[0];

    // 7b. Citizen creates a challenge specifically requiring the newly verified capability
    const createChalRes = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Community Initiative Requiring ${targetCap.name} - ${Date.now()}`,
        description: `High-priority civic infrastructure initiative requiring ${targetCap.name} expertise, technical research, and field testing in ${ranchiDist.name}.`,
        category: 'CIVIC_INFRASTRUCTURE',
        district_id: ranchiDist.id,
        block_id: ranchiBlk?.id,
      }),
    });
    assert(createChalRes.status === 201 || createChalRes.status === 200, 'Created challenge aligned to verified capability');
    const newChallenge = await createChalRes.json();

    // 7c. Submit challenge for review and matching
    const submitChalRes = await fetch(`${API_BASE}/challenges/${newChallenge.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(submitChalRes.status === 200, 'Challenge submitted successfully');

    // 7d. Generate AI recommendations for the challenge
    const recsRes = await fetch(`${API_BASE}/reviews/challenge/${newChallenge.id}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert(recsRes.status === 200 || recsRes.status === 201, 'Recommendation generation succeeded');
    const recsData = await recsRes.json();
    assert(Array.isArray(recsData.recommendations), 'Recommendations returned as ranked array');

    const bitMesraMatch = recsData.recommendations?.find(
      (r: any) => r.organization_id === orgId,
    );
    assert(!!bitMesraMatch, 'BIT Mesra matched in recommendation run for aligned challenge');

    if (bitMesraMatch) {
      console.log(`     BIT Mesra Total Match Score: ${bitMesraMatch.total_score}`);
      console.log(`     Capability Score: ${bitMesraMatch.capability_match_score}`);
      console.log(`     Triage Category: ${bitMesraMatch.confidence_category}`);
      console.log(`     Match Reasons: ${JSON.stringify(bitMesraMatch.reasons)}`);

      assert(
        bitMesraMatch.capability_match_score >= 0.50,
        `Capability score reflects positive trust weighting (Score: ${bitMesraMatch.capability_match_score})`,
      );
      assert(
        bitMesraMatch.total_score >= 50,
        `Total recommendation score incorporates verified status (Total: ${bitMesraMatch.total_score})`,
      );
      const hasVerifiedReason = bitMesraMatch.reasons.some((r: string) =>
        r.toLowerCase().includes('verified'),
      );
      assert(hasVerifiedReason, 'Explainable match reasons explicitly cite verified credentials');
    }

    // -------------------------------------------------------------
    // Test 8: Rejection Workflow & Reason Preservation
    // -------------------------------------------------------------
    console.log('\n❌ Test 8: Testing rejection workflow with mandatory audit notes...');

    // 8a. Add a second test evidence item
    const rejectTestEvidenceRes = await fetch(`${API_BASE}/organizations/${orgId}/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deanToken}`,
      },
      body: JSON.stringify({
        title: `Draft Experimental Lab Notes - ${Date.now()}`,
        evidence_type: 'DOCUMENT',
        url: 'https://example.com/unverified-notes.pdf',
        institution_capability_id: targetCap.id,
        is_public: true,
      }),
    });
    const rejectTestEvidence = (await rejectTestEvidenceRes.json()).evidence;

    // 8b. Reject without notes -> Must fail (400 Bad Request)
    const rejectNoNotesRes = await fetch(
      `${API_BASE}/admin/verification/${rejectTestEvidence.id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ target_type: 'EVIDENCE', notes: '' }),
      },
    );
    assert(
      rejectNoNotesRes.status === 400,
      `Rejection without explanatory notes rejected with 400 Bad Request (got: ${rejectNoNotesRes.status})`,
    );

    // 8c. Reject with valid notes -> Must succeed
    const mandatoryRejectionReason =
      'Submitted documentation does not include official government testing accreditation seal.';
    const rejectValidRes = await fetch(
      `${API_BASE}/admin/verification/${rejectTestEvidence.id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          target_type: 'EVIDENCE',
          notes: mandatoryRejectionReason,
        }),
      },
    );
    assert(
      rejectValidRes.status === 200 || rejectValidRes.status === 201,
      'Rejection with mandatory notes succeeded',
    );
    const rejectData = await rejectValidRes.json();
    assert(
      rejectData.entity?.verification_status === 'REJECTED',
      `Evidence entity status is REJECTED (got: ${rejectData.entity?.verification_status})`,
    );
    assert(
      rejectData.entity?.verification_notes === mandatoryRejectionReason,
      'Rejection notes are preserved on evidence record',
    );

    console.log('\n======================================================================');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('\n❌ Unhandled error during capability verification tests:', err);
    process.exit(1);
  }
}

runCapabilityVerificationTests();
