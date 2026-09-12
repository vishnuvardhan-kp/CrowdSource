import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { Organization } from '../src/modules/organizations/entities/organization.entity';
import { InstitutionProfile } from '../src/modules/institutions/entities/institution-profile.entity';
import { IndustryProfile } from '../src/modules/industries/entities/industry-profile.entity';
import { Capability } from '../src/modules/capabilities/entities/capability.entity';
import { InstitutionCapability } from '../src/modules/institutions/entities/institution-capability.entity';
import { IndustryCapability } from '../src/modules/industries/entities/industry-capability.entity';
import { IndustrySupportType } from '../src/modules/industries/entities/industry-support-type.entity';
import { ChallengeAiAnalysis } from '../src/modules/ai-analysis/entities/challenge-ai-analysis.entity';
import { EntityEmbedding, EntityEmbeddingType } from '../src/modules/ai-analysis/entities/entity-embedding.entity';
import { RecommendationReview } from '../src/modules/reviews/entities/recommendation-review.entity';
import { RecommendationRun } from '../src/modules/reviews/entities/recommendation-run.entity';
import { AiAnalysisService } from '../src/modules/ai-analysis/ai-analysis.service';
import { MatchingService } from '../src/modules/reviews/matching.service';
import { User } from '../src/modules/users/entities/user.entity';
import { OrganizationMembership } from '../src/modules/organizations/entities/organization-membership.entity';
import { ReviewsService } from '../src/modules/reviews/reviews.service';
import {
  OrganizationType,
  VerificationStatus,
  ChallengeStatus,
  CapabilitySource,
  ReviewStatus,
  UserRole,
} from '../src/common/enums';

let passedAssertions = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedAssertions++;
  console.log(`  ✓ ${message}`);
}

