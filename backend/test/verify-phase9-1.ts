import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import {
  Organization,
  OrganizationMembership,
  User,
  Challenge,
  ChallengeEvidence,
  Project,
  ProjectParticipant,
  ProjectMilestone,
  ProjectTask,
  ProjectDeliverable,
  ProjectUpdate,
  ProjectReview,
  ProjectInnovationOutcome,
  Notification,
  District,
  Block,
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
  MilestoneStatus,
  DeliverableDocumentType,
  ProjectUpdateType,
  ParticipantRole,
  NotificationType,
  InnovationOutcomeType,
  InnovationOutcomeStatus,
  EvidenceType,
} from '../src/common/enums';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { EvidenceService, ExpressUploadedFile } from '../src/modules/challenges/services/evidence.service';
import { randomUUID } from 'crypto';

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
  console.log('🧪 Starting SamadhanSetu Phase 9.1 Feature Completion Test Suite');
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
  const evidenceRepo = dataSource.getRepository(ChallengeEvidence);
  const projectRepo = dataSource.getRepository(Project);
  const participantRepo = dataSource.getRepository(ProjectParticipant);
  const milestoneRepo = dataSource.getRepository(ProjectMilestone);
  const taskRepo = dataSource.getRepository(ProjectTask);
  const deliverableRepo = dataSource.getRepository(ProjectDeliverable);
  const updateRepo = dataSource.getRepository(ProjectUpdate);
  const reviewRepo = dataSource.getRepository(ProjectReview);
  const outcomeRepo = dataSource.getRepository(ProjectInnovationOutcome);
  const notifRepo = dataSource.getRepository(Notification);
  const distRepo = dataSource.getRepository(District);
  const ranchiDist = await distRepo.findOne({ where: { name: 'Ranchi' } });

  const notificationsService = new NotificationsService(
    notifRepo,
    userRepo,
    memberRepo,
    participantRepo,
    distRepo,
  );

  const projectsService = new ProjectsService(
    projectRepo,
    participantRepo,
    milestoneRepo,
    taskRepo,
    deliverableRepo,
    updateRepo,
    reviewRepo,
    memberRepo,
    userRepo,
    dataSource,
    undefined,
    undefined,
    orgRepo,
    notificationsService,
    outcomeRepo,
  );

  const analyticsService = new AnalyticsService(dataSource, userRepo, distRepo, challengeRepo);
  const evidenceService = new EvidenceService(evidenceRepo);

  const prefix = `p91_${randomUUID().substring(0, 8)}`;

  // -------------------------------------------------------------
  // SETUP TEST DATA: Users, Orgs, Challenge, Project
  // -------------------------------------------------------------
  console.log('--- Setting Up Test Entities ---');

  const govOrg = await orgRepo.save(
    orgRepo.create({
      name: `${prefix} Ranchi District Administration`,
      organization_type: OrganizationType.GOVERNMENT,
      district: 'Ranchi',
      district_id: ranchiDist ? ranchiDist.id : undefined,
      state: 'Jharkhand',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
    }),
  );

  const govUser = await userRepo.save(
    userRepo.create({
      email: `${prefix}_gov@jharkhand.gov.in`,
      password_hash: 'hash',
      name: 'Gov Officer 9.1',
      role: UserRole.GOVERNMENT_OFFICER,
      organization_id: govOrg.id,
      district_id: ranchiDist ? ranchiDist.id : undefined,
      district: 'Ranchi',
      is_active: true,
    }),
  );

  await memberRepo.save(
    memberRepo.create({
      organization_id: govOrg.id,
      user_id: govUser.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  const testOrg = await orgRepo.save(
    orgRepo.create({
      name: `${prefix} Institute of Technology`,
      organization_type: OrganizationType.INSTITUTION,
      district: 'Ranchi',
      state: 'Jharkhand',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
    }),
  );

  const academicUser = await userRepo.save(
    userRepo.create({
      email: `${prefix}_prof@bit.ac.in`,
      password_hash: 'hash',
      name: 'Prof. 9.1',
      role: UserRole.FACULTY,
      organization_id: testOrg.id,
      is_active: true,
    }),
  );

  await memberRepo.save(
    memberRepo.create({
      organization_id: testOrg.id,
      user_id: academicUser.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  const industryUser = await userRepo.save(
    userRepo.create({
      email: `${prefix}_ind@tata.com`,
      password_hash: 'hash',
      name: 'Industry Lead 9.1',
      role: UserRole.INDUSTRY_MEMBER,
      is_active: true,
    }),
  );

  const outsiderUser = await userRepo.save(
    userRepo.create({
      email: `${prefix}_outsider@random.org`,
      password_hash: 'hash',
      name: 'Outsider User',
      role: UserRole.CITIZEN,
      is_active: true,
    }),
  );

  // Challenge
  const testChallenge = await challengeRepo.save(
    challengeRepo.create({
      title: `${prefix} Solar Desalination Unit`,
      description: 'Solar desalination challenge for rural communities in Ranchi district.',
      district: 'Ranchi',
      category: 'Water & Sanitation',
      priority: ChallengePriority.HIGH,
      status: ChallengeStatus.PROJECT_INITIATED,
      submitted_by: academicUser.id,
    }),
  );

  // Project
  const testProject = await projectRepo.save(
    projectRepo.create({
      challenge_id: testChallenge.id,
      title: `${prefix} Clean Solar Water Project`,
      description: 'Execution consortium project for community water.',
      status: ProjectStatus.ACTIVE,
    }),
  );

  await participantRepo.save(
    participantRepo.create({
      project_id: testProject.id,
      organization_id: testOrg.id,
      participant_role: ParticipantRole.LEAD,
      status: 'ACTIVE',
    }),
  );

  console.log('✅ Test entities created successfully.\n');

  // =============================================================
  // TEST SUITE 1: VIDEO EVIDENCE SUPPORT
  // =============================================================
  console.log('--- Suite 1: Video Evidence Support ---');

  assert(
    evidenceService.detectEvidenceType('video/mp4') === EvidenceType.VIDEO,
    'EvidenceService maps video/mp4 to EvidenceType.VIDEO',
  );
  assert(
    evidenceService.detectEvidenceType('video/webm') === EvidenceType.VIDEO,
    'EvidenceService maps video/webm to EvidenceType.VIDEO',
  );
  assert(
    evidenceService.detectEvidenceType('video/quicktime') === EvidenceType.VIDEO,
    'EvidenceService maps video/quicktime to EvidenceType.VIDEO',
  );
  assert(
    evidenceService.detectEvidenceType('image/png') === EvidenceType.IMAGE,
    'EvidenceService maps image/png to EvidenceType.IMAGE',
  );
  assert(
    evidenceService.detectEvidenceType('application/pdf') === EvidenceType.DOCUMENT,
    'EvidenceService maps application/pdf to EvidenceType.DOCUMENT',
  );

  // Negative test: unsupported MIME rejected
  const mockInvalidFile: ExpressUploadedFile = {
    fieldname: 'file',
    originalname: 'exploit.exe',
    encoding: '7bit',
    mimetype: 'application/x-msdownload',
    size: 1024,
    buffer: Buffer.from('MZ0000'),
  };

  await assertThrows(
    () => evidenceService.saveEvidenceFile(testChallenge.id, mockInvalidFile, academicUser.id),
    'Unsupported file type',
    'EvidenceService rejects disallowed executable MIME type',
  );

  const mockAviFile: ExpressUploadedFile = {
    fieldname: 'file',
    originalname: 'video.avi',
    encoding: '7bit',
    mimetype: 'video/x-msvideo',
    size: 1024,
    buffer: Buffer.from('RIFF'),
  };

  await assertThrows(
    () => evidenceService.saveEvidenceFile(testChallenge.id, mockAviFile, academicUser.id),
    'Unsupported file type',
    'EvidenceService rejects unwhitelisted video container AVI',
  );

  // =============================================================
  // TEST SUITE 2: LIFECYCLE STAKEHOLDER NOTIFICATIONS
  // =============================================================
  console.log('\n--- Suite 2: Lifecycle Stakeholder Notifications ---');

  // Test Direct Notification
  const directNotif = await notificationsService.notifyUser(
    academicUser.id,
    NotificationType.CHALLENGE_STATUS,
    'Challenge Verified',
    'Your challenge has been verified by the district admin.',
    'CHALLENGE',
    testChallenge.id,
  );
  assert(!!directNotif && directNotif.user_id === academicUser.id, 'Direct notification dispatched to submitter');

  // Test District-Scoped Notification
  const districtNotifs = await notificationsService.notifyDistrictOfficers(
    'Ranchi',
    NotificationType.CHALLENGE_STATUS,
    'New Citizen Challenge Submitted',
    `Challenge ${testChallenge.title} submitted in Ranchi district.`,
    'CHALLENGE',
    testChallenge.id,
  );
  assert(districtNotifs.length >= 1, 'District-scoped notification delivered to district government officers');
  const govNotifReceived = districtNotifs.find((n) => n.user_id === govUser.id);
  assert(!!govNotifReceived, 'Government officer in Ranchi received district challenge notification');

  // Test Consortium Notification
  const consortiumNotifs = await notificationsService.notifyConsortium(
    testProject.id,
    NotificationType.MILESTONE_ACTION,
    'Milestone 1 Approved',
    'Milestone 1 has been approved by the reviewer.',
    'PROJECT',
    testProject.id,
  );
  assert(consortiumNotifs.length >= 1, 'Consortium notification delivered to active project participants');
  const academicConsortiumNotif = consortiumNotifs.find((n) => n.user_id === academicUser.id);
  assert(!!academicConsortiumNotif, 'Academic team member received consortium milestone notification');

  // Test User Notification Retrieval & Read Status
  const userNotifs = await notificationsService.getUserNotifications(academicUser.id, 20);
  assert(userNotifs.notifications.length >= 2, 'User can retrieve their received notifications');
  assert(userNotifs.unreadCount >= 2, 'Unread notification count correctly calculated');

  const marked = await notificationsService.markAsRead(directNotif.id, academicUser.id);
  assert(marked.is_read === true, 'Notification can be marked as read');

  await notificationsService.markAllAsRead(academicUser.id);
  const refreshedNotifs = await notificationsService.getUserNotifications(academicUser.id, 20);
  assert(refreshedNotifs.unreadCount === 0, 'markAllAsRead clears all unread notifications for user');

  // =============================================================
  // TEST SUITE 3: INNOVATION & IP OUTCOME TRACKING
  // =============================================================
  console.log('\n--- Suite 3: Innovation & IP Outcome Tracking ---');

  // 1. Create Patent Application Outcome
  const patentOutcome = await projectsService.createInnovationOutcome(
    testProject.id,
    academicUser.id,
    UserRole.FACULTY,
    {
      outcome_type: InnovationOutcomeType.PATENT_APPLICATION,
      title: 'Solar Desalination Hydrophobic Membrane Process',
      description: 'Novel multi-stage nano-membrane process for high-efficiency solar desalination in rural water treatment.',
      reference_number: 'IN-PAT-2026-091442',
      organization_id: testOrg.id,
    },
  );
  assert(!!patentOutcome.id, 'Patent application outcome created successfully');
  assert(patentOutcome.status === InnovationOutcomeStatus.PROPOSED, 'New outcome initial status is PROPOSED');
  assert(patentOutcome.reference_number === 'IN-PAT-2026-091442', 'Reference number persisted');

  // 2. Create Startup Outcome
  const startupOutcome = await projectsService.createInnovationOutcome(
    testProject.id,
    academicUser.id,
    UserRole.FACULTY,
    {
      outcome_type: InnovationOutcomeType.STARTUP_CREATED,
      title: 'AquaSol Innovations Pvt Ltd',
      description: 'Spin-off incubated at BIT Ranchi for commercial manufacturing of low-cost desalination units.',
      reference_number: 'U72200JH2026PTC018892',
      organization_id: testOrg.id,
    },
  );
  assert(startupOutcome.outcome_type === InnovationOutcomeType.STARTUP_CREATED, 'Startup outcome created');

  // 3. Create Tech Transfer Outcome
  const techTransferOutcome = await projectsService.createInnovationOutcome(
    testProject.id,
    academicUser.id,
    UserRole.FACULTY,
    {
      outcome_type: InnovationOutcomeType.TECHNOLOGY_TRANSFER,
      title: 'Rural Water Supply Board Technology Transfer',
      description: 'Licensing of patent-pending membrane design to state rural water agency for block-level water stations.',
      organization_id: testOrg.id,
    },
  );
  assert(techTransferOutcome.outcome_type === InnovationOutcomeType.TECHNOLOGY_TRANSFER, 'Technology transfer outcome created');

  // 4. Authorization test: Outsider cannot create outcome
  await assertThrows(
    () =>
      projectsService.createInnovationOutcome(
        testProject.id,
        outsiderUser.id,
        UserRole.CITIZEN,
        {
          outcome_type: InnovationOutcomeType.IP_GENERATED,
          title: 'Illegitimate Outcome Attempt',
          description: 'Non-member trying to record outcome on foreign project.',
        },
      ),
    'Only consortium participants or government reviewers can record innovation outcomes',
    'Outsider non-consortium user forbidden from recording project innovation outcome',
  );

  // 5. Query Project Innovation Outcomes
  const projectOutcomes = await projectsService.getInnovationOutcomes(
    testProject.id,
    academicUser.id,
    UserRole.FACULTY,
  );
  assert(projectOutcomes.length >= 3, 'Consortium member can query all recorded innovation outcomes');

  // 6. Reviewer Verification: Gov officer verifies Patent Application
  const verifiedPatent = await projectsService.verifyInnovationOutcome(
    testProject.id,
    patentOutcome.id,
    govUser.id,
    UserRole.GOVERNMENT_OFFICER,
    {
      status: InnovationOutcomeStatus.VERIFIED,
      verification_notes: 'Filing verified against Indian Patent Office official e-register. Claims confirmed.',
      reference_number: 'IN-PAT-2026-091442-OFFICIAL',
    },
  );
  assert(verifiedPatent.status === InnovationOutcomeStatus.VERIFIED, 'Outcome status updated to VERIFIED');
  assert(verifiedPatent.verified_by_user_id === govUser.id, 'verified_by_user_id recorded accurately');
  assert(!!verifiedPatent.verified_at, 'verified_at timestamp populated');
  assert(verifiedPatent.reference_number === 'IN-PAT-2026-091442-OFFICIAL', 'Updated official reference number persisted');

  // 7. Reviewer Verification: Gov officer verifies Startup
  const verifiedStartup = await projectsService.verifyInnovationOutcome(
    testProject.id,
    startupOutcome.id,
    govUser.id,
    UserRole.GOVERNMENT_OFFICER,
    {
      status: InnovationOutcomeStatus.VERIFIED,
      verification_notes: 'CIN verified via Ministry of Corporate Affairs portal.',
    },
  );
  assert(verifiedStartup.status === InnovationOutcomeStatus.VERIFIED, 'Startup outcome verified');

  // 8. Rejection of invalid outcome
  const rejectedTechTransfer = await projectsService.verifyInnovationOutcome(
    testProject.id,
    techTransferOutcome.id,
    govUser.id,
    UserRole.GOVERNMENT_OFFICER,
    {
      status: InnovationOutcomeStatus.REJECTED,
      verification_notes: 'Commercial agreement documentation incomplete. Re-submit once signed.',
    },
  );
  assert(rejectedTechTransfer.status === InnovationOutcomeStatus.REJECTED, 'Outcome can be rejected with notes');

  // 9. Reviewer Queue check
  const reviewerQueue = await projectsService.getReviewerInnovationOutcomes();
  assert(reviewerQueue.length >= 3, 'Reviewer queue lists innovation outcomes across governed projects');

  // 10. CRITICAL INVARIANT: Project status remains ACTIVE
  const refreshedProject = await projectRepo.findOneOrFail({ where: { id: testProject.id } });
  assert(
    refreshedProject.status === ProjectStatus.ACTIVE,
    'CRITICAL INVARIANT: Project status remains ACTIVE (innovation outcomes are non-blocking parallel metadata)',
  );

  // =============================================================
  // TEST SUITE 4: POSTGRESQL ANALYTICS AGGREGATIONS
  // =============================================================
  console.log('\n--- Suite 4: PostgreSQL Analytics Aggregations ---');

  const innovAnalytics = await analyticsService.getInnovationOutcomes();
  assert(Array.isArray(innovAnalytics.outcomesByType), 'getInnovationOutcomes returns outcomesByType');
  assert(Array.isArray(innovAnalytics.outcomesByStatus), 'getInnovationOutcomes returns outcomesByStatus');
  assert(Array.isArray(innovAnalytics.recentVerifiedOutcomes), 'getInnovationOutcomes returns recentVerifiedOutcomes');

  // Verify breakdown
  const patentRow = innovAnalytics.outcomesByType.find(
    (r: any) => r.outcome_type === InnovationOutcomeType.PATENT_APPLICATION,
  );
  assert(!!patentRow && Number(patentRow.total) >= 1, 'outcomesByType reflects patent application total count');
  assert(!!patentRow && Number(patentRow.verified) >= 1, 'outcomesByType reflects verified patent application count');

  const verifiedStatusRow = innovAnalytics.outcomesByStatus.find((r: any) => r.status === 'VERIFIED');
  assert(!!verifiedStatusRow && Number(verifiedStatusRow.count) >= 2, 'outcomesByStatus reflects VERIFIED outcomes count');

  // Verify recent items join projects and organizations
  const recentItem = innovAnalytics.recentVerifiedOutcomes.find((i: any) => i.id === patentOutcome.id);
  assert(!!recentItem, 'Recent verified outcomes contains verified patent');
  assert(recentItem.project_title === testProject.title, 'Recent outcome correctly joined with project_title');
  assert(recentItem.organization_name === testOrg.name, 'Recent outcome correctly joined with organization_name');

  // Overview analytics
  const overview = await analyticsService.getOverview();
  assert(overview.innovation !== undefined, 'Overview analytics includes innovation metrics');
  assert(overview.innovation.totalOutcomes >= 3, 'Overview reflects total innovation outcomes');
  assert(overview.innovation.verifiedOutcomes >= 2, 'Overview reflects verified outcomes');

  // -------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------
  console.log('\n--- Cleaning Up Test Data ---');
  await outcomeRepo.delete({ project_id: testProject.id });
  await participantRepo.delete({ project_id: testProject.id });
  await projectRepo.delete(testProject.id);
  await challengeRepo.delete(testChallenge.id);
  await memberRepo.delete({ organization_id: testOrg.id });
  await memberRepo.delete({ organization_id: govOrg.id });
  await orgRepo.delete(testOrg.id);
  await orgRepo.delete(govOrg.id);
  await notifRepo.delete({ user_id: academicUser.id });
  await notifRepo.delete({ user_id: govUser.id });
  await notifRepo.delete({ reference_id: testProject.id });
  await notifRepo.delete({ reference_id: testChallenge.id });
  await userRepo.delete([govUser.id, academicUser.id, industryUser.id, outsiderUser.id]);

  await dataSource.destroy();

  console.log('\n============================================================');
  console.log(`🎉 All Phase 9.1 Verification Tests Passed! (${passedAssertions} assertions)`);
  console.log('============================================================\n');
}

main().catch((err) => {
  console.error('Fatal error running Phase 9.1 verification tests:', err);
  process.exit(1);
});
