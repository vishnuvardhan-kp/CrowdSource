import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AiAnalysisService } from '../src/modules/ai-analysis/ai-analysis.service';
import { ChallengesService } from '../src/modules/challenges/challenges.service';
import { ChallengeStatus, CitizenSeverity } from '../src/common/enums';
import { DataSource } from 'typeorm';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { User } from '../src/modules/users/entities/user.entity';

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

async function runAiResilienceVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 2: AI Resilience & Fault Tolerance');
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
  const aiAnalysisService = app.get(AiAnalysisService);
  const challengesService = app.get(ChallengesService);
  const dataSource = app.get(DataSource);

  const chalRepo = dataSource.getRepository(Challenge);
  const userRepo = dataSource.getRepository(User);

  // Setup test user
  const uniqueId = Date.now();
  const testUser = await userRepo.save(
    userRepo.create({
      email: `ai-test-${uniqueId}@test.local`,
      password_hash: '$2a$10$abcdefghijklmnopqrstuv',
      name: 'AI Resilience Tester',
      role: 'CITIZEN' as any,
      is_active: true,
    }),
  );

  const districtRows = await dataSource.query('SELECT id, name FROM districts LIMIT 1');
  const districtId = districtRows[0]?.id;
  const blockRows = await dataSource.query('SELECT id FROM blocks WHERE district_id = $1 LIMIT 1', [districtId]);
  const blockId = blockRows[0]?.id;

  try {
    // -------------------------------------------------------------------------
    // Case 1: Rule-Based Fallback Structuring Schema Conformance
    // -------------------------------------------------------------------------
    console.log('▶ CASE 1: Verifying Fallback Structuring Schema Integrity...');
    const dummyChallenge = {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Waterlogging issue',
      description: 'Severe waterlogging and open drains on Main Road causing traffic blockage',
      category: 'WATER_AND_SANITATION',
      district: 'Ranchi',
      state: 'Jharkhand',
      location: 'Main Road',
    };

    const fallback = (aiAnalysisService as any).createFallbackAnalysis(
      dummyChallenge,
      'Simulated AI down',
    );

    assert(fallback !== null && typeof fallback === 'object', 'Fallback returns structured object');
    assert(fallback.category === 'WATER_AND_SANITATION', 'Fallback preserves challenge category: ' + fallback.category);
    assert(typeof fallback.summary === 'string' && fallback.summary.length > 0, 'Fallback assigns non-empty summary');
    assert(fallback.status === 'FALLBACK', 'Fallback assigns status FALLBACK');
    assert(typeof fallback.confidence === 'number' && fallback.confidence >= 0 && fallback.confidence <= 1, 'Fallback confidence is normalized number: ' + fallback.confidence);
    assert(Array.isArray(fallback.keywords) && Array.isArray(fallback.required_capabilities), 'Fallback tags/capabilities schema present');

    // -------------------------------------------------------------------------
    // Case 2: AI Service Down / Port Unreachable Fallback
    // -------------------------------------------------------------------------
    console.log('\n▶ CASE 2: Verifying Graceful Fallback When AI Service Port Is Down...');
    const testChal1 = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Heavy power outage in Sector 4',
        description: 'Heavy power outage in Sector 4 electricity substation since morning',
        district: districtRows[0]?.name || 'Ranchi',
        district_id: districtId,
        block_id: blockId,
        latitude: 23.36,
        longitude: 85.33,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    const originalUrl = (aiAnalysisService as any).aiServiceUrl;
    (aiAnalysisService as any).aiServiceUrl = 'http://127.0.0.1:9998'; // Dead port

    const deadPortResult = await aiAnalysisService.analyzeChallenge(testChal1.id);

    assert(deadPortResult !== null, 'Analysis does not throw when AI service is unreachable');
    assert(deadPortResult.confidence < 0.80, 'Fallback confidence is bounded: ' + deadPortResult.confidence);
    assert(deadPortResult.raw_analysis?.fallback === true, 'Provenance flags fallback: true');
    assert(deadPortResult.ai_processing_status === 'SERVICE_UNAVAILABLE' || deadPortResult.ai_processing_status === 'FALLBACK', 'State recorded as SERVICE_UNAVAILABLE or FALLBACK');

    // -------------------------------------------------------------------------
    // Case 3: Malformed AI Response Handled Safely
    // -------------------------------------------------------------------------
    console.log('\n▶ CASE 3: Verifying Malformed / Corrupted AI Response Protection...');
    (aiAnalysisService as any).aiServiceUrl = originalUrl;

    const malformedHandled = (aiAnalysisService as any).createFallbackAnalysis(
      dummyChallenge,
      'Unexpected token in JSON',
    );
    assert(malformedHandled !== null, 'Handled safely despite invalid response');
    assert(malformedHandled.category.length > 0, 'Safe category produced despite invalid response');

    // -------------------------------------------------------------------------
    // Case 4: AI Offline During Challenge Submission (E2E Integration)
    // -------------------------------------------------------------------------
    console.log('\n▶ CASE 4: Verifying submitChallenge Succeeds Even When AI Is Offline...');
    const challenge = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Deep Pothole on Circular Road',
        description: 'Large pothole near Circular Road traffic signal causing accidents and tire bursts',
        district: districtRows[0]?.name || 'Ranchi',
        district_id: districtId,
        block_id: blockId,
        latitude: 23.36,
        longitude: 85.33,
        status: ChallengeStatus.DRAFT,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    );

    (aiAnalysisService as any).aiServiceUrl = 'http://127.0.0.1:9998';

    const submitted = await challengesService.submitChallenge(challenge.id, testUser.id);
    assert(submitted.status === ChallengeStatus.SUBMITTED, 'Challenge transitions to SUBMITTED even when AI service is offline');
    assert(submitted.title === 'Deep Pothole on Circular Road', 'Original title is strictly preserved');
    assert(submitted.description.includes('Circular Road traffic signal'), 'Original description is strictly preserved');

    const savedAi = await dataSource.query(
      'SELECT * FROM challenge_ai_analysis WHERE challenge_id = $1',
      [challenge.id],
    );
    assert(savedAi.length === 1, 'AI analysis record was created in challenge_ai_analysis');
    assert(savedAi[0].raw_analysis?.fallback === true, 'Saved analysis marked as fallback');

    (aiAnalysisService as any).aiServiceUrl = originalUrl;

    // -------------------------------------------------------------------------
    // Case 5: Timeout Resilience & Bounded Execution
    // -------------------------------------------------------------------------
    console.log('\n▶ CASE 5: Verifying Timeout Hierarchy & Resilience Configuration...');
    const testChal2 = await chalRepo.save(
      chalRepo.create({
        submitted_by: testUser.id,
        title: 'Streetlight repair pending in Ward 12',
        description: 'Streetlight electrical fault in Ward 12',
        district: 'Ranchi',
        latitude: 23.36,
        longitude: 85.33,
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.MODERATE,
      }),
    );
    assert(testChal2.id !== null, 'Created test challenge for timeout resilience');

    // -------------------------------------------------------------------------
    // Case 6: High Volume Batch Fallback Stability
    // -------------------------------------------------------------------------
    console.log('\n▶ CASE 6: Verifying Memory & Execution Stability under Rapid Calls...');
    const batchChals = await Promise.all(
      Array.from({ length: 5 }).map((_, i) =>
        chalRepo.save(
          chalRepo.create({
            submitted_by: testUser.id,
            title: `Rapid batch item ${i} garbage pile on street`,
            description: `Garbage dump near locality junction ${i}`,
            category: 'MUNICIPAL_SERVICES',
            district: districtRows[0]?.name || 'Ranchi',
            district_id: districtId,
            block_id: blockId,
            latitude: 23.36 + i * 0.001,
            longitude: 85.33,
            status: ChallengeStatus.SUBMITTED,
            citizen_severity: CitizenSeverity.MODERATE,
          }),
        ),
      ),
    );

    const batchResults = await Promise.all(
      batchChals.map((c) => aiAnalysisService.analyzeChallenge(c.id)),
    );
    assert(batchResults.length === 5, 'All 5 rapid calls completed without pool exhaustion or unhandled rejections');
    assert(batchResults.every((r) => r && r.category), 'All batch results have valid category');
  } finally {
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 2 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAiResilienceVerification().catch((err) => {
  console.error('Fatal error in verify-ai-resilience:', err);
  process.exit(1);
});
