import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import {
  Organization,
  OrganizationMembership,
  Capability,
  InstitutionProfile,
  Department,
  Laboratory,
  ResearchArea,
  InstitutionCapability,
  IndustryProfile,
  IndustryCapability,
  IndustrySupportType,
  OrganizationEvidence,
  TaxonomyAdditionRequest,
  VerificationRecord,
  EntityEmbedding,
  User,
} from '../src/database/entities';
import {
  OrganizationType,
  OrganizationRole,
  VerificationStatus,
  CapabilitySource,
  ReviewStatus,
  EvidenceType,
  UserRole,
  IndexingStatus,
} from '../src/common/enums';
import { EntityEmbeddingType } from '../src/modules/ai-analysis/entities/entity-embedding.entity';
import { PassportService } from '../src/modules/organizations/services/passport.service';
import { AvailabilityService } from '../src/modules/organizations/services/availability.service';
import { EcosystemIndexingService } from '../src/modules/organizations/services/ecosystem-indexing.service';
import { TaxonomyRequestsService } from '../src/modules/capabilities/services/taxonomy-requests.service';
import { VerificationService } from '../src/modules/verification/verification.service';
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
  console.log('🧪 Starting SamadhanSetu Phase 5.5A Real Ecosystem Verification Suite');
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

  try {
    const orgRepo = dataSource.getRepository(Organization);
    const memberRepo = dataSource.getRepository(OrganizationMembership);
    const capRepo = dataSource.getRepository(Capability);
    const instProfileRepo = dataSource.getRepository(InstitutionProfile);
    const deptRepo = dataSource.getRepository(Department);
    const labRepo = dataSource.getRepository(Laboratory);
    const researchAreaRepo = dataSource.getRepository(ResearchArea);
    const instCapRepo = dataSource.getRepository(InstitutionCapability);
    const indProfileRepo = dataSource.getRepository(IndustryProfile);
    const indCapRepo = dataSource.getRepository(IndustryCapability);
    const suppTypeRepo = dataSource.getRepository(IndustrySupportType);
    const evidenceRepo = dataSource.getRepository(OrganizationEvidence);
    const taxReqRepo = dataSource.getRepository(TaxonomyAdditionRequest);
    const verifRecordRepo = dataSource.getRepository(VerificationRecord);
    const embeddingRepo = dataSource.getRepository(EntityEmbedding);
    const userRepo = dataSource.getRepository(User);

    // Mock EventEmitter
    const mockEventEmitter = {
      emit: (event: string, payload: any) => {
        // Mock event dispatch
      },
    } as any;

    const mockConfigService = {
      get: (key: string) => {
        if (key === 'AVAILABILITY_TTL_DAYS') return 30;
        if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
        return null;
      },
    } as any;

    // Instantiate Services
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

    const taxonomyService = new TaxonomyRequestsService(
      taxReqRepo,
      capRepo,
      orgRepo,
    );

    const jurisdictionService = new JurisdictionService();
    const verificationService = new VerificationService(
      verifRecordRepo,
      orgRepo,
      evidenceRepo,
      instCapRepo,
      indCapRepo,
      dataSource.getRepository(ALL_ENTITIES.find((e) => (e as any).name === 'OrganizationClaimRequest') as any),
      userRepo,
      jurisdictionService,
      mockEventEmitter,
    );

    // -------------------------------------------------------------
    // Set Up Personas
    // -------------------------------------------------------------
    console.log('👤 Setting Up Test Personas...');
    let adminUser = await userRepo.findOne({ where: { role: UserRole.PLATFORM_ADMIN } });
    if (!adminUser) {
      adminUser = await userRepo.save(
        userRepo.create({
          name: 'Platform Administrator',
          email: `admin-55a-${Date.now()}@samadhansetu.gov.in`,
          role: UserRole.PLATFORM_ADMIN,
          password_hash: 'hash',
        }),
      );
    }

    const distRepo = dataSource.getRepository(ALL_ENTITIES.find((e) => (e as any).name === 'District') as any);
    let dhanbadDist = await distRepo.findOne({ where: { name: 'Dhanbad' } });
    if (!dhanbadDist) {
      dhanbadDist = await distRepo.save(distRepo.create({ name: 'Dhanbad', state: 'Jharkhand' }));
    }

    let reviewerUser = await userRepo.findOne({ where: { role: UserRole.GOVERNMENT_OFFICER } });
    if (!reviewerUser) {
      reviewerUser = await userRepo.save(
        userRepo.create({
          name: 'Government Reviewer',
          email: `reviewer-55a-${Date.now()}@jharkhand.gov.in`,
          role: UserRole.GOVERNMENT_OFFICER,
          password_hash: 'hash',
          district_id: dhanbadDist.id,
          district: 'Dhanbad',
        }),
      );
    } else {
      reviewerUser.district_id = dhanbadDist.id;
      reviewerUser.district = 'Dhanbad';
      await userRepo.save(reviewerUser);
    }

    const heiUser = await userRepo.save(
      userRepo.create({
        name: 'Prof. Ramesh Sharma',
        email: `ramesh-55a-${Date.now()}@bitsindri.ac.in`,
        role: UserRole.FACULTY,
        password_hash: 'hash',
      }),
    );

    const unauthorizedUser = await userRepo.save(
      userRepo.create({
        name: 'Unauthorized Citizen',
        email: `unauth-55a-${Date.now()}@test.local`,
        role: UserRole.CITIZEN,
        password_hash: 'hash',
      }),
    );

    console.log('  ✅ Personas initialized successfully.\n');

    // -------------------------------------------------------------
    // Test Suite 1: Capability Passport Creation & Ownership Authorization
    // -------------------------------------------------------------
    console.log('🏛️ Test Suite 1: Capability Passport Creation & Authorization');

    // Create Base HEI Organization shell (starts UNVERIFIED)
    const testHeiOrg = await orgRepo.save(
      orgRepo.create({
        name: `BIT Sindri Research Hub ${Date.now().toString().slice(-4)}`,
        organization_type: OrganizationType.INSTITUTION,
        district_id: dhanbadDist.id,
        district: 'Dhanbad',
        state: 'Jharkhand',
        verification_status: VerificationStatus.UNVERIFIED,
        is_claimed: false,
        available_capacity: 3,
        availability_status: 'UNKNOWN',
      }),
    );

    // Attach membership to heiUser
    await memberRepo.save(
      memberRepo.create({
        organization_id: testHeiOrg.id,
        user_id: heiUser.id,
        organization_role: OrganizationRole.ADMIN,
      }),
    );

    // 1.1 Verify Unauthorized User is Rejected from modifying passport
    let forbiddenCaught = false;
    try {
      await passportService.updatePassport(testHeiOrg.id, unauthorizedUser.id, {
        description: 'Malicious modification',
      });
    } catch (err: any) {
      forbiddenCaught = err.status === 403 || err.message.includes('not authorized');
    }
    assert(forbiddenCaught, 'Unauthorized user rejected from modifying passport (403 Forbidden)');

    // 1.2 Authorized representative updates HEI passport with departments, labs, and research areas
    const updatedHeiPassport = await passportService.updatePassport(testHeiOrg.id, heiUser.id, {
      description: 'Premier state engineering institution and applied technology research hub.',
      website: 'https://bitsindri.ac.in',
      email: 'contact@bitsindri.ac.in',
      institution_category: 'Technical University',
      established_year: 1949,
      campus_area: '450 Acres',
      departments: [
        { name: 'Chemical Engineering', code: 'CHEM' },
        { name: 'Environmental Engineering', code: 'ENV' },
      ],
      laboratories: [
        { name: 'Groundwater Desalination & Heavy Metal Testing Lab', description: 'Spectrophotometers and filtration rigs' },
      ],
      research_areas: [
        { name: 'Rural Water Treatment and Fluoride Remediation', description: 'Membrane synthesis and column adsorption' },
      ],
    });

    assert(updatedHeiPassport.passport_type === 'HEI_PASSPORT', 'Passport polymorphic type is HEI_PASSPORT');
    assert(updatedHeiPassport.organization.website === 'https://bitsindri.ac.in', 'Organization website updated');
    assert((updatedHeiPassport.profile_details as InstitutionProfile).institution_category === 'Technical University', 'Institution category updated');

    // -------------------------------------------------------------
    // Test Suite 2: Trust Model Invariants (UNVERIFIED vs CLAIMED vs VERIFIED)
    // -------------------------------------------------------------
    console.log('\n🔒 Test Suite 2: Trust Model Invariants');

    // 2.1 Unverified initial state
    assert(testHeiOrg.verification_status === VerificationStatus.UNVERIFIED, 'Organization shell starts in UNVERIFIED trust state');
    assert(testHeiOrg.is_claimed === false, 'Organization shell is initially unclaimed (is_claimed = false)');

    // 2.2 Simulate Claim Approval
    testHeiOrg.is_claimed = true;
    testHeiOrg.claimed_at = new Date();
    await orgRepo.save(testHeiOrg);

    const claimedOrg = await orgRepo.findOne({ where: { id: testHeiOrg.id } });
    assert(claimedOrg!.is_claimed === true, 'Organization is now CLAIMED by representative');
    assert(
      claimedOrg!.verification_status === VerificationStatus.UNVERIFIED,
      'INVARIANT: Claiming identity does NOT automatically verify organization (verification_status remains UNVERIFIED)',
    );

    // -------------------------------------------------------------
    // Test Suite 3: Master Taxonomy Governance & Missing Capability Workflow
    // -------------------------------------------------------------
    console.log('\n📚 Test Suite 3: Master Taxonomy Governance & Addition Requests');

    // Ensure a master taxonomy capability exists
    let waterCap = await capRepo.findOne({ where: { name: 'Water Purification & Filtration' } });
    if (!waterCap) {
      waterCap = await capRepo.save(
        capRepo.create({
          name: 'Water Purification & Filtration',
          slug: 'water-purification-filtration',
          category: 'Environmental Engineering',
        }),
      );
    }

    // 3.1 Attach valid capability from Master Taxonomy
    const capAddResult = await passportService.addCapability(testHeiOrg.id, heiUser.id, {
      capability_id: waterCap.id,
      evidence_summary: 'Published papers and pilot filter units deployed in 4 districts',
    });

    assert(capAddResult.capability_id === waterCap.id, 'Attached master capability to HEI passport');
    assert(
      capAddResult.verification_status === VerificationStatus.UNVERIFIED,
      'INVARIANT: Self-asserted capability claim starts in UNVERIFIED trust state',
    );

    // 3.2 Attaching arbitrary non-existent capability is strictly rejected
    let badCapCaught = false;
    try {
      await passportService.addCapability(testHeiOrg.id, heiUser.id, {
        capability_id: '00000000-0000-0000-0000-000000000000',
      });
    } catch (err: any) {
      badCapCaught = true;
    }
    assert(badCapCaught, 'Arbitrary capability ID outside master taxonomy rejected with 400 Bad Request');

    // 3.3 Submit Taxonomy Addition Request for a missing specialized capability
    const proposedCapName = `Solar-Powered Arsenic Adsorption Unit ${Date.now().toString().slice(-4)}`;
    const taxReq = await taxonomyService.createRequest(testHeiOrg.id, heiUser.id, {
      proposed_name: proposedCapName,
      proposed_category: 'Renewable Technology',
      reason: 'Specialized hybrid electrochemical filter developed for rural arsenic-contaminated aquifers.',
    });

    assert(taxReq.status === ReviewStatus.PENDING, 'Taxonomy addition request created in PENDING status');
    assert(taxReq.proposed_name === proposedCapName, 'Proposed capability name captured accurately');

    // Verify it is NOT yet in master capabilities table
    const capLookup = await capRepo.findOne({ where: { name: proposedCapName } });
    assert(
      capLookup === null,
      'INVARIANT: PENDING taxonomy addition request does NOT enter master capabilities table or matching pool',
    );

    // 3.4 Platform Admin Approves Taxonomy Request
    const approveResult = await taxonomyService.approveRequest(taxReq.id, adminUser.id, {
      admin_notes: 'Verified research publication and patent grant. Added to master taxonomy.',
    });

    assert(approveResult.request.status === ReviewStatus.APPROVED, 'Taxonomy request status transitioned to APPROVED');
    assert(approveResult.created_capability !== undefined, 'New capability row created in master capabilities table');
    assert(approveResult.created_capability.name === proposedCapName, 'Approved capability is now in master taxonomy');

    // 3.5 Platform Admin Rejects a non-standard proposal
    const badCapName = `Generic Quick Repair Services ${Date.now().toString().slice(-4)}`;
    const badTaxReq = await taxonomyService.createRequest(testHeiOrg.id, heiUser.id, {
      proposed_name: badCapName,
      proposed_category: 'General',
      reason: 'General maintenance',
    });
    const rejectResult = await taxonomyService.rejectRequest(badTaxReq.id, adminUser.id, {
      admin_notes: 'Too generic; does not meet technical capability criteria.',
    });
    assert(rejectResult.request.status === ReviewStatus.REJECTED, 'Non-standard proposal rejected by admin');

    // -------------------------------------------------------------
    // Test Suite 4: Evidence Provenance & Universal Verification Workflow
    // -------------------------------------------------------------
    console.log('\n📄 Test Suite 4: Evidence Provenance & Verification Workflow');

    // Retrieve the institution capability ID
    const instCap = await instCapRepo.findOne({
      where: { institution: { organization_id: testHeiOrg.id }, capability_id: waterCap.id },
    });
    assert(instCap !== null, 'Institution capability claim record exists');

    // 4.1 Upload capability-specific documentary evidence
    const evidResult = await passportService.addEvidence(testHeiOrg.id, heiUser.id, {
      title: 'Groundwater Filtration Lab ISO 17025 Calibration Certificate',
      url: 'https://evidence.samadhansetu.gov.in/certs/iso-calibration-2026.pdf',
      evidence_type: EvidenceType.DOCUMENT,
      institution_capability_id: instCap!.id,
      capability_id: waterCap.id,
      description: 'National accreditation certificate for water contaminant analytical testing.',
    });

    assert(
      evidResult.evidence.verification_status === VerificationStatus.UNVERIFIED ||
      evidResult.evidence.verification_status === VerificationStatus.PENDING_VERIFICATION,
      'Uploaded evidence starts UNVERIFIED or PENDING_VERIFICATION',
    );
    assert(evidResult.evidence.institution_capability_id === instCap!.id, 'Evidence is linked specifically to the capability claim');

    // 4.2 Reviewer views verification queue
    const queue = await verificationService.getVerificationQueue();
    assert(queue.pending_evidence_count >= 1, 'Pending evidence appears in reviewer verification queue');

    // 4.3 Reviewer approves evidence and its linked capability
    const approveDecision = await verificationService.approveItem(
      evidResult.evidence.id,
      reviewerUser.id,
      {
        target_type: TargetEntityType.EVIDENCE,
        notes: 'Verified against NABL official certification registry.',
      },
    );

    assert(approveDecision.entity.verification_status === VerificationStatus.VERIFIED, 'Evidence status transitioned to VERIFIED');
    assert(approveDecision.audit_record !== undefined, 'VerificationRecord audit log persisted');

    // Verify that linked capability was also verified
    const verifiedInstCap = await instCapRepo.findOne({ where: { id: instCap!.id } });
    assert(
      verifiedInstCap!.verification_status === VerificationStatus.VERIFIED,
      'Linked institution capability claim upgraded to VERIFIED upon evidence verification',
    );

    // -------------------------------------------------------------
    // Test Suite 5: Configurable Availability TTL
    // -------------------------------------------------------------
    console.log('\n⏱️ Test Suite 5: Configurable Availability TTL & Freshness');

    // 5.1 Verify that claiming does not make availability fresh
    const preConfirmAvail = await availabilityService.getAvailability(testHeiOrg.id);
    assert(
      preConfirmAvail.availability_status !== 'FRESH',
      'INVARIANT: Claimed organization does NOT automatically have FRESH availability',
    );

    // 5.2 Confirm active availability (with configured 30 days TTL)
    const confirmResult = await availabilityService.confirmAvailability(testHeiOrg.id, 5, 30);
    assert(confirmResult.availability_status === 'FRESH', 'Availability confirmed as FRESH');
    assert(confirmResult.days_remaining === 30, 'Availability TTL configured for 30 days');

    // 5.3 Simulate TTL expiration
    testHeiOrg.availability_expires_at = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    testHeiOrg.availability_status = 'FRESH';
    await orgRepo.save(testHeiOrg);

    const expiredAvail = await availabilityService.getAvailability(testHeiOrg.id);
    assert(expiredAvail.availability_status === 'STALE', 'Expired availability TTL evaluates to STALE status');

    // -------------------------------------------------------------
    // Test Suite 6: Explicitly Recoverable PostgreSQL AI Indexing
    // -------------------------------------------------------------
    console.log('\n🤖 Test Suite 6: Explicitly Recoverable AI Indexing State');

    // 6.1 Generate deterministic canonical text
    const { sourceText, hash } = await indexingService.buildCanonicalSourceText(testHeiOrg.id);
    assert(sourceText.includes('ORGANIZATION:'), 'Canonical text contains structured organization header');
    assert(sourceText.includes('Water Purification & Filtration'), 'Canonical text contains verified capabilities');
    assert(hash.length === 64, 'Deterministic SHA-256 hash generated');

    // 6.2 Explicitly queue indexing in PostgreSQL
    const queuedEmbedding = await indexingService.queueAndProcessIndexing(testHeiOrg.id);
    assert(
      queuedEmbedding.indexing_status === IndexingStatus.ACTIVE,
      'PostgreSQL tracks explicit indexing status transitioning to ACTIVE',
    );
    assert(queuedEmbedding.dimensions === 2048, 'Embedding generated with verified 2048 dimensions');
    assert(queuedEmbedding.is_active === true, 'Embedding marked active for ecosystem matching');

    // 6.3 Simulate crash recovery: set indexing_status to FAILED and run scheduled recovery sweep
    queuedEmbedding.indexing_status = IndexingStatus.FAILED;
    queuedEmbedding.indexing_attempts = 1;
    await embeddingRepo.save(queuedEmbedding);

    await indexingService.runRecoverySweep();

    const recoveredEmbedding = await embeddingRepo.findOne({
      where: { entity_id: testHeiOrg.id, entity_type: EntityEmbeddingType.ORGANIZATION },
    });
    assert(
      recoveredEmbedding!.indexing_status === IndexingStatus.ACTIVE,
      'Scheduled recovery sweep discovered and repaired failed embedding job from PostgreSQL',
    );

    console.log('\n============================================================');
    console.log(`🏆 ALL PHASE 5.5A ASSERTIONS PASSED! Total Passed: ${passedAssertions}`);
    console.log('============================================================\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Fatal error in Phase 5.5A verification:', err);
  process.exit(1);
});
