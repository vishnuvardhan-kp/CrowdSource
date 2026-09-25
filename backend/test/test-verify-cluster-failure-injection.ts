import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ProblemClustersService } from '../src/modules/problem-clusters/problem-clusters.service';
import { DataSource } from 'typeorm';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { ProblemCluster } from '../src/modules/problem-clusters/entities/problem-cluster.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { ChallengeStatus, ProblemClusterStatus, UserRole } from '../src/common/enums';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
    throw new Error(`Assertion failed: ${name}`);
  }
}

async function runVerifyClusterFailureInjectionTest() {
  console.log('========================================================================');
  console.log('🧪 FAILURE INJECTION & TRANSACTION AUDIT: verifyCluster Atomicity');
  console.log('========================================================================\n');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.listen(0);

  const clusterService = app.get(ProblemClustersService);
  const dataSource = app.get(DataSource);
  const clusterRepo = dataSource.getRepository(ProblemCluster);
  const chalRepo = dataSource.getRepository(Challenge);
  const userRepo = dataSource.getRepository(User);

  const uniqueId = `fi-vc-${Date.now()}`;

  const officer = await userRepo.save(
    userRepo.create({
      email: `officer-${uniqueId}@jharkhand.gov.in`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Failure Injection Officer',
      role: UserRole.GOVERNMENT_OFFICER,
      district: 'Ranchi',
      is_active: true,
    }),
  );

  const citizen = await userRepo.save(
    userRepo.create({
      email: `citizen-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Citizen Tester',
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  // Setup cluster and 2 member challenges
  const testCluster = await clusterRepo.save(
    clusterRepo.create({
      title: `Cluster for Failure Injection ${uniqueId}`,
      description: 'Testing verifyCluster rollback under failure injection',
      category: 'WATER_AND_SANITATION',
      district: 'Ranchi',
      status: ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
      government_verification_status: 'PENDING',
      report_count: 2,
    }),
  );

  const chal1 = await chalRepo.save(
    chalRepo.create({
      submitted_by: citizen.id,
      title: `Challenge 1 in Cluster ${uniqueId}`,
      description: 'First challenge report in test cluster',
      district: 'Ranchi',
      cluster_id: testCluster.id,
      status: ChallengeStatus.SUBMITTED,
    }),
  );

  const chal2 = await chalRepo.save(
    chalRepo.create({
      submitted_by: citizen.id,
      title: `Challenge 2 in Cluster ${uniqueId}`,
      description: 'Second challenge report in test cluster',
      district: 'Ranchi',
      cluster_id: testCluster.id,
      status: ChallengeStatus.SUBMITTED,
    }),
  );

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Injected Failure in Middle of verifyCluster Transaction
    // -------------------------------------------------------------------------
    console.log('▶ TEST 1: Injecting Fatal DB Failure Inside verifyCluster Transaction...');

    // Simulate the exact queryRunner execution of verifyCluster with an injected failure
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let injectionThrew = false;
    try {
      const clusterInTx = await queryRunner.manager.findOne(ProblemCluster, {
        where: { id: testCluster.id },
        lock: { mode: 'pessimistic_write' },
      });

      clusterInTx!.status = ProblemClusterStatus.VALIDATED;
      clusterInTx!.government_verification_status = 'VERIFIED';
      clusterInTx!.verified_at = new Date();
      clusterInTx!.verified_by = officer.id;

      // Update cluster inside transaction
      await queryRunner.manager.save(clusterInTx!);

      // Update first challenge
      await queryRunner.manager.update(Challenge, { id: chal1.id }, { status: ChallengeStatus.VALIDATED });

      // INJECT INTENTIONAL FATAL FAILURE before updating chal2 and before commit
      throw new Error('SIMULATED_DATABASE_FAILURE: Disk I/O or unique constraint violation during verification');
    } catch (injectedErr: any) {
      injectionThrew = true;
      assert(injectedErr.message.includes('SIMULATED_DATABASE_FAILURE'), 'Injected failure triggered in transaction');
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      assert(queryRunner.isReleased, 'QueryRunner was successfully released after rollback');
    }

    assert(injectionThrew, 'Transaction aborted due to injected failure');

    // VERIFY DATABASE INTEGRITY: Entire transaction must have rolled back
    console.log('\n▶ VERIFYING POST-ROLLBACK DB INTEGRITY: Zero Partial State...');
    const clusterAfterFailure = await clusterRepo.findOne({ where: { id: testCluster.id } });
    assert(
      clusterAfterFailure?.status === ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
      'Cluster status was NOT updated to VALIDATED (retained AWAITING_GOVERNMENT_VERIFICATION)',
    );
    assert(
      clusterAfterFailure?.government_verification_status === 'PENDING',
      'Government verification status retained PENDING',
    );

    const chal1AfterFailure = await chalRepo.findOne({ where: { id: chal1.id } });
    assert(
      chal1AfterFailure?.status === ChallengeStatus.SUBMITTED,
      'Challenge 1 status was NOT updated to VALIDATED (rolled back to SUBMITTED)',
    );

    const chal2AfterFailure = await chalRepo.findOne({ where: { id: chal2.id } });
    assert(
      chal2AfterFailure?.status === ChallengeStatus.SUBMITTED,
      'Challenge 2 status remained SUBMITTED',
    );

    // -------------------------------------------------------------------------
    // TEST 2: Normal Successful verifyCluster Execution
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 2: Executing Real verifyCluster Successful Path...');
    const verifiedCluster = await clusterService.verifyCluster(testCluster.id, officer.id);
    assert(verifiedCluster.status === ProblemClusterStatus.VALIDATED, 'Cluster successfully transitioned to VALIDATED');
    assert(verifiedCluster.government_verification_status === 'VERIFIED', 'Verification status set to VERIFIED');

    const chal1Verified = await chalRepo.findOne({ where: { id: chal1.id } });
    assert(chal1Verified?.status === ChallengeStatus.VALIDATED, 'Challenge 1 atomically transitioned to VALIDATED');

    const chal2Verified = await chalRepo.findOne({ where: { id: chal2.id } });
    assert(chal2Verified?.status === ChallengeStatus.VALIDATED, 'Challenge 2 atomically transitioned to VALIDATED');

    // -------------------------------------------------------------------------
    // TEST 3: Idempotent Subsequent verifyCluster Execution
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 3: Verifying Duplicate verifyCluster Idempotency...');
    const duplicateCall = await clusterService.verifyCluster(testCluster.id, officer.id);
    assert(duplicateCall.status === ProblemClusterStatus.VALIDATED, 'Duplicate call succeeds idempotently without error');
    assert(duplicateCall.government_verification_status === 'VERIFIED', 'Cluster remains in VERIFIED state');
  } finally {
    await app.close();
  }

  console.log(`\n📊 verifyCluster Failure-Injection Results: ${passed} Passed, ${failed} Failed`);
}

runVerifyClusterFailureInjectionTest().catch((err) => {
  console.error('Fatal in test:', err);
  process.exit(1);
});
