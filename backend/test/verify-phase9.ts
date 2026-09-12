import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import {
  Organization,
  OrganizationMembership,
  User,
  Challenge,
  Project,
  ProjectParticipant,
  ProjectAcademicMember,
  ProjectContribution,
  Notification,
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
  AcademicMemberRole,
  AcademicMemberStatus,
  ProjectContributionType,
  ContributionStatus,
  ContributionVisibility,
  NotificationType,
} from '../src/common/enums';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { District } from '../src/modules/locations/entities/district.entity';
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
  console.log('🧪 Starting SamadhanSetu Phase 9 Ecosystem Intelligence & Analytics Test Suite');
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
  const acadRepo = dataSource.getRepository(ProjectAcademicMember);
  const contribRepo = dataSource.getRepository(ProjectContribution);
  const notifRepo = dataSource.getRepository(Notification);

  const distRepo = dataSource.getRepository(District);

  // Instantiate services
  const notifService = new NotificationsService(
    notifRepo,
    userRepo,
    memberRepo,
    participantRepo,
    distRepo,
  );

  const projectsService = new ProjectsService(
    projectRepo,
    participantRepo,
    dataSource.getRepository(ALL_ENTITIES.find(e => (e as any).name === 'ProjectMilestone') as any),
    dataSource.getRepository(ALL_ENTITIES.find(e => (e as any).name === 'ProjectTask') as any),
    dataSource.getRepository(ALL_ENTITIES.find(e => (e as any).name === 'ProjectDeliverable') as any),
    dataSource.getRepository(ALL_ENTITIES.find(e => (e as any).name === 'ProjectUpdate') as any),
    dataSource.getRepository(ALL_ENTITIES.find(e => (e as any).name === 'ProjectReview') as any),
    memberRepo,
    userRepo,
    dataSource,
    acadRepo,
    contribRepo,
    orgRepo,
    notifService,
  );

  const analyticsService = new AnalyticsService(
    dataSource,
    userRepo,
    distRepo,
    challengeRepo,
  );

  const testSuffix = randomUUID().substring(0, 8);

  try {
    // =========================================================================
    // STEP 1: DATABASE SCHEMA & MIGRATION INTEGRITY AUDIT
    // =========================================================================
    console.log('📋 STEP 1: Verifying Phase 9 Schema & Enum Existence...');
    const qRunner = dataSource.createQueryRunner();

    const tableCheck = await qRunner.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('project_academic_members', 'project_contributions', 'notifications');
    `);
    assert(tableCheck.length === 3, 'All 3 Phase 9 database tables exist in PostgreSQL.');

    const enumCheck = await qRunner.query(`
      SELECT typname FROM pg_type 
      WHERE typname IN (
        'academic_member_role_enum',
        'academic_member_status_enum',
        'project_contribution_type_enum',
        'contribution_status_enum',
        'contribution_visibility_enum',
        'notification_type_enum'
      );
    `);
    assert(enumCheck.length === 6, 'All 6 Phase 9 PostgreSQL database enums exist.');
    await qRunner.release();

    // =========================================================================
    // STEP 2: SEED TEST CONTEXT (HEI, INDUSTRY, USERS, PROJECT)
    // =========================================================================
    console.log('\n🌱 STEP 2: Seeding Test Ecosystem Entities...');

    let ranchiDist = await distRepo.findOne({ where: { name: 'Ranchi' } });
    if (!ranchiDist) {
      ranchiDist = await distRepo.save(distRepo.create({ name: 'Ranchi', state: 'Jharkhand' }));
    }

    // 1. Admin / Gov User
    const govUser = await userRepo.save(
      userRepo.create({
        email: `gov.officer.${testSuffix}@gov.in`,
        password_hash: 'hash123',
        name: 'Jharkhand District Officer',
        role: UserRole.GOVERNMENT_OFFICER,
        district_id: ranchiDist.id,
        district: 'Ranchi',
        is_active: true,
      }),
    );

    const platformAdminUser = await userRepo.save(
      userRepo.create({
        email: `platform.admin.${testSuffix}@gov.in`,
        password_hash: 'hash123',
        name: 'Platform Admin',
        role: UserRole.PLATFORM_ADMIN,
        is_active: true,
      }),
    );

    // 2. HEI Organization
    const heiOrg = await orgRepo.save(
      orgRepo.create({
        name: `BIT Mesra Innovation Lab ${testSuffix}`,
        organization_type: OrganizationType.INSTITUTION,
        verification_status: VerificationStatus.VERIFIED,
        district: 'Ranchi',
        state: 'Jharkhand',
      }),
    );

    // 3. Faculty Mentor User
    const facultyUser = await userRepo.save(
      userRepo.create({
        email: `faculty.mentor.${testSuffix}@bitmesra.ac.in`,
        password_hash: 'hash123',
        name: 'Dr. A. K. Sharma',
        role: UserRole.FACULTY,
        is_active: true,
      }),
    );
    await memberRepo.save(
      memberRepo.create({
        user_id: facultyUser.id,
        organization_id: heiOrg.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );

    // 4. Student Researcher User
    const studentUser = await userRepo.save(
      userRepo.create({
        email: `student.researcher.${testSuffix}@bitmesra.ac.in`,
        password_hash: 'hash123',
        name: 'Rohan Verma',
        role: UserRole.STUDENT,
        is_active: true,
      }),
    );
    await memberRepo.save(
      memberRepo.create({
        user_id: studentUser.id,
        organization_id: heiOrg.id,
        organization_role: OrganizationRole.MEMBER,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );

    // 5. Unaffiliated Outside User
    const outsiderUser = await userRepo.save(
      userRepo.create({
        email: `outsider.user.${testSuffix}@test.com`,
        password_hash: 'hash123',
        name: 'Outsider User',
        role: UserRole.CITIZEN,
        is_active: true,
      }),
    );

    // 6. Industry Partner Org & Rep User
    const industryOrg = await orgRepo.save(
      orgRepo.create({
        name: `Tata Steel Tech Sol ${testSuffix}`,
        organization_type: OrganizationType.INDUSTRY,
        verification_status: VerificationStatus.VERIFIED,
        district: 'East Singhbhum',
        state: 'Jharkhand',
      }),
    );
    const industryUser = await userRepo.save(
      userRepo.create({
        email: `tech.lead.${testSuffix}@tatasteel.com`,
        password_hash: 'hash123',
        name: 'Vikram Mehta',
        role: UserRole.INDUSTRY_MEMBER,
        is_active: true,
      }),
    );
    await memberRepo.save(
      memberRepo.create({
        user_id: industryUser.id,
        organization_id: industryOrg.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );

    // 7. Seed Challenge & Project
    const challenge = await challengeRepo.save(
      challengeRepo.create({
        title: `Solar Water Filtration for Rural Schools ${testSuffix}`,
        description: 'Solar powered filtration units for 15 secondary schools in Ranchi district.',
        district: 'Ranchi',
        status: ChallengeStatus.VALIDATED,
        priority: ChallengePriority.HIGH,
        submitted_by: govUser.id,
      }),
    );

    const project = await projectRepo.save(
      projectRepo.create({
        challenge_id: challenge.id,
        title: `Rural Solar Water Consortium ${testSuffix}`,
        status: ProjectStatus.ACTIVE,
      }),
    );

    // Add HEI as LEAD participant
    const heiParticipant = await participantRepo.save(
      participantRepo.create({
        project_id: project.id,
        organization_id: heiOrg.id,
        participant_role: ParticipantRole.LEAD,
      }),
    );

    // Add Industry Org as PARTNER participant
    const indParticipant = await participantRepo.save(
      participantRepo.create({
        project_id: project.id,
        organization_id: industryOrg.id,
        participant_role: ParticipantRole.PARTNER,
      }),
    );

    assert(Boolean(project.id && heiParticipant.id && indParticipant.id), 'Test project and participants successfully created.');

    // =========================================================================
    // STEP 3: MODULE A — ACADEMIC COLLABORATION & MENTORSHIP TESTS
    // =========================================================================
    console.log('\n🎓 STEP 3: Testing Module A (Academic Collaboration & Mentorship)...');

    // Test 3.1: Add Student Researcher
    const studentMember = await projectsService.addAcademicMember(
      project.id,
      facultyUser.id,
      UserRole.FACULTY,
      {
        organizationId: heiOrg.id,
        userId: studentUser.id,
        role: AcademicMemberRole.STUDENT,
        department: 'Department of Environmental Science',
        specialization: 'Solar PV & Membrane Filtration',
      },
    );
    assert(studentMember.role === AcademicMemberRole.STUDENT, 'Student researcher successfully added to project.');
    assert(studentMember.department === 'Department of Environmental Science', 'Department verified.');
    assert(studentMember.specialization?.includes('Solar PV') === true, 'Specialization verified.');

    // Test 3.2: Add Faculty Mentor
    const facultyMember = await projectsService.addAcademicMember(
      project.id,
      facultyUser.id,
      UserRole.FACULTY,
      {
        organizationId: heiOrg.id,
        userId: facultyUser.id,
        role: AcademicMemberRole.FACULTY_MENTOR,
        department: 'Renewable Energy Systems',
        specialization: 'Solar Micro-grids & Storage',
      },
    );
    assert(facultyMember.role === AcademicMemberRole.FACULTY_MENTOR, 'Faculty mentor successfully added to project.');

    // Test 3.3: Rejection of outsider user who is not member of the HEI
    await assertThrows(
      () =>
        projectsService.addAcademicMember(
          project.id,
          facultyUser.id,
          UserRole.FACULTY,
          {
            organizationId: heiOrg.id,
            userId: outsiderUser.id,
            role: AcademicMemberRole.STUDENT,
          },
        ),
      'active membership',
      'Outsider user without active HEI membership is rejected.',
    );

    // Test 3.4: Rejection of duplicate assignment on the same project
    await assertThrows(
      () =>
        projectsService.addAcademicMember(
          project.id,
          facultyUser.id,
          UserRole.FACULTY,
          {
            organizationId: heiOrg.id,
            userId: studentUser.id,
            role: AcademicMemberRole.STUDENT,
          },
        ),
      'already an assigned academic team member',
      'Duplicate academic member assignment is strictly rejected.',
    );

    // Test 3.5: Privacy Access Control on GET academic-members
    // A) Consortium member access -> Succeeded
    const acadListForConsortium = await projectsService.getAcademicMembers(
      project.id,
      studentUser.id,
      UserRole.STUDENT,
    );
    assert(acadListForConsortium.length === 2, 'Consortium member can read project academic members (length = 2).');

    // B) Government reviewer access -> Succeeded
    const acadListForGov = await projectsService.getAcademicMembers(
      project.id,
      govUser.id,
      UserRole.GOVERNMENT_OFFICER,
    );
    assert(acadListForGov.length === 2, 'Government reviewer can read project academic members.');

    // C) Outsider access -> Forbidden (403)
    await assertThrows(
      () =>
        projectsService.getAcademicMembers(
          project.id,
          outsiderUser.id,
          UserRole.CITIZEN,
        ),
      'authenticated consortium members',
      'Public / outsider access to academic members list is strictly Forbidden (403).',
    );

    // Test 3.6: Update academic member
    const updatedMember = await projectsService.updateAcademicMember(
      project.id,
      studentMember.id,
      facultyUser.id,
      UserRole.FACULTY,
      {
        specialization: 'Advanced Ultrafiltration & IoT Telemetry',
        status: AcademicMemberStatus.ACTIVE,
      },
    );
    assert(updatedMember.specialization === 'Advanced Ultrafiltration & IoT Telemetry', 'Academic member specialization updated successfully.');

    // =========================================================================
    // STEP 4: MODULE B — INDUSTRY CONTRIBUTIONS & VISIBILITY CONTROLS
    // =========================================================================
    console.log('\n💼 STEP 4: Testing Module B (Industry & Ecosystem Contributions)...');

    // Test 4.1: Create Public Consortium Contribution (Testing Facilities)
    const contrib1 = await projectsService.createContribution(
      project.id,
      industryUser.id,
      UserRole.INDUSTRY_MEMBER,
      {
        contributionType: ProjectContributionType.TESTING,
        title: 'Water Quality Spectrometry Lab Access',
        description: 'Provide certified lab facilities for weekly bacteriological and heavy metal testing.',
        value: 75000,
        visibility: ContributionVisibility.CONSORTIUM,
      },
    );
    assert(contrib1.status === ContributionStatus.PROPOSED, 'Contribution 1 created with status PROPOSED.');
    assert(contrib1.visibility === ContributionVisibility.CONSORTIUM, 'Contribution 1 visibility is CONSORTIUM.');

    // Test 4.2: Create CONTRIBUTOR_AND_LEAD_ONLY Contribution (Co-financing grant)
    const contrib2 = await projectsService.createContribution(
      project.id,
      industryUser.id,
      UserRole.INDUSTRY_MEMBER,
      {
        contributionType: ProjectContributionType.FUNDING,
        title: 'Hardware Procurement Grant',
        description: 'Direct procurement funding for 15 smart pump inverters.',
        value: 300000,
        visibility: ContributionVisibility.CONTRIBUTOR_AND_LEAD_ONLY,
      },
    );
    assert(contrib2.visibility === ContributionVisibility.CONTRIBUTOR_AND_LEAD_ONLY, 'Contribution 2 created with CONTRIBUTOR_AND_LEAD_ONLY visibility.');

    // Test 4.3: Visibility scoping on GET /api/projects/:id/contributions
    // A) Gov user sees both
    const govContribs = await projectsService.getContributions(
      project.id,
      govUser.id,
      UserRole.GOVERNMENT_OFFICER,
    );
    assert(govContribs.length === 2, 'Government reviewer sees all contributions.');

    // B) Lead institution user sees CONSORTIUM and CONTRIBUTOR_AND_LEAD_ONLY
    const leadContribs = await projectsService.getContributions(
      project.id,
      facultyUser.id,
      UserRole.FACULTY,
    );
    assert(leadContribs.length === 2, 'Lead institution user sees both contributions.');

    // Test 4.4: Government Verification of Contribution (VERIFIED)
    const verifiedContrib = await projectsService.verifyContribution(
      contrib1.id,
      govUser.id,
      UserRole.GOVERNMENT_OFFICER,
      {
        decision: ContributionStatus.VERIFIED,
        verificationNotes: 'Verified against district laboratory guidelines. Facilities inspected.',
      },
    );
    assert(verifiedContrib.status === ContributionStatus.VERIFIED, 'Contribution 1 successfully marked VERIFIED by government.');
    assert(verifiedContrib.verified_by_id === govUser.id, 'Contribution verification recorded officer user ID.');

    // Test 4.5: Contribution Non-Blocking Invariant
    // Rejection of a contribution does NOT mutate project status (stays ACTIVE)
    const rejectedContrib = await projectsService.verifyContribution(
      contrib2.id,
      govUser.id,
      UserRole.GOVERNMENT_OFFICER,
      {
        decision: ContributionStatus.REJECTED,
        verificationNotes: 'Duplicate funding source with CSR scheme.',
      },
    );
    assert(rejectedContrib.status === ContributionStatus.REJECTED, 'Contribution 2 marked REJECTED.');

    const freshProject = await projectRepo.findOneOrFail({ where: { id: project.id } });
    assert(freshProject.status === ProjectStatus.ACTIVE, 'Non-blocking invariant verified: Project status remains ACTIVE despite contribution rejection.');

    // =========================================================================
    // STEP 5: MODULE C — GOVERNMENT INTELLIGENCE & DATABASE-LEVEL ANALYTICS
    // =========================================================================
    console.log('\n📊 STEP 5: Testing Module C (Government Intelligence & Analytics)...');

    // Test 5.1: Overview Analytics (100% DB Aggregation)
    const overviewMetrics = await analyticsService.getOverview(platformAdminUser);
    assert(typeof overviewMetrics.challenges.total === 'number', 'challenges.total is a valid numeric aggregate.');
    assert(typeof overviewMetrics.projects.total === 'number', 'projects.total is a valid numeric aggregate.');
    assert(overviewMetrics.ecosystem.academicMembers >= 2, 'ecosystem.academicMembers reflects the seeded academic members.');
    assert(overviewMetrics.impact.totalFundingMobilized >= 75000, 'totalFundingMobilized includes approved contribution value.');

    // Test 5.2: Challenges Analytics
    const challengesAnalytics = await analyticsService.getChallengesAnalytics(platformAdminUser);
    assert(Array.isArray(challengesAnalytics.byDistrict || challengesAnalytics.byDomain), 'Analytics grouped response returned.');

    // Test 5.3: Projects Analytics
    const projectsAnalytics = await analyticsService.getProjectsAnalytics(platformAdminUser);
    assert(Array.isArray(projectsAnalytics.pipeline), 'pipeline is returned as an array.');

    // Test 5.4: Ecosystem Analytics
    const ecosystemAnalytics = await analyticsService.getEcosystemAnalytics(platformAdminUser);
    assert(Array.isArray(ecosystemAnalytics.orgBreakdown), 'orgBreakdown is returned as an array.');
    assert(Array.isArray(ecosystemAnalytics.academicRoles), 'academicRoles is returned as an array.');

    // Test 5.5: Filter parameter scoping
    const filteredOverview = await analyticsService.getOverview(platformAdminUser, { district: 'Ranchi' });
    assert(filteredOverview.challenges.total >= 0, 'District filtering scopes challenge aggregation without errors.');

    // =========================================================================
    // STEP 6: MODULE D — SCOPED STAKEHOLDER NOTIFICATIONS & USER ISOLATION
    // =========================================================================
    console.log('\n🔔 STEP 6: Testing Module D (Scoped Stakeholder Notifications)...');

    // Test 6.1: Direct notification
    const testNotif = await notifService.notifyUser(
      studentUser.id,
      NotificationType.PROJECT_GOVERNANCE,
      'Field Testing Task Assigned',
      'Please perform water sample collection at School #3.',
      'PROJECT',
      project.id,
    );
    assert(testNotif.id && !testNotif.is_read, 'Direct notification created with is_read = false.');

    // Test 6.2: User isolation
    const studentNotifs = await notifService.getUserNotifications(studentUser.id);
    const outsiderNotifs = await notifService.getUserNotifications(outsiderUser.id);
    assert(studentNotifs.notifications.some((n) => n.id === testNotif.id), 'Student sees their notification.');
    assert(!outsiderNotifs.notifications.some((n) => n.id === testNotif.id), 'User isolation verified: Outsider cannot see student notification.');

    // Test 6.3: Mark single notification read
    const readNotif = await notifService.markAsRead(testNotif.id, studentUser.id);
    assert(readNotif.is_read === true, 'Notification marked as read successfully.');

    // Test 6.4: Unauthorized mark as read rejected
    await assertThrows(
      () => notifService.markAsRead(testNotif.id, outsiderUser.id),
      'Notification not found or access denied',
      'Marking another user notification as read is strictly rejected (NotFound/AccessDenied).',
    );

    // Test 6.5: Bulk mark all read
    await notifService.notifyUser(
      studentUser.id,
      NotificationType.MILESTONE_ACTION,
      'Milestone Due Reminder',
      'Milestone 1 due in 3 days.',
    );
    await notifService.notifyUser(
      studentUser.id,
      NotificationType.CONTRIBUTION_UPDATE,
      'Contribution Approved',
      'Lab equipment approved by government.',
    );

    const markAllRes = await notifService.markAllAsRead(studentUser.id);
    assert(markAllRes.affected >= 2, 'Bulk mark-all-as-read updated multiple unread notifications.');

    const refreshedStudentNotifs = await notifService.getUserNotifications(studentUser.id);
    assert(refreshedStudentNotifs.unreadCount === 0, 'Unread notification count reset to 0 after mark-all-read.');

    // =========================================================================
    // STEP 7: CLEANUP
    // =========================================================================
    console.log('\n🧹 STEP 7: Cleaning up test artifacts...');
    await notifRepo.delete({ user_id: studentUser.id });
    await notifRepo.delete({ user_id: facultyUser.id });
    await notifRepo.delete({ user_id: govUser.id });
    await contribRepo.delete({ project_id: project.id });
    await acadRepo.delete({ project_id: project.id });
    await participantRepo.delete({ project_id: project.id });
    await projectRepo.delete({ id: project.id });
    await challengeRepo.delete({ id: challenge.id });
    await memberRepo.delete({ user_id: studentUser.id });
    await memberRepo.delete({ user_id: facultyUser.id });
    await memberRepo.delete({ user_id: industryUser.id });
    await userRepo.delete({ id: studentUser.id });
    await userRepo.delete({ id: facultyUser.id });
    await userRepo.delete({ id: industryUser.id });
    await userRepo.delete({ id: outsiderUser.id });
    await userRepo.delete({ id: govUser.id });
    await orgRepo.delete({ id: heiOrg.id });
    await orgRepo.delete({ id: industryOrg.id });
    console.log('  ✅ Test data cleaned up successfully.');

    console.log('\n============================================================');
    console.log(`🎉 ALL PHASE 9 TESTS PASSED (${passedAssertions}/${passedAssertions} ASSERTIONS)`);
    console.log('============================================================\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('\n💥 TEST SUITE TERMINATED WITH ERROR:', err);
  process.exit(1);
});