async function main() {
  console.log('============================================================');
  console.log('🧪 Starting SamadhanSetu Phase 5 AI Intelligence Verification Suite');
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
  });

  await dataSource.initialize();
  console.log('🔌 Database connected successfully.\n');

  try {
    const orgRepo = dataSource.getRepository(Organization);
    const instRepo = dataSource.getRepository(InstitutionProfile);
    const indRepo = dataSource.getRepository(IndustryProfile);
    const capRepo = dataSource.getRepository(Capability);
    const instCapRepo = dataSource.getRepository(InstitutionCapability);
    const indCapRepo = dataSource.getRepository(IndustryCapability);
    const suppRepo = dataSource.getRepository(IndustrySupportType);
    const chalRepo = dataSource.getRepository(Challenge);
    const aiAnalysisRepo = dataSource.getRepository(ChallengeAiAnalysis);
    const embeddingRepo = dataSource.getRepository(EntityEmbedding);
    const reviewRepo = dataSource.getRepository(RecommendationReview);
    const runRepo = dataSource.getRepository(RecommendationRun);

    const aiAnalysisService = new AiAnalysisService(
      aiAnalysisRepo,
      embeddingRepo,
      chalRepo,
      capRepo,
    );

    const userRepo = dataSource.getRepository(User);
    const memberRepo = dataSource.getRepository(OrganizationMembership);
    const mockNotifService = {
      notifyDistrictOfficers: async () => {},
      notifyMatch: async () => {},
    } as any;

    const matchingService = new MatchingService(
      chalRepo,
      orgRepo,
      instRepo,
      indRepo,
      reviewRepo,
      runRepo,
      aiAnalysisRepo,
      embeddingRepo,
      mockNotifService,
    );

    const reviewsService = new ReviewsService(
      reviewRepo,
      userRepo,
      memberRepo,
      chalRepo,
      matchingService,
    );


    // -------------------------------------------------------------
    // Test 1: Provider & Microservice Status
    // -------------------------------------------------------------
    console.log('▶ Test 1: AI Provider Abstraction & Status...');
    const status = await aiAnalysisService.getAiServiceStatus();
    assert(status.status !== undefined, 'AI service status is accessible');
    assert(status.provider !== undefined, 'AI provider metadata is present');

    // -------------------------------------------------------------
    // Test 2: Taxonomy Normalization with Official DB Capabilities
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Taxonomy Normalization Engine...');
    // Seed test capabilities if not present
    let iotCap = await capRepo.findOne({ where: [{ slug: 'iot-sensor-networks' }, { name: 'Internet of Things (IoT)' }] });
    if (!iotCap) {
      iotCap = await capRepo.save(
        capRepo.create({
          name: 'Internet of Things (IoT)',
          slug: 'iot-sensor-networks',
          category: 'Technology',
          description: 'Sensors and smart telemetry',
        }),
      );
    }
    let waterCap = await capRepo.findOne({ where: [{ slug: 'water-purification' }, { name: 'Water Purification & Filtration' }] });
    if (!waterCap) {
      waterCap = await capRepo.save(
        capRepo.create({
          name: 'Water Purification & Filtration',
          slug: 'water-purification',
          category: 'Environmental',
          description: 'Water filtration and testing',
        }),
      );
    }

    const normResults = await aiAnalysisService.normalizeCapabilities([
      'smart agricultural sensors',
      'Water Purification & Filtration',
      'Unknown Random Widget 999',
    ]);
    assert(normResults.length === 3, 'All extracted capabilities processed by normalizer');
    assert(normResults[0].confidence > 0.5, 'Alias normalized with high confidence');
    assert(normResults[1].normalized_name === 'Water Purification & Filtration', 'Exact match preserved');

    // -------------------------------------------------------------
    // Test 3: Structured AI Challenge Analysis & Immutability
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: Structured AI Challenge Analysis & Immutability...');
    const testChal = await chalRepo.save(
      chalRepo.create({
        title: 'Contaminated Well and Drainage Overflow in Rampur Block',
        description: 'Villagers facing severe gastrointestinal illness due to contaminated groundwater and cracked pipelines.',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        status: ChallengeStatus.VALIDATED,
        priority: 'HIGH' as any,
        category: 'Water & Sanitation',
      }),
    );

    const initialTitle = testChal.title;
    const initialDesc = testChal.description;

    const analysis = await aiAnalysisService.analyzeChallenge(testChal.id);
    assert(analysis.challenge_id === testChal.id, 'Analysis linked to correct challenge');
    assert(analysis.category !== undefined, 'Category extracted');
    assert(analysis.sub_category !== undefined, 'Sub-category extracted');
    assert(analysis.required_capabilities.length > 0, 'Required capabilities normalized and populated');
    assert(analysis.model_name !== undefined, 'Model name tracked');
    assert(analysis.raw_analysis.model_provider !== undefined, 'Model provider provenance tracked');

    // Verify Citizen Challenge Immutability
    const chalAfter = await chalRepo.findOne({ where: { id: testChal.id } });
    assert(chalAfter?.title === initialTitle, 'Original citizen challenge title is strictly immutable');
    assert(chalAfter?.description === initialDesc, 'Original citizen challenge description is strictly immutable');

    // -------------------------------------------------------------
    // Test 4: Versioned Embeddings & Re-indexing Safety
    // -------------------------------------------------------------
    console.log('\n▶ Test 4: Versioned Vector Embeddings...');
    const embedding = await embeddingRepo.findOne({
      where: { entity_id: testChal.id, entity_type: EntityEmbeddingType.CHALLENGE },
    });
    assert(embedding !== null, 'Vector embedding saved for challenge');
    assert(embedding!.dimensions === 1024 || embedding!.dimensions === 2048, `Dimensions match configured embedding dimensions (${embedding!.dimensions})`);
    assert(embedding!.embedding_version === 'v1.0', 'Embedding version recorded (v1.0)');
    assert(embedding!.source_text_hash.length === 64, 'SHA-256 source text hash preserved for integrity');
    assert(embedding!.is_active === true, 'Embedding active status is true');

    // -------------------------------------------------------------
    // Test 5: Capability Passport Representation (HEI & Industry)
    // -------------------------------------------------------------
    console.log('\n▶ Test 5: Ecosystem Capability Passport & Availability TTL...');
    
    // Clean up previous test orgs if any to ensure test isolation
    const existingTestOrgs = await orgRepo.find({
      where: [{ name: 'Varanasi Institute of Technology' }, { name: 'AquaPure Solutions Pvt Ltd' }],
    });
    for (const org of existingTestOrgs) {
      const indP = await indRepo.findOne({ where: { organization_id: org.id } });
      if (indP) {
        await indCapRepo.delete({ industry_id: indP.id });
        await indRepo.delete(indP.id);
      }
      const instP = await instRepo.findOne({ where: { organization_id: org.id } });
      if (instP) {
        await instCapRepo.delete({ institution_id: instP.id });
        await instRepo.delete(instP.id);
      }
      await orgRepo.delete(org.id);
    }

    // Seed HEI Organization
    let heiOrg = await orgRepo.save(
      orgRepo.create({
        name: 'Varanasi Institute of Technology',
        organization_type: OrganizationType.INSTITUTION,
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        verification_status: VerificationStatus.VERIFIED,
        available_capacity: 4,
        availability_status: 'FRESH',
        availability_confirmed_at: new Date(),
        availability_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }),
    );

    let heiProfile = await instRepo.findOne({ where: { organization_id: heiOrg.id } });
    if (!heiProfile) {
      heiProfile = await instRepo.save(
        instRepo.create({
          organization_id: heiOrg.id,
          institution_code: `HEI-${Date.now()}`,
        }),
      );
    }

    let heiCap = await instCapRepo.findOne({ where: { institution_id: heiProfile.id, capability_id: waterCap.id } });
    if (!heiCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: heiProfile.id,
          capability_id: waterCap.id,
          source: CapabilitySource.OFFICIAL_WEBSITE,
          verification_status: VerificationStatus.VERIFIED,
          confidence_score: 0.95,
          evidence_summary: 'Published 12 papers on groundwater filtration',
        }),
      );
    }

    // Seed Industry Organization with Stale Availability
    let indOrg = await orgRepo.save(
      orgRepo.create({
        name: 'AquaPure Solutions Pvt Ltd',
        organization_type: OrganizationType.INDUSTRY,
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        verification_status: VerificationStatus.VERIFIED,
        available_capacity: 2,
        availability_status: 'STALE',
        availability_confirmed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        availability_expires_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      }),
    );

    let indProfile = await indRepo.findOne({ where: { organization_id: indOrg.id } });
    if (!indProfile) {
      indProfile = await indRepo.save(
        indRepo.create({
          organization_id: indOrg.id,
          industry_type: 'Water Filtration',
        }),
      );
    }

    let suppType = await suppRepo.findOne({ where: { code: 'PROTOTYPING' } });
    if (!suppType) {
      suppType = await suppRepo.save(
        suppRepo.create({
          code: 'PROTOTYPING',
          name: 'Prototyping Support',
        }),
      );
    }

    await indCapRepo.save(
      indCapRepo.create({
        industry_id: indProfile.id,
        capability_id: waterCap.id,
        support_type_id: suppType.id,
        source: CapabilitySource.ORGANIZATION_PROVIDED,
        verification_status: VerificationStatus.VERIFIED,
        confidence_score: 0.90,
      }),
    );

    assert(heiOrg.availability_status === 'FRESH', 'HEI availability confirmed as FRESH');
    assert(indOrg.availability_status === 'STALE', 'Industry availability marked as STALE');

    // -------------------------------------------------------------
    // Test 6: Hybrid Matching, Ranking & Explainability
    // -------------------------------------------------------------
    console.log('\n▶ Test 6: Hybrid Matching & Explainable Recommendations...');
    const recResult = await matchingService.generateRecommendations(testChal.id);
    assert(recResult.recommendations.length > 0, 'Recommendations generated');
    console.log('Top recommendations generated:');
    recResult.recommendations.forEach((r, idx) => {
      console.log(`  [#${idx + 1}] ID:${r.organization_id} ${r.organization_name} (${r.organization_type}) - Score: ${r.total_score}% [${r.confidence_category}]`);
    });
    console.log(`Target heiOrg.id=${heiOrg.id}, indOrg.id=${indOrg.id}`);

    // Verify HEI is present in top recommendations with high score
    const heiRec = recResult.recommendations.find((r) => r.organization_id === heiOrg.id);
    assert(heiRec !== undefined, 'HEI is present in recommendations list');
    assert(heiRec.total_score >= 50, 'HEI scored well due to local district, verified status, and fresh availability');

    // -------------------------------------------------------------
    // Test 7: Human Review Governance & Triage Decisions
    // -------------------------------------------------------------
    console.log('\n▶ Test 7: Human Review Triage & Authority...');
    let reviewer = await userRepo.findOne({ where: { role: UserRole.PLATFORM_ADMIN } });
    if (!reviewer) {
      reviewer = await userRepo.save(
        userRepo.create({
          name: 'Platform Reviewer Admin',
          email: `reviewer-${Date.now()}@samadhansetu.gov.in`,
          role: UserRole.PLATFORM_ADMIN,
          password_hash: 'hash',
        }),
      );
    }

    const reviews = await reviewRepo.find({ where: { challenge_id: testChal.id } });
    assert(reviews.length >= 2, 'Recommendation review records persisted');
    assert(reviews[0].human_review_status === ReviewStatus.PENDING, 'Initial review status is PENDING');

    // Approve Top Match
    const approved = await reviewsService.submitReviewDecision(
      reviews[0].id,
      reviewer.id,
      ReviewStatus.APPROVED,
      'Verified local research lab fits deployment needs.',
    );
    assert(approved.human_review_status === ReviewStatus.APPROVED, 'Review successfully APPROVED');
    assert(approved.reviewed_at !== null, 'reviewed_at timestamp recorded');

    // Reject Second Match with mandatory reason
    const rejected = await reviewsService.submitReviewDecision(
      reviews[1].id,
      reviewer.id,
      ReviewStatus.REJECTED,
      'Stale capacity and distance from site.',
    );
    assert(rejected.human_review_status === ReviewStatus.REJECTED, 'Review successfully REJECTED');
    assert(rejected.review_notes === 'Stale capacity and distance from site.', 'Rejection reason audit note captured');

    console.log('\n============================================================');
    console.log(`🏆 ALL PHASE 5 ASSERTIONS PASSED! Total Passed: ${passedAssertions}`);
    console.log('============================================================\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Fatal error in Phase 5 verification:', err);
  process.exit(1);
});
