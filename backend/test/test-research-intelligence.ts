import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { ChallengeAiAnalysis } from '../src/modules/ai-analysis/entities/challenge-ai-analysis.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { OrganizationMembership } from '../src/modules/organizations/entities/organization-membership.entity';
import { RecommendationReview } from '../src/modules/reviews/entities/recommendation-review.entity';
import { JurisdictionService } from '../src/modules/auth/services/jurisdiction.service';
import { ResearchIntelligenceService } from '../src/modules/research-intelligence/research-intelligence.service';
import { ChallengeStatus, UserRole } from '../src/common/enums';
import { ConfigService } from '@nestjs/config';

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

async function main() {
  console.log('============================================================');
  console.log('🧪 SamadhanSetu Research Intelligence Test Suite');
  console.log('============================================================\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres_password',
    database: 'samadhan_setu',
    entities: ALL_ENTITIES,
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('📦 Connected to SamadhanSetu PostgreSQL database.\n');

  const challengeRepo = dataSource.getRepository(Challenge);
  const aiAnalysisRepo = dataSource.getRepository(ChallengeAiAnalysis);
  const userRepo = dataSource.getRepository(User);
  const memberRepo = dataSource.getRepository(OrganizationMembership);
  const reviewRepo = dataSource.getRepository(RecommendationReview);

  const jurisdictionService = new JurisdictionService();
  const mockConfigService = {
    get: (key: string) => {
      if (key === 'RESEARCH_ENGINE_URL') return 'http://127.0.0.1:8001';
      return null;
    },
  } as unknown as ConfigService;

  const researchService = new ResearchIntelligenceService(
    challengeRepo,
    aiAnalysisRepo,
    userRepo,
    memberRepo,
    reviewRepo,
    jurisdictionService,
    mockConfigService,
  );

  // 1. Find a validated challenge with AI analysis
  const validatedChallenge = await challengeRepo.findOne({
    where: { status: ChallengeStatus.VALIDATED },
    relations: ['aiAnalysis'],
  });

  assert(!!validatedChallenge, 'Found a validated challenge in database', validatedChallenge?.id);

  if (!validatedChallenge) {
    console.error('No validated challenge found to test. Exiting.');
    await dataSource.destroy();
    process.exit(1);
  }

  // 2. Test Authorized Access - University User
  console.log('\n--- Test 1: Authorized Access (University Role) ---');
  const universityUser = {
    id: 'test-uni-user-id',
    role: UserRole.UNIVERSITY_ADMIN,
    organization_id: 'test-org-id',
  };

  const response = await researchService.getRecommendations(validatedChallenge.id, universityUser);
  assert(response.status === 'available', 'Research recommendations returned status "available"');
  assert(response.challengeId === validatedChallenge.id, 'Response matches requested challengeId');
  assert(Array.isArray(response.papers) && response.papers.length > 0, `Returned ${response.papers.length} recommended papers`);
  assert(Array.isArray(response.datasets) && response.datasets.length > 0, `Returned ${response.datasets.length} recommended datasets`);
  assert(response.cached === false, 'First call is not cached (cached === false)');

  // Verify paper DTO structure
  const firstPaper = response.papers[0];
  assert(typeof firstPaper.id === 'number', 'Paper has valid numeric ID');
  assert(typeof firstPaper.title === 'string' && firstPaper.title.length > 0, 'Paper has non-empty title');
  assert(typeof firstPaper.relevanceScore === 'number' && firstPaper.relevanceScore > 0, 'Paper has positive relevanceScore');
  assert(firstPaper.scoreBreakdown && typeof firstPaper.scoreBreakdown.semantic === 'number', 'Paper has semantic scoreBreakdown');
  assert(typeof firstPaper.scoreBreakdown.keyword === 'number', 'Paper has keyword scoreBreakdown');
  assert(typeof firstPaper.scoreBreakdown.domain === 'number', 'Paper has domain scoreBreakdown');

  // Verify dataset DTO structure
  const firstDataset = response.datasets[0];
  assert(typeof firstDataset.id === 'number', 'Dataset has valid numeric ID');
  assert(typeof firstDataset.title === 'string' && firstDataset.title.length > 0, 'Dataset has non-empty title');
  assert(typeof firstDataset.relevanceScore === 'number' && firstDataset.relevanceScore > 0, 'Dataset has positive relevanceScore');
  assert(firstDataset.scoreBreakdown && typeof firstDataset.scoreBreakdown.semantic === 'number', 'Dataset has semantic scoreBreakdown');

  // 3. Test Caching (24 Hours)
  console.log('\n--- Test 2: In-Memory Caching ---');
  const cachedResponse = await researchService.getRecommendations(validatedChallenge.id, universityUser);
  assert(cachedResponse.cached === true, 'Subsequent call returns cached response (cached === true)');
  assert(cachedResponse.papers.length === response.papers.length, 'Cached papers match original count');

  // 4. Test Cache Invalidation
  console.log('\n--- Test 3: Cache Invalidation ---');
  researchService.invalidateCache(validatedChallenge.id);
  const refreshedResponse = await researchService.getRecommendations(validatedChallenge.id, universityUser);
  assert(refreshedResponse.cached === false, 'After invalidation, recommendation is computed fresh (cached === false)');

  // 5. Test Access Control - Citizen Restriction
  console.log('\n--- Test 4: RBAC Citizen Access Restriction ---');
  const citizenUser = {
    id: 'test-citizen-user-id',
    role: UserRole.CITIZEN,
  };

  let citizenBlocked = false;
  try {
    await researchService.getRecommendations(validatedChallenge.id, citizenUser);
  } catch (err: any) {
    citizenBlocked = err.status === 403 || err.name === 'ForbiddenException';
  }
  assert(citizenBlocked, 'Citizen user is blocked with ForbiddenException');

  // 6. Test Access Control - Draft Challenge Protection
  console.log('\n--- Test 5: Draft Challenge Access Boundary ---');
  // Find or create a draft challenge
  let draftChallenge = await challengeRepo.findOne({
    where: { status: ChallengeStatus.DRAFT },
  });

  if (!draftChallenge) {
    draftChallenge = challengeRepo.create({
      title: 'Temporary Draft Test Challenge',
      description: 'Temporary draft description for access test.',
      status: ChallengeStatus.DRAFT,
      original_language: 'en',
    });
    draftChallenge = await challengeRepo.save(draftChallenge);
  }

  let draftBlocked = false;
  try {
    await researchService.getRecommendations(draftChallenge.id, universityUser);
  } catch (err: any) {
    draftBlocked = err.status === 403 || err.name === 'ForbiddenException';
  }
  assert(draftBlocked, 'University cannot access research intelligence for DRAFT challenge');

  // 7. Test Failure Isolation / Degraded Fallback
  console.log('\n--- Test 6: Failure Isolation (Degraded Fallback) ---');
  const deadConfigService = {
    get: (key: string) => {
      if (key === 'RESEARCH_ENGINE_URL') return 'http://127.0.0.1:9999'; // Dead port
      return null;
    },
  } as unknown as ConfigService;

  const resilientService = new ResearchIntelligenceService(
    challengeRepo,
    aiAnalysisRepo,
    userRepo,
    memberRepo,
    reviewRepo,
    jurisdictionService,
    deadConfigService,
  );

  const fallbackResponse = await resilientService.getRecommendations(validatedChallenge.id, universityUser);
  assert(fallbackResponse.status === 'unavailable', 'When engine is unreachable, returns status "unavailable"');
  assert(Array.isArray(fallbackResponse.papers) && fallbackResponse.papers.length === 0, 'Gracefully returns empty papers array');
  assert(Array.isArray(fallbackResponse.datasets) && fallbackResponse.datasets.length === 0, 'Gracefully returns empty datasets array');
  assert(typeof fallbackResponse.message === 'string' && fallbackResponse.message.length > 0, 'Graceful fallback includes human-readable message');

  await dataSource.destroy();

  console.log('\n============================================================');
  console.log(`Research Intelligence Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
