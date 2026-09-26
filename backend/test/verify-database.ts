import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  ALL_ENTITIES,
  User,
  Organization,
  OrganizationMembership,
  OrganizationClaimRequest,
  Capability,
  InstitutionProfile,
  Department,
  FacultyMember,
  ResearchArea,
  Laboratory,
  Facility,
  InstitutionCapability,
  IndustryProfile,
  IndustrySector,
  IndustrySupportType,
  IndustryCapability,
  VerificationRecord,
  Challenge,
  ChallengeEvidence,
  ChallengeAiAnalysis,
  RecommendationReview,
  Project,
  ProjectImpact,
} from '../src/database/entities';
import { AppDataSource } from '../src/database/data-source';
import { InitialDatabaseSchema1710000000000 } from '../src/database/migrations/1710000000000-InitialDatabaseSchema';
import { Phase3AuthAndMemberships1710100000000 } from '../src/database/migrations/1710100000000-Phase3AuthAndMemberships';
import { Phase4ChallengesAndCrowdsourcing1710200000000 } from '../src/database/migrations/1710200000000-Phase4ChallengesAndCrowdsourcing';
import { HealthService } from '../src/health/health.service';
import { ConfigService } from '@nestjs/config';

async function runVerification() {
  console.log('🧪 Starting Phase 2 Database & Backend Foundation Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // TEST SUITE 1: Entity Metadata & Schema Definitions
  console.log('📦 Test Suite 1: Entity Definitions & Relational Metadata');
  
  const testDs = new DataSource({
    type: 'postgres',
    entities: ALL_ENTITIES,
  });

  assert(ALL_ENTITIES.length >= 23, `All required entities are registered (found: ${ALL_ENTITIES.length})`);

  // Build metadata to inspect entities
  await (testDs as any).buildMetadatas();

  const entityClasses = [
    User,
    Organization,
    OrganizationMembership,
    OrganizationClaimRequest,
    Capability,
    InstitutionProfile,
    Department,
    FacultyMember,
    ResearchArea,
    Laboratory,
    Facility,
    InstitutionCapability,
    IndustryProfile,
    IndustrySector,
    IndustrySupportType,
    IndustryCapability,
    VerificationRecord,
    Challenge,
    ChallengeEvidence,
    ChallengeAiAnalysis,
    RecommendationReview,
    Project,
    ProjectImpact,
  ];

  for (const cls of entityClasses) {
    const meta = testDs.getMetadata(cls);
    assert(meta !== undefined && meta.tableName !== '', `Entity ${cls.name} has valid TypeORM metadata (table: ${meta.tableName})`);
  }

  // TEST SUITE 2: Core Relationships & Foreign Keys
  console.log('\n🔗 Test Suite 2: Relational Integrity & Associations');

  const userMeta = testDs.getMetadata(User);
  const userOrgRelation = userMeta.relations.find((r) => r.propertyName === 'organization');
  assert(userOrgRelation !== undefined, 'User entity has ManyToOne relation to Organization');

  const instCapMeta = testDs.getMetadata(InstitutionCapability);
  const instCapInstRel = instCapMeta.relations.find((r) => r.propertyName === 'institution');
  const instCapCapRel = instCapMeta.relations.find((r) => r.propertyName === 'capability');
  assert(instCapInstRel !== undefined, 'InstitutionCapability has ManyToOne relation to InstitutionProfile');
  assert(instCapCapRel !== undefined, 'InstitutionCapability has ManyToOne relation to Capability');

  const indCapMeta = testDs.getMetadata(IndustryCapability);
  const indCapIndRel = indCapMeta.relations.find((r) => r.propertyName === 'industry');
  const indCapCapRel = indCapMeta.relations.find((r) => r.propertyName === 'capability');
  const indCapSupportRel = indCapMeta.relations.find((r) => r.propertyName === 'supportType');
  assert(indCapIndRel !== undefined, 'IndustryCapability has ManyToOne relation to IndustryProfile');
  assert(indCapCapRel !== undefined, 'IndustryCapability has ManyToOne relation to Capability');
  assert(indCapSupportRel !== undefined, 'IndustryCapability has ManyToOne relation to IndustrySupportType');

  const challengeMeta = testDs.getMetadata(Challenge);
  const challengeEvRel = challengeMeta.relations.find((r) => r.propertyName === 'evidence');
  const challengeAiRel = challengeMeta.relations.find((r) => r.propertyName === 'aiAnalysis');
  const challengeProjRel = challengeMeta.relations.find((r) => r.propertyName === 'projects');
  assert(challengeEvRel !== undefined, 'Challenge has OneToMany relation to ChallengeEvidence');
  assert(challengeAiRel !== undefined, 'Challenge has OneToOne relation to ChallengeAiAnalysis');
  assert(challengeProjRel !== undefined, 'Challenge has OneToMany relation to Project');

  const projectMeta = testDs.getMetadata(Project);
  const projectImpactRel = projectMeta.relations.find((r) => r.propertyName === 'impact');
  assert(projectImpactRel !== undefined, 'Project has OneToOne relation to ProjectImpact');

  const orgMembershipMeta = testDs.getMetadata(OrganizationMembership);
  const memUserRel = orgMembershipMeta.relations.find((r) => r.propertyName === 'user');
  const memOrgRel = orgMembershipMeta.relations.find((r) => r.propertyName === 'organization');
  assert(memUserRel !== undefined, 'OrganizationMembership has ManyToOne relation to User');
  assert(memOrgRel !== undefined, 'OrganizationMembership has ManyToOne relation to Organization');

  const claimMeta = testDs.getMetadata(OrganizationClaimRequest);
  const claimOrgRel = claimMeta.relations.find((r) => r.propertyName === 'organization');
  const claimUserRel = claimMeta.relations.find((r) => r.propertyName === 'requestingUser');
  assert(claimOrgRel !== undefined, 'OrganizationClaimRequest has ManyToOne relation to Organization');
  assert(claimUserRel !== undefined, 'OrganizationClaimRequest has ManyToOne relation to requestingUser');

  // TEST SUITE 3: Capability Provenance & Verification
  console.log('\n🛡️ Test Suite 3: Capability Provenance & Reusable Verification Model');
  const verifMeta = testDs.getMetadata(VerificationRecord);
  assert(verifMeta.findColumnWithPropertyName('entity_type') !== undefined, 'VerificationRecord tracks entity_type');
  assert(verifMeta.findColumnWithPropertyName('entity_id') !== undefined, 'VerificationRecord tracks entity_id');
  assert(verifMeta.findColumnWithPropertyName('verification_source') !== undefined, 'VerificationRecord tracks verification_source');

  assert(instCapMeta.findColumnWithPropertyName('source') !== undefined, 'InstitutionCapability tracks source provenance');
  assert(instCapMeta.findColumnWithPropertyName('confidence_score') !== undefined, 'InstitutionCapability stores confidence_score');
  assert(indCapMeta.findColumnWithPropertyName('source') !== undefined, 'IndustryCapability tracks source provenance');

  // TEST SUITE 4: Explainability & Human Review
  console.log('\n💡 Test Suite 4: Explainability & Human Review Foundation');
  const reviewMeta = testDs.getMetadata(RecommendationReview);
  assert(reviewMeta.findColumnWithPropertyName('ai_match_reasons') !== undefined, 'RecommendationReview stores ai_match_reasons JSONB');
  assert(reviewMeta.findColumnWithPropertyName('human_review_status') !== undefined, 'RecommendationReview tracks human_review_status');
  assert(reviewMeta.findColumnWithPropertyName('final_decision') !== undefined, 'RecommendationReview stores final_decision');

  // TEST SUITE 5: Application Naming Rule & Config Dynamism
  console.log('\n🏷️ Test Suite 5: Configurable APP_NAME & Health Check');
  const previousEnv = process.env.APP_NAME;
  process.env.APP_NAME = 'CustomInnovationNetwork';
  const mockConfigService = new ConfigService();

  const mockDataSource = {
    isInitialized: false,
    query: async () => [{ '?column?': 1 }],
  } as unknown as DataSource;

  const healthService = new HealthService(mockConfigService, mockDataSource);
  const healthResult = await healthService.checkHealth();
  process.env.APP_NAME = previousEnv;

  assert(healthResult.status === 'ok', 'Health check returns status ok');
  assert(healthResult.appName === 'CustomInnovationNetwork', 'Health check dynamically reflects APP_NAME without hardcoding');
  assert(healthResult.service === 'custominnovationnetwork-backend', 'Service slug is dynamically derived from APP_NAME');
  assert(healthResult.database !== undefined, 'Database health section is present');
  assert(healthResult.database.type === 'postgres', 'Database type is reported as postgres');
  assert(healthResult.database.status === 'disconnected', 'Database reports disconnected when not initialized');

  // TEST SUITE 6: Migrations & DataSource Definition
  console.log('\n📦 Test Suite 6: Migration Script & CLI DataSource');
  assert(AppDataSource.options.type === 'postgres', 'AppDataSource is configured for postgres');
  assert((AppDataSource.options.entities as any[]).length >= 23, 'AppDataSource includes all registered entities');

  const migration = new InitialDatabaseSchema1710000000000();
  assert(typeof migration.up === 'function', 'Initial migration has executable up() method');
  assert(typeof migration.down === 'function', 'Initial migration has executable down() method');
  assert(migration.name === 'InitialDatabaseSchema1710000000000', 'Initial migration name matches convention');

  const phase3Migration = new Phase3AuthAndMemberships1710100000000();
  assert(typeof phase3Migration.up === 'function', 'Phase 3 migration has executable up() method');
  assert(typeof phase3Migration.down === 'function', 'Phase 3 migration has executable down() method');
  assert(phase3Migration.name === 'Phase3AuthAndMemberships1710100000000', 'Phase 3 migration name matches convention');

  const phase4Migration = new Phase4ChallengesAndCrowdsourcing1710200000000();
  assert(typeof phase4Migration.up === 'function', 'Phase 4 migration has executable up() method');
  assert(typeof phase4Migration.down === 'function', 'Phase 4 migration has executable down() method');
  assert(phase4Migration.name === 'Phase4ChallengesAndCrowdsourcing1710200000000', 'Phase 4 migration name matches convention');

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All Phase 2 Database & Backend Foundation checks PASSED!\n');
  }
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
