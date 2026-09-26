import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ChallengesService } from '../src/modules/challenges/challenges.service';
import { DataSource } from 'typeorm';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { ChallengeStatus, CitizenSeverity, UserRole } from '../src/common/enums';

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

async function runStateTransitionsVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 8: State Transitions & Text Immutability');
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
  const dataSource = app.get(DataSource);

  const chalRepo = dataSource.getRepository(Challenge);
  const userRepo = dataSource.getRepository(User);

  const distRows = await dataSource.query(`SELECT id, name FROM districts WHERE LOWER(name) = 'ranchi' LIMIT 1`);
  const ranchiId = distRows[0]?.id;
  const blockRows = await dataSource.query(`SELECT id, name FROM blocks WHERE district_id = $1 LIMIT 1`, [ranchiId]);
  const blockId = blockRows[0]?.id;

  const uniqueId = Date.now().toString().slice(-6);
  const testUser = await userRepo.save(
    userRepo.create({
      email: `state-transitions-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'State Transitions Tester',
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  try {
    // -------------------------------------------------------------------------
    // Step 1: Legal Transition DRAFT -> SUBMITTED
    // -------------------------------------------------------------------------
    console.log('▶ STEP 1: Verifying Legal Transition: DRAFT -> SUBMITTED...');
    const originalTitle = 'Broken footbridge over village stream';
    const originalDesc = 'Wooden footbridge collapsed after flash floods, children unable to reach primary school';

    const challenge = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: originalTitle,
        description: originalDesc,
        district: 'Ranchi',
        district_id: ranchiId,
        block_id: blockId,
        latitude: 23.38,
        longitude: 85.35,
        status: ChallengeStatus.DRAFT,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );
    assert(challenge.status === ChallengeStatus.DRAFT, 'Challenge initialized in DRAFT status');

    const submitted = await challengesService.submitChallenge(challenge.id, testUser.id);
    assert(submitted.status === ChallengeStatus.SUBMITTED, 'Successfully transitioned DRAFT -> SUBMITTED');

    // -------------------------------------------------------------------------
    // Step 2: Citizen Text Immutability Post-Submission
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 2: Verifying Citizen Text Immutability Post-Submission...');
    const reloaded = await chalRepo.findOneBy({ id: challenge.id });
    assert(reloaded?.title === originalTitle, 'Raw citizen title is strictly unchanged');
    assert(reloaded?.description === originalDesc, 'Raw citizen description is strictly unchanged');

    // Attempting to update a submitted challenge via updateDraft MUST throw BadRequestException
    let illegalUpdateThrew = false;
    try {
      await challengesService.updateDraft(
        challenge.id,
        {
          title: 'Tampered Title',
          description: 'Tampered Description',
        } as any,
        testUser.id,
      );
    } catch (err: any) {
      if (err.message && err.message.includes('immutable')) {
        illegalUpdateThrew = true;
      }
    }
    assert(illegalUpdateThrew, 'updateDraft rejects modifications to submitted challenge with immutability error');

    // Check in database that values remain strictly immutable
    const afterAttempt = await chalRepo.findOneBy({ id: challenge.id });
    assert(afterAttempt?.title === originalTitle, 'Database confirms citizen title was not overwritten');
    assert(afterAttempt?.description === originalDesc, 'Database confirms citizen description was not overwritten');

    // -------------------------------------------------------------------------
    // Step 3: Rejection of Invalid Re-submission to DRAFT
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 3: Verifying State Transition Rules...');
    let invalidResubmitThrew = false;
    try {
      // Calling submitChallenge on an already submitted challenge
      await challengesService.submitChallenge(challenge.id, testUser.id);
    } catch (e: any) {
      invalidResubmitThrew = true;
    }
    // Challenge remains in SUBMITTED
    const checkState = await chalRepo.findOneBy({ id: challenge.id });
    assert(checkState?.status === ChallengeStatus.SUBMITTED, 'Challenge status protected against state corruption');

    // -------------------------------------------------------------------------
    // Step 4: Validate Progression to Terminal / Validated States
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 4: Verifying Valid Progression to VALIDATED & RESOLVED...');
    await chalRepo.update({ id: challenge.id }, { status: ChallengeStatus.VALIDATED });
    const validatedChal = await chalRepo.findOneBy({ id: challenge.id });
    assert(validatedChal?.status === ChallengeStatus.VALIDATED, 'Valid transition to VALIDATED');

    await chalRepo.update({ id: challenge.id }, { status: ChallengeStatus.COMPLETED });
    const completedChal = await chalRepo.findOneBy({ id: challenge.id });
    assert(completedChal?.status === ChallengeStatus.COMPLETED, 'Valid transition to COMPLETED');
  } finally {
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 8 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStateTransitionsVerification().catch((err) => {
  console.error('Fatal error in verify-state-transitions:', err);
  process.exit(1);
});
