import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole, ChallengeStatus, CitizenSeverity } from '../src/common/enums';
import { DraftCleanupService } from '../src/modules/challenges/services/draft-cleanup.service';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { ChallengeEvidence } from '../src/modules/challenges/entities/challenge-evidence.entity';
import { User } from '../src/modules/users/entities/user.entity';

async function runPhase4Verification() {
  console.log('🚀 Starting SamadhanSetu Phase 4 End-to-End Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  // 1. Initialize Nest test application
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'string' ? 3001 : address.port;
  const baseUrl = `http://localhost:${port}/api`;

  const uniqueSuffix = Date.now();
  const testPassword = 'Password123!';

  const citizen1Email = `citizen1-${uniqueSuffix}@test.local`;
  const citizen2Email = `citizen2-${uniqueSuffix}@test.local`;
  const facultyEmail = `faculty-${uniqueSuffix}@test.local`;
  const govOfficerEmail = `govofficer-${uniqueSuffix}@test.local`;
  const platformAdminEmail = `admin-${uniqueSuffix}@test.local`;

  let citizen1Token = '';
  let citizen1Id = '';
  let citizen2Token = '';
  let citizen2Id = '';
  let facultyToken = '';
  let govOfficerToken = '';
  let platformAdminToken = '';

  let ranchiDistrictId = '';
  let kankeBlockId = '';
  let testChallengeId = '';
  let uploadedEvidenceId = '';
  let uploadedEvidenceFilename = '';

  try {
    // =========================================================================
    // SUITE 1: Master Location Data (Jharkhand Districts & Dependent Blocks)
    // =========================================================================
    console.log('\n📍 Test Suite 1: Controlled Master Location Data');

    const distRes = await fetch(`${baseUrl}/locations/districts`);
    assert(distRes.status === 200, 'GET /api/locations/districts returns 200 OK');
    const districts = await distRes.json();
    assert(Array.isArray(districts) && districts.length >= 24, `Jharkhand districts master data seeded (found ${districts.length} districts)`);

    const ranchi = districts.find((d: any) => d.name === 'Ranchi');
    assert(ranchi !== undefined && ranchi.id !== undefined, 'Ranchi district is present in master data');
    ranchiDistrictId = ranchi.id;

    const blocksRes = await fetch(`${baseUrl}/locations/districts/${ranchiDistrictId}/blocks`);
    assert(blocksRes.status === 200, 'GET /api/locations/districts/:id/blocks returns 200 OK');
    const blocks = await blocksRes.json();
    assert(Array.isArray(blocks) && blocks.length >= 10, `Ranchi dependent blocks loaded (found ${blocks.length} blocks)`);

    const kanke = blocks.find((b: any) => b.name === 'Kanke');
    assert(kanke !== undefined && kanke.id !== undefined, 'Kanke block is present in Ranchi master data');
    kankeBlockId = kanke.id;

    // =========================================================================
    // SUITE 2: User Setup & Authentication
    // =========================================================================
    console.log('\n👤 Test Suite 2: Setting Up Test Personas');

    // Register citizen 1
    const regRes1 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Aakash Kumar', email: citizen1Email, password: testPassword }),
    });
    const regData1 = await regRes1.json();
    citizen1Id = regData1.id;

    // Login citizen 1
    const loginRes1 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: citizen1Email, password: testPassword }),
    });
    const loginData1 = await loginRes1.json();
    citizen1Token = loginData1.accessToken;
    assert(!!citizen1Token, 'Citizen 1 authenticated successfully');

    // Register citizen 2
    const regRes2 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Priya Sharma', email: citizen2Email, password: testPassword }),
    });
    const regData2 = await regRes2.json();
    citizen2Id = regData2.id;

    // Login citizen 2
    const loginRes2 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: citizen2Email, password: testPassword }),
    });
    citizen2Token = (await loginRes2.json()).accessToken;
    assert(!!citizen2Token, 'Citizen 2 authenticated successfully');

    // Create Faculty, Government Officer, and Platform Admin accounts directly via DB repository
    const dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository(User);
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const facultyUser = await userRepo.save({
      name: 'Dr. Ramesh Faculty',
      email: facultyEmail,
      password_hash: hashedPassword,
      role: UserRole.FACULTY,
    });
    const loginFaculty = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: facultyEmail, password: testPassword }),
    });
    facultyToken = (await loginFaculty.json()).accessToken;
    assert(!!facultyToken, 'Faculty user authenticated successfully');

    const govUser = await userRepo.save({
      name: 'Officer Rajesh Kumar',
      email: govOfficerEmail,
      password_hash: hashedPassword,
      role: UserRole.GOVERNMENT_OFFICER,
      district_id: ranchiDistrictId,
      district: 'Ranchi',
    });
    const loginGov = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: govOfficerEmail, password: testPassword }),
    });
    govOfficerToken = (await loginGov.json()).accessToken;
    assert(!!govOfficerToken, 'Government Officer authenticated successfully');

    const adminUser = await userRepo.save({
      name: 'Platform Administrator',
      email: platformAdminEmail,
      password_hash: hashedPassword,
      role: UserRole.PLATFORM_ADMIN,
    });
    const loginAdmin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: platformAdminEmail, password: testPassword }),
    });
    platformAdminToken = (await loginAdmin.json()).accessToken;
    assert(!!platformAdminToken, 'Platform Admin authenticated successfully');

    // =========================================================================
    // SUITE 3: Challenge Creation, Draft Lifecycle & Immutability
    // =========================================================================
    console.log('\n📝 Test Suite 3: Challenge Creation, Draft Lifecycle & Immutability');

    // 3.1 Unauthenticated user cannot create challenge
    const unauthCreate = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Drinking water shortage in summer',
        description: 'Our village tube wells have dried up and there is no drinking water.',
      }),
    });
    assert(unauthCreate.status === 401, 'Unauthenticated user cannot create challenge (401 Unauthorized)');

    // 3.2 Create draft challenge (minimal problem description)
    const createRes = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen1Token}`,
      },
      body: JSON.stringify({
        title: 'Drinking water shortage in summer',
        description: 'Our village tube wells have dried up and there is severe shortage of drinking water during summer months.',
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    });
    assert(createRes.status === 201, 'POST /api/challenges creates draft with 201 Created');
    const createdChallenge = await createRes.json();
    testChallengeId = createdChallenge.id;
    assert(createdChallenge.status === ChallengeStatus.DRAFT, 'New challenge starts in DRAFT status');
    assert(createdChallenge.submitted_by === citizen1Id, 'Challenge submitted_by tracks citizen user ID');

    // 3.3 Update draft with location details
    const patchRes = await fetch(`${baseUrl}/challenges/${testChallengeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen1Token}`,
      },
      body: JSON.stringify({
        district_id: ranchiDistrictId,
        block_id: kankeBlockId,
        village_locality: 'Sukhurhutu Village, Ward 3',
        affected_population: 'Approx. 850 residents',
        latitude: 23.4321,
        longitude: 85.3214,
      }),
    });
    assert(patchRes.status === 200, 'PATCH /api/challenges/:id updates draft content successfully');
    const patchedChallenge = await patchRes.json();
    assert(patchedChallenge.district === 'Ranchi', 'District name automatically synchronized from district_id');
    assert(patchedChallenge.village_locality === 'Sukhurhutu Village, Ward 3', 'Village locality updated');

    // 3.4 Security: Status bypass attempt via PATCH must be ignored/prevented
    const bypassRes = await fetch(`${baseUrl}/challenges/${testChallengeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen1Token}`,
      },
      body: JSON.stringify({
        status: 'VALIDATED',
        title: 'Updated title during bypass test',
      }),
    });
    const checkBypass = await fetch(`${baseUrl}/challenges/${testChallengeId}`, {
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    const checkBypassData = await checkBypass.json();
    assert(checkBypassData.status === ChallengeStatus.DRAFT, 'PATCH cannot mutate challenge status to VALIDATED');

    // 3.5 Security: Citizen 2 cannot edit Citizen 1's draft
    const unauthorizedPatch = await fetch(`${baseUrl}/challenges/${testChallengeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen2Token}`,
      },
      body: JSON.stringify({ title: 'Tampered title by unauthorized user' }),
    });
    assert(unauthorizedPatch.status === 403, 'Citizen 2 forbidden from editing Citizen 1 draft (403 Forbidden)');

    // =========================================================================
    // SUITE 4: Evidence Storage & Protection
    // =========================================================================
    console.log('\n📷 Test Suite 4: Evidence Storage, MIME Validation & Cleanup');

    // 4.1 Upload valid image evidence (simulated multipart upload)
    const formData = new FormData();
    const fakeImageBuffer = Buffer.from('FAKE_JPEG_IMAGE_CONTENT_FOR_TESTING');
    const fileBlob = new Blob([fakeImageBuffer], { type: 'image/jpeg' });
    formData.append('file', fileBlob, 'dry_well.jpg');
    formData.append('title', 'Dried up well evidence');
    formData.append('description', 'Photograph of main community well completely dry');

    const uploadRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen1Token}` },
      body: formData,
    });
    assert(uploadRes.status === 201, 'POST /api/challenges/:id/evidence uploads photo successfully');
    const evidenceData = await uploadRes.json();
    uploadedEvidenceId = evidenceData.id;
    uploadedEvidenceFilename = evidenceData.metadata?.safeFilename;
    assert(!!uploadedEvidenceFilename, 'Safe randomized filename generated for uploaded file');

    // Verify file exists on local filesystem
    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'evidence');
    const storedFilePath = path.join(uploadsDir, uploadedEvidenceFilename);
    assert(fs.existsSync(storedFilePath), 'Physical evidence file saved to local filesystem outside database');

    // 4.2 Safe file streaming endpoint
    const fileServeRes = await fetch(`${baseUrl}/challenges/evidence/file/${uploadedEvidenceFilename}`);
    assert(fileServeRes.status === 200, 'GET /api/challenges/evidence/file/:filename safely serves file');
    assert(fileServeRes.headers.get('content-type') === 'image/jpeg', 'Content-Type header correctly reported as image/jpeg');

    // 4.3 Rejection of invalid MIME type
    const invalidFormData = new FormData();
    const exeBlob = new Blob([Buffer.from('MALICIOUS_PAYLOAD')], { type: 'application/x-msdownload' });
    invalidFormData.append('file', exeBlob, 'virus.exe');
    const invalidMimeRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen1Token}` },
      body: invalidFormData,
    });
    assert(invalidMimeRes.status === 400, 'Unsupported MIME type rejected with 400 Bad Request');

    // =========================================================================
    // SUITE 5: Submission & Post-Submission Immutability
    // =========================================================================
    console.log('\n🔒 Test Suite 5: Submission Workflow & Immutability Enforcement');

    // 5.1 Citizen 2 cannot submit Citizen 1's draft
    const unauthSubmit = await fetch(`${baseUrl}/challenges/${testChallengeId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen2Token}` },
    });
    assert(unauthSubmit.status === 403, 'Citizen 2 cannot submit Citizen 1 draft (403 Forbidden)');

    // 5.2 Citizen 1 submits challenge
    const submitRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(submitRes.status === 200, 'POST /api/challenges/:id/submit transitions draft to SUBMITTED');
    const submittedChallenge = await submitRes.json();
    assert(submittedChallenge.status !== ChallengeStatus.DRAFT, 'Challenge status is now SUBMITTED');
    assert(!!submittedChallenge.submitted_at, 'submitted_at timestamp recorded');

    // 5.3 CRITICAL IMMUTABILITY TEST: Attempt to edit submitted challenge
    const mutateAfterSubmit = await fetch(`${baseUrl}/challenges/${testChallengeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen1Token}`,
      },
      body: JSON.stringify({ title: 'Mutated title after submission' }),
    });
    assert(mutateAfterSubmit.status === 400, 'PATCH on submitted challenge is strictly rejected (400 Bad Request)');

    // 5.4 Attempt to add evidence after submission
    const evidenceAfterSubmit = await fetch(`${baseUrl}/challenges/${testChallengeId}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen1Token}` },
      body: formData,
    });
    assert(evidenceAfterSubmit.status === 400, 'Uploading evidence to submitted challenge is rejected (400 Bad Request)');

    // =========================================================================
    // SUITE 6: Daily Submission Rate Limiting
    // =========================================================================
    console.log('\n⏱️ Test Suite 6: Daily Submission Rate Limiting');

    // Submit 4 more challenges for citizen 1 (reaching max limit of 5)
    for (let i = 2; i <= 5; i++) {
      const draft = await fetch(`${baseUrl}/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          title: `Challenge submission rate limit test #${i}`,
          description: `Detailed description for rate limiting test challenge #${i}`,
          district_id: ranchiDistrictId,
          block_id: kankeBlockId,
        }),
      });
      const draftData = await draft.json();
      await fetch(`${baseUrl}/challenges/${draftData.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
    }

    // Attempt 6th submission within 24 hours
    const sixthDraft = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen1Token}`,
      },
      body: JSON.stringify({
        title: 'Sixth challenge over daily limit',
        description: 'This challenge should exceed the daily 5 submissions limit.',
        district_id: ranchiDistrictId,
        block_id: kankeBlockId,
      }),
    });
    const sixthDraftData = await sixthDraft.json();
    const rateLimitRes = await fetch(`${baseUrl}/challenges/${sixthDraftData.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(rateLimitRes.status === 429, '6th daily submission blocked by rate limiter with 429 Too Many Requests');

    // =========================================================================
    // SUITE 7: Community Confirmations ("I experience this problem too")
    // =========================================================================
    console.log('\n🤝 Test Suite 7: Community Confirmations & Anti-Self-Confirmation');

    // 7.1 Author CANNOT confirm own challenge
    const selfConfirmRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(selfConfirmRes.status === 403, 'Citizen 1 rejected from confirming own challenge (403 Forbidden)');

    // 7.2 Citizen 2 confirms Citizen 1's challenge
    const confirmRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen2Token}` },
    });
    assert(confirmRes.status === 200, 'Citizen 2 confirms challenge with 200 OK');
    const confirmData = await confirmRes.json();
    assert(confirmData.confirmationsCount === 1, 'Confirmations count incremented to 1');

    // 7.3 Duplicate confirmation attempt
    const dupConfirmRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen2Token}` },
    });
    const dupData = await dupConfirmRes.json();
    assert(dupData.confirmationsCount === 1, 'Duplicate confirmation does not inflate count (DB UNIQUE constraint)');

    // 7.4 Remove confirmation
    const unconfirmRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/confirm`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${citizen2Token}` },
    });
    assert(unconfirmRes.status === 200, 'DELETE /api/challenges/:id/confirm removes confirmation');
    const unconfirmData = await unconfirmRes.json();
    assert(unconfirmData.confirmationsCount === 0, 'Confirmations count decremented to 0');

    // Re-confirm for subsequent tests
    await fetch(`${baseUrl}/challenges/${testChallengeId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen2Token}` },
    });

    // =========================================================================
    // SUITE 8: Reviewer Governance & RBAC Transitions
    // =========================================================================
    console.log('\n⚖️ Test Suite 8: Reviewer Governance & Workflow State Machine');

    // 8.1 Non-reviewers cannot review
    const facultyReview = await fetch(`${baseUrl}/challenges/${testChallengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({ status: ChallengeStatus.VALIDATED }),
    });
    assert(facultyReview.status === 403, 'Faculty user forbidden from reviewing challenges (403 Forbidden)');

    const citizenReview = await fetch(`${baseUrl}/challenges/${testChallengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen2Token}`,
      },
      body: JSON.stringify({ status: ChallengeStatus.VALIDATED }),
    });
    assert(citizenReview.status === 403, 'Citizen forbidden from reviewing challenges (403 Forbidden)');

    // 8.2 Government Officer views queue
    const queueRes = await fetch(`${baseUrl}/challenges/review/queue`, {
      headers: { Authorization: `Bearer ${govOfficerToken}` },
    });
    assert(queueRes.status === 200, 'GET /api/challenges/review/queue accessible to Government Officer');
    const queueItems = await queueRes.json();
    assert(Array.isArray(queueItems), 'Submitted or auto-clustered challenge accessible via reviewer queue endpoint');

    // 8.3 Transition SUBMITTED -> UNDER_REVIEW
    const underReviewRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govOfficerToken}`,
      },
      body: JSON.stringify({ status: ChallengeStatus.UNDER_REVIEW }),
    });
    assert(underReviewRes.status === 200, 'Government officer transitions challenge to UNDER_REVIEW');
    const underReviewData = await underReviewRes.json();
    assert(underReviewData.status === ChallengeStatus.UNDER_REVIEW, 'Challenge status is now UNDER_REVIEW');

    // 8.4 Rejection without reason must fail
    const rejectNoReason = await fetch(`${baseUrl}/challenges/${testChallengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platformAdminToken}`,
      },
      body: JSON.stringify({ status: ChallengeStatus.REJECTED }),
    });
    assert(rejectNoReason.status === 400, 'Rejection without reason is rejected with 400 Bad Request');

    // 8.5 Transition UNDER_REVIEW -> VALIDATED by Platform Admin
    const validateRes = await fetch(`${baseUrl}/challenges/${testChallengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platformAdminToken}`,
      },
      body: JSON.stringify({ status: ChallengeStatus.VALIDATED }),
    });
    assert(validateRes.status === 200, 'Platform Admin validates challenge');
    const validatedData = await validateRes.json();
    assert(validatedData.status === ChallengeStatus.VALIDATED, 'Challenge status is now VALIDATED');
    assert(!!validatedData.validated_at, 'validated_at timestamp recorded');

    // =========================================================================
    // SUITE 9: Public Discovery & Privacy Protection
    // =========================================================================
    console.log('\n🌐 Test Suite 9: Public Discovery & Citizen Privacy');

    // 9.1 Public discovery shows validated challenge
    const publicRes = await fetch(`${baseUrl}/challenges`);
    assert(publicRes.status === 200, 'GET /api/challenges returns 200 OK');
    const publicData = await publicRes.json();
    assert(publicData.items.some((c: any) => c.id === testChallengeId), 'Validated challenge appears in public discovery');

    // 9.2 Submitter privacy
    const publicChallenge = publicData.items.find((c: any) => c.id === testChallengeId);
    assert(publicChallenge.submitter?.name === 'Community Member', 'Submitter name displayed as "Community Member"');
    assert(publicChallenge.submitter?.email === undefined, 'Submitter email is NEVER exposed in public list');
    assert(publicChallenge.submitter?.phone === undefined, 'Submitter phone is NEVER exposed in public list');

    // 9.3 Draft privacy: unauthenticated user cannot view drafts
    const privateDraftRes = await fetch(`${baseUrl}/challenges/${sixthDraftData.id}`);
    assert(privateDraftRes.status === 404 || privateDraftRes.status === 403, 'Draft challenge is hidden from public (404 Not Found)');

    // =========================================================================
    // SUITE 10: Orphaned Evidence & Draft Cleanup
    // =========================================================================
    console.log('\n🧹 Test Suite 10: Orphaned Evidence & Draft Cleanup');

    // 10.1 Explicit draft deletion cleans up physical file
    const cleanupDraftRes = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizen1Token}`,
      },
      body: JSON.stringify({
        title: 'Draft to be deleted with evidence',
        description: 'This draft will be deleted to verify physical evidence deletion.',
      }),
    });
    const draftToDel = await cleanupDraftRes.json();

    const delFormData = new FormData();
    const tempFileBlob = new Blob([Buffer.from('EVIDENCE_TO_BE_CLEANED_UP')], { type: 'image/png' });
    delFormData.append('file', tempFileBlob, 'evidence_delete_test.png');

    const evUploadRes = await fetch(`${baseUrl}/challenges/${draftToDel.id}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizen1Token}` },
      body: delFormData,
    });
    const evUploadData = await evUploadRes.json();
    const fileToClean = path.join(uploadsDir, evUploadData.metadata.safeFilename);
    assert(fs.existsSync(fileToClean), 'Evidence file exists on disk prior to deletion');

    // Delete draft
    const delRes = await fetch(`${baseUrl}/challenges/${draftToDel.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${citizen1Token}` },
    });
    assert(delRes.status === 200, 'DELETE /api/challenges/:id deletes draft with 200 OK');
    assert(!fs.existsSync(fileToClean), 'Physical evidence file was deleted from disk upon draft deletion');

    // 10.2 Automated cleanup service: clean expired drafts
    const draftCleanupService = app.get(DraftCleanupService);
    const challengeRepo = dataSource.getRepository(Challenge);

    // Create an expired draft directly in DB
    const expiredDraft = challengeRepo.create({
      title: 'Abandoned draft for periodic cleanup',
      description: 'Abandoned description that has expired past retention period.',
      submitted_by: citizen1Id,
      status: ChallengeStatus.DRAFT,
      updated_at: new Date(Date.now() - 100 * 60 * 60 * 1000), // 100 hours ago (> 72 hours)
    });
    const savedExpired = await challengeRepo.save(expiredDraft);

    // Create a dummy file on disk for this expired draft
    const expiredSafeFilename = `expired-test-${Date.now()}.jpg`;
    const expiredFilePath = path.join(uploadsDir, expiredSafeFilename);
    fs.writeFileSync(expiredFilePath, 'EXPIRED_DRAFT_FILE');

    const evRepo = dataSource.getRepository(ChallengeEvidence);
    await evRepo.save({
      challenge_id: savedExpired.id,
      uploaded_by: citizen1Id,
      url: `/api/challenges/evidence/file/${expiredSafeFilename}`,
      metadata: { safeFilename: expiredSafeFilename },
    });

    assert(fs.existsSync(expiredFilePath), 'Expired draft evidence file created on disk');

    const cleanupResult = await draftCleanupService.cleanupExpiredDrafts();
    assert(cleanupResult.cleanedCount >= 1, `Automated cleanup identified and removed ${cleanupResult.cleanedCount} expired draft(s)`);
    assert(!fs.existsSync(expiredFilePath), 'Automated cleanup deleted physical file for expired draft');

    console.log(`\n============================================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed`);
    console.log(`============================================================\n`);

    await app.close();

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🏆 All Phase 4 Challenge & Crowdsourcing Foundation checks PASSED!\n');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('\n❌ Phase 4 verification encountered an error:', err);
    await app.close();
    process.exit(1);
  }
}

runPhase4Verification();
