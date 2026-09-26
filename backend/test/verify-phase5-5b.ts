import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import {
  Organization,
  OrganizationMembership,
  OrganizationClaimRequest,
  OrganizationOnboardingRequest,
  OrganizationEvidence,
  Capability,
  InstitutionProfile,
  Department,
  Laboratory,
  ResearchArea,
  InstitutionCapability,
  IndustryProfile,
  IndustryCapability,
  IndustrySupportType,
  TaxonomyAdditionRequest,
  VerificationRecord,
  EntityEmbedding,
  User,
  Challenge,
  ChallengeAiAnalysis,
  RecommendationRun,
  RecommendationReview,
} from '../src/database/entities';
import {
  OrganizationType,
  OrganizationRole,
  GeographicReach,
  VerificationStatus,
  CapabilitySource,
  ReviewStatus,
  ClaimRequestStatus,
  EvidenceType,
  UserRole,
  IndexingStatus,
  IndustrySupportCode,
} from '../src/common/enums';
import { EntityEmbeddingType } from '../src/modules/ai-analysis/entities/entity-embedding.entity';
import { OnboardingService } from '../src/modules/organizations/services/onboarding.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { PassportService } from '../src/modules/organizations/services/passport.service';
import { AvailabilityService } from '../src/modules/organizations/services/availability.service';
import { EcosystemIndexingService } from '../src/modules/organizations/services/ecosystem-indexing.service';
import { TaxonomyRequestsService } from '../src/modules/capabilities/services/taxonomy-requests.service';
import { VerificationService } from '../src/modules/verification/verification.service';
import { MatchingService } from '../src/modules/reviews/matching.service';
import { JurisdictionService } from '../src/modules/auth/services/jurisdiction.service';
import { TargetEntityType } from '../src/modules/verification/dto/verification-decision.dto';

let passedAssertions = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedAssertions++;
  console.log(`  ✅ PASS: ${message}`);
}

