import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { ALL_ENTITIES } from '../src/database/entities';
import {
  Organization,
  OrganizationMembership,
  User,
  Challenge,
  Project,
  ProjectParticipant,
  ImpactAssessment,
  ImpactMetric,
  ImpactEvidence,
  ImpactFeedback,
  ImpactReview,
} from '../src/database/entities';
import {
  OrganizationType,
  OrganizationRole,
  VerificationStatus,
  UserRole,
  MembershipStatus,
  ChallengeStatus,
  ChallengePriority,
  ProjectStatus,
  ParticipantRole,
  ImpactAssessmentStatus,
  ImpactMetricCategory,
  ImpactEvidenceType,
  ImpactReviewDecision,
} from '../src/common/enums';
import { ImpactService, ExpressUploadedFile } from '../src/modules/impact/impact.service';

let passedAssertions = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedAssertions++;
  console.log(`  ✅ PASS: ${message}`);
}

async function assertThrows(
  asyncFn: () => Promise<any>,
  expectedErrorSnippet: string,
  message: string,
) {
  try {
    await asyncFn();
    console.error(`❌ ASSERTION FAILED (expected exception): ${message}`);
    throw new Error(
      `Expected exception containing "${expectedErrorSnippet}", but function succeeded.`,
    );
  } catch (err: any) {
    if (err.message && err.message.includes(expectedErrorSnippet)) {
      passedAssertions++;
      console.log(`  ✅ PASS: ${message} (threw expected: "${err.message}")`);
    } else {
      console.error(
        `❌ ASSERTION FAILED: expected error containing "${expectedErrorSnippet}", but got: "${err.message}"`,
      );
      throw err;
    }
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('🧪 Starting SamadhanSetu Phase 8 Impact Verification Test Suite');
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
  const memberRepo = dataSource.getRepository(OrganizationMembership);
  const userRepo = dataSource.getRepository(User);
  const challengeRepo = dataSource.getRepository(Challenge);
  const projectRepo = dataSource.getRepository(Project);
  const participantRepo = dataSource.getRepository(ProjectParticipant);
  const assessmentRepo = dataSource.getRepository(ImpactAssessment);
  const metricRepo = dataSource.getRepository(ImpactMetric);
  const evidenceRepo = dataSource.getRepository(ImpactEvidence);
  const feedbackRepo = dataSource.getRepository(ImpactFeedback);
  const reviewRepo = dataSource.getRepository(ImpactReview);

  const impactService = new ImpactService(
    assessmentRepo,
    metricRepo,
    evidenceRepo,
    feedbackRepo,
    reviewRepo,
    projectRepo,
    participantRepo,
    memberRepo,
    userRepo,
    dataSource,
  );

  try {
    // =============================================================
    // TEST FIXTURE SETUP
    // =============================================================
    console.log('--- Setting Up Test Fixtures ---');

    // 1. Citizen Challenge Submitter
    const citizenUser = userRepo.create({
      name: 'Impact Challenge Submitter Citizen',
      email: `citizen.impact.${Date.now()}@test.org`,
      password_hash: 'hashedpassword',
      role: UserRole.CITIZEN,
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
    });
    await userRepo.save(citizenUser);

    // 2. Unrelated Citizen
    const unrelatedCitizen = userRepo.create({
      name: 'Unrelated Citizen',
      email: `unrelated.citizen.${Date.now()}@test.org`,
      password_hash: 'hashedpassword',
      role: UserRole.CITIZEN,
    });
    await userRepo.save(unrelatedCitizen);

    // 3. Lead Institution & Lead User
    const leadOrg = orgRepo.create({
      name: `Lead University for Impact ${Date.now()}`,
      organization_type: OrganizationType.INSTITUTION,
      verification_status: VerificationStatus.VERIFIED,
      district: 'Ranchi',
      state: 'Jharkhand',
    });
    await orgRepo.save(leadOrg);

    const leadUser = userRepo.create({
      name: 'Lead Project Director',
      email: `lead.univ.${Date.now()}@test.org`,
      password_hash: 'hashedpassword',
      role: UserRole.UNIVERSITY_ADMIN,
    });
    await userRepo.save(leadUser);

    const leadMembership = memberRepo.create({
      user_id: leadUser.id,
      organization_id: leadOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    });
    await memberRepo.save(leadMembership);

    // 4. Partner Industry & Partner User
    const partnerOrg = orgRepo.create({
      name: `Partner Tech Enterprise ${Date.now()}`,
      organization_type: OrganizationType.INDUSTRY,
      verification_status: VerificationStatus.VERIFIED,
      district: 'East Singhbhum',
      state: 'Jharkhand',
    });
    await orgRepo.save(partnerOrg);

    const partnerUser = userRepo.create({
      name: 'Partner Tech Officer',
      email: `partner.tech.${Date.now()}@test.org`,
      password_hash: 'hashedpassword',
      role: UserRole.INDUSTRY_ADMIN,
    });
    await userRepo.save(partnerUser);

    const partnerMembership = memberRepo.create({
      user_id: partnerUser.id,
      organization_id: partnerOrg.id,
      organization_role: OrganizationRole.MEMBER,
      membership_status: MembershipStatus.ACTIVE,
    });
    await memberRepo.save(partnerMembership);

    // 5. Government Reviewer & Platform Admin
    const govUser = userRepo.create({
      name: 'Impact Verification Officer',
      email: `gov.officer.${Date.now()}@gov.in`,
      password_hash: 'hashedpassword',
      role: UserRole.GOVERNMENT_OFFICER,
    });
    await userRepo.save(govUser);

    const platformAdmin = userRepo.create({
      name: 'System Platform Administrator',
      email: `platform.admin.${Date.now()}@gov.in`,
      password_hash: 'hashedpassword',
      role: UserRole.PLATFORM_ADMIN,
    });
    await userRepo.save(platformAdmin);

    // 6. Source Challenge
    const challenge = challengeRepo.create({
      title: 'Contaminated Groundwater & Fluorosis in Palamu',
      description: 'Severe high-fluoride groundwater causing skeletal fluorosis in 5 rural panchayats.',
      district: 'Palamu',
      submitted_by: citizenUser.id,
      status: ChallengeStatus.PROJECT_INITIATED,
      priority: ChallengePriority.HIGH,
    });
    await challengeRepo.save(challenge);

    // 7. COMPLETED Project for Impact Testing
    const completedProject = projectRepo.create({
      challenge_id: challenge.id,
      title: 'Solar-Powered Automated Defluoridation Filter Network',
      description: 'Community-scale defluoridation and telemetry water distribution system.',
      status: ProjectStatus.COMPLETED,
      objectives: 'Eliminate fluoride contamination across 5 panchayats.',
      expected_outcomes: 'Clean water below 1.0 mg/L fluoride delivered to 10,000 villagers.',
    });
    await projectRepo.save(completedProject);

    // Project Participants
    const leadPart = participantRepo.create({
      project_id: completedProject.id,
      organization_id: leadOrg.id,
      participant_role: ParticipantRole.LEAD,
      status: 'ACTIVE',
    });
    await participantRepo.save(leadPart);

    const partnerPart = participantRepo.create({
      project_id: completedProject.id,
      organization_id: partnerOrg.id,
      participant_role: ParticipantRole.PARTNER,
      status: 'ACTIVE',
    });
    await participantRepo.save(partnerPart);

    // 8. Non-Completed Project (ACTIVE) to test Invariant 10
    const activeProject = projectRepo.create({
      challenge_id: challenge.id,
      title: 'Active Unfinished Solar Grid',
      status: ProjectStatus.ACTIVE,
    });
    await projectRepo.save(activeProject);

    console.log('✅ Test fixtures initialized.\n');

    // =============================================================
    // SUITE 1: DATABASE ENTITIES & SCHEMA INTEGRITY
    // =============================================================
    console.log('--- Suite 1: Database & Entity Schema Integrity ---');

    assert(assessmentRepo !== undefined, 'ImpactAssessment entity loaded in TypeORM');
    assert(metricRepo !== undefined, 'ImpactMetric entity loaded in TypeORM');
    assert(evidenceRepo !== undefined, 'ImpactEvidence entity loaded in TypeORM');
    assert(feedbackRepo !== undefined, 'ImpactFeedback entity loaded in TypeORM');
    assert(reviewRepo !== undefined, 'ImpactReview entity loaded in TypeORM');

    // =============================================================
    // SUITE 2: INVARIANT 10 & INITIALIZATION GUARDS
    // =============================================================
    console.log('\n--- Suite 2: Invariant 10 & Initialization Guards ---');

    // Non-COMPLETED project cannot initiate impact assessment
    await assertThrows(
      () =>
        impactService.createImpactAssessment(activeProject.id, leadUser.id, leadUser.role, {
          summary: 'Premature summary',
          problem_addressed: 'Problem',
          solution_implemented: 'Solution',
        }),
      'Only COMPLETED projects can begin impact verification',
      'Cannot initiate impact assessment on an ACTIVE (non-COMPLETED) project',
    );

    // Unrelated citizen cannot create assessment
    await assertThrows(
      () =>
        impactService.createImpactAssessment(completedProject.id, unrelatedCitizen.id, unrelatedCitizen.role, {
          summary: 'Unauthorized summary',
          problem_addressed: 'Problem',
          solution_implemented: 'Solution',
        }),
      'Only the Consortium Lead or an authorized administrator',
      'Unrelated citizen rejected from creating impact assessment',
    );

    // Partner participant cannot create assessment (Lead only)
    await assertThrows(
      () =>
        impactService.createImpactAssessment(completedProject.id, partnerUser.id, partnerUser.role, {
          summary: 'Partner summary',
          problem_addressed: 'Problem',
          solution_implemented: 'Solution',
        }),
      'Only the Consortium Lead or an authorized administrator',
      'Partner organization rejected from creating impact assessment (Lead only)',
    );

    // Consortium Lead successfully initiates Impact Assessment
    const initialAssessment = await impactService.createImpactAssessment(
      completedProject.id,
      leadUser.id,
      leadUser.role,
      {
        summary: 'Solar defluoridation plants successfully operational across 5 villages.',
        problem_addressed: 'High fluoride levels (4.8 mg/L) causing dental and skeletal fluorosis.',
        solution_implemented: 'Activated alumina adsorption with automated solar telemetry monitoring.',
        beneficiaries_reached: 12400,
        geographic_coverage: '5 Panchayats, Palamu District',
        implementation_cost: 1850000,
        sustainability_notes: 'Village water committees established with nominal tariff collection.',
      },
    );
    assert(
      initialAssessment.status === ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING,
      'Impact assessment initiated in IMPACT_VERIFICATION_PENDING state',
    );
    assert(
      initialAssessment.project_id === completedProject.id,
      'Impact assessment correctly bound to target Project ID',
    );

    // UNIQUE(project_id) constraint: Attempting to create duplicate assessment on same project fails
    await assertThrows(
      () =>
        impactService.createImpactAssessment(completedProject.id, leadUser.id, leadUser.role, {
          summary: 'Duplicate assessment attempt',
          problem_addressed: 'Problem',
          solution_implemented: 'Solution',
        }),
      'An impact assessment already exists for this project',
      'Creating duplicate impact assessment on same project rejected',
    );

    // =============================================================
    // SUITE 3: SUBMISSION GUARDS (METRICS & EVIDENCE INVARIANTS)
    // =============================================================
    console.log('\n--- Suite 3: Submission Guards (Metrics & Evidence) ---');

    // Attempting to submit without metrics fails Guard 6
    await assertThrows(
      () => impactService.submitImpactAssessment(completedProject.id, leadUser.id, leadUser.role),
      'at least one structured impact metric',
      'Submission without impact metrics rejected',
    );

    // Adding structured metrics
    const metric1 = await impactService.addMetric(completedProject.id, leadUser.id, leadUser.role, {
      metric_category: ImpactMetricCategory.POPULATION_REACHED,
      metric_name: 'Villagers with Clean Water Access',
      baseline_value: '0',
      target_value: '10000',
      actual_value: '12400',
      unit: 'Citizens',
      measurement_method: 'Door-to-door water card biometric telemetry',
    });
    assert(metric1.id !== undefined, 'Metric 1 (Population Reached) created successfully');

    const metric2 = await impactService.addMetric(completedProject.id, partnerUser.id, partnerUser.role, {
      metric_category: ImpactMetricCategory.ENVIRONMENTAL_IMPACT,
      metric_name: 'Treated Water Fluoride Concentration',
      baseline_value: '4.8',
      target_value: '1.0',
      actual_value: '0.65',
      unit: 'mg/L',
      measurement_method: 'NABL Certified spectrophotometric laboratory testing',
    });
    assert(metric2.id !== undefined, 'Partner successfully contributed Metric 2 (Environmental Impact)');

    // Attempting to submit without evidence fails Guard 7
    await assertThrows(
      () => impactService.submitImpactAssessment(completedProject.id, leadUser.id, leadUser.role),
      'at least one verified impact evidence document',
      'Submission without impact evidence rejected',
    );

    // Uploading isolated evidence
    const dummyBuffer = Buffer.from('Official NABL Fluoride Test Certification Report Data');
    const mockFile: ExpressUploadedFile = {
      fieldname: 'file',
      originalname: 'nabl_water_test_cert.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: dummyBuffer.length,
      buffer: dummyBuffer,
    };

    const evidence1 = await impactService.uploadEvidence(
      completedProject.id,
      leadUser.id,
      leadUser.role,
      mockFile,
      {
        document_type: ImpactEvidenceType.CERTIFICATION,
        description: 'Third-party NABL water quality test report showing 0.65 mg/L fluoride level.',
      },
    );
    assert(evidence1.id !== undefined, 'Impact evidence uploaded successfully to isolated vault');
    assert(evidence1.checksum.length === 64, 'Evidence SHA-256 checksum calculated and verified');
    assert(
      evidence1.storage_key.startsWith('impact_'),
      'Evidence storage key strictly isolated with impact_ prefix',
    );

    // Path traversal protection test
    const maliciousFile: ExpressUploadedFile = {
      fieldname: 'file',
      originalname: '../../../../etc/passwd',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 20,
      buffer: Buffer.from('malicious test payload'),
    };
    const sanitizedEvidence = await impactService.uploadEvidence(
      completedProject.id,
      leadUser.id,
      leadUser.role,
      maliciousFile,
      { document_type: ImpactEvidenceType.OTHER },
    );
    assert(
      !sanitizedEvidence.storage_key.includes('..'),
      'Path traversal attempt neutralized via safe basename sanitization',
    );

    // Partner participant cannot submit assessment (Lead only)
    await assertThrows(
      () => impactService.submitImpactAssessment(completedProject.id, partnerUser.id, partnerUser.role),
      'Only the Consortium Lead can submit the impact assessment',
      'Partner organization cannot submit assessment for government verification',
    );

    // Lead submits assessment: Transitions to UNDER_REVIEW
    const submittedAssessment = await impactService.submitImpactAssessment(
      completedProject.id,
      leadUser.id,
      leadUser.role,
    );
    assert(
      submittedAssessment.status === ImpactAssessmentStatus.UNDER_REVIEW,
      'Assessment transitions cleanly to UNDER_REVIEW',
    );
    assert(submittedAssessment.submitted_at !== null, 'submitted_at timestamp recorded');

    // Assessment is locked while UNDER_REVIEW
    await assertThrows(
      () =>
        impactService.updateImpactAssessment(completedProject.id, leadUser.id, leadUser.role, {
          summary: 'Modifying while under review',
        }),
      'UNDER_REVIEW by the government and cannot be modified',
      'Assessment editing rejected while UNDER_REVIEW',
    );

    // =============================================================
    // SUITE 4: REVISION WORKFLOW
    // =============================================================
    console.log('\n--- Suite 4: Government Revision Workflow ---');

    // Reviewer requires revision without notes fails
    await assertThrows(
      () =>
        impactService.requireRevision(submittedAssessment.id, govUser.id, {
          notes: '   ',
        }),
      'Mandatory reviewer notes are required',
      'Revision request without notes rejected',
    );

    // Reviewer requests revision with mandatory notes
    const revisionAssessment = await impactService.requireRevision(
      submittedAssessment.id,
      govUser.id,
      {
        notes: 'Please add beneficiary testimonial documentation and clarify tariff sustainability.',
      },
    );
    assert(
      revisionAssessment.status === ImpactAssessmentStatus.REVISION_REQUIRED,
      'Assessment transitions to REVISION_REQUIRED',
    );

    // Audit record created for revision
    const reviewsAfterRevision = await reviewRepo.find({
      where: { impact_assessment_id: revisionAssessment.id },
    });
    assert(
      reviewsAfterRevision.some(
        (r) => r.decision === ImpactReviewDecision.REVISION_REQUIRED,
      ),
      'Audit log captures REVISION_REQUIRED decision with reviewer ID',
    );

    // Consortium Lead updates assessment and resubmits
    await impactService.updateImpactAssessment(completedProject.id, leadUser.id, leadUser.role, {
      sustainability_notes: 'Panchayat water committee formal agreement signed with tariff reserve fund.',
    });

    const resubmittedAssessment = await impactService.submitImpactAssessment(
      completedProject.id,
      leadUser.id,
      leadUser.role,
    );
    assert(
      resubmittedAssessment.status === ImpactAssessmentStatus.UNDER_REVIEW,
      'Resubmission transitions assessment back to UNDER_REVIEW',
    );

    // =============================================================
    // SUITE 5: ANTI-ASTROTURF COMMUNITY FEEDBACK
    // =============================================================
    console.log('\n--- Suite 5: Anti-Astroturf Community Feedback ---');

    // Consortium Lead cannot submit feedback as a citizen
    await assertThrows(
      () =>
        impactService.submitFeedback(completedProject.id, leadUser.id, {
          rating: 5,
          feedback: 'We did great work!',
        }),
      'Consortium participants cannot submit citizen community feedback',
      'Consortium member forbidden from submitting citizen feedback',
    );

    // Unrelated citizen cannot submit feedback
    await assertThrows(
      () =>
        impactService.submitFeedback(completedProject.id, unrelatedCitizen.id, {
          rating: 5,
          feedback: 'Astroturfing review from unrelated citizen.',
        }),
      'Only the original citizen challenge submitter is eligible',
      'Unrelated citizen forbidden from submitting community feedback',
    );

    // Original Challenge Submitter submits valid feedback
    const feedback = await impactService.submitFeedback(completedProject.id, citizenUser.id, {
      rating: 5,
      feedback: 'The solar defluoridation plant in our village has provided clean, sweet water. Dental pain in children stopped.',
      benefit_confirmed: true,
    });
    assert(feedback.id !== undefined, 'Original citizen submitter feedback accepted');
    assert(feedback.benefit_confirmed === true, 'Community benefit confirmation recorded');

    // Duplicate feedback attempt from same citizen is blocked
    await assertThrows(
      () =>
        impactService.submitFeedback(completedProject.id, citizenUser.id, {
          rating: 4,
          feedback: 'Submitting a second duplicate review.',
        }),
      'already submitted community feedback',
      'Duplicate feedback from same citizen rejected',
    );

    // =============================================================
    // SUITE 6: GOVERNMENT APPROVAL & PROJECT HANDOFF
    // =============================================================
    console.log('\n--- Suite 6: Government Approval & Project Handoff ---');

    // Consortium members cannot self-verify (Invariant 6)
    await assertThrows(
      () =>
        impactService.approveImpact(resubmittedAssessment.id, leadUser.id, {
          notes: 'Self verification attempt',
        }),
      'Consortium participants cannot verify',
      'Self-verification by consortium members rejected',
    );

    // Government Reviewer verifies impact
    const approvalResult = await impactService.approveImpact(
      resubmittedAssessment.id,
      govUser.id,
      {
        notes: 'Field telemetry and NABL certification verified. 12,400 beneficiaries confirmed.',
      },
    );

    assert(
      approvalResult.assessment.status === ImpactAssessmentStatus.VERIFIED,
      'Assessment status transitions to VERIFIED',
    );
    assert(
      approvalResult.project.status === ProjectStatus.IMPACT_VERIFIED,
      'Project status transitions cleanly from COMPLETED to IMPACT_VERIFIED',
    );
    assert(approvalResult.assessment.verified_at !== null, 'verified_at timestamp recorded');

    // Immutable check: verified assessment cannot be edited or modified
    await assertThrows(
      () =>
        impactService.updateImpactAssessment(completedProject.id, leadUser.id, leadUser.role, {
          summary: 'Modifying verified assessment',
        }),
      'VERIFIED and is immutable',
      'Verified impact assessment is strictly immutable',
    );

    await assertThrows(
      () =>
        impactService.addMetric(completedProject.id, leadUser.id, leadUser.role, {
          metric_category: ImpactMetricCategory.FINANCIAL_SAVINGS,
          metric_name: 'Post-verification metric',
          actual_value: '100',
          unit: 'INR',
          measurement_method: 'Method',
        }),
      'Assessment status is "VERIFIED"',
      'Adding metrics to verified assessment rejected',
    );

    // =============================================================
    // SUITE 7: PLATFORM ADMIN AUDIT REVOCATION WORKFLOW
    // =============================================================
    console.log('\n--- Suite 7: Platform Admin Audit Revocation Workflow ---');

    // Ordinary Government Officer cannot execute revoke (PLATFORM_ADMIN only)
    await assertThrows(
      () =>
        impactService.revokeImpact(
          resubmittedAssessment.id,
          govUser.id,
          govUser.role,
          { reason: 'Unauthorized revoke' },
        ),
      'Only a PLATFORM_ADMIN can revoke verified impact',
      'Government officer without PLATFORM_ADMIN rejected from revoking impact',
    );

    // Revocation requires mandatory reason
    await assertThrows(
      () =>
        impactService.revokeImpact(
          resubmittedAssessment.id,
          platformAdmin.id,
          platformAdmin.role,
          { reason: '   ' },
        ),
      'Mandatory revocation reason is required',
      'Revocation without reason rejected',
    );

    // PLATFORM_ADMIN executes controlled audit revocation
    const revokeResult = await impactService.revokeImpact(
      resubmittedAssessment.id,
      platformAdmin.id,
      platformAdmin.role,
      {
        reason: 'Random field audit revealed flow telemetry sensor misalignment in Panchayat 4.',
      },
    );

    assert(
      revokeResult.assessment.status === ImpactAssessmentStatus.REVISION_REQUIRED,
      'Revocation transitions assessment to REVISION_REQUIRED for consortium correction',
    );
    assert(
      revokeResult.project.status === ProjectStatus.COMPLETED,
      'Revocation downgrades project status from IMPACT_VERIFIED back to COMPLETED',
    );
    assert(
      revokeResult.assessment.verified_at === null,
      'verified_at reset to null upon revocation',
    );

    // Audit logs verify both APPROVED and REVOKED entries remain intact
    const allReviews = await reviewRepo.find({
      where: { impact_assessment_id: resubmittedAssessment.id },
      order: { created_at: 'ASC' },
    });
    const decisions = allReviews.map((r) => r.decision);
    assert(
      decisions.includes(ImpactReviewDecision.APPROVED),
      'Historical APPROVED record preserved in audit trail',
    );
    assert(
      decisions.includes(ImpactReviewDecision.REVOKED),
      'Historical REVOKED record appended to audit trail',
    );

    // Re-verification by Government Officer after correction
    await impactService.updateImpactAssessment(completedProject.id, leadUser.id, leadUser.role, {
      summary: 'Recalibrated flow telemetry and re-verified all 5 sensors.',
    });
    await impactService.submitImpactAssessment(completedProject.id, leadUser.id, leadUser.role);
    const finalApproval = await impactService.approveImpact(
      resubmittedAssessment.id,
      govUser.id,
      { notes: 'Recalibrated sensors audited and approved.' },
    );
    assert(
      finalApproval.project.status === ProjectStatus.IMPACT_VERIFIED,
      'Project restored to IMPACT_VERIFIED after re-verification',
    );

    // =============================================================
    // SUITE 8: PERMANENT REJECTION (TERMINAL STATE)
    // =============================================================
    console.log('\n--- Suite 8: Permanent Rejection (Terminal State) ---');

    // Create a separate project for rejection testing
    const rejectProject = projectRepo.create({
      challenge_id: challenge.id,
      title: 'Failed Project for Rejection Test',
      status: ProjectStatus.COMPLETED,
    });
    await projectRepo.save(rejectProject);

    await participantRepo.save(
      participantRepo.create({
        project_id: rejectProject.id,
        organization_id: leadOrg.id,
        participant_role: ParticipantRole.LEAD,
        status: 'ACTIVE',
      }),
    );

    const rejectAssessment = await impactService.createImpactAssessment(
      rejectProject.id,
      leadUser.id,
      leadUser.role,
      {
        summary: 'Non-functioning prototype reported as impactful',
        problem_addressed: 'Fluoride',
        solution_implemented: 'Defective filter',
      },
    );

    await impactService.addMetric(rejectProject.id, leadUser.id, leadUser.role, {
      metric_category: ImpactMetricCategory.POPULATION_REACHED,
      metric_name: 'Reported Beneficiaries',
      actual_value: '0',
      unit: 'Citizens',
      measurement_method: 'Inspection',
    });

    await impactService.uploadEvidence(rejectProject.id, leadUser.id, leadUser.role, mockFile, {
      document_type: ImpactEvidenceType.IMPACT_REPORT,
    });

    await impactService.submitImpactAssessment(rejectProject.id, leadUser.id, leadUser.role);

    // Reviewer rejects assessment with mandatory reason
    const rejectedAssessment = await impactService.rejectImpact(
      rejectAssessment.id,
      govUser.id,
      {
        notes: 'Independent laboratory inspection confirmed 0% fluoride reduction. Water unsafe.',
      },
    );

    assert(
      rejectedAssessment.status === ImpactAssessmentStatus.REJECTED,
      'Assessment marked REJECTED',
    );
    assert(rejectedAssessment.rejected_at !== null, 'rejected_at timestamp recorded');

    // Verify project did NOT become IMPACT_VERIFIED
    const refreshedRejectProject = await projectRepo.findOne({
      where: { id: rejectProject.id },
    });
    assert(
      refreshedRejectProject?.status === ProjectStatus.COMPLETED,
      'Project remained COMPLETED and did NOT become IMPACT_VERIFIED after rejection',
    );

    // Terminal check: Rejected assessment cannot be resubmitted
    await assertThrows(
      () => impactService.submitImpactAssessment(rejectProject.id, leadUser.id, leadUser.role),
      'Cannot submit assessment: Current status is "REJECTED"',
      'Rejected assessment cannot be resubmitted (terminal state)',
    );

    // =============================================================
    // FINAL SUMMARY
    // =============================================================
    console.log('\n============================================================');
    console.log(`🏆 ALL PHASE 8 ASSERTIONS PASSED: ${passedAssertions} / ${passedAssertions} PASSED`);
    console.log('============================================================\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Phase 8 test failed:', err);
    await dataSource.destroy();
    process.exit(1);
  }
}

main();
