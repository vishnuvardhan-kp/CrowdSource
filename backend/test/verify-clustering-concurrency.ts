import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ProblemClustersService } from '../src/modules/problem-clusters/problem-clusters.service';
import { ChallengesService } from '../src/modules/challenges/challenges.service';
import { DataSource } from 'typeorm';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { ProblemCluster } from '../src/modules/problem-clusters/entities/problem-cluster.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { ChallengeStatus, ProblemClusterStatus, ClusteringStatus, CitizenSeverity, UserRole } from '../src/common/enums';

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

async function runClusteringConcurrencyVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 3: Clustering Concurrency & Transaction Safety');
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
  const clusterService = app.get(ProblemClustersService);
  const challengesService = app.get(ChallengesService);
  const dataSource = app.get(DataSource);

  const chalRepo = dataSource.getRepository(Challenge);
  const clusterRepo = dataSource.getRepository(ProblemCluster);
  const userRepo = dataSource.getRepository(User);

  // Obtain master location data
  const distRows = await dataSource.query(`SELECT id, name FROM districts WHERE LOWER(name) = 'ranchi' LIMIT 1`);
  const ranchiId = distRows[0]?.id;
  const blockRows = await dataSource.query(`SELECT id, name FROM blocks WHERE district_id = $1 LIMIT 1`, [ranchiId]);
  const blockId = blockRows[0]?.id;

  const dhanbadRows = await dataSource.query(`SELECT id, name FROM districts WHERE LOWER(name) = 'dhanbad' LIMIT 1`);
  const dhanbadId = dhanbadRows[0]?.id;
  const dhanbadBlockRows = await dataSource.query(`SELECT id, name FROM blocks WHERE district_id = $1 LIMIT 1`, [dhanbadId]);
  const dhanbadBlockId = dhanbadBlockRows[0]?.id;

  const uniqueId = Date.now().toString().slice(-6);
  const testUser = await userRepo.save(
    userRepo.create({
      email: `clustering-concurrency-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Concurrency Tester',
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  const testOfficer = await userRepo.save(
    userRepo.create({
      email: `officer-clustering-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Ranchi Officer',
      role: UserRole.GOVERNMENT_OFFICER,
      is_active: true,
    }),
  );

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Advisory Lock Formula & Hash Determinism
    // -------------------------------------------------------------------------
    console.log('▶ SCENARIO 1: Verifying PostgreSQL Advisory Lock Calculation & Release...');
    const districtKey = 'ranchi';
    const lockFormula = `hashtext('cluster_lock:' || '${districtKey}')`;
    const lockResult = await dataSource.query(`SELECT ${lockFormula} AS lock_key;`);
    const lockKey = lockResult[0].lock_key;
    assert(typeof lockKey === 'number', `Advisory lock key computed deterministically: ${lockKey}`);

    const acquired = await dataSource.query(`SELECT pg_try_advisory_lock(${lockKey}) AS locked;`);
    assert(acquired[0].locked === true, 'Successfully acquired PostgreSQL advisory lock');
    const released = await dataSource.query(`SELECT pg_advisory_unlock(${lockKey}) AS unlocked;`);
    assert(released[0].unlocked === true, 'Successfully released PostgreSQL advisory lock');

    // -------------------------------------------------------------------------
    // Scenario 2: Sequential High-Similarity Submissions in Same District
    // -------------------------------------------------------------------------
    console.log('\n▶ SCENARIO 2: Verifying Sequential Clustering...');
    const chalA = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Severe drinking water pipeline leak at Station Road Ranchi',
        description: 'Drinking water pipeline cracked near station road junction causing street flooding and loss of drinking water supply',
        category: 'WATER_AND_SANITATION',
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.35,
        longitude: 85.32,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    await clusterService.clusterCitizenReport(chalA.id);

    const reloadedA = await chalRepo.findOneBy({ id: chalA.id });
    assert(reloadedA?.clustering_status === ClusteringStatus.CLUSTERED || reloadedA?.cluster_id !== null, 'First challenge created/joined a cluster');

    const chalB = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Severe drinking water pipeline leak at Station Road Ranchi junction',
        description: 'Drinking water pipeline cracked near station road junction causing street flooding and loss of drinking water supply',
        category: 'WATER_AND_SANITATION',
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.351,
        longitude: 85.321,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    await clusterService.clusterCitizenReport(chalB.id);

    const reloadedB = await chalRepo.findOneBy({ id: chalB.id });
    assert(reloadedB?.cluster_id !== null && reloadedB?.cluster_id !== undefined, 'Second challenge clustered');
    assert(reloadedA?.cluster_id === reloadedB?.cluster_id, 'Both high-similarity challenges clustered together');

    // -------------------------------------------------------------------------
    // Scenario 3: 2 Concurrent Submissions in Same District (Advisory Lock Safety)
    // -------------------------------------------------------------------------
    console.log('\n▶ SCENARIO 3: Verifying 2 Concurrent Submissions in Same District...');
    const chalC = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Dangerous electrical sparks from substation on Kanke Road',
        description: 'Open electrical transformer throwing sparks near residential area on Kanke Road endangering pedestrians',
        category: 'POWER_AND_ENERGY',
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.40,
        longitude: 85.31,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    const chalD = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Dangerous electrical sparks from substation on Kanke Road corner',
        description: 'Open electrical transformer throwing sparks near residential area on Kanke Road endangering pedestrians',
        category: 'POWER_AND_ENERGY',
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.401,
        longitude: 85.311,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    await Promise.all([
      clusterService.clusterCitizenReport(chalC.id),
      clusterService.clusterCitizenReport(chalD.id),
    ]);

    const reloadedC = await chalRepo.findOneBy({ id: chalC.id });
    const reloadedD = await chalRepo.findOneBy({ id: chalD.id });

    assert(reloadedC?.cluster_id !== null, 'Concurrent challenge C assigned cluster');
    assert(reloadedD?.cluster_id !== null, 'Concurrent challenge D assigned cluster');
    assert(reloadedC?.cluster_id === reloadedD?.cluster_id, 'Concurrent submissions merged into exactly 1 cluster without race duplicate');

    // -------------------------------------------------------------------------
    // Scenario 4: Multi-District Parallel Processing
    // -------------------------------------------------------------------------
    console.log('\n▶ SCENARIO 4: Verifying Multi-District Parallel Execution...');
    const chalRanchi = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Road subsidence near Ranchi Airport road',
        description: 'Road cave in after heavy rain near airport approach causing vehicle hazard',
        category: 'ROADS_AND_TRANSPORT',
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.31,
        longitude: 85.32,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    const chalDhanbad = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Coal dust emission near Bank More Dhanbad depot',
        description: 'Excessive coal dust emission near Bank More coal depot creating heavy air pollution',
        category: 'ENVIRONMENT',
        district: 'Dhanbad',
        district_id: dhanbadId || ranchiId,
        block_id: dhanbadBlockId || blockId,
        latitude: 23.79,
        longitude: 86.43,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    await Promise.all([
      clusterService.clusterCitizenReport(chalRanchi.id),
      clusterService.clusterCitizenReport(chalDhanbad.id),
    ]);

    const resRanchi = await chalRepo.findOneBy({ id: chalRanchi.id });
    const resDhanbad = await chalRepo.findOneBy({ id: chalDhanbad.id });

    assert(resRanchi?.cluster_id !== null && resDhanbad?.cluster_id !== null, 'Both district submissions assigned clusters');
    assert(resRanchi?.cluster_id !== resDhanbad?.cluster_id, 'Ranchi and Dhanbad challenges formed distinct clusters without cross-district lock clash');

    // -------------------------------------------------------------------------
    // Scenario 5: Atomic verifyCluster Transaction
    // -------------------------------------------------------------------------
    console.log('\n▶ SCENARIO 5: Verifying Atomic verifyCluster Transaction Integrity...');
    const clusterToVerify = await clusterRepo.findOne({
      where: { id: reloadedC?.cluster_id! },
      relations: ['reports'],
    });
    assert(clusterToVerify !== null, 'Found cluster for verification');

    const verified = await clusterService.verifyCluster(clusterToVerify!.id, testOfficer.id);
    assert(verified.status === ProblemClusterStatus.VALIDATED, 'Cluster transitioned to VALIDATED');
    assert(verified.government_verification_status === 'VERIFIED', 'Government verification status is VERIFIED');

    const memberChallenges = await chalRepo.find({ where: { cluster_id: clusterToVerify!.id } });
    assert(memberChallenges.length >= 2, `Cluster has ${memberChallenges.length} member challenges`);
    assert(memberChallenges.every((c) => c.status === ChallengeStatus.VALIDATED), 'All member challenges atomically transitioned to VALIDATED');
  } finally {
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 3 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runClusteringConcurrencyVerification().catch((err) => {
  console.error('Fatal error in verify-clustering-concurrency:', err);
  process.exit(1);
});