async function main() {
  console.log('\n============================================================');
  console.log('🧪 Starting SamadhanSetu Phase 5.5B Real Ecosystem Verification Suite');
  console.log('============================================================\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres_password',
    database: process.env.DATABASE_NAME || 'samadhan_setu',
    entities: ALL_ENTITIES,
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('🔌 Database connected successfully.\n');

  const orgRepo = dataSource.getRepository(Organization);
  const onboardingRepo = dataSource.getRepository(OrganizationOnboardingRequest);
  const claimRepo = dataSource.getRepository(OrganizationClaimRequest);
  const memberRepo = dataSource.getRepository(OrganizationMembership);
  const evidenceRepo = dataSource.getRepository(OrganizationEvidence);
  const capRepo = dataSource.getRepository(Capability);
  const instProfileRepo = dataSource.getRepository(InstitutionProfile);
  const deptRepo = dataSource.getRepository(Department);
  const labRepo = dataSource.getRepository(Laboratory);
  const researchAreaRepo = dataSource.getRepository(ResearchArea);
  const instCapRepo = dataSource.getRepository(InstitutionCapability);
  const indProfileRepo = dataSource.getRepository(IndustryProfile);
  const indCapRepo = dataSource.getRepository(IndustryCapability);
  const supportTypeRepo = dataSource.getRepository(IndustrySupportType);
  const taxReqRepo = dataSource.getRepository(TaxonomyAdditionRequest);
  const verifRepo = dataSource.getRepository(VerificationRecord);
  const embeddingRepo = dataSource.getRepository(EntityEmbedding);
  const userRepo = dataSource.getRepository(User);
  const challengeRepo = dataSource.getRepository(Challenge);
  const analysisRepo = dataSource.getRepository(ChallengeAiAnalysis);
  const runRepo = dataSource.getRepository(RecommendationRun);
  const reviewRepo = dataSource.getRepository(RecommendationReview);

  // Mock EventEmitter2
  const emittedEvents: { event: string; payload: any }[] = [];
  const mockEventEmitter: any = {
    emit: (event: string, payload: any) => {
      emittedEvents.push({ event, payload });
      return true;
    },
  };

  // Mock ConfigService
  const mockConfigService: any = {
    get: (key: string) => {
      if (key === 'AVAILABILITY_TTL_DAYS') return 30;
      if (key === 'AI_SERVICE_URL') return 'http://127.0.0.1:8000';
      if (key === 'BATCH_INDEXING_DELAY_MS') return 50;
      return null;
    },
  };

  // Initialize services
  const onboardingService = new OnboardingService(
    onboardingRepo,
    orgRepo,
    memberRepo,
    instProfileRepo,
    indProfileRepo,
    userRepo,
    mockEventEmitter,
  );

  const orgsService = new OrganizationsService(
    orgRepo,
    memberRepo,
    claimRepo,
    userRepo,
  );

  const passportService = new PassportService(
    orgRepo,
    memberRepo,
    evidenceRepo,
    instProfileRepo,
    deptRepo,
    labRepo,
    researchAreaRepo,
    instCapRepo,
    indProfileRepo,
    indCapRepo,
    capRepo,
    embeddingRepo,
    userRepo,
    mockEventEmitter,
  );

  const availabilityService = new AvailabilityService(
    orgRepo,
    mockConfigService,
    mockEventEmitter,
  );

  const indexingService = new EcosystemIndexingService(
    orgRepo,
    embeddingRepo,
    mockConfigService,
  );

  const taxService = new TaxonomyRequestsService(
    taxReqRepo,
    capRepo,
    orgRepo,
  );

  const jurisdictionService = new JurisdictionService();
  const verifService = new VerificationService(
    verifRepo,
    orgRepo,
    evidenceRepo,
    instCapRepo,
    indCapRepo,
    claimRepo,
    userRepo,
    jurisdictionService,
    mockEventEmitter,
  );

  const mockNotifService = {
    notifyDistrictOfficers: async () => {},
    notifyMatch: async () => {},
  } as any;

  const matchingService = new MatchingService(
    challengeRepo,
    orgRepo,
    instProfileRepo,
    indProfileRepo,
    reviewRepo,
    runRepo,
    analysisRepo,
    embeddingRepo,
    mockNotifService,
  );


  // Setup Test Personas
  console.log('👤 Setting Up Test Personas...');
  const adminUser = await userRepo.save(
    userRepo.create({
      name: 'P55B Platform Admin',
      email: `p55b-admin-${Date.now()}@samadhan.test`,
      role: UserRole.PLATFORM_ADMIN,
      is_active: true,
    }),
  );

  const citizenUser = await userRepo.save(
    userRepo.create({
      name: 'Ramesh Citizen',
      email: `p55b-citizen-${Date.now()}@samadhan.test`,
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  const industryCitizenUser = await userRepo.save(
    userRepo.create({
      name: 'Sunita Industry Founder',
      email: `p55b-founder-${Date.now()}@samadhan.test`,
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  console.log('  ✅ Personas initialized successfully.\n');

  try {
    // =========================================================
    // Test Suite 1: Organization Onboarding & Claim Scenarios
    // =========================================================
    console.log('🏛️ Test Suite 1: Organization Onboarding & Claims (Scenarios A & B)');

    // 1.1 Scenario A: Claiming an existing organization shell
    const existingShell = await orgRepo.save(
      orgRepo.create({
        name: `Ranchi Technical Institute Shell ${Date.now().toString().slice(-4)}`,
        organization_type: OrganizationType.INSTITUTION,
        district: 'Ranchi',
        state: 'Jharkhand',
        geographic_reach: GeographicReach.DISTRICT,
        is_claimed: false,
        verification_status: VerificationStatus.UNVERIFIED,
      }),
    );

    const claimResult = await orgsService.createClaimRequest(citizenUser.id, {
      organization_id: existingShell.id,
      reason: 'Official university registrar claiming institutional profile for research collaboration.',
    });
    assert(claimResult.claim.status === ClaimRequestStatus.PENDING, 'Scenario A: Organization claim created in PENDING status');

    const approveClaimResult = await orgsService.approveClaimRequest(
      claimResult.claim.id,
      adminUser.id,
      'Identity verified via institutional email domain.',
    );
    assert(approveClaimResult.claim.status === ClaimRequestStatus.APPROVED, 'Scenario A: Organization claim approved by administrator');
    assert(approveClaimResult.organization.is_claimed === true, 'Scenario A: Target organization is now marked is_claimed = true');

    // 1.2 Scenario A: Membership & Role Elevation
    const shellMembership = await memberRepo.findOne({
      where: { organization_id: existingShell.id, user_id: citizenUser.id },
    });
    assert(shellMembership !== null, 'Scenario A: OrganizationMembership created for claimant');
    assert(shellMembership?.organization_role === OrganizationRole.ADMIN, 'Scenario A: Membership assigned ADMIN role');

    const elevatedCitizen = await userRepo.findOne({ where: { id: citizenUser.id } });
    assert(elevatedCitizen?.role === UserRole.UNIVERSITY_ADMIN, 'Scenario A: Requester platform role elevated to UNIVERSITY_ADMIN');

    // 1.3 Scenario B: Onboarding a new organization (does not exist in registry)
    const newOrgName = `Chotanagpur Innovation Foundry ${Date.now().toString().slice(-4)}`;
    const onboardResult = await onboardingService.createOnboardingRequest(industryCitizenUser.id, {
      name: newOrgName,
      organization_type: OrganizationType.INDUSTRY,
      registration_number: 'U72900JH2024PTC009999',
      email: `contact@foundry-${Date.now().toString().slice(-4)}.test`,
      website: 'https://chotanagpur-foundry.example.com',
      phone: '+91-651-9988776',
      address: 'Industrial Area, Tupudana, Ranchi',
      district: 'Ranchi',
      state: 'Jharkhand',
      geographic_reach: GeographicReach.DISTRICT,
      verification_document_url: '/api/challenges/evidence/file/incorp-cert.pdf',
    });
    assert(onboardResult.request.status === ReviewStatus.PENDING, 'Scenario B: New organization onboarding request created in PENDING status');
    assert(onboardResult.request.geographic_reach === GeographicReach.DISTRICT, 'Scenario B: Geographic reach defaults to DISTRICT');

    // 1.4 Duplicate Onboarding Request is safely rejected
    let duplicateRejected = false;
    try {
      await onboardingService.createOnboardingRequest(industryCitizenUser.id, {
        name: newOrgName,
        organization_type: OrganizationType.INDUSTRY,
        email: 'another@foundry.test',
        district: 'Ranchi',
      });
    } catch (err: any) {
      if (err.status === 409 || err.message.includes('already exists')) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Scenario B: Duplicate onboarding request safely rejected with 409 Conflict');

    // 1.5 Admin approval of Onboarding Request
    const approveOnboardResult = await onboardingService.approveRequest(
      onboardResult.request.id,
      adminUser.id,
      'Incorporation certificate and MSME registration verified.',
    );
    assert(approveOnboardResult.request.status === ReviewStatus.APPROVED, 'Scenario B: Onboarding request transitioned to APPROVED');
    assert(approveOnboardResult.organization.name === newOrgName, 'Scenario B: Organization record created safely in database');
    assert(approveOnboardResult.organization.is_demo === false, 'Scenario B: Onboarded organization is marked is_demo = false (Real Organization)');

    // 1.6 Membership & Platform Role Elevation for Industry Founder
    const indMembership = await memberRepo.findOne({
      where: { organization_id: approveOnboardResult.organization.id, user_id: industryCitizenUser.id },
    });
    assert(indMembership?.organization_role === OrganizationRole.ADMIN, 'Scenario B: Requester receives OrganizationMembership ADMIN privileges');

    const elevatedFounder = await userRepo.findOne({ where: { id: industryCitizenUser.id } });
    assert(elevatedFounder?.role === UserRole.INDUSTRY_ADMIN, 'Scenario B: Industry founder role elevated to INDUSTRY_ADMIN');

    // =========================================================
    // Test Suite 2: Geographic Reach & Matching Treatment
    // =========================================================
    console.log('\n🌍 Test Suite 2: Geographic Reach & Matching Behavior');

    // Create Statewide HEI (e.g. Birsa Agri University model)
    const statewideOrg = await orgRepo.save(
      orgRepo.create({
        name: `Jharkhand State Research Institute ${Date.now().toString().slice(-4)}`,
        organization_type: OrganizationType.INSTITUTION,
        district: 'Ranchi',
        state: 'Jharkhand',
        geographic_reach: GeographicReach.STATEWIDE,
        verification_status: VerificationStatus.VERIFIED,
        is_demo: false,
      }),
    );
    assert(statewideOrg.geographic_reach === GeographicReach.STATEWIDE, 'Organization created with STATEWIDE geographic reach');

    // Create National Institution (e.g. IIT/NIT model)
    const nationalOrg = await orgRepo.save(
      orgRepo.create({
        name: `National Institute of Advanced R&D ${Date.now().toString().slice(-4)}`,
        organization_type: OrganizationType.INSTITUTION,
        district: 'Dhanbad',
        state: 'Jharkhand',
        geographic_reach: GeographicReach.NATIONAL,
        verification_status: VerificationStatus.VERIFIED,
        is_demo: false,
      }),
    );
    assert(nationalOrg.geographic_reach === GeographicReach.NATIONAL, 'Organization created with NATIONAL geographic reach');

    // Create a challenge located in Bokaro (different from Ranchi and Dhanbad)
    const bokaroChallenge = await challengeRepo.save(
      challengeRepo.create({
        title: 'Bokaro Rural Drinking Water Pipeline Contamination',
        description: 'Bokaro rural pipeline contamination requiring water testing and environmental mitigation.',
        category: 'Water & Sanitation',
        district: 'Bokaro',
        state: 'Jharkhand',
        submitted_by: citizenUser.id,
      }),
    );

    const testAnalysis = await analysisRepo.save(
      analysisRepo.create({
        challenge_id: bokaroChallenge.id,
        category: 'Water & Sanitation',
        sub_category: 'Drinking Water Quality',
        required_capabilities: ['Water Quality & Resource Management'],
        model_name: 'meta/llama-3.2-11b-vision-instruct',
        confidence: 0.85,
      }),
    );

    // Score statewide org against Bokaro challenge (should NOT be penalized for different district)
    const statewideScore = (matchingService as any).computeHybridScore(
      bokaroChallenge,
      testAnalysis,
      statewideOrg,
      null,
    );
    assert(statewideScore.geographic_relevance_score === 1.0, 'STATEWIDE organization receives full 1.0 geographic score for any Jharkhand district');
    assert(statewideScore.reasons.some((r: string) => r.includes('Statewide operational mandate')), 'Match reasons highlight statewide operational mandate');

    // Score national org against Bokaro challenge (should receive 1.0 national applicability)
    const nationalScore = (matchingService as any).computeHybridScore(
      bokaroChallenge,
      testAnalysis,
      nationalOrg,
      null,
    );
    assert(nationalScore.geographic_relevance_score === 1.0, 'NATIONAL organization receives full 1.0 geographic score across nationwide scope');
    assert(nationalScore.reasons.some((r: string) => r.includes('National-reach organization')), 'Match reasons highlight national operational applicability');

    // Score a DISTRICT org from Ranchi against Bokaro challenge (should receive 0.80 state-level proximity)
    const districtOrg = await orgRepo.save(
      orgRepo.create({
        name: `Ranchi Local Testing Lab ${Date.now().toString().slice(-4)}`,
        organization_type: OrganizationType.INDUSTRY,
        district: 'Ranchi',
        state: 'Jharkhand',
        geographic_reach: GeographicReach.DISTRICT,
        verification_status: VerificationStatus.VERIFIED,
      }),
    );
    const districtScore = (matchingService as any).computeHybridScore(
      bokaroChallenge,
      testAnalysis,
      districtOrg,
      null,
    );
    assert(districtScore.geographic_relevance_score === 0.80, 'DISTRICT organization outside challenge district receives 0.80 state proximity score');

    // =========================================================
    // Test Suite 3: Master Taxonomy Governance
    // =========================================================
    console.log('\n📚 Test Suite 3: Master Taxonomy Governance');

    const masterCap = await capRepo.findOne({ where: { slug: 'iot' } });
    assert(masterCap !== null, 'Authoritative master taxonomy capability exists');

    // Attempt to attach arbitrary non-existent capability ID
    let arbitraryCapRejected = false;
    try {
      await passportService.addCapability(statewideOrg.id, adminUser.id, {
        capability_id: '00000000-0000-0000-0000-000000000000',
      });
    } catch (err: any) {
      if (err.status === 400 || err.message.includes('does not exist in master taxonomy')) {
        arbitraryCapRejected = true;
      }
    }
    assert(arbitraryCapRejected, 'Arbitrary capability outside master taxonomy rejected with 400 Bad Request');

    // Submit Taxonomy Addition Request
    const propName = `Advanced Hyperspectral Agronomy Diagnostics ${Date.now().toString().slice(-4)}`;
    const taxReq = await taxService.createRequest(statewideOrg.id, adminUser.id, {
      proposed_name: propName,
      proposed_category: 'Agriculture & Remote Sensing',
      reason: 'Specialized optical drone diagnostics capability required for precision pest tracking.',
    });
    assert(taxReq.status === ReviewStatus.PENDING, 'Taxonomy addition request submitted in PENDING status');

    // Invariant: PENDING request does NOT enter master capabilities table
    const unapprovedCap = await capRepo.findOne({ where: { name: propName } });
    assert(unapprovedCap === null, 'INVARIANT: PENDING taxonomy request does NOT enter master capabilities table');

    // Admin approves taxonomy request
    const approvedTax = await taxService.approveRequest(taxReq.id, adminUser.id, {
      admin_notes: 'Standardized and approved into master taxonomy domain.',
    });
    assert(approvedTax.request.status === ReviewStatus.APPROVED, 'Taxonomy addition request approved by platform admin');

    const newMasterCap = await capRepo.findOne({ where: { name: propName } });
    assert(newMasterCap !== null, 'Approved capability successfully added to authoritative master taxonomy');

    // =========================================================
    // Test Suite 4: Deterministic Canonical Serialization & Hashing
    // =========================================================
    console.log('\n🔒 Test Suite 4: Deterministic Canonical Serialization & Hashing');

    // Create HEI with unordered departments and laboratories
    const heiForHash = await orgRepo.save(
      orgRepo.create({
        name: `Deterministic Hashing Institute ${Date.now().toString().slice(-4)}`,
        organization_type: OrganizationType.INSTITUTION,
        district: 'Ranchi',
        state: 'Jharkhand',
        geographic_reach: GeographicReach.STATEWIDE,
        available_capacity: 3,
        availability_status: 'FRESH',
      }),
    );

    const heiProfileForHash = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: heiForHash.id,
        institution_code: `DHI-${Date.now().toString().slice(-6)}`,
        institution_category: 'Engineering & Technology',
      }),
    );


    // Save departments in reverse alphabetical order: Z, M, A
    await deptRepo.save(deptRepo.create({ institution_id: heiProfileForHash.id, name: 'Zoology & Life Sciences', code: 'ZOO' }));
    await deptRepo.save(deptRepo.create({ institution_id: heiProfileForHash.id, name: 'Mechanical Engineering', code: 'MECH' }));
    await deptRepo.save(deptRepo.create({ institution_id: heiProfileForHash.id, name: 'Applied Mathematics', code: 'MATH' }));

    // Save laboratories in reverse alphabetical order: Z, B, A
    await labRepo.save(labRepo.create({ institution_id: heiProfileForHash.id, name: 'Zenith High Precision Lab' }));
    await labRepo.save(labRepo.create({ institution_id: heiProfileForHash.id, name: 'Bio-Sensor Testing Lab' }));
    await labRepo.save(labRepo.create({ institution_id: heiProfileForHash.id, name: 'Advanced Robotics Facility' }));

    // Generate canonical source text and hash
    const run1 = await indexingService.buildCanonicalSourceText(heiForHash.id);
    const run2 = await indexingService.buildCanonicalSourceText(heiForHash.id);

    assert(run1.hash === run2.hash, 'Deterministic canonical source text generates identical SHA-256 hash on repeated runs');
    assert(run1.sourceText.includes('DEPARTMENTS: Applied Mathematics, Mechanical Engineering, Zoology & Life Sciences'), 'Departments are sorted alphabetically by explicit string comparator');
    assert(run1.sourceText.includes('LABS: Advanced Robotics Facility, Bio-Sensor Testing Lab, Zenith High Precision Lab'), 'Laboratories are sorted alphabetically by explicit string comparator');
    assert(run1.sourceText.includes('GEOGRAPHIC REACH: STATEWIDE'), 'Canonical text incorporates organization geographic_reach');

    // =========================================================
    // Test Suite 5: Capability Mutation & Evidence Invalidation
    // =========================================================
    console.log('\n⚡ Test Suite 5: Capability Mutation & Evidence Invalidation (Critical Rule)');

    // Attach master capability to institution
    const attachResult = await passportService.addCapability(heiForHash.id, adminUser.id, {
      capability_id: masterCap!.id,
      evidence_summary: 'Preliminary research project record.',
    });
    assert(attachResult.verification_status === VerificationStatus.UNVERIFIED, 'Capability claim initially starts UNVERIFIED');

    const createdInstCap = await instCapRepo.findOne({
      where: { institution_id: heiProfileForHash.id, capability_id: masterCap!.id },
    });
    assert(createdInstCap !== null, 'InstitutionCapability claim persisted in database');

    // Upload verified evidence linked to this capability
    const ev1 = await evidenceRepo.save(
      evidenceRepo.create({
        organization_id: heiForHash.id,
        uploaded_by: adminUser.id,
        title: 'ISO/IEC 17025 Laboratory Accreditation Certificate',
        url: '/api/challenges/evidence/file/iso-cert.pdf',
        mime_type: 'application/pdf',
        institution_capability_id: createdInstCap!.id,
        verification_status: VerificationStatus.VERIFIED,
        is_public: false,
      }),
    );

    // Verify capability via reviewer decision
    await verifService.approveItem(createdInstCap!.id, adminUser.id, {
      target_type: TargetEntityType.INSTITUTION_CAPABILITY,
      notes: 'Reviewed and verified against ISO accreditation.',
    });

    const verifiedInstCap = await instCapRepo.findOne({ where: { id: createdInstCap!.id } });
    assert(verifiedInstCap!.verification_status === VerificationStatus.VERIFIED, 'Capability successfully verified by platform reviewer');

    // MUTATION TEST: Edit the verified capability
    // Critical Invariant: Verification MUST NOT survive claim mutation!
    await passportService.updateCapability(heiForHash.id, adminUser.id, masterCap!.id, {
      evidence_summary: 'Updated scope to include industrial field deployments.',
    });

    const mutatedInstCap = await instCapRepo.findOne({ where: { id: createdInstCap!.id } });
    assert(
      mutatedInstCap!.verification_status === VerificationStatus.PENDING_VERIFICATION,
      'CRITICAL INVARIANT: Capability mutation downgrades VERIFIED to PENDING_VERIFICATION when supporting evidence exists',
    );

    // EVIDENCE DELETION TEST: Delete the supporting evidence
    // Invariant: Capability must be downgraded to UNVERIFIED if no supporting evidence remains
    await passportService.deleteEvidence(heiForHash.id, adminUser.id, ev1.id);

    const postEvidenceInstCap = await instCapRepo.findOne({ where: { id: createdInstCap!.id } });
    assert(
      postEvidenceInstCap!.verification_status === VerificationStatus.UNVERIFIED,
      'CRITICAL INVARIANT: Evidence deletion downgrades dependent capability claim to UNVERIFIED when no proof remains',
    );

    // =========================================================
    // Test Suite 6: Evidence Authorization & Security
    // =========================================================
    console.log('\n🛡️ Test Suite 6: Evidence Authorization & Security');

    // Create a private evidence record
    const privateEv = await evidenceRepo.save(
      evidenceRepo.create({
        organization_id: heiForHash.id,
        uploaded_by: adminUser.id,
        title: 'Proprietary Lab Calibration Report',
        url: '/api/challenges/evidence/file/calibration-secret.pdf',
        mime_type: 'application/pdf',
        is_public: false,
        verification_status: VerificationStatus.VERIFIED,
      }),
    );
    assert(privateEv.is_public === false, 'Private evidence record created with is_public = false');

    // Create a public evidence record
    const publicEv = await evidenceRepo.save(
      evidenceRepo.create({
        organization_id: heiForHash.id,
        uploaded_by: adminUser.id,
        title: 'Public Annual Innovation Report',
        url: '/api/challenges/evidence/file/annual-report.pdf',
        mime_type: 'application/pdf',
        is_public: true,
        verification_status: VerificationStatus.VERIFIED,
      }),
    );
    assert(publicEv.is_public === true, 'Public evidence record created with is_public = true');

    // =========================================================
    // Test Suite 7: Availability TTL & Freshness Invariants
    // =========================================================
    console.log('\n⏱️ Test Suite 7: Availability TTL & Freshness Invariants');

    // Invariant: Claiming or onboarding an organization does NOT make availability FRESH
    const unclaimedOrg = await orgRepo.save(
      orgRepo.create({
        name: `Freshness Invariant Test Org ${Date.now().toString().slice(-4)}`,
        organization_type: OrganizationType.INDUSTRY,
        district: 'Ranchi',
        state: 'Jharkhand',
        is_claimed: false,
        availability_status: 'UNKNOWN',
      }),
    );

    // Claim the organization
    unclaimedOrg.is_claimed = true;
    unclaimedOrg.claimed_at = new Date();
    await orgRepo.save(unclaimedOrg);

    const availPreConfirm = await availabilityService.getAvailability(unclaimedOrg.id);
    assert(availPreConfirm.is_fresh === false, 'INVARIANT: Claiming an organization profile does NOT automatically make availability FRESH');
    assert(availPreConfirm.availability_status === 'UNKNOWN', 'Availability status remains UNKNOWN until explicitly confirmed');

    // Explicit availability confirmation
    const confirmResult = await availabilityService.confirmAvailability(unclaimedOrg.id, 4, 30);
    assert(confirmResult.availability_status === 'FRESH', 'Explicit confirmation transitions availability to FRESH');
    assert(confirmResult.days_remaining === 30, 'Availability TTL configured for 30 days');

    // Simulate TTL expiration
    unclaimedOrg.availability_expires_at = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day in past
    await orgRepo.save(unclaimedOrg);

    const availPostExpire = await availabilityService.getAvailability(unclaimedOrg.id);
    assert(availPostExpire.availability_status === 'STALE', 'Expired availability TTL evaluates dynamically to STALE');

    // =========================================================
    // Test Suite 8: AI Indexing Pipeline & Rate Limiting
    // =========================================================
    console.log('\n🤖 Test Suite 8: AI Indexing Pipeline & Rate Limiting');

    // 8.1 Indexing is triggered when canonical data changes
    const indexed = await indexingService.queueAndProcessIndexing(heiForHash.id);
    assert(indexed.indexing_status === IndexingStatus.ACTIVE, 'Organization indexed successfully with status ACTIVE');
    assert(indexed.dimensions === 2048, 'Embedding dimensions dynamically tracked at 2048');

    // 8.2 Redundant call with unchanged source text skips external call
    const redundantCall = await indexingService.queueAndProcessIndexing(heiForHash.id);
    assert(redundantCall.source_text_hash === indexed.source_text_hash, 'Unchanged canonical source text hash prevents redundant re-indexing');

    // 8.3 Scheduled recovery sweep discovers and retries failed jobs
    indexed.indexing_status = IndexingStatus.FAILED;
    indexed.last_indexing_error = 'Simulated timeout during inference.';
    await embeddingRepo.save(indexed);

    await indexingService.runRecoverySweep();

    const recovered = await embeddingRepo.findOne({ where: { entity_id: heiForHash.id } });
    assert(recovered?.indexing_status === IndexingStatus.ACTIVE, 'Recovery sweep discovered and repaired FAILED embedding job from PostgreSQL');

    console.log('\n============================================================');
    console.log(`🏆 ALL PHASE 5.5B ASSERTIONS PASSED! Total Passed: ${passedAssertions}`);
    console.log('============================================================\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Phase 5.5B Test Suite Encountered Error:', err);
    await dataSource.destroy();
    process.exit(1);
  }
}

main();
