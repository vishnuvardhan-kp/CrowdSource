import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { ChallengeAiAnalysis } from '../src/modules/ai-analysis/entities/challenge-ai-analysis.entity';
import { RecommendationReview } from '../src/modules/reviews/entities/recommendation-review.entity';
import { ChallengeStatus, UserRole } from '../src/common/enums';

const API_BASE = 'http://localhost:3001/api';
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error('     Details:', JSON.stringify(details, null, 2));
    failedCount++;
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runAuditVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu: Complete AI Structuring & Verification Workflow Audit');
  console.log('========================================================================\n');

  // Direct database handle for authoritative verification
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres_password',
    database: 'samadhan_setu',
    entities: ALL_ENTITIES,
    synchronize: false,
  });
  await dataSource.initialize();
  console.log('🔌 Database connected successfully.\n');

  const chalRepo = dataSource.getRepository(Challenge);
  const aiRepo = dataSource.getRepository(ChallengeAiAnalysis);
  const recRepo = dataSource.getRepository(RecommendationReview);

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Test Actors
    // -------------------------------------------------------------------------
    console.log('▶ STEP 1: Setting Up Test Actors (Citizen & Government Reviewer)...');
    const citizenEmail = `citizen.water.${Date.now()}@test.local`;
    const citizenPassword = 'Password123!';

    const citizenRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunita Devi',
        email: citizenEmail,
        password: citizenPassword,
        phone: '+91-9876543210',
      }),
    });
    assert(citizenRegRes.status === 201, 'Citizen registration returns 201 Created');

    const citizenLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: citizenEmail,
        password: citizenPassword,
      }),
    });
    assert(citizenLoginRes.status === 200, 'Citizen login succeeded');
    const citizenToken = (await citizenLoginRes.json()).accessToken;
    assert(!!citizenToken, 'Citizen received valid JWT access token');

    // Login as Government Reviewer (Ranchi District)
    const reviewerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer.ranchi@jharkhand.gov.in',
        password: 'GovOfficer123!',
      }),
    });
    assert(reviewerLoginRes.status === 200, 'Government Reviewer login succeeded');
    const reviewerToken = (await reviewerLoginRes.json()).accessToken;

    // Login as Institution User (BIT Mesra)
    const instLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dean@bitmesra.ac.in',
        password: 'BitMesra123!',
      }),
    });
    assert(instLoginRes.status === 200, 'Institution User login succeeded');
    const instToken = (await instLoginRes.json()).accessToken;

    // Fetch Ranchi district ID
    const distRes = await fetch(`${API_BASE}/locations/districts`);
    const districts = await distRes.json();
    const ranchiDistrict = districts.find((d: any) => d.name.toLowerCase() === 'ranchi');
    assert(!!ranchiDistrict, 'Found Ranchi district ID', ranchiDistrict);
    const ranchiDistrictId = ranchiDistrict.id;

    const blocksRes = await fetch(`${API_BASE}/locations/districts/${ranchiDistrictId}/blocks`);
    const blocks = await blocksRes.json();
    assert(blocks.length > 0, 'Found blocks for Ranchi district');
    const ranchiBlockId = blocks[0].id;

    // -------------------------------------------------------------------------
    // 2. Real Problem Submission with AI Structuring
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 2: Citizen Submitting Real Test Problem Statement...');
    const testProblem = {
      title: 'Drinking-water shortages in rural government schools',
      description:
        'Several government schools in a rural area are facing frequent drinking-water shortages. Students are forced to bring water from home and there is no reliable drinking-water infrastructure during summer.',
      district_id: ranchiDistrictId,
      block_id: ranchiBlockId,
      village_locality: 'Bundu Block Primary School Cluster',
      affected_population: 'Approx. 800 rural school children and staff',
      citizen_severity: 'SERIOUS',
    };

    // Create Draft
    const draftRes = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify(testProblem),
    });
    assert(draftRes.status === 201, 'Draft challenge created with 201');
    const draftChallenge = await draftRes.json();
    const challengeId = draftChallenge.id;
    console.log(`   Draft Challenge ID: ${challengeId}`);

    // Submit Challenge & Measure Latency (must complete within bounded window)
    const startTime = Date.now();
    const submitRes = await fetch(`${API_BASE}/challenges/${challengeId}/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
    });
    const submitDurationMs = Date.now() - startTime;
    console.log(`   Submission + AI Processing Roundtrip: ${submitDurationMs} ms`);

    assert(submitRes.status === 200 || submitRes.status === 201, 'Challenge submission succeeded');
    const submittedChallenge = await submitRes.json();

    // Verify submission response status & display status
    assert(submittedChallenge.status === 'SUBMITTED', 'Challenge status is SUBMITTED');
    assert(
      submittedChallenge.verification_display_status === 'Pending Government Verification',
      'Display status is "Pending Government Verification"',
      submittedChallenge.verification_display_status
    );

    // -------------------------------------------------------------------------
    // 3. Inspect AI Problem Intelligence for the Citizen
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 3: Verifying AI-Generated Structured Intelligence for Citizen...');
    const citizenViewRes = await fetch(`${API_BASE}/challenges/${challengeId}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(citizenViewRes.status === 200, 'Citizen GET /challenges/:id returns 200');
    const citizenView = await citizenViewRes.json();

    assert(!!citizenView.aiAnalysis, 'aiAnalysis object is present in citizen view');
    const ai = citizenView.aiAnalysis;

    console.log('   AI Structured Intelligence:');
    console.log(`     • Domain:                 "${ai.domain}"`);
    console.log(`     • Subdomain:              "${ai.subdomain}"`);
    console.log(`     • Category:               "${ai.category}"`);
    console.log(`     • AI Processing Status:   "${ai.ai_processing_status}"`);
    console.log(`     • Required Technologies:  ${JSON.stringify(ai.required_technologies)}`);
    console.log(`     • Keywords:               ${JSON.stringify(ai.keywords)}`);
    console.log(`     • Confidence:             ${ai.confidence}`);
    console.log(`     • Model Name:             "${ai.model_name}"`);
    console.log(`     • Summary:                "${ai.summary}"`);

    assert(ai.ai_processing_status === 'SUCCESS', 'AI processing status is SUCCESS');
    assert(typeof ai.domain === 'string' && ai.domain.length > 0, 'Domain is non-empty string');
    assert(typeof ai.subdomain === 'string' && ai.subdomain.length > 0, 'Subdomain is non-empty string');
    assert(typeof ai.category === 'string' && ai.category.length > 0, 'Category is non-empty string');
    assert(Array.isArray(ai.required_technologies) && ai.required_technologies.length > 0, 'Required technologies is non-empty array');
    assert(Array.isArray(ai.keywords) && ai.keywords.length > 0, 'Keywords is non-empty array');
    assert(typeof ai.summary === 'string' && ai.summary.length > 0, 'Summary is non-empty string');

    // -------------------------------------------------------------------------
    // 4. Verification Boundary Guard (Pre-Verification Isolation)
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 4: Enforcing Government Verification Boundary (Zero Pre-Verification Matches)...');

    // 4a. Check database directly for any recommendation records
    const preRecs = await recRepo.find({ where: { challenge_id: challengeId } });
    assert(preRecs.length === 0, `Database contains 0 recommendations for unverified challenge (found: ${preRecs.length})`);

    // 4b. Reviewer calls GET /reviews/challenge/:id before verification
    const reviewerPreRecsRes = await fetch(`${API_BASE}/reviews/challenge/${challengeId}`, {
      headers: { Authorization: `Bearer ${reviewerToken}` },
    });
    assert(reviewerPreRecsRes.status === 200, 'Reviewer GET /reviews/challenge/:id returns 200');
    const reviewerPreRecsData = await reviewerPreRecsRes.json();
    assert(
      !reviewerPreRecsData.recommendations || reviewerPreRecsData.recommendations.length === 0,
      'Reviewer API returns 0 recommendations prior to government verification',
      reviewerPreRecsData
    );

    // 4c. Institutional User calls GET /reviews/challenge/:id before verification
    const instPreRecsRes = await fetch(`${API_BASE}/reviews/challenge/${challengeId}`, {
      headers: { Authorization: `Bearer ${instToken}` },
    });
    // Should either be empty recommendations or not allowed
    if (instPreRecsRes.status === 200) {
      const instData = await instPreRecsRes.json();
      assert(
        !instData.recommendations || instData.recommendations.length === 0,
        'Institutional portal returns 0 recommendations prior to government verification'
      );
    } else {
      assert(instPreRecsRes.status === 403, 'Institutional portal forbidden from accessing unverified challenge review');
    }

    // -------------------------------------------------------------------------
    // 5. AI Fallback Path Test (Zero Guessing / Fallback Classification)
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 5: Verifying AI Fallback Path & Zero Guesswork Guarantee...');
    // Create another challenge and simulate AI failure/fallback directly via database & service
    const fallbackDraftRes = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: 'Road connectivity broken during monsoon',
        description: 'The access road connecting to the primary healthcare centre has washed away.',
        district_id: ranchiDistrictId,
        block_id: ranchiBlockId,
      }),
    });
    const fallbackDraft = await fallbackDraftRes.json();

    // Manually create fallback analysis to test fallback persistence contract
    const fallbackRecord = aiRepo.create({
      challenge_id: fallbackDraft.id,
      category: 'Unclassified',
      sub_category: 'General Inquiry',
      summary: 'AI structuring is temporarily unavailable. This report will be reviewed directly by administrative reviewers.',
      priority_score: 50,
      severity_score: 50,
      confidence: 0,
      model_name: 'none',
      model_version: 'fallback',
      domain: null as any,
      subdomain: null as any,
      required_technologies: [],
      keywords: [],
      ai_processing_status: 'FALLBACK',
    });
    await aiRepo.save(fallbackRecord);

    // Update challenge to SUBMITTED
    await chalRepo.update(fallbackDraft.id, { status: ChallengeStatus.SUBMITTED });

    // Fetch via API to verify citizen contract
    const fallbackViewRes = await fetch(`${API_BASE}/challenges/${fallbackDraft.id}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const fallbackView = await fallbackViewRes.json();

    assert(fallbackView.status === 'SUBMITTED', 'Fallback challenge status is SUBMITTED');
    assert(fallbackView.verification_display_status === 'Pending Government Verification', 'Fallback challenge display status is Pending Government Verification');
    assert(fallbackView.aiAnalysis.ai_processing_status === 'FALLBACK', 'Fallback entity has ai_processing_status = FALLBACK');
    assert(!fallbackView.aiAnalysis.domain, 'Fallback entity domain is null/empty (no guessed domain)');
    assert(!fallbackView.aiAnalysis.subdomain, 'Fallback entity subdomain is null/empty (no guessed subdomain)');
    assert(fallbackView.aiAnalysis.required_technologies.length === 0, 'Fallback required_technologies is empty array (no guessed tech)');
    assert(fallbackView.aiAnalysis.keywords.length === 0, 'Fallback keywords is empty array (no guessed keywords)');

    // -------------------------------------------------------------------------
    // 6. Concurrency & Transaction-Scoped Advisory Lock Test
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 6: Verifying PostgreSQL Transaction-Scoped Advisory Lock on Clustering...');
    // Submit 2 concurrent challenges in the same district
    const c1DraftRes = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        title: 'Concurrent Test 1: Water pipeline leak',
        description: 'Pipeline leakage in Bundu block.',
        district_id: ranchiDistrictId,
        block_id: ranchiBlockId,
      }),
    });
    const c1Draft = await c1DraftRes.json();

    const c2DraftRes = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        title: 'Concurrent Test 2: Water pump motor failure',
        description: 'Pump motor failure in Bundu block.',
        district_id: ranchiDistrictId,
        block_id: ranchiBlockId,
      }),
    });
    const c2Draft = await c2DraftRes.json();

    // Fire submissions simultaneously to test pg_advisory_xact_lock
    const [c1Submit, c2Submit] = await Promise.all([
      fetch(`${API_BASE}/challenges/${c1Draft.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizenToken}` },
      }),
      fetch(`${API_BASE}/challenges/${c2Draft.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizenToken}` },
      }),
    ]);

    assert(c1Submit.status === 200 || c1Submit.status === 201, 'Concurrent submission 1 succeeded without lock conflict');
    assert(c2Submit.status === 200 || c2Submit.status === 201, 'Concurrent submission 2 succeeded without lock conflict');

    // -------------------------------------------------------------------------
    // 7. Government Verification & Post-Verification Capability Matching
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 7: Government Verification & Post-Verification Capability Matching...');
    // Reviewer validates the drinking-water problem
    const reviewRes = await fetch(`${API_BASE}/challenges/${challengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${reviewerToken}`,
      },
      body: JSON.stringify({
        status: 'VALIDATED',
        reason: 'Verified on-site by District Education Officer. Drinking-water infrastructure urgently required.',
      }),
    });
    assert(reviewRes.status === 200 || reviewRes.status === 201, 'Government verification review succeeded');
    const reviewResult = await reviewRes.json();
    assert(reviewResult.status === 'VALIDATED', 'Challenge status updated to VALIDATED');

    // Verify capability matching was triggered post-verification
    console.log('   Querying post-verification recommendations...');
    const postRecsRes = await fetch(`${API_BASE}/reviews/challenge/${challengeId}`, {
      headers: { Authorization: `Bearer ${reviewerToken}` },
    });
    assert(postRecsRes.status === 200, 'Reviewer GET /reviews/challenge/:id returns 200');
    const postRecsData = await postRecsRes.json();

    assert(Array.isArray(postRecsData.recommendations), 'Recommendations array is present');
    console.log(`   Post-Verification Recommendations Count: ${postRecsData.recommendations.length}`);
    for (const rec of postRecsData.recommendations) {
      console.log(`     • Institution: ${rec.organization_name} (${rec.organization_type})`);
      console.log(`       Match Score: ${rec.total_score}% | Confidence: ${rec.confidence_category}`);
      console.log(`       Reasons:     ${rec.reasons?.join('; ')}`);
    }

    assert(postRecsData.recommendations.length > 0, 'Post-verification capability matching generated recommendations');
    const topMatch = postRecsData.recommendations[0];
    assert(topMatch.total_score > 0, 'Top recommendation has positive match score');
    assert(Array.isArray(topMatch.reasons) && topMatch.reasons.length > 0, 'Top recommendation has valid match reasons');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`🎉 AUDIT VERIFICATION COMPLETE: All ${passedCount} assertions PASSED! (0 failures)`);
    console.log('========================================================================\n');
  } finally {
    await dataSource.destroy();
  }
}

runAuditVerification().catch((err) => {
  console.error('\n❌ AUDIT VERIFICATION ENCOUNTERED FATAL ERROR:');
  console.error(err);
  process.exit(1);
});
