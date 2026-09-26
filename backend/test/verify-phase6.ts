import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import {
  Organization,
  OrganizationMembership,
  OrganizationClaimRequest,
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
  VerificationRecord,
  User,
  Challenge,
  Project,
  ProjectParticipant,
  ExpressionOfInterest,
  EoiContribution,
  EoiEvidence,
  EoiReview,
  RecommendationReview,
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
  EoiStatus,
  EoiTimeline,
  EoiContributionType,
  EoiReviewAction,
} from '../src/common/enums';
import { EoisService } from '../src/modules/eois/eois.service';

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
    throw new Error(`Expected exception containing "${expectedErrorSnippet}", but function succeeded.`);
  } catch (err: any) {
    if (err.message.includes(expectedErrorSnippet)) {
      passedAssertions++;
      console.log(`  ✅ PASS: ${message} (threw: "${err.message}")`);
    } else {
      console.error(`❌ ASSERTION FAILED: expected "${expectedErrorSnippet}", got "${err.message}"`);
      throw err;
    }
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('🧪 Starting SamadhanSetu Phase 6 EOI & Project Formation Verification Suite');
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
  const capRepo = dataSource.getRepository(Capability);
  const instProfileRepo = dataSource.getRepository(InstitutionProfile);
  const instCapRepo = dataSource.getRepository(InstitutionCapability);
  const indProfileRepo = dataSource.getRepository(IndustryProfile);
  const indCapRepo = dataSource.getRepository(IndustryCapability);
  const challengeRepo = dataSource.getRepository(Challenge);
  const projectRepo = dataSource.getRepository(Project);
  const participantRepo = dataSource.getRepository(ProjectParticipant);
  const eoiRepo = dataSource.getRepository(ExpressionOfInterest);
  const eoiContributionRepo = dataSource.getRepository(EoiContribution);
  const eoiEvidenceRepo = dataSource.getRepository(EoiEvidence);
  const eoiReviewRepo = dataSource.getRepository(EoiReview);
  const orgEvidenceRepo = dataSource.getRepository(OrganizationEvidence);
  const recReviewRepo = dataSource.getRepository(RecommendationReview);

  const eoisService = new EoisService(
    dataSource,
    eoiRepo,
    eoiContributionRepo,
    eoiEvidenceRepo,
    eoiReviewRepo,
    participantRepo,
    challengeRepo,
    orgRepo,
    memberRepo,
    orgEvidenceRepo,
    instCapRepo,
    indCapRepo,
    projectRepo,
    userRepo,
    recReviewRepo,
  );

  const testSuffix = `p6_${Date.now()}`;

  // =========================================================================
  // SETUP TEST DATA: Users, Organizations, Capabilities, Challenges
  // =========================================================================
  console.log('📦 Setting up test ecosystem data...');

  // Reviewer
  const reviewer = await userRepo.save(
    userRepo.create({
      name: `Officer Reviewer ${testSuffix}`,
      email: `reviewer_${testSuffix}@gov.jharkhand.gov.in`,
      role: UserRole.GOVERNMENT_OFFICER,
    }),
  );

  // Common Capability
  const sharedCap = await capRepo.save(
    capRepo.create({
      name: `Solar Water Purification ${testSuffix}`,
      slug: `solar-water-purification-${testSuffix}`,
      category: 'Water & Sanitation',
      description: 'Advanced solar-powered nano-filtration technology',
    }),
  );

  // University A (Eligible: Claimed, Verified, has Capability)
  const uniOrg = await orgRepo.save(
    orgRepo.create({
      name: `Jharkhand Technical University ${testSuffix}`,
      organization_type: OrganizationType.INSTITUTION,
      district: 'Ranchi',
      state: 'Jharkhand',
      is_claimed: true,
      verification_status: VerificationStatus.VERIFIED,
    }),
  );
  const uniProfile = await instProfileRepo.save(
    instProfileRepo.create({
      organization_id: uniOrg.id,
      institution_code: `JTU_${testSuffix}`,
    }),
  );
  await instCapRepo.save(
    instCapRepo.create({
      institution_id: uniProfile.id,
      capability_id: sharedCap.id,
      confidence_score: 0.95,
    }),
  );
  const uniAdmin = await userRepo.save(
    userRepo.create({
      name: `Prof. Amit Sharma ${testSuffix}`,
      email: `amit_${testSuffix}@jtu.ac.in`,
      role: UserRole.UNIVERSITY_ADMIN,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: uniAdmin.id,
      organization_id: uniOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  // Startup B (Eligible: Claimed, has Capability)
  const startupOrg = await orgRepo.save(
    orgRepo.create({
      name: `JalShakti Innovations ${testSuffix}`,
      organization_type: OrganizationType.INDUSTRY,
      district: 'Ranchi',
      state: 'Jharkhand',
      is_claimed: true,
      verification_status: VerificationStatus.VERIFIED,
    }),
  );
  const startupProfile = await indProfileRepo.save(
    indProfileRepo.create({
      organization_id: startupOrg.id,
      company_registration_number: `JAL_${testSuffix}`,
    }),
  );
  await indCapRepo.save(
    indCapRepo.create({
      industry_id: startupProfile.id,
      capability_id: sharedCap.id,
      confidence_score: 0.9,
    }),
  );
  const startupAdmin = await userRepo.save(
    userRepo.create({
      name: `Neha Verma ${testSuffix}`,
      email: `neha_${testSuffix}@jalshakti.io`,
      role: UserRole.INDUSTRY_ADMIN,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: startupAdmin.id,
      organization_id: startupOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  // Industry C (Eligible)
  const industryOrg = await orgRepo.save(
    orgRepo.create({
      name: `Tata Steel CSR Engineering ${testSuffix}`,
      organization_type: OrganizationType.INDUSTRY,
      district: 'East Singhbhum',
      state: 'Jharkhand',
      is_claimed: true,
      verification_status: VerificationStatus.VERIFIED,
    }),
  );
  const industryProfile = await indProfileRepo.save(
    indProfileRepo.create({
      organization_id: industryOrg.id,
      company_registration_number: `TATA_${testSuffix}`,
    }),
  );
  await indCapRepo.save(
    indCapRepo.create({
      industry_id: industryProfile.id,
      capability_id: sharedCap.id,
      confidence_score: 0.98,
    }),
  );
  const industryAdmin = await userRepo.save(
    userRepo.create({
      name: `Rajesh Singh ${testSuffix}`,
      email: `rajesh_${testSuffix}@tatasteel.com`,
      role: UserRole.INDUSTRY_ADMIN,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: industryAdmin.id,
      organization_id: industryOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  // Ineligible Org 1: Unclaimed & Unverified
  const unclaimedOrg = await orgRepo.save(
    orgRepo.create({
      name: `Unclaimed College ${testSuffix}`,
      organization_type: OrganizationType.INSTITUTION,
      district: 'Dhanbad',
      is_claimed: false,
      verification_status: VerificationStatus.UNVERIFIED,
    }),
  );
  const unclaimedAdmin = await userRepo.save(
    userRepo.create({
      name: `Unclaimed User ${testSuffix}`,
      email: `unclaimed_${testSuffix}@college.edu`,
      role: UserRole.CITIZEN,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: unclaimedAdmin.id,
      organization_id: unclaimedOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  // Ineligible Org 2: Zero Capabilities
  const zeroCapOrg = await orgRepo.save(
    orgRepo.create({
      name: `Empty Tech ${testSuffix}`,
      organization_type: OrganizationType.INDUSTRY,
      district: 'Ranchi',
      is_claimed: true,
      verification_status: VerificationStatus.VERIFIED,
    }),
  );
  await indProfileRepo.save(
    indProfileRepo.create({
      organization_id: zeroCapOrg.id,
    }),
  );
  const zeroCapAdmin = await userRepo.save(
    userRepo.create({
      name: `Zero Cap User ${testSuffix}`,
      email: `zerocap_${testSuffix}@empty.org`,
      role: UserRole.INDUSTRY_ADMIN,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: zeroCapAdmin.id,
      organization_id: zeroCapOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  // Non-admin member of University A
  const uniMember = await userRepo.save(
    userRepo.create({
      name: `Student Researcher ${testSuffix}`,
      email: `student_${testSuffix}@jtu.ac.in`,
      role: UserRole.STUDENT,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: uniMember.id,
      organization_id: uniOrg.id,
      organization_role: OrganizationRole.MEMBER, // NOT ADMIN
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  // Inactive admin of University A
  const inactiveAdmin = await userRepo.save(
    userRepo.create({
      name: `Inactive Former Admin ${testSuffix}`,
      email: `inactive_${testSuffix}@jtu.ac.in`,
      role: UserRole.FACULTY,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: inactiveAdmin.id,
      organization_id: uniOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.INACTIVE, // NOT ACTIVE
    }),
  );

  // Validated Challenge
  const challenge = await challengeRepo.save(
    challengeRepo.create({
      title: `Fluoride Contamination in Ground Water ${testSuffix}`,
      description: 'Severe fluoride contamination affecting drinking water in 12 villages of Tamar block, Ranchi.',
      district: 'Ranchi',
      state: 'Jharkhand',
      status: ChallengeStatus.VALIDATED,
      priority: ChallengePriority.HIGH,
      category: 'Water & Sanitation',
    }),
  );

  console.log('✅ Ecosystem setup complete.\n');

  // =========================================================================
  // TEST SUITE 1: Organization Eligibility Guard (Negative Tests)
  // =========================================================================
  console.log('🛡️ Test Suite 1: Organization Eligibility Guard');

  await assertThrows(
    () => eoisService.createDraft(challenge.id, unclaimedAdmin.id),
    'Only claimed or verified organizations may submit',
    'Unclaimed and unverified organization is rejected',
  );

  await assertThrows(
    () => eoisService.createDraft(challenge.id, zeroCapAdmin.id),
    'Organization must have at least one registered capability',
    'Organization with zero capabilities is rejected',
  );

  await assertThrows(
    () => eoisService.createDraft(challenge.id, uniMember.id),
    'You must be an active administrator',
    'Non-admin organization member is rejected',
  );

  await assertThrows(
    () => eoisService.createDraft(challenge.id, inactiveAdmin.id),
    'You must be an active administrator',
    'Inactive organization member is rejected',
  );

  // Challenge in DRAFT or REJECTED status
  const draftChallenge = await challengeRepo.save(
    challengeRepo.create({
      title: `Draft Challenge ${testSuffix}`,
      description: 'Problem description for draft challenge.',
      district: 'Ranchi',
      status: ChallengeStatus.DRAFT,
    }),
  );
  await assertThrows(
    () => eoisService.createDraft(draftChallenge.id, uniAdmin.id),
    'not currently open for Expressions of Interest',
    'Challenge in DRAFT status rejects EOI creation',
  );

  // =========================================================================
  // TEST SUITE 2: Positive EOI Lifecycle (Draft -> Submit -> Review -> Accept)
  // =========================================================================
  console.log('\n📝 Test Suite 2: EOI Lifecycle Transitions');

  // University A creates DRAFT
  const uniEoi = await eoisService.createDraft(challenge.id, uniAdmin.id, {
    motivation: 'Our university department has dedicated solar nano-filtration technology.',
    proposed_contribution: 'Deploy 5 solar water purification units and provide faculty oversight.',
    proposed_approach: 'Modular community water filtration kiosks with decentralized solar power.',
    resource_summary: '2 professors, 6 graduate students, laboratory testing equipment.',
    timeline: EoiTimeline.THREE_TO_SIX_MONTHS,
    contributions: [
      { contribution_type: EoiContributionType.TECHNOLOGY, description: 'Solar filtration systems' },
      { contribution_type: EoiContributionType.FACULTY, description: 'Faculty oversight' },
      { contribution_type: EoiContributionType.STUDENT_TEAM, description: 'Student field deployment' },
    ],
  });

  assert(uniEoi.status === EoiStatus.DRAFT, 'Created EOI is in DRAFT status');
  assert(uniEoi.organization_id === uniOrg.id, 'EOI organization is resolved by server');
  assert(uniEoi.proposer_user_id === uniAdmin.id, 'Proposer user is recorded');
  assert(uniEoi.contributions.length === 3, 'Contributions are saved');
  assert(uniEoi.collaboration_lead_name === uniAdmin.name, 'Lead name is snapshotted');

  // Uniqueness check: University A attempts second active EOI on same challenge
  await assertThrows(
    () => eoisService.createDraft(challenge.id, uniAdmin.id),
    'An active Expression of Interest already exists for your organization',
    'Duplicate active EOI for same organization + challenge is rejected',
  );

  // University A submits EOI
  const submittedUniEoi = await eoisService.submitEoi(uniEoi.id, uniAdmin.id);
  assert(submittedUniEoi.status === EoiStatus.UNDER_REVIEW, 'Submitted EOI transitions to UNDER_REVIEW');
  assert(submittedUniEoi.submitted_at !== null, 'submitted_at timestamp is set');

  // Review history check
  const reviews1 = await eoiReviewRepo.find({ where: { eoi_id: uniEoi.id } });
  assert(reviews1.length === 1, 'Review history records SUBMIT action');
  assert(reviews1[0].action === EoiReviewAction.SUBMIT, 'Action is SUBMIT');
  assert(reviews1[0].previous_status === EoiStatus.DRAFT, 'Previous status is DRAFT');
  assert(reviews1[0].new_status === EoiStatus.UNDER_REVIEW, 'New status is UNDER_REVIEW');

  // Editing UNDER_REVIEW EOI directly must be rejected
  await assertThrows(
    () => eoisService.updateEoi(uniEoi.id, { motivation: 'Changed' }, uniAdmin.id),
    'cannot be modified',
    'Editing an EOI in UNDER_REVIEW status is rejected',
  );

  // =========================================================================
  // TEST SUITE 3: Discussion & Resubmission Workflow
  // =========================================================================
  console.log('\n💬 Test Suite 3: Discussion & Resubmission Workflow');

  // Reviewer requests discussion
  const discussionEoi = await eoisService.requestDiscussion(uniEoi.id, reviewer.id, {
    message: 'Please provide more details on water quality testing frequency and maintenance.',
  });
  assert(discussionEoi.status === EoiStatus.DISCUSSION_REQUIRED, 'EOI transitions to DISCUSSION_REQUIRED');

  // Resubmitting before updating or without valid state
  await assertThrows(
    () => eoisService.submitEoi(uniEoi.id, uniAdmin.id),
    'Only DRAFT EOIs can be submitted',
    'Calling submit on DISCUSSION_REQUIRED is rejected (must use resubmit)',
  );

  // University A updates proposal while in DISCUSSION_REQUIRED
  const updatedUniEoi = await eoisService.updateEoi(
    uniEoi.id,
    {
      proposed_approach: 'Modular kiosks with weekly sensor monitoring and monthly certified lab tests.',
      timeline_notes: 'Phase 1: 2 months pilot, Phase 2: 4 months full scale.',
    },
    uniAdmin.id,
  );
  assert(updatedUniEoi.timeline_notes === 'Phase 1: 2 months pilot, Phase 2: 4 months full scale.', 'EOI updated in DISCUSSION_REQUIRED');

  // University A resubmits
  const resubmittedUniEoi = await eoisService.resubmitEoi(uniEoi.id, uniAdmin.id);
  assert(resubmittedUniEoi.status === EoiStatus.UNDER_REVIEW, 'Resubmitted EOI transitions back to UNDER_REVIEW');

  // Check audit trail
  const reviews2 = await eoiReviewRepo.find({ where: { eoi_id: uniEoi.id }, order: { created_at: 'ASC' } });
  assert(reviews2.length === 3, 'Audit trail records SUBMIT, REQUEST_DISCUSSION, and RESUBMIT');
  assert(reviews2[1].action === EoiReviewAction.REQUEST_DISCUSSION, 'Second audit record is REQUEST_DISCUSSION');
  assert(reviews2[2].action === EoiReviewAction.RESUBMIT, 'Third audit record is RESUBMIT');

  // Resubmitting again when already UNDER_REVIEW must be rejected
  await assertThrows(
    () => eoisService.resubmitEoi(uniEoi.id, uniAdmin.id),
    'Only EOIs in DISCUSSION_REQUIRED status can be resubmitted',
    'Resubmitting when not in DISCUSSION_REQUIRED is rejected',
  );

  // =========================================================================
  // TEST SUITE 4: Reviewer Acceptance Invariant (Accept EOI NEVER Creates Project)
  // =========================================================================
  console.log('\n🤝 Test Suite 4: Acceptance Invariant');

  const projectCountBefore = await projectRepo.count({ where: { challenge_id: challenge.id } });
  assert(projectCountBefore === 0, 'No projects exist before EOI acceptance');

  // Reviewer accepts University A
  const acceptedUniEoi = await eoisService.acceptEoi(uniEoi.id, reviewer.id);
  assert(acceptedUniEoi.status === EoiStatus.ACCEPTED, 'University EOI is ACCEPTED');
  assert(acceptedUniEoi.accepted_at !== null, 'accepted_at timestamp is populated');

  // CRITICAL INVARIANT: Accepting an EOI must NEVER create a project!
  const projectCountAfterUni = await projectRepo.count({ where: { challenge_id: challenge.id } });
  assert(projectCountAfterUni === 0, 'INVARIANT VERIFIED: Accepting University A EOI did NOT create any project');

  // Startup B submits EOI
  const startupEoi = await eoisService.createDraft(challenge.id, startupAdmin.id, {
    motivation: 'We manufacture affordable IoT water monitoring telemetry.',
    proposed_contribution: 'Supply smart water monitoring sensors for all kiosks.',
    proposed_approach: 'Cellular IoT telemetry connected to state dashboard.',
    resource_summary: '10 IoT sensors, cloud dashboard access, 1 hardware engineer.',
    timeline: EoiTimeline.LESS_THAN_3_MONTHS,
    contributions: [
      { contribution_type: EoiContributionType.PROTOTYPING, description: 'Hardware sensor integration' },
      { contribution_type: EoiContributionType.TECHNOLOGY, description: 'Cloud analytics' },
    ],
  });
  await eoisService.submitEoi(startupEoi.id, startupAdmin.id);

  // Reviewer accepts Startup B
  const acceptedStartupEoi = await eoisService.acceptEoi(startupEoi.id, reviewer.id);
  assert(acceptedStartupEoi.status === EoiStatus.ACCEPTED, 'Startup EOI is ACCEPTED');

  // CRITICAL INVARIANT: Accepting second EOI must STILL NEVER create a project!
  const projectCountAfterStartup = await projectRepo.count({ where: { challenge_id: challenge.id } });
  assert(projectCountAfterStartup === 0, 'INVARIANT VERIFIED: Accepting Startup B EOI did NOT create any project');

  // Industry C also submits and gets accepted
  const industryEoi = await eoisService.createDraft(challenge.id, industryAdmin.id, {
    motivation: 'CSR initiative committed to clean water in Jharkhand mining regions.',
    proposed_contribution: 'Co-funding equipment manufacturing and field distribution.',
    proposed_approach: 'Factory fabrication of stainless steel filtration housings.',
    resource_summary: 'Rs 15 Lakh CSR funding and manufacturing facilities.',
    timeline: EoiTimeline.THREE_TO_SIX_MONTHS,
    contributions: [
      { contribution_type: EoiContributionType.FUNDING_SUPPORT, description: 'CSR co-funding' },
      { contribution_type: EoiContributionType.MANUFACTURING, description: 'Housing fabrication' },
    ],
  });
  await eoisService.submitEoi(industryEoi.id, industryAdmin.id);
  await eoisService.acceptEoi(industryEoi.id, reviewer.id);

  // Check accepted EOIs queue for this challenge
  const acceptedEois = await eoisService.getAcceptedEoisForChallenge(challenge.id);
  assert(acceptedEois.length === 3, 'Accepted EOIs queue returns all 3 accepted organizations');

  // Cannot accept already accepted EOI
  await assertThrows(
    () => eoisService.acceptEoi(uniEoi.id, reviewer.id),
    'Only EOIs currently in UNDER_REVIEW status can be accepted',
    'Cannot re-accept an already accepted EOI',
  );

  // =========================================================================
  // TEST SUITE 5: Collaborative Project Formation & Double-Dipping Protection
  // =========================================================================
  console.log('\n🚀 Test Suite 5: Collaborative Project Formation');

  // Form ONE project from University A + Startup B + Industry C
  const formedProject = await eoisService.formCollaborativeProject(
    challenge.id,
    reviewer.id,
    {
      eoi_ids: [uniEoi.id, startupEoi.id, industryEoi.id],
      title: `Clean Water Consortium - Tamar Block (${testSuffix})`,
      description: 'Joint university, startup, and industry consortium for solar water purification.',
    },
  );

  assert(formedProject !== null, 'Collaborative project formed successfully');
  assert(formedProject.status === ProjectStatus.PROPOSED, 'Project has PROPOSED status');
  assert(formedProject.participants.length === 3, 'Project has exactly 3 participants from the 3 accepted EOIs');

  // Verify all EOIs transitioned to PROJECT_FORMED
  const updatedUni = await eoiRepo.findOne({ where: { id: uniEoi.id } });
  const updatedStartup = await eoiRepo.findOne({ where: { id: startupEoi.id } });
  const updatedIndustry = await eoiRepo.findOne({ where: { id: industryEoi.id } });

  assert(updatedUni?.status === EoiStatus.PROJECT_FORMED, 'University EOI is PROJECT_FORMED');
  assert(updatedUni?.project_id === formedProject.id, 'University EOI references formed project');
  assert(updatedStartup?.status === EoiStatus.PROJECT_FORMED, 'Startup EOI is PROJECT_FORMED');
  assert(updatedIndustry?.status === EoiStatus.PROJECT_FORMED, 'Industry EOI is PROJECT_FORMED');

  // Verify challenge transitioned to PROJECT_INITIATED
  const updatedChallenge = await challengeRepo.findOne({ where: { id: challenge.id } });
  assert(updatedChallenge?.status === ChallengeStatus.PROJECT_INITIATED, 'Challenge status is PROJECT_INITIATED');

  // Verify accepted queue is now EMPTY (PROJECT_FORMED EOIs must not appear)
  const remainingAccepted = await eoisService.getAcceptedEoisForChallenge(challenge.id);
  assert(remainingAccepted.length === 0, 'Accepted EOI queue is now empty (consumed EOIs excluded)');

  // DOUBLE-DIPPING PROTECTION: Cannot form another project using already consumed EOIs
  await assertThrows(
    () =>
      eoisService.formCollaborativeProject(challenge.id, reviewer.id, {
        eoi_ids: [uniEoi.id, startupEoi.id],
      }),
    'A collaborative project has already been formed for this challenge',
    'Double-dipping prevented: Challenge in PROJECT_INITIATED rejects new project formation',
  );

  // Closed challenge intake: Cannot submit new EOI to challenge in PROJECT_INITIATED
  // Create another organization to test intake closure
  const lateOrg = await orgRepo.save(
    orgRepo.create({
      name: `Late NGO ${testSuffix}`,
      organization_type: OrganizationType.NGO,
      district: 'Ranchi',
      is_claimed: true,
      verification_status: VerificationStatus.VERIFIED,
    }),
  );
  await orgEvidenceRepo.save(
    orgEvidenceRepo.create({
      organization_id: lateOrg.id,
      title: 'Valid Evidence',
      url: 'http://example.com/evidence.pdf',
      evidence_type: 'DOCUMENT' as any,
    }),
  );
  const lateAdmin = await userRepo.save(
    userRepo.create({
      name: `Late NGO Lead ${testSuffix}`,
      email: `late_${testSuffix}@ngo.org`,
      role: UserRole.CITIZEN,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: lateAdmin.id,
      organization_id: lateOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  await assertThrows(
    () => eoisService.createDraft(challenge.id, lateAdmin.id),
    'Collaboration has already been formed for this challenge',
    'New EOI intake rejected after challenge becomes PROJECT_INITIATED',
  );

  // =========================================================================
  // TEST SUITE 6: Withdrawal (No-Backout Trap Fix) & Edge Cases
  // =========================================================================
  console.log('\n🚪 Test Suite 6: Safe Withdrawal Workflow');

  // Create another validated challenge
  const challenge2 = await challengeRepo.save(
    challengeRepo.create({
      title: `Malnutrition Monitoring Challenge ${testSuffix}`,
      description: 'Digital tracking of child nutrition across anganwadis in Khunti district.',
      district: 'Khunti',
      state: 'Jharkhand',
      status: ChallengeStatus.VALIDATED,
      category: 'Health',
    }),
  );

  // University creates DRAFT on challenge2 and withdraws
  const draftEoiToWithdraw = await eoisService.createDraft(challenge2.id, uniAdmin.id, {
    motivation: 'Initial exploratory interest.',
  });
  const withdrawnDraft = await eoisService.withdrawEoi(draftEoiToWithdraw.id, uniAdmin.id, {
    reason: 'Department workload constraints.',
  });
  assert(withdrawnDraft.status === EoiStatus.WITHDRAWN, 'DRAFT EOI can be withdrawn');

  // Because the previous EOI is WITHDRAWN, partial unique index allows creating a new EOI!
  const newEoiAfterWithdraw = await eoisService.createDraft(challenge2.id, uniAdmin.id, {
    motivation: 'New application with updated research team availability.',
    proposed_contribution: 'Full IoT nutrition tracking system.',
    proposed_approach: 'Mobile app and weighing scale integration.',
    resource_summary: '5 student teams.',
    timeline: EoiTimeline.THREE_TO_SIX_MONTHS,
    contributions: [{ contribution_type: EoiContributionType.RESEARCH, description: 'Nutrition metrics' }],
  });
  assert(newEoiAfterWithdraw.status === EoiStatus.DRAFT, 'New EOI successfully created after withdrawal');

  // Submit new EOI
  await eoisService.submitEoi(newEoiAfterWithdraw.id, uniAdmin.id);

  // Withdraw while UNDER_REVIEW
  const withdrawnUnderReview = await eoisService.withdrawEoi(newEoiAfterWithdraw.id, uniAdmin.id, {
    reason: 'Grant redirection.',
  });
  assert(withdrawnUnderReview.status === EoiStatus.WITHDRAWN, 'UNDER_REVIEW EOI can be withdrawn');

  // Reviewer queue check: WITHDRAWN must NOT appear in default reviewer queue
  const reviewerQueue = await eoisService.getReviewerEois(undefined, challenge2.id);
  const foundWithdrawn = reviewerQueue.some((e) => e.status === EoiStatus.WITHDRAWN);
  assert(!foundWithdrawn, 'Withdrawn EOIs disappear from default reviewer queue');

  // Prohibited withdrawals: ACCEPTED or PROJECT_FORMED cannot be withdrawn
  await assertThrows(
    () => eoisService.withdrawEoi(uniEoi.id, uniAdmin.id),
    'cannot be withdrawn in its current status',
    'Withdrawing a PROJECT_FORMED EOI is strictly rejected',
  );

  // Rejection workflow on another EOI
  const eoiToReject = await eoisService.createDraft(challenge2.id, startupAdmin.id, {
    motivation: 'Startup interest.',
    proposed_contribution: 'Basic support.',
    proposed_approach: 'Standard software.',
    resource_summary: '1 dev.',
    timeline: EoiTimeline.LESS_THAN_3_MONTHS,
    contributions: [{ contribution_type: EoiContributionType.TECHNOLOGY, description: 'App' }],
  });
  await eoisService.submitEoi(eoiToReject.id, startupAdmin.id);

  // Rejection without reason must fail
  await assertThrows(
    () => eoisService.rejectEoi(eoiToReject.id, reviewer.id, { reason: '' }),
    'A reason explaining rejection is mandatory',
    'Rejection without a reason is rejected',
  );

  // Rejection with valid reason
  const rejectedEoi = await eoisService.rejectEoi(eoiToReject.id, reviewer.id, {
    reason: 'The proposed software does not meet the offline anganwadi sync requirements.',
  });
  assert(rejectedEoi.status === EoiStatus.REJECTED, 'EOI is rejected');

  // Withdrawing a REJECTED EOI is prohibited
  await assertThrows(
    () => eoisService.withdrawEoi(eoiToReject.id, startupAdmin.id),
    'cannot be withdrawn in its current status',
    'Withdrawing a REJECTED EOI is rejected',
  );

  // =========================================================================
  // TEST SUITE 7: Dedicated EOI Evidence Management
  // =========================================================================
  console.log('\n📁 Test Suite 7: Dedicated EOI Evidence Management');

  const challenge3 = await challengeRepo.save(
    challengeRepo.create({
      title: `Rural Solar Microgrids ${testSuffix}`,
      description: 'Microgrid implementation in remote tribal settlements.',
      district: 'Gumla',
      state: 'Jharkhand',
      status: ChallengeStatus.VALIDATED,
      category: 'Energy',
    }),
  );

  const eoiWithEvidence = await eoisService.createDraft(challenge3.id, uniAdmin.id, {
    motivation: 'Solar microgrid research proposal.',
  });

  const mockFile = {
    fieldname: 'file',
    originalname: 'technical_spec_v1.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 50,
    buffer: Buffer.from('%PDF-1.4 Mock proposal content for verification test'),
  };

  const evidenceRecord = await eoisService.uploadEvidence(
    eoiWithEvidence.id,
    mockFile,
    uniAdmin.id,
    {
      title: 'Technical Microgrid Specification',
      description: '50kW solar microgrid architecture blueprint',
    },
  );

  assert(evidenceRecord.id !== null, 'EOI evidence record created');
  assert(evidenceRecord.title === 'Technical Microgrid Specification', 'Title matches');
  assert(evidenceRecord.file_name === 'technical_spec_v1.pdf', 'File name preserved');
  assert(evidenceRecord.mime_type === 'application/pdf', 'MIME type recorded');

  // Verify EOI evidence is ISOLATED and did not pollute organization evidence
  const orgEvidencePollution = await orgEvidenceRepo.count({
    where: { organization_id: uniOrg.id, title: 'Technical Microgrid Specification' },
  });
  assert(orgEvidencePollution === 0, 'INVARIANT VERIFIED: EOI evidence did not pollute Organization Evidence');

  // Retrieve evidence
  const eoiEvidences = await eoisService.getEvidence(eoiWithEvidence.id, uniAdmin.id);
  assert(eoiEvidences.length === 1, 'Evidence retrieved for EOI');

  // Delete evidence
  const deleteResult = await eoisService.deleteEvidence(
    eoiWithEvidence.id,
    evidenceRecord.id,
    uniAdmin.id,
  );
  assert(deleteResult.success, 'Evidence deleted successfully');

  console.log('\n============================================================');
  console.log(`🏆 ALL PHASE 6 ASSERTIONS PASSED! Total Passed: ${passedAssertions}`);
  console.log('============================================================\n');

  await dataSource.destroy();
}

main().catch((err) => {
  console.error('\n❌ Phase 6 Verification failed:', err);
  process.exit(1);
});
