import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ChallengesService } from '../src/modules/challenges/challenges.service';
import { EoisService } from '../src/modules/eois/eois.service';
import { ProblemClustersService } from '../src/modules/problem-clusters/problem-clusters.service';
import { DataSource } from 'typeorm';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { ExpressionOfInterest } from '../src/modules/eois/entities/expression-of-interest.entity';
import { ProblemCluster } from '../src/modules/problem-clusters/entities/problem-cluster.entity';
import { Organization } from '../src/modules/organizations/entities/organization.entity';
import { ChallengeAiAnalysis } from '../src/modules/ai-analysis/entities/challenge-ai-analysis.entity';
import { ChallengeStatus, CitizenSeverity, EoiStatus, ProblemClusterStatus, UserRole, OrganizationType } from '../src/common/enums';

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

async function runIdempotencyVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 7: Idempotency & Duplicate Request Safety');
  console.log('========================================================================\n');

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
  const challengesService = app.get(ChallengesService);
  const eoisService = app.get(EoisService);
  const clusterService = app.get(ProblemClustersService);
  const dataSource = app.get(DataSource);

  const chalRepo = dataSource.getRepository(Challenge);
  const userRepo = dataSource.getRepository(User);
  const eoiRepo = dataSource.getRepository(ExpressionOfInterest);
  const clusterRepo = dataSource.getRepository(ProblemCluster);
  const orgRepo = dataSource.getRepository(Organization);
  const aiRepo = dataSource.getRepository(ChallengeAiAnalysis);

  const distRows = await dataSource.query(`SELECT id, name FROM districts WHERE LOWER(name) = 'ranchi' LIMIT 1`);
  const ranchiId = distRows[0]?.id;
  const blockRows = await dataSource.query(`SELECT id, name FROM blocks WHERE district_id = $1 LIMIT 1`, [ranchiId]);
  const blockId = blockRows[0]?.id;

  const uniqueId = Date.now().toString().slice(-6);
  const testUser = await userRepo.save(
    userRepo.create({
      email: `idempotency-tester-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Idempotency Tester',
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  const testOfficer = await userRepo.save(
    userRepo.create({
      email: `officer-idem-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Officer Reviewer',
      role: UserRole.GOVERNMENT_OFFICER,
      is_active: true,
    }),
  );

  try {
    // -------------------------------------------------------------------------
    // Test 1: Sequential Duplicate Challenge Submission
    // -------------------------------------------------------------------------
    console.log('▶ TEST 1: Verifying Sequential Duplicate submitChallenge Call...');
    const chal1 = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Broken handpump in Village Ward 3',
        description: 'Single drinking water source damaged and non-functional for past 3 weeks',
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.35,
        longitude: 85.32,
        status: ChallengeStatus.DRAFT,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    // First submission
    const sub1 = await challengesService.submitChallenge(chal1.id, testUser.id);
    assert(sub1.status === ChallengeStatus.SUBMITTED, 'First submission transitions status to SUBMITTED');

    // Second submission of the exact same challenge
    let sub2Handled = false;
    try {
      const sub2 = await challengesService.submitChallenge(chal1.id, testUser.id);
      if (sub2 && sub2.status === ChallengeStatus.SUBMITTED) {
        sub2Handled = true;
      }
    } catch (e: any) {
      if (e.message && e.message.includes('already submitted')) {
        sub2Handled = true;
      }
    }
    assert(sub2Handled, 'Second submission handled safely without database error');

    // Verify AI analysis was NOT duplicated
    const analyses = await aiRepo.find({ where: { challenge_id: chal1.id } });
    assert(analyses.length === 1, `Exactly 1 AI analysis created (found ${analyses.length}), no duplicate generated`);

    // -------------------------------------------------------------------------
    // Test 2: Concurrent Duplicate Challenge Submissions (Race Condition Safety)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 2: Verifying Concurrent Duplicate Submissions of Same Challenge...');
    const chal2 = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Dangerous dangling high-tension wire across school playground',
        description: 'Overhead 11kV line hanging very low over playing area posing electrocution threat',
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.37,
        longitude: 85.33,
        status: ChallengeStatus.DRAFT,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    // Call submitChallenge concurrently twice for chal2
    const results = await Promise.allSettled([
      challengesService.submitChallenge(chal2.id, testUser.id),
      challengesService.submitChallenge(chal2.id, testUser.id),
    ]);

    const successfulSubmissions = results.filter((r) => r.status === 'fulfilled');
    assert(successfulSubmissions.length >= 1, 'At least one submission succeeded');

    const reloadedChal2 = await chalRepo.findOneBy({ id: chal2.id });
    assert(reloadedChal2?.status === ChallengeStatus.SUBMITTED, 'Final challenge state is cleanly SUBMITTED');

    const chal2Analyses = await aiRepo.find({ where: { challenge_id: chal2.id } });
    assert(chal2Analyses.length === 1, `Exactly 1 AI analysis generated under concurrent race (found ${chal2Analyses.length})`);

    // -------------------------------------------------------------------------
    // Test 3: Problem Cluster Verification Idempotency
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 3: Verifying Duplicate verifyCluster Idempotency...');
    const testCluster = await clusterRepo.save(
      clusterRepo.create({
        title: 'Cluster of Waterlogging Reports',
        description: 'Multiple waterlogging reports in Sector 4',
        category: 'WATER_AND_SANITATION',
        district: 'Ranchi',
        district_id: ranchiId,
        latitude: 23.36,
        longitude: 85.33,
        status: ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
        severity: 'HIGH',
      }),
    );

    // First verification
    const v1 = await clusterService.verifyCluster(testCluster.id, testOfficer.id);
    assert(v1.status === ProblemClusterStatus.VALIDATED, 'First verifyCluster call transitions status to VALIDATED');

    // Second duplicate verification
    const v2 = await clusterService.verifyCluster(testCluster.id, testOfficer.id);
    assert(v2.status === ProblemClusterStatus.VALIDATED, 'Second duplicate verifyCluster call succeeds idempotently');

    // -------------------------------------------------------------------------
    // Test 4: EOI Acceptance Idempotency
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 4: Verifying EOI Duplicate Acceptance Idempotency...');
    const testOrg = await orgRepo.save(
      orgRepo.create({
        name: `Test Institution ${uniqueId}`,
        organization_type: OrganizationType.INSTITUTION,
        state: 'Jharkhand',
        district: 'Ranchi',
        is_claimed: true,
      }),
    );

    const testEoi = await eoiRepo.save(
      eoiRepo.create({
        challenge_id: chal1.id,
        organization_id: testOrg.id,
        proposer_user_id: testUser.id,
        proposed_approach: 'Deploy low-cost solar-powered ultrasonic depth sensors',
        status: EoiStatus.UNDER_REVIEW,
      }),
    );

    // Accept EOI first time
    const a1 = await eoisService.acceptEoi(testEoi.id, testOfficer.id);
    assert(a1.status === EoiStatus.ACCEPTED, 'First acceptEoi call transitions to ACCEPTED');

    // Accept EOI second time (must be idempotent)
    const a2 = await eoisService.acceptEoi(testEoi.id, testOfficer.id);
    assert(a2.status === EoiStatus.ACCEPTED, 'Second duplicate acceptEoi returns existing accepted state without error');
  } finally {
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 7 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIdempotencyVerification().catch((err) => {
  console.error('Fatal error in verify-idempotency:', err);
  process.exit(1);
});
