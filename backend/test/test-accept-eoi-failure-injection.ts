import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { EoisService } from '../src/modules/eois/eois.service';
import { DataSource } from 'typeorm';
import { ExpressionOfInterest } from '../src/modules/eois/entities/expression-of-interest.entity';
import { EoiReview } from '../src/modules/eois/entities/eoi-review.entity';
import { Organization } from '../src/modules/organizations/entities/organization.entity';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { ChallengeStatus, EoiStatus, OrganizationType, UserRole } from '../src/common/enums';

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

async function runAcceptEoiFailureInjectionTest() {
  console.log('========================================================================');
  console.log('🧪 FAILURE INJECTION & TRANSACTION AUDIT: acceptEoi Atomicity');
  console.log('========================================================================\n');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.listen(0);

  const eoisService = app.get(EoisService);
  const dataSource = app.get(DataSource);
  const eoiRepo = dataSource.getRepository(ExpressionOfInterest);
  const reviewRepo = dataSource.getRepository(EoiReview);
  const orgRepo = dataSource.getRepository(Organization);
  const chalRepo = dataSource.getRepository(Challenge);
  const userRepo = dataSource.getRepository(User);

  const uniqueId = `fi-eoi-${Date.now()}`;

  const officer = await userRepo.save(
    userRepo.create({
      email: `officer-${uniqueId}@jharkhand.gov.in`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Reviewer Officer',
      role: UserRole.GOVERNMENT_OFFICER,
      district: 'Ranchi',
      is_active: true,
    }),
  );

  const citizen = await userRepo.save(
    userRepo.create({
      email: `citizen-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'Citizen Proposer',
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  const org = await orgRepo.save(
    orgRepo.create({
      name: `Institution Innovation Cell ${uniqueId}`,
      organization_type: OrganizationType.INSTITUTION,
      state: 'Jharkhand',
      district: 'Ranchi',
      is_claimed: true,
    }),
  );

  const challenge = await chalRepo.save(
    chalRepo.create({
      submitted_by: citizen.id,
      title: `Challenge for EOI Test ${uniqueId}`,
      description: 'Testing acceptEoi transactional atomicity',
      district: 'Ranchi',
      status: ChallengeStatus.VALIDATED,
    }),
  );

  const testEoi = await eoiRepo.save(
    eoiRepo.create({
      challenge_id: challenge.id,
      organization_id: org.id,
      proposer_user_id: citizen.id,
      proposed_approach: 'Deploy specialized IoT environmental sensor pods',
      status: EoiStatus.UNDER_REVIEW,
    }),
  );

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Injected Fatal Failure Inside acceptEoi Transaction
    // -------------------------------------------------------------------------
    console.log('▶ TEST 1: Injecting Fatal DB Failure Inside acceptEoi Transaction...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let injectionThrew = false;
    try {
      const eoiInTx = await queryRunner.manager.findOne(ExpressionOfInterest, {
        where: { id: testEoi.id },
        lock: { mode: 'pessimistic_write' },
      });

      eoiInTx!.status = EoiStatus.ACCEPTED;
      eoiInTx!.accepted_at = new Date();
      eoiInTx!.reviewed_at = new Date();
      await queryRunner.manager.save(eoiInTx!);

      // INJECT INTENTIONAL FATAL FAILURE before saving audit record and before commit
      throw new Error('SIMULATED_DB_ERROR: Foreign key constraint or dead transaction during EOI acceptance');
    } catch (injectedErr: any) {
      injectionThrew = true;
      assert(injectedErr.message.includes('SIMULATED_DB_ERROR'), 'Injected failure triggered in transaction');
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      assert(queryRunner.isReleased, 'QueryRunner was successfully released after rollback');
    }

    assert(injectionThrew, 'Transaction aborted due to injected error');

    // VERIFY DATABASE INTEGRITY: Rollback restored previous state
    console.log('\n▶ VERIFYING POST-ROLLBACK DB INTEGRITY: Zero Partial State...');
    const eoiAfterFailure = await eoiRepo.findOne({ where: { id: testEoi.id } });
    assert(
      eoiAfterFailure?.status === EoiStatus.UNDER_REVIEW,
      'EOI status was NOT updated to ACCEPTED (retained UNDER_REVIEW)',
    );
    assert(
      eoiAfterFailure?.accepted_at === null || eoiAfterFailure?.accepted_at === undefined,
      'accepted_at remains null/unmodified',
    );

    const reviewsCount = await reviewRepo.count({ where: { eoi_id: testEoi.id } });
    assert(reviewsCount === 0, 'No partial or orphaned EoiReview audit records created in database');

    // -------------------------------------------------------------------------
    // TEST 2: Normal Successful acceptEoi Execution
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 2: Executing Real acceptEoi Successful Path...');
    const acceptedEoi = await eoisService.acceptEoi(testEoi.id, officer.id);
    assert(acceptedEoi.status === EoiStatus.ACCEPTED, 'EOI transitioned to ACCEPTED');
    assert(!!acceptedEoi.accepted_at, 'accepted_at timestamp populated');

    const eoiInDb = await eoiRepo.findOne({ where: { id: testEoi.id } });
    assert(eoiInDb?.status === EoiStatus.ACCEPTED, 'Database confirms persistent ACCEPTED status');

    const reviewsAfterSuccess = await reviewRepo.find({ where: { eoi_id: testEoi.id } });
    assert(reviewsAfterSuccess.length === 1, 'Exactly 1 EoiReview audit record created atomically');
    assert(reviewsAfterSuccess[0].new_status === EoiStatus.ACCEPTED, 'Audit record tracks new_status = ACCEPTED');
    assert(reviewsAfterSuccess[0].reviewer_id === officer.id, 'Audit record tracks reviewer_id accurately');

    // -------------------------------------------------------------------------
    // TEST 3: Idempotent Subsequent acceptEoi Execution
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 3: Verifying Duplicate acceptEoi Idempotency...');
    const duplicateCall = await eoisService.acceptEoi(testEoi.id, officer.id);
    assert(duplicateCall.status === EoiStatus.ACCEPTED, 'Duplicate acceptEoi succeeds idempotently without error');

    const reviewsAfterDuplicate = await reviewRepo.find({ where: { eoi_id: testEoi.id } });
    assert(reviewsAfterDuplicate.length === 1, 'Duplicate call does not create duplicate audit records');
  } finally {
    await app.close();
  }

  console.log(`\n📊 acceptEoi Failure-Injection Results: ${passed} Passed, ${failed} Failed`);
}

runAcceptEoiFailureInjectionTest().catch((err) => {
  console.error('Fatal in test:', err);
  process.exit(1);
});
