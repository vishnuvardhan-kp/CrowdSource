import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_ENTITIES } from '../src/database/entities';
import {
  Organization,
  OrganizationMembership,
  User,
  Challenge,
  Project,
  ProjectParticipant,
  ProjectMilestone,
  ProjectTask,
  ProjectDeliverable,
  ProjectUpdate,
  ProjectReview,
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
  TaskStatus,
  DeliverableDocumentType,
  ProjectUpdateType,
  ProjectReviewAction,
} from '../src/common/enums';
import { ProjectsService, ExpressUploadedFile } from '../src/modules/projects/projects.service';

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
  console.log('🧪 Starting SamadhanSetu Phase 7 Project Execution & Governance Test Suite');
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
  const milestoneRepo = dataSource.getRepository(ProjectMilestone);
  const taskRepo = dataSource.getRepository(ProjectTask);
  const deliverableRepo = dataSource.getRepository(ProjectDeliverable);
  const updateRepo = dataSource.getRepository(ProjectUpdate);
  const reviewRepo = dataSource.getRepository(ProjectReview);

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
  );

  try {
    // -------------------------------------------------------------
    // SEEDING TEST ACTORS & ORGANIZATIONS
    // -------------------------------------------------------------
    console.log('--- Setting Up Test Actors & Organizations ---');
    const testSuffix = `p7_${Date.now()}`;

    // Gov Officer
    const govUser = await userRepo.save(
      userRepo.create({
        name: `Gov Officer ${testSuffix}`,
        email: `gov_${testSuffix}@gov.jharkhand.gov.in`,
        role: UserRole.GOVERNMENT_OFFICER,
      }),
    );

    // Lead Org User (Academic/R&D Lead)
    const leadUser = await userRepo.save(
      userRepo.create({
        name: `Lead Prof ${testSuffix}`,
        email: `lead_${testSuffix}@iit.test.edu`,
        role: UserRole.UNIVERSITY_ADMIN,
      }),
    );

    // Partner Org User (Industry Partner)
    const partnerUser = await userRepo.save(
      userRepo.create({
        name: `Partner CTO ${testSuffix}`,
        email: `partner_${testSuffix}@techcorp.test.com`,
        role: UserRole.INDUSTRY_ADMIN,
      }),
    );

    // Outsider User (Non-participant)
    const outsiderUser = await userRepo.save(
      userRepo.create({
        name: `Outsider User ${testSuffix}`,
        email: `outsider_${testSuffix}@random.test.com`,
        role: UserRole.CITIZEN,
      }),
    );

    // Lead Org
    const leadOrg = await orgRepo.save(
      orgRepo.create({
        name: `Phase 7 Research Institute ${testSuffix}`,
        organization_type: OrganizationType.INSTITUTION,
        district: 'Ranchi',
        state: 'Jharkhand',
        is_claimed: true,
        verification_status: VerificationStatus.VERIFIED,
      }),
    );

    // Partner Org
    const partnerOrg = await orgRepo.save(
      orgRepo.create({
        name: `Phase 7 CleanTech Solutions Ltd ${testSuffix}`,
        organization_type: OrganizationType.INDUSTRY,
        district: 'East Singhbhum',
        state: 'Jharkhand',
        is_claimed: true,
        verification_status: VerificationStatus.VERIFIED,
      }),
    );

    // Memberships
    await memberRepo.save(
      memberRepo.create({
        user_id: leadUser.id,
        organization_id: leadOrg.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );

    await memberRepo.save(
      memberRepo.create({
        user_id: partnerUser.id,
        organization_id: partnerOrg.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );

    // Challenge
    const challenge = await challengeRepo.save(
      challengeRepo.create({
        title: `Phase 7 Rural Water Filtration Collaborative Initiative ${testSuffix}`,
        description: 'Advanced membrane filtration challenge for high-salinity borewells.',
        district: 'Ranchi',
        state: 'Jharkhand',
        status: ChallengeStatus.PROJECT_INITIATED,
        priority: ChallengePriority.HIGH,
        category: 'Water & Sanitation',
      }),
    );

    // Create Main Test Project
    let project = await projectRepo.save(
      projectRepo.create({
        title: `Phase 7 Clean Water Demonstration Pilot ${testSuffix}`,
        description: 'Collaborative development and deployment of solar-powered filtration units.',
        challenge_id: challenge.id,
        status: ProjectStatus.INITIATED,
      }),
    );

    // Participants: Lead + Partner
    const leadPart = participantRepo.create({
      project_id: project.id,
      organization_id: leadOrg.id,
      participant_role: 'LEAD',
      status: 'ACTIVE',
    });
    await participantRepo.save(leadPart);

    const partnerPart = participantRepo.create({
      project_id: project.id,
      organization_id: partnerOrg.id,
      participant_role: 'PARTNER',
      status: 'ACTIVE',
    });
    await participantRepo.save(partnerPart);

    console.log('✅ Test actors, organizations, and project created successfully.\n');

    // =============================================================
    // SUITE 1: PROJECT INITIATION & GOVERNANCE ACCESS CONTROL
    // =============================================================
    console.log('--- Suite 1: Project Initiation & Governance Access Control ---');

    // 1. Outsider cannot access project
    await assertThrows(
      () => projectsService.getProjectById(project.id, outsiderUser.id, outsiderUser.role),
      'You do not have access',
      'Non-participant user receives 403 Forbidden on project workspace',
    );

    // 2. Consortium members can access project
    const leadView = await projectsService.getProjectById(project.id, leadUser.id, leadUser.role);
    assert(leadView.id === project.id, 'Lead institution member can view project details');
    assert(leadView.participants.length === 2, 'Project has both participants registered');

    const partnerView = await projectsService.getProjectById(
      project.id,
      partnerUser.id,
      partnerUser.role,
    );
    assert(partnerView.id === project.id, 'Partner industry member can view project details');

    // 3. Government officer can view all projects
    const govView = await projectsService.getProjectById(project.id, govUser.id, govUser.role);
    assert(govView.id === project.id, 'Government officer has administrative visibility');

    // =============================================================
    // SUITE 2: KICKOFF SUBMISSION & GOVERNMENT APPROVAL WORKFLOW
    // =============================================================
    console.log('\n--- Suite 2: Kickoff Submission & Government Approval Workflow ---');

    // 1. Partner cannot submit kickoff (Lead only)
    await assertThrows(
      () =>
        projectsService.submitKickoff(project.id, partnerUser.id, partnerUser.role, {
          objectives: 'Unauthorized partner kickoff attempt',
        }),
      'Only the Lead institution',
      'Partner participant cannot submit kickoff plan',
    );

    // 2. Lead submits kickoff plan with initial milestones
    const kickedOff = await projectsService.submitKickoff(
      project.id,
      leadUser.id,
      leadUser.role,
      {
        objectives: 'Establish high-flow solar filtration in 5 villages.',
        expected_outcomes: '10,000L/day clean drinking water meeting BIS standards.',
        target_completion_date: '2026-12-31',
        initial_milestones: [
          {
            title: 'Milestone 1: Prototype Fabrication & Lab Validation',
            description: 'Design and assemble 5 pilot units.',
            order_index: 1,
          },
          {
            title: 'Milestone 2: Field Deployment & Community Testing',
            description: 'Deploy units and monitor water quality for 30 days.',
            order_index: 2,
          },
        ],
      },
    );

    assert(
      kickedOff.status === ProjectStatus.KICKOFF_PENDING,
      'Kickoff submission sets project status to KICKOFF_PENDING',
    );
    assert(
      kickedOff.objectives === 'Establish high-flow solar filtration in 5 villages.',
      'Project objectives correctly saved during kickoff',
    );
    assert(
      kickedOff.milestones.length === 2,
      'Initial milestones automatically created during kickoff submission',
    );

    // 3. Government requests revision on kickoff
    const revisionReq = await projectsService.reviewKickoff(project.id, govUser.id, {
      decision: 'REQUEST_REVISION',
      comments: 'Please elaborate water testing protocol and timeline.',
    });
    assert(
      revisionReq.status === ProjectStatus.KICKOFF_REVISION,
      'Government can request revision on kickoff, moving to KICKOFF_REVISION',
    );

    // 4. Lead revises kickoff and resubmits
    const resubmittedKickoff = await projectsService.submitKickoff(
      project.id,
      leadUser.id,
      leadUser.role,
      {
        objectives:
          'Establish high-flow solar filtration in 5 villages with ISO 17025 lab water quality testing.',
      },
    );
    assert(
      resubmittedKickoff.status === ProjectStatus.KICKOFF_PENDING,
      'Lead can resubmit revised kickoff, returning status to KICKOFF_PENDING',
    );

    // 5. Government approves kickoff
    const approvedProject = await projectsService.reviewKickoff(project.id, govUser.id, {
      decision: 'APPROVE',
      comments: 'Kickoff plan approved. Project is cleared for real-world execution.',
    });
    assert(
      approvedProject.status === ProjectStatus.ACTIVE,
      'Kickoff approval activates project (status -> ACTIVE)',
    );
    assert(approvedProject.start_date !== null, 'Kickoff approval automatically sets start_date');

    const m1 = approvedProject.milestones.find((m) => m.order_index === 1)!;
    assert(
      m1.status === MilestoneStatus.IN_PROGRESS,
      'First milestone is automatically activated to IN_PROGRESS upon kickoff approval',
    );

    // =============================================================
    // SUITE 3: MILESTONE PROGRESSION & CASCADING LOCK ENFORCEMENT
    // =============================================================
    console.log('\n--- Suite 3: Milestone Progression & Cascading Lock Enforcement ---');

    // 1. Create tasks under Milestone 1 (IN_PROGRESS)
    const task1 = await projectsService.createTask(
      project.id,
      leadUser.id,
      leadUser.role,
      {
        milestone_id: m1.id,
        title: 'Membrane filter assembly',
        description: 'Assemble multi-layer reverse osmosis filter membranes.',
      },
    );
    assert(task1.status === TaskStatus.TODO, 'Task 1 created in TODO status');

    // 2. Upload deliverable linked to Milestone 1
    const dummyFile: ExpressUploadedFile = {
      fieldname: 'file',
      originalname: 'lab_test_report_v1.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('%PDF-1.4 Dummy PDF Content for Lab Report'),
    };

    const deliv1 = await projectsService.uploadDeliverable(
      project.id,
      dummyFile,
      leadUser.id,
      leadUser.role,
      {
        milestone_id: m1.id,
        title: 'Lab Test Report V1',
        document_type: DeliverableDocumentType.REPORT,
      },
    );
    assert(deliv1.title === 'Lab Test Report V1', 'Deliverable 1 uploaded successfully');

    // 3. Lead requests milestone review -> Status becomes REVIEW_REQUESTED
    const requestedM1 = await projectsService.requestMilestoneReview(
      project.id,
      m1.id,
      leadUser.id,
      leadUser.role,
    );
    assert(
      requestedM1.status === MilestoneStatus.REVIEW_REQUESTED,
      'Milestone 1 transitions to REVIEW_REQUESTED',
    );

    // 4. Cascading Lock Enforcement: Modifications blocked while REVIEW_REQUESTED
    await assertThrows(
      () =>
        projectsService.createTask(project.id, leadUser.id, leadUser.role, {
          milestone_id: m1.id,
          title: 'Locked task attempt',
        }),
      'locked',
      'Cannot add tasks to a milestone that is under review (Cascading Lock)',
    );

    await assertThrows(
      () =>
        projectsService.updateTask(project.id, task1.id, leadUser.id, leadUser.role, {
          status: TaskStatus.DONE,
        }),
      'locked',
      'Cannot update tasks in a milestone that is under review (Cascading Lock)',
    );

    await assertThrows(
      () =>
        projectsService.uploadDeliverable(
          project.id,
          dummyFile,
          leadUser.id,
          leadUser.role,
          {
            milestone_id: m1.id,
            title: 'Locked deliverable upload attempt',
          },
        ),
      'locked',
      'Cannot upload deliverables to a milestone under review (Cascading Lock)',
    );

    await assertThrows(
      () =>
        projectsService.updateMilestone(project.id, m1.id, leadUser.id, leadUser.role, {
          title: 'Locked milestone title edit',
        }),
      'locked',
      'Cannot modify milestone details while under review (Cascading Lock)',
    );

    // 5. Gov requests revision on milestone -> Unlocks editing
    const revM1 = await projectsService.reviewMilestone(project.id, m1.id, govUser.id, {
      decision: 'REQUEST_REVISION',
      comments: 'Please attach flow-rate calibration logs to the deliverable.',
    });
    assert(
      revM1.status === MilestoneStatus.REVISION_REQUIRED,
      'Gov review can request revision, transitioning milestone to REVISION_REQUIRED',
    );

    // Unlocked: Task can now be updated
    const updatedTask = await projectsService.updateTask(
      project.id,
      task1.id,
      leadUser.id,
      leadUser.role,
      { status: TaskStatus.DONE },
    );
    assert(
      updatedTask.status === TaskStatus.DONE,
      'Tasks can be edited again after milestone returns to REVISION_REQUIRED',
    );

    // Re-request review -> Lock engages again
    await projectsService.requestMilestoneReview(
      project.id,
      m1.id,
      leadUser.id,
      leadUser.role,
    );

    // 6. Gov approves milestone -> Permanent Lock
    const approvedM1 = await projectsService.reviewMilestone(
      project.id,
      m1.id,
      govUser.id,
      {
        decision: 'APPROVE',
        comments: 'Lab validation verified. Milestone 1 approved.',
      },
    );
    assert(
      approvedM1.status === MilestoneStatus.APPROVED,
      'Government approves Milestone 1 (status -> APPROVED)',
    );

    // Verify next milestone (Milestone 2) is auto-activated to IN_PROGRESS
    const m2 = await milestoneRepo.findOneOrFail({
      where: { project_id: project.id, order_index: 2 },
    });
    assert(
      m2.status === MilestoneStatus.IN_PROGRESS,
      'Next milestone (Milestone 2) is auto-activated to IN_PROGRESS',
    );

    // Permanent Lock Check on Approved Milestone:
    await assertThrows(
      () =>
        projectsService.updateTask(project.id, task1.id, leadUser.id, leadUser.role, {
          title: 'Tampering approved milestone task',
        }),
      'locked',
      'Tasks in APPROVED milestones are permanently immutable',
    );

    await assertThrows(
      () =>
        projectsService.uploadDeliverable(
          project.id,
          dummyFile,
          leadUser.id,
          leadUser.role,
          {
            milestone_id: m1.id,
            title: 'Tampering approved milestone deliverables',
          },
        ),
      'locked',
      'Deliverables cannot be added to APPROVED milestones (Permanent Immutability)',
    );

    // =============================================================
    // SUITE 4: TASK EXECUTION & PARTICIPANT COLLABORATION
    // =============================================================
    console.log('\n--- Suite 4: Task Execution & Participant Collaboration ---');

    // Create task in Milestone 2 assigned to Partner
    const task2 = await projectsService.createTask(
      project.id,
      leadUser.id,
      leadUser.role,
      {
        milestone_id: m2.id,
        assigned_participant_id: partnerPart.id,
        title: 'Field installation of units',
        description: 'Install 5 pilot units in designated panchayat borewells.',
      },
    );
    assert(
      task2.assigned_participant_id === partnerPart.id,
      'Task correctly assigned to partner industry participant',
    );

    // Partner updates task progress
    const inProgressTask = await projectsService.updateTask(
      project.id,
      task2.id,
      partnerUser.id,
      partnerUser.role,
      { status: TaskStatus.IN_PROGRESS },
    );
    assert(
      inProgressTask.status === TaskStatus.IN_PROGRESS,
      'Assigned partner can advance task status to IN_PROGRESS',
    );

    const completedTask = await projectsService.updateTask(
      project.id,
      task2.id,
      partnerUser.id,
      partnerUser.role,
      { status: TaskStatus.DONE },
    );
    assert(
      completedTask.status === TaskStatus.DONE,
      'Partner completes task and marks status as DONE',
    );

    // =============================================================
    // SUITE 5: DELIVERABLE VAULT ISOLATION & SECURITY
    // =============================================================
    console.log('\n--- Suite 5: Deliverable Vault Isolation & Security ---');

    const fieldPhotoFile: ExpressUploadedFile = {
      fieldname: 'file',
      originalname: 'field_deployment_site.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 2048,
      buffer: Buffer.from('Dummy JPEG File Contents for Field Photo'),
    };

    const deliv2 = await projectsService.uploadDeliverable(
      project.id,
      fieldPhotoFile,
      partnerUser.id,
      partnerUser.role,
      {
        milestone_id: m2.id,
        title: 'Field Deployment Site Verification',
        document_type: DeliverableDocumentType.FIELD_PHOTO,
      },
    );

    assert(
      deliv2.document_type === DeliverableDocumentType.FIELD_PHOTO,
      'Deliverable document type correctly stored as FIELD_PHOTO',
    );
    assert(
      deliv2.storage_key.endsWith('.jpg'),
      'Deliverable file stored with sanitized extension',
    );

    // Verify file exists on physical disk in uploads/project-deliverables
    const expectedDir = path.resolve(process.cwd(), 'uploads/project-deliverables');
    const diskPath = path.join(expectedDir, deliv2.storage_key);
    assert(
      fs.existsSync(diskPath),
      'Deliverable file physically persisted in uploads/project-deliverables directory',
    );

    // Outsider cannot access deliverable list
    await assertThrows(
      () =>
        projectsService.getDeliverables(
          project.id,
          outsiderUser.id,
          outsiderUser.role,
        ),
      'You do not have access',
      'Outsider cannot list project deliverables',
    );

    // =============================================================
    // SUITE 6: PROJECT UPDATES & BLOCKER EMERGENCY WORKFLOW
    // =============================================================
    console.log('\n--- Suite 6: Project Updates & Blocker Emergency Workflow ---');

    // 1. Post normal progress update
    const progUpdate = await projectsService.createUpdate(
      project.id,
      leadUser.id,
      leadUser.role,
      {
        update_type: ProjectUpdateType.PROGRESS,
        summary: 'Site 1 & 2 installations completed ahead of schedule.',
      },
    );
    assert(
      progUpdate.update_type === ProjectUpdateType.PROGRESS,
      'Normal progress update recorded successfully',
    );

    let currentProject = await projectRepo.findOneOrFail({ where: { id: project.id } });
    assert(
      currentProject.status === ProjectStatus.ACTIVE,
      'Project remains ACTIVE after normal progress update',
    );

    // 2. Post Blocker Update -> Project IMMEDIATELY becomes BLOCKED
    const blockerUpdate = await projectsService.createUpdate(
      project.id,
      partnerUser.id,
      partnerUser.role,
      {
        update_type: ProjectUpdateType.BLOCKER,
        summary: 'Panchayat electrical grid failure prevents pump operation at Site 3.',
        details: 'Grid voltage fluctuates dangerously between 140V and 290V.',
      },
    );
    assert(
      blockerUpdate.blocker_status === 'OPEN',
      'Blocker update created with blocker_status = OPEN',
    );

    currentProject = await projectRepo.findOneOrFail({ where: { id: project.id } });
    assert(
      currentProject.status === ProjectStatus.BLOCKED,
      'Project status immediately transitions to BLOCKED upon blocker creation',
    );

    // While blocked, uploading deliverables is prohibited
    await assertThrows(
      () =>
        projectsService.uploadDeliverable(
          project.id,
          fieldPhotoFile,
          partnerUser.id,
          partnerUser.role,
          { title: 'Upload during blocker' },
        ),
      'Cannot upload deliverables: Project is currently in status "BLOCKED"',
      'Deliverable uploads blocked while project is BLOCKED',
    );

    // 3. Gov acknowledges blocker
    const ackBlocker = await projectsService.reviewBlocker(
      project.id,
      blockerUpdate.id,
      govUser.id,
      {
        decision: 'ACKNOWLEDGE',
        comments: 'Notified local electricity distribution board of grid fluctuation.',
      },
    );
    currentProject = await projectRepo.findOneOrFail({ where: { id: project.id } });
    assert(
      currentProject.status === ProjectStatus.BLOCKED,
      'Project remains BLOCKED after government acknowledgment',
    );

    // 4. Gov resolves blocker -> Project unblocks (status -> ACTIVE)
    const resBlocker = await projectsService.reviewBlocker(
      project.id,
      blockerUpdate.id,
      govUser.id,
      {
        decision: 'RESOLVE',
        comments: 'Dedicated 5kVA servo stabilizer installed at Site 3. Grid issue resolved.',
      },
    );
    assert(
      resBlocker.blocker_status === 'RESOLVED',
      'Blocker status updated to RESOLVED',
    );

    currentProject = await projectRepo.findOneOrFail({ where: { id: project.id } });
    assert(
      currentProject.status === ProjectStatus.ACTIVE,
      'Project status automatically restored to ACTIVE once blocker is resolved',
    );

    // =============================================================
    // SUITE 7: ZERO-MILESTONE COMPLETION GUARD ENFORCEMENT
    // =============================================================
    console.log('\n--- Suite 7: Zero-Milestone Completion Guard Enforcement ---');

    // 1. Test Project with 0 Milestones
    const emptyProj = await projectRepo.save(
      projectRepo.create({
        title: 'Empty Project for Zero-Milestone Guard',
        challenge_id: challenge.id,
        status: ProjectStatus.ACTIVE,
      }),
    );
    await assertThrows(
      () =>
        projectsService.completeProject(emptyProj.id, govUser.id, {
          comments: 'Attempting invalid completion',
        }),
      'Zero-Milestone Completion Guard',
      'Project with 0 milestones cannot be completed (Zero-Milestone Completion Guard)',
    );
    await projectRepo.delete(emptyProj.id);

    // 2. Test Main Project with unapproved Milestone 2
    await assertThrows(
      () =>
        projectsService.completeProject(project.id, govUser.id, {
          comments: 'Attempting early completion',
        }),
      'All milestones must be APPROVED',
      'Project cannot be completed while any milestone remains unapproved',
    );

    // Approve Milestone 2
    await projectsService.requestMilestoneReview(
      project.id,
      m2.id,
      leadUser.id,
      leadUser.role,
    );
    await projectsService.reviewMilestone(project.id, m2.id, govUser.id, {
      decision: 'APPROVE',
      comments: 'Field deployment and community testing approved.',
    });

    // 3. Successful Project Completion
    const completedProject = await projectsService.completeProject(
      project.id,
      govUser.id,
      {
        comments: 'All milestones completed and verified. Pilot successfully delivered.',
      },
    );
    assert(
      completedProject.status === ProjectStatus.COMPLETED,
      'Project successfully transitions to COMPLETED when all guards pass',
    );
    assert(
      completedProject.actual_completion_date !== null,
      'Completion date recorded upon project completion',
    );

    // =============================================================
    // SUITE 8: IMPACT VERIFICATION & PROJECT TERMINATION
    // =============================================================
    console.log('\n--- Suite 8: Impact Verification & Project Termination ---');

    // 1. Impact Verification (COMPLETED -> IMPACT_VERIFIED)
    const verifiedProject = await projectsService.verifyImpact(
      project.id,
      govUser.id,
      {
        comments:
          'Impact verified: 12,400L/day water treated, 5 panchayats benefited.',
      },
    );
    assert(
      verifiedProject.status === ProjectStatus.IMPACT_VERIFIED,
      'Project cleanly transitions to IMPACT_VERIFIED (Phase 7 clean handoff point)',
    );

    // 2. Termination workflow on separate test project
    let termProject = projectRepo.create({
      title: 'Phase 7 Terminated Project Test',
      challenge_id: challenge.id,
      status: ProjectStatus.ACTIVE,
    });
    termProject = await projectRepo.save(termProject);

    await participantRepo.save(
      participantRepo.create({
        project_id: termProject.id,
        organization_id: leadOrg.id,
        participant_role: 'LEAD',
        status: 'ACTIVE',
      }),
    );

    // Termination without reason must fail
    await assertThrows(
      () =>
        projectsService.terminateProject(termProject.id, govUser.id, {
          reason: '',
        }),
      'mandatory for project termination',
      'Termination without valid reason is rejected',
    );

    // Termination with mandatory reason succeeds
    const terminated = await projectsService.terminateProject(
      termProject.id,
      govUser.id,
      {
        reason: 'Consortium dissolved and failed environmental clearance.',
        comments: 'Formal notice issued under section 14.',
      },
    );
    assert(
      terminated.status === ProjectStatus.TERMINATED,
      'Project status updated to TERMINATED',
    );

    // Cannot modify terminated project
    await assertThrows(
      () =>
        projectsService.createUpdate(terminated.id, leadUser.id, leadUser.role, {
          update_type: ProjectUpdateType.PROGRESS,
          summary: 'Attempt update on terminated project',
        }),
      'terminal status',
      'Further updates on TERMINATED project are strictly prohibited',
    );

    console.log('\n============================================================');
    console.log(`🏆 ALL 8 PHASE 7 SUITES PASSED! (${passedAssertions} assertions verified)`);
    console.log('============================================================\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Phase 7 Test Failure:', err);
  process.exit(1);
});
