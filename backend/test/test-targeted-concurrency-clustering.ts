import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { ProblemCluster } from '../src/modules/problem-clusters/entities/problem-cluster.entity';
import { ChallengeAiAnalysis } from '../src/modules/ai-analysis/entities/challenge-ai-analysis.entity';
import { RecommendationReview } from '../src/modules/reviews/entities/recommendation-review.entity';
import { ChallengeStatus, ProblemClusterStatus, ClusteringStatus } from '../src/common/enums';

const API_BASE = 'http://127.0.0.1:3001/api';
const AI_BASE = 'http://127.0.0.1:8000';

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

async function runTargetedConcurrencyVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu: Targeted Concurrency & Advisory Lock Clustering Test');
  console.log('========================================================================\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: 'postgres',
    password: 'postgres_password',
    database: 'samadhan_setu',
    entities: ALL_ENTITIES,
    synchronize: false,
  });
  await dataSource.initialize();
  console.log('🔌 Database connected successfully.\n');

  const chalRepo = dataSource.getRepository(Challenge);
  const clusterRepo = dataSource.getRepository(ProblemCluster);
  const aiRepo = dataSource.getRepository(ChallengeAiAnalysis);
  const recRepo = dataSource.getRepository(RecommendationReview);

  try {
    // -------------------------------------------------------------------------
    // 1. Inspect PostgreSQL Lock Key Calculation
    // -------------------------------------------------------------------------
    console.log('▶ STEP 1: Verifying PostgreSQL Transaction Advisory Lock Formula...');
    const districtName = 'Ranchi';
    const districtKey = districtName.trim().toLowerCase();
    const lockParam = `cluster_lock:${districtKey}`;

    const lockResult = await dataSource.query(
      'SELECT hashtext($1) AS lock_key_hash',
      [lockParam]
    );
    const lockKeyHash = lockResult[0].lock_key_hash;
    console.log(`   Lock String: "${lockParam}"`);
    console.log(`   PostgreSQL hashtext() Key: ${lockKeyHash} (32-bit signed integer)`);
    assert(!!lockKeyHash, 'PostgreSQL hashtext lock key computed successfully');

    // -------------------------------------------------------------------------
    // 2. Setup Two Distinct Citizen Actors
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 2: Setting Up Two Distinct Citizen Actors...');
    const timestamp = Date.now();
    const citizenEmailA = `citizen.a.${timestamp}@test.local`;
    const citizenEmailB = `citizen.b.${timestamp}@test.local`;
    const password = 'Password123!';

    // Register Citizen A
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ramesh Kumar (Citizen A)',
        email: citizenEmailA,
        password,
        phone: '+91-9876500001',
      }),
    });
    assert(regResA.status === 201, 'Citizen A registered (201 Created)');

    const loginResA = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: citizenEmailA, password }),
    });
    assert(loginResA.status === 200, 'Citizen A logged in');
    const tokenA = (await loginResA.json()).accessToken;

    // Register Citizen B
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anita Devi (Citizen B)',
        email: citizenEmailB,
        password,
        phone: '+91-9876500002',
      }),
    });
    assert(regResB.status === 201, 'Citizen B registered (201 Created)');

    const loginResB = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: citizenEmailB, password }),
    });
    assert(loginResB.status === 200, 'Citizen B logged in');
    const tokenB = (await loginResB.json()).accessToken;

    // Fetch Ranchi district & Bundu block
    const distRes = await fetch(`${API_BASE}/locations/districts`);
    const districts = await distRes.json();
    const ranchi = districts.find((d: any) => d.name.toLowerCase() === 'ranchi');
    assert(!!ranchi, 'Found Ranchi district');
    const ranchiId = ranchi.id;

    const blocksRes = await fetch(`${API_BASE}/locations/districts/${ranchiId}/blocks`);
    const blocks = await blocksRes.json();
    const bundu = blocks.find((b: any) => b.name.toLowerCase() === 'bundu');
    assert(!!bundu, 'Found Bundu block in Ranchi district');
    const bunduId = bundu.id;

    // -------------------------------------------------------------------------
    // 3. Reset Previous Test Clusters in Bundu for Clean-Slate Concurrency Test
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 3: Resetting Any Prior Drinking-Water Test Clusters in Bundu for Clean Slate...');
    await dataSource.query(
      `UPDATE challenges SET cluster_id = NULL WHERE district = 'Ranchi' AND block_id = $1 AND title ILIKE '%drinking-water%'`,
      [bunduId]
    );
    await dataSource.query(
      `DELETE FROM problem_clusters WHERE district = 'Ranchi' AND block_id = $1 AND title ILIKE '%drinking-water%'`,
      [bunduId]
    );

    const initialClusters = await clusterRepo.find({
      where: { district: 'Ranchi' },
    });
    const baselineClusterCount = initialClusters.length;
    console.log(`   Clean baseline cluster count in Ranchi: ${baselineClusterCount}`);

    // -------------------------------------------------------------------------
    // 4. Create Draft Problem A & Problem B
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 4: Creating Draft Problem A and Problem B (Realistic Problem Scenario)...');
    const problemA = {
      title: 'Government schools in rural Bundu face drinking-water shortages',
      description:
        'Government schools in rural Bundu are facing severe drinking-water shortages during summer. Students are forced to bring water from home and there is no reliable drinking-water infrastructure.',
      category: 'Infrastructural',
      district_id: ranchiId,
      block_id: bunduId,
      village_locality: 'Bundu Block Primary School Cluster',
      citizen_severity: 'SERIOUS',
      affected_population: 'Approx. 500 rural primary school students',
    };

    const problemB = {
      title: 'Government schools in rural Bundu face severe drinking-water shortages',
      description:
        'Government schools in rural Bundu face frequent drinking-water shortages during summer. Students are forced to bring water from home and there is no reliable drinking-water infrastructure.',
      category: 'Infrastructural',
      district_id: ranchiId,
      block_id: bunduId,
      village_locality: 'Bundu Block Primary School Cluster',
      citizen_severity: 'SERIOUS',
      affected_population: 'Multiple village schools in Bundu block',
    };

    // Warm AI inference cache for both problems so AI runs within the 3000ms bound
    console.log('   Warming AI inference cache...');
    await Promise.all([
      fetch(`${AI_BASE}/v1/ai/analyze-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: 'warm-a',
          title: problemA.title,
          description: problemA.description,
        }),
      }).catch(() => null),
      fetch(`${AI_BASE}/v1/ai/analyze-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: 'warm-b',
          title: problemB.title,
          description: problemB.description,
        }),
      }).catch(() => null),
    ]);
    console.log('   AI inference cache pre-warmed.');

    const draftResA = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(problemA),
    });
    assert(draftResA.status === 201, 'Draft Problem A created (201)');
    const challengeA = await draftResA.json();

    const draftResB = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify(problemB),
    });
    assert(draftResB.status === 201, 'Draft Problem B created (201)');
    const challengeB = await draftResB.json();

    console.log(`   Challenge A ID: ${challengeA.id} (Citizen: ${citizenEmailA})`);
    console.log(`   Challenge B ID: ${challengeB.id} (Citizen: ${citizenEmailB})`);

    // -------------------------------------------------------------------------
    // 5. Execute Simultaneous Concurrent Submissions
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 5: Executing Simultaneous Concurrent Submissions (Race Condition Simulation)...');
    console.log('   Firing Promise.all([ submit(A), submit(B) ]) simultaneously...');

    const startSubmitTime = Date.now();
    const [submitResA, submitResB] = await Promise.all([
      fetch(`${API_BASE}/challenges/${challengeA.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      }),
      fetch(`${API_BASE}/challenges/${challengeB.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
      }),
    ]);
    const durationMs = Date.now() - startSubmitTime;
    console.log(`   Both concurrent submissions resolved in ${durationMs} ms.`);

    assert(
      submitResA.status === 200 || submitResA.status === 201,
      'Concurrent Submission A completed successfully (200/201)'
    );
    assert(
      submitResB.status === 200 || submitResB.status === 201,
      'Concurrent Submission B completed successfully (200/201)'
    );

    // -------------------------------------------------------------------------
    // 6. Direct Database Inspection of Reports, Lock Scope, and Clusters
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 6: Authoritative Database Inspection of Clustering State...');

    const dbChallengeA = await chalRepo.findOne({
      where: { id: challengeA.id },
      relations: ['aiAnalysis'],
    });
    const dbChallengeB = await chalRepo.findOne({
      where: { id: challengeB.id },
      relations: ['aiAnalysis'],
    });

    assert(!!dbChallengeA, 'Report A exists in database (not lost)');
    assert(!!dbChallengeB, 'Report B exists in database (not lost)');

    assert(dbChallengeA!.status === ChallengeStatus.SUBMITTED, 'Report A status is SUBMITTED');
    assert(dbChallengeB!.status === ChallengeStatus.SUBMITTED, 'Report B status is SUBMITTED');

    assert(dbChallengeA!.submitted_by !== dbChallengeB!.submitted_by, 'Report A and B have different citizen submitters');

    console.log(`   Report A Cluster ID:        ${dbChallengeA!.cluster_id}`);
    console.log(`   Report A Clustering Status: ${dbChallengeA!.clustering_status}`);
    console.log(`   Report B Cluster ID:        ${dbChallengeB!.cluster_id}`);
    console.log(`   Report B Clustering Status: ${dbChallengeB!.clustering_status}`);

    assert(!!dbChallengeA!.cluster_id, 'Report A is linked to a cluster');
    assert(!!dbChallengeB!.cluster_id, 'Report B is linked to a cluster');

    // CRITICAL RACE CONDITION VERIFICATION:
    // Did pg_advisory_xact_lock prevent duplicate cluster creation?
    assert(
      dbChallengeA!.cluster_id === dbChallengeB!.cluster_id,
      'CRITICAL: Both concurrent submissions merged into the EXACT SAME shared cluster ID!',
      { clusterIdA: dbChallengeA!.cluster_id, clusterIdB: dbChallengeB!.cluster_id }
    );

    const sharedClusterId = dbChallengeA!.cluster_id;
    const sharedCluster = await clusterRepo.findOne({
      where: { id: sharedClusterId },
    });
    assert(!!sharedCluster, 'Shared cluster record exists in database');

    console.log('\n   Shared Cluster Details:');
    console.log(`     • Cluster ID:     ${sharedCluster!.id}`);
    console.log(`     • Title:          "${sharedCluster!.title}"`);
    console.log(`     • District:       "${sharedCluster!.district}"`);
    console.log(`     • Locality:       "${sharedCluster!.village_locality}"`);
    console.log(`     • Report Count:   ${sharedCluster!.report_count} (Expected: 2)`);
    console.log(`     • Status:         ${sharedCluster!.status}`);
    console.log(`     • Priority Score: ${sharedCluster!.priority_score}`);

    assert(sharedCluster!.report_count === 2, 'Shared cluster report_count is exactly 2 (both reports aggregated)');
    assert(
      sharedCluster!.status === ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
      'Shared cluster status is AWAITING_GOVERNMENT_VERIFICATION'
    );

    // Verify cluster count delta:
    const postClusters = await clusterRepo.find({
      where: { district: 'Ranchi' },
    });
    const finalClusterCount = postClusters.length;
    console.log(`   Post-test cluster count in Ranchi: ${finalClusterCount} (Baseline: ${baselineClusterCount})`);
    assert(
      finalClusterCount === baselineClusterCount + 1,
      'Duplicate cluster prevention verified: Cluster count increased by EXACTLY 1, NOT 2!',
      { baseline: baselineClusterCount, final: finalClusterCount }
    );

    // -------------------------------------------------------------------------
    // 7. Verify AI Processing Status on Both Reports
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 7: Verifying AI Processing Status on Both Reports...');
    console.log(`   Report A AI Status: ${dbChallengeA!.aiAnalysis?.ai_processing_status}`);
    console.log(`   Report B AI Status: ${dbChallengeB!.aiAnalysis?.ai_processing_status}`);

    assert(
      dbChallengeA!.aiAnalysis?.ai_processing_status === 'SUCCESS',
      'Report A has valid AI analysis with status SUCCESS'
    );
    assert(
      dbChallengeB!.aiAnalysis?.ai_processing_status === 'SUCCESS',
      'Report B has valid AI analysis with status SUCCESS'
    );
    assert(
      typeof dbChallengeA!.aiAnalysis?.domain === 'string' && dbChallengeA!.aiAnalysis?.domain.length > 0,
      'Report A has valid structured domain'
    );
    assert(
      typeof dbChallengeB!.aiAnalysis?.domain === 'string' && dbChallengeB!.aiAnalysis?.domain.length > 0,
      'Report B has valid structured domain'
    );

    // -------------------------------------------------------------------------
    // 8. Verify Government Verification Boundary & Zero Pre-Verification Matches
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 8: Verifying Government Verification Boundary on Both Reports...');

    // Check DB directly for recommendations
    const preRecsA = await recRepo.find({ where: { challenge_id: challengeA.id } });
    const preRecsB = await recRepo.find({ where: { challenge_id: challengeB.id } });
    assert(preRecsA.length === 0, 'Database contains 0 recommendations for Report A prior to verification');
    assert(preRecsB.length === 0, 'Database contains 0 recommendations for Report B prior to verification');

    // Check API endpoint for Report A and B
    const apiReviewsA = await (await fetch(`${API_BASE}/reviews/challenge/${challengeA.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    const apiReviewsB = await (await fetch(`${API_BASE}/reviews/challenge/${challengeB.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    const recsCountA = apiReviewsA.recommendations?.length || 0;
    const recsCountB = apiReviewsB.recommendations?.length || 0;
    console.log(`   API Recommendations exposed for Report A: ${recsCountA}`);
    console.log(`   API Recommendations exposed for Report B: ${recsCountB}`);

    assert(recsCountA === 0, 'API returns 0 recommendations for unverified Report A');
    assert(recsCountB === 0, 'API returns 0 recommendations for unverified Report B');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`🎉 TARGETED CONCURRENCY AUDIT COMPLETE: All ${passedCount} assertions PASSED! (0 failures)`);
    console.log('========================================================================\n');
  } finally {
    await dataSource.destroy();
  }
}

runTargetedConcurrencyVerification().catch((err) => {
  console.error('\n❌ CONCURRENCY VERIFICATION FAILED:');
  console.error(err);
  process.exit(1);
});
