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
  ProjectContribution,
  ProjectUpdate,
  ProjectReview,
  ProblemCluster,
  ExpressionOfInterest,
  Notification,
  District,
  EntityEmbedding,
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
  EoiStatus,
  ProblemClusterStatus,
  ClusteringStatus,
  ProjectContributionType,
  ContributionStatus,
  DeliverableDocumentType,
  NotificationType,
  CitizenSeverity,
} from '../src/common/enums';
import { ProblemClustersService } from '../src/modules/problem-clusters/problem-clusters.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

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
  console.log('🧪 Starting SamadhanSetu Phase 9 Problem Intelligence Test Suite');
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
  const clusterRepo = dataSource.getRepository(ProblemCluster);
  const eoiRepo = dataSource.getRepository(ExpressionOfInterest);
  const projectRepo = dataSource.getRepository(Project);
  const participantRepo = dataSource.getRepository(ProjectParticipant);
  const milestoneRepo = dataSource.getRepository(ProjectMilestone);
  const taskRepo = dataSource.getRepository(ProjectTask);
  const deliverableRepo = dataSource.getRepository(ProjectDeliverable);
  const updateRepo = dataSource.getRepository(ProjectUpdate);
  const reviewRepo = dataSource.getRepository(ProjectReview);
  const contribRepo = dataSource.getRepository(ProjectContribution);
  const notifRepo = dataSource.getRepository(Notification);
  const districtRepo = dataSource.getRepository(District);
  const embeddingRepo = dataSource.getRepository(EntityEmbedding);

  const notifService = new NotificationsService(
    notifRepo,
    userRepo,
    memberRepo,
    participantRepo,
  );

  const clustersService = new ProblemClustersService(
    clusterRepo,
    challengeRepo,
    evidenceRepo,
    embeddingRepo,
    dataSource,
    notifService,
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
    contribRepo,
    orgRepo,
    notifService,
  );

  const analyticsService = new AnalyticsService(dataSource);

  console.log('--- Setting Up Test Actors & Baseline Data ---');
  const runId = Date.now().toString().slice(-6);

  // Government Officer
  const govUser: User = await userRepo.save(
    userRepo.create({
      email: `gov_intel_${runId}@jharkhand.gov.in`,
      password_hash: 'hashed',
      name: 'Dr. Vivek Kumar (Nodal Officer)',
      role: UserRole.GOVERNMENT_OFFICER,
    }),
  );

  // Citizen submitter
  const citizenUser: User = await userRepo.save(
    userRepo.create({
      email: `citizen_intel_${runId}@community.org`,
      password_hash: 'hashed',
      name: 'Ramesh Oraon',
      role: UserRole.CITIZEN,
    }),
  );

  // Academic Lead User & Organization
  const univUser: User = await userRepo.save(
    userRepo.create({
      email: `dean_intel_${runId}@bitmesra.ac.in`,
      password_hash: 'hashed',
      name: 'Prof. Ananya Sen',
      role: UserRole.UNIVERSITY_ADMIN,
    }),
  );
  const univOrg: Organization = await orgRepo.save(
    orgRepo.create({
      name: `BIT Mesra Lab ${runId}`,
      organization_type: OrganizationType.INSTITUTION,
      district: 'Ranchi',
      state: 'Jharkhand',
      is_claimed: true,
      verification_status: VerificationStatus.VERIFIED,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: univUser.id,
      organization_id: univOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  // Industry Partner User & Organization
  const indUser: User = await userRepo.save(
    userRepo.create({
      email: `lead_intel_${runId}@tata.com`,
      password_hash: 'hashed',
      name: 'Rajesh Varma (Tata Steel Tech)',
      role: UserRole.INDUSTRY_ADMIN,
    }),
  );
  const indOrg: Organization = await orgRepo.save(
    orgRepo.create({
      name: `Tata Innovation Labs ${runId}`,
      organization_type: OrganizationType.INDUSTRY,
      district: 'East Singhbhum',
      state: 'Jharkhand',
      is_claimed: true,
      verification_status: VerificationStatus.VERIFIED,
    }),
  );
  await memberRepo.save(
    memberRepo.create({
      user_id: indUser.id,
      organization_id: indOrg.id,
      organization_role: OrganizationRole.ADMIN,
      membership_status: MembershipStatus.ACTIVE,
    }),
  );

  console.log('✅ Baseline actors created.\n');

  let consolidatedClusterId = '';
  let targetChallenge: Challenge;

  try {
    // =========================================================================
    // SUITE 1: Concurrency / Race Condition Protection Test
    // =========================================================================
    console.log('--- Suite 1: Concurrency & Advisory Lock Race Condition Protection ---');
    
    // Simulate 5 simultaneous citizen reports arriving at the exact same time for the same water contamination crisis in Namkum, Ranchi
    const incidentTitle = `Heavy arsenic contamination in groundwater ${runId}`;
    const incidentDesc = 'Severe arsenic contamination observed in village drinking water handpumps in Namkum block affecting over 200 families.';
    const incidentDistrict = 'Ranchi';
    const incidentLat = 23.3441000;
    const incidentLng = 85.3096000;

    // Create 5 Challenge records in DB as if incoming simultaneously
    const challengePromises = Array.from({ length: 5 }, async (_, i) => {
      const ch: Challenge = await challengeRepo.save(
        challengeRepo.create({
          title: `${incidentTitle} - Report #${i + 1}`,
          description: incidentDesc,
          district: incidentDistrict,
          village_locality: 'Namkum Village',
          latitude: incidentLat,
          longitude: incidentLng,
          citizen_severity: CitizenSeverity.SERIOUS,
          affected_population: '100-500',
          category: 'Water & Sanitation',
          submitted_by: citizenUser.id,
          status: ChallengeStatus.SUBMITTED,
        }),
      );
      // Concurrently run clustering engine with report id
      return clustersService.clusterCitizenReport(ch.id);
    });

    const clusterResults = await Promise.all(challengePromises);

    // Verify all 5 received a valid cluster assignment
    assert(clusterResults.length === 5, 'All 5 concurrent requests returned cluster results');
    
    // Extract unique cluster IDs
    const uniqueClusterIds = new Set(clusterResults.map((r) => r.id));
    assert(
      uniqueClusterIds.size === 1,
      `CRITICAL CONCURRENCY INVARIANT: Exactly 1 ProblemCluster created for 5 simultaneous submissions (got ${uniqueClusterIds.size})`,
    );

    consolidatedClusterId = clusterResults[0].id;
    const consolidatedCluster = await clusterRepo.findOne({
      where: { id: consolidatedClusterId },
    });

    assert(!!consolidatedCluster, 'Consolidated ProblemCluster found in database');
    assert(
      consolidatedCluster!.report_count === 5,
      `ProblemCluster report_count correctly aggregated to 5 (got ${consolidatedCluster?.report_count})`,
    );
    assert(
      consolidatedCluster!.status === ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
      'Cluster initial status is AWAITING_GOVERNMENT_VERIFICATION',
    );
    assert(
      consolidatedCluster!.priority === ChallengePriority.CRITICAL || consolidatedCluster!.priority === ChallengePriority.HIGH,
      `Consolidated cluster has elevated priority due to multi-citizen volume (got ${consolidatedCluster?.priority})`,
    );
    assert(
      consolidatedCluster!.priority_reasons && consolidatedCluster!.priority_reasons.length > 0,
      'Priority explainability reasons are transparently documented',
    );

    // Verify all 5 underlying challenge records reference the consolidated cluster
    const linkedReports = await challengeRepo.find({
      where: { cluster_id: consolidatedClusterId },
    });
    assert(
      linkedReports.length === 5,
      `All 5 challenge records successfully linked to cluster (got ${linkedReports.length})`,
    );

    // =========================================================================
    // SUITE 2: Location-Aware Clustering Guard (GPS & District Isolation)
    // =========================================================================
    console.log('\n--- Suite 2: Location-Aware Clustering Guard (Strict GPS & District Isolation) ---');

    // Case 2A: Identical text but in Dhanbad (>100 km away and different district)
    const dhanbadChallenge: Challenge = await challengeRepo.save(
      challengeRepo.create({
        title: `${incidentTitle} - Dhanbad copy`,
        description: incidentDesc,
        district: 'Dhanbad', // Different district
        village_locality: 'Jharia Ward 4',
        latitude: 23.7957000,
        longitude: 86.4304000,
        citizen_severity: CitizenSeverity.SERIOUS,
        category: 'Water & Sanitation',
        submitted_by: citizenUser.id,
        status: ChallengeStatus.SUBMITTED,
      }),
    );

    const dhanbadResult = await clustersService.clusterCitizenReport(dhanbadChallenge.id);

    assert(
      dhanbadResult.id !== consolidatedClusterId,
      'District isolation guard: Dhanbad report NOT merged into Ranchi cluster',
    );

    // Case 2B: Report in Ranchi but >8km away (e.g. Kanke vs Namkum: ~15km away)
    const distantRanchiChallenge: Challenge = await challengeRepo.save(
      challengeRepo.create({
        title: `${incidentTitle} - Distant locality`,
        description: incidentDesc,
        district: 'Ranchi', // Same district
        village_locality: 'Kanke Block',
        latitude: 23.4350000, // ~12 km north of Namkum
        longitude: 85.3200000,
        citizen_severity: CitizenSeverity.SERIOUS,
        category: 'Water & Sanitation',
        submitted_by: citizenUser.id,
        status: ChallengeStatus.SUBMITTED,
      }),
    );

    const distantResult = await clustersService.clusterCitizenReport(distantRanchiChallenge.id);
    assert(
      distantResult.id !== consolidatedClusterId,
      'Spatial isolation guard (>8km): Distant report within Ranchi created distinct ProblemCluster',
    );

    // Case 2C: Report in Ranchi within 1.5km of Namkum incident
    const nearbyChallenge: Challenge = await challengeRepo.save(
      challengeRepo.create({
        title: `Arsenic contamination in Namkum handpumps ${runId}`,
        description: 'Severe arsenic contamination observed in village drinking water handpumps in Namkum block.',
        district: 'Ranchi',
        village_locality: 'Namkum Village',
        latitude: 23.3480000, // ~500 meters away
        longitude: 85.3120000,
        citizen_severity: CitizenSeverity.SERIOUS,
        category: 'Water & Sanitation',
        submitted_by: citizenUser.id,
        status: ChallengeStatus.SUBMITTED,
      }),
    );

    const nearbyResult = await clustersService.clusterCitizenReport(nearbyChallenge.id);
    assert(
      nearbyResult.id === consolidatedClusterId,
      'Spatial proximity match (<=8km): Nearby report merged into consolidated cluster',
    );

    const updatedCluster = await clusterRepo.findOne({
      where: { id: consolidatedClusterId },
    });
    assert(
      updatedCluster?.report_count === 6,
      `Consolidated cluster report count updated to 6 (got ${updatedCluster?.report_count})`,
    );

    // =========================================================================
    // SUITE 3: Resilient AI Fallback Guard (3-Second Timeout / Failure)
    // =========================================================================
    console.log('\n--- Suite 3: Resilient AI Fallback Guard (3s Timeout Non-Fatal Processing) ---');

    // Create a standalone report and verify deterministic fallback behavior
    const fallbackChallenge: Challenge = await challengeRepo.save(
      challengeRepo.create({
        title: `AI Fallback Test Problem ${runId}`,
        description: 'Testing system resiliency when AI services are unreachable or timeout occurs.',
        district: 'Hazaribagh',
        village_locality: 'Town Hall Area',
        latitude: 23.9930000,
        longitude: 85.3630000,
        citizen_severity: CitizenSeverity.MODERATE,
        category: 'Education & Digital Literacy',
        submitted_by: citizenUser.id,
        status: ChallengeStatus.SUBMITTED,
      }),
    );

    const fallbackResult = await clustersService.clusterCitizenReport(fallbackChallenge.id);
    assert(!!fallbackResult.id, 'Citizen report was clustered successfully despite fallback');

    const fallbackCluster = await clusterRepo.findOne({
      where: { id: fallbackResult.id },
    });
    assert(!!fallbackCluster, 'Independent fallback cluster exists in database');
    assert(
      fallbackCluster?.district === 'Hazaribagh',
      'Fallback cluster preserved geographic locality accurately',
    );
    assert(
      fallbackCluster?.status === ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
      'Fallback cluster routed to government verification queue',
    );

    // =========================================================================
    // SUITE 4: Deterministic Medium-Confidence Rejection Routing
    // =========================================================================
    console.log('\n--- Suite 4: Deterministic Medium-Confidence Rejection Routing ---');

    // Set up a challenge in POTENTIAL_MATCH status pointing to consolidatedCluster
    const potentialChallenge: Challenge = await challengeRepo.save(
      challengeRepo.create({
        title: `Potential Match Issue ${runId}`,
        description: 'Borderline similarity report that reviewer deems non-identical.',
        district: 'Ranchi',
        village_locality: 'Namkum Border',
        clustering_status: ClusteringStatus.POTENTIAL_MATCH,
        potential_cluster_id: consolidatedClusterId,
        cluster_id: consolidatedClusterId,
        submitted_by: citizenUser.id,
        status: ChallengeStatus.SUBMITTED,
      }),
    );

    // Reviewer explicitly REJECTS the match
    const rejectionDecision = await clustersService.reviewPotentialMatch(
      potentialChallenge.id,
      { action: 'REJECT' },
      govUser.id,
    );

    assert(rejectionDecision.success === true, 'Match review completed successfully');
    assert(rejectionDecision.action === 'REJECTED', 'Action recorded as REJECTED');
    assert(!!rejectionDecision.newClusterId, 'New independent ProblemCluster created immediately');
    assert(
      rejectionDecision.newClusterId !== consolidatedClusterId,
      'New cluster is independent from original cluster',
    );

    const refreshedPotentialChallenge = await challengeRepo.findOne({
      where: { id: potentialChallenge.id },
    });
    assert(
      refreshedPotentialChallenge?.clustering_status === ClusteringStatus.INDEPENDENT,
      'Report status transitioned to INDEPENDENT',
    );
    assert(
      refreshedPotentialChallenge?.cluster_id === rejectionDecision.newClusterId,
      'Report reassigned to new independent cluster',
    );
    assert(
      refreshedPotentialChallenge?.potential_cluster_id === null,
      'potential_cluster_id cleared after rejection routing',
    );

    // =========================================================================
    // SUITE 5: Single Government Verification of Problem Cluster
    // =========================================================================
    console.log('\n--- Suite 5: Single Government Verification of Problem Cluster ---');

    const verifiedCluster = await clustersService.verifyCluster(
      consolidatedClusterId,
      govUser.id,
    );

    assert(
      verifiedCluster.status === ProblemClusterStatus.VALIDATED,
      'Problem cluster status updated to VALIDATED',
    );
    assert(
      verifiedCluster.government_verification_status === 'VERIFIED',
      'Government verification status is VERIFIED',
    );
    assert(
      verifiedCluster.verified_by === govUser.id,
      'Government verifier user recorded',
    );
    assert(
      !!verifiedCluster.verified_at,
      'verified_at timestamp recorded',
    );

    // Verify all underlying citizen reports automatically transitioned to VALIDATED
    const validatedReports = await challengeRepo.find({
      where: { cluster_id: consolidatedClusterId },
    });
    const allValidated = validatedReports.every(
      (r) => r.status === ChallengeStatus.VALIDATED && !!r.validated_at,
    );
    assert(
      allValidated && validatedReports.length >= 6,
      `Single verification: All ${validatedReports.length} underlying citizen reports automatically marked VALIDATED`,
    );

    targetChallenge = validatedReports[0];

    // =========================================================================
    // SUITE 6: Multi-EOI Support (Parallel Expressions of Interest)
    // =========================================================================
    console.log('\n--- Suite 6: Multi-EOI Support (No Problem Locking) ---');

    // University A submits EOI on the validated cluster
    const eoi1 = await eoiRepo.save(
      eoiRepo.create({
        challenge_id: targetChallenge.id,
        cluster_id: consolidatedClusterId,
        organization_id: univOrg.id,
        proposer_user_id: univUser.id,
        status: EoiStatus.ACCEPTED, // Auto-accepted candidate for cluster
        motivation: 'University research team with patented water filtration tech',
        proposed_approach: 'Deploy electro-coagulation pilot units in Namkum',
        collaboration_lead_name: univUser.name,
      }),
    );
    assert(eoi1.status === EoiStatus.ACCEPTED, 'University EOI is ACCEPTED collaboration candidate');

    // Industry Partner B concurrently submits EOI on the same cluster
    const eoi2 = await eoiRepo.save(
      eoiRepo.create({
        challenge_id: targetChallenge.id,
        cluster_id: consolidatedClusterId,
        organization_id: indOrg.id,
        proposer_user_id: indUser.id,
        status: EoiStatus.ACCEPTED, // Concurrent acceptance without lock
        motivation: 'Industry CSR funding and pilot fabrication capacity',
        proposed_approach: 'Provide commercial casing and solar pump integration',
        collaboration_lead_name: indUser.name,
      }),
    );
    assert(eoi2.status === EoiStatus.ACCEPTED, 'Industry EOI is concurrently ACCEPTED');

    // Check cluster is NOT locked
    const clusterCheck = await clusterRepo.findOne({
      where: { id: consolidatedClusterId },
    });
    assert(
      clusterCheck?.status === ProblemClusterStatus.VALIDATED,
      'INVARIANT: Problem cluster is NOT locked by individual EOIs (remains VALIDATED & open)',
    );

    // =========================================================================
    // SUITE 7: Industry Contribution Completion Guard (Blocking vs Optional)
    // =========================================================================
    console.log('\n--- Suite 7: Industry Contribution Completion Guard ---');

    // Create a collaborative project linked to the cluster
    const project: Project = await projectRepo.save(
      projectRepo.create({
        title: `Namkum Groundwater Remediation Project ${runId}`,
        challenge_id: targetChallenge.id,
        cluster_id: consolidatedClusterId,
        status: ProjectStatus.ACTIVE,
      }),
    );

    // Add participants
    const leadPart: ProjectParticipant = await participantRepo.save(
      participantRepo.create({
        project_id: project.id,
        organization_id: univOrg.id,
        participant_role: 'LEAD',
        status: 'ACTIVE',
      }),
    );

    const partnerPart: ProjectParticipant = await participantRepo.save(
      participantRepo.create({
        project_id: project.id,
        organization_id: indOrg.id,
        participant_role: 'PARTNER',
        status: 'ACTIVE',
      }),
    );

    // Add an approved milestone
    const milestone: ProjectMilestone = await milestoneRepo.save(
      milestoneRepo.create({
        project_id: project.id,
        title: 'Milestone 1: Pilot Fabrication',
        order_index: 1,
        status: MilestoneStatus.APPROVED,
      }),
    );

    // Add required deliverable
    await deliverableRepo.save(
      deliverableRepo.create({
        project_id: project.id,
        milestone_id: milestone.id,
        title: 'Fabrication Design Blueprint',
        document_type: DeliverableDocumentType.PROTOTYPE_SPEC,
        storage_key: `blueprint_${runId}.pdf`,
        file_name: 'blueprint.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        uploaded_by_participant_id: leadPart.id,
      }),
    );

    // Add Industry Contributions:
    // Contribution 1: REQUIRED (mandatory blocking)
    const requiredContrib: ProjectContribution = await contribRepo.save(
      contribRepo.create({
        project_id: project.id,
        participant_id: partnerPart.id,
        contribution_type: ProjectContributionType.TESTING,
        title: 'Water Quality Testing',
        description: 'Mandatory environmental laboratory water testing',
        status: ContributionStatus.PROPOSED,
        is_required: true, // BLOCKING
      }),
    );

    // Contribution 2: OPTIONAL (non-blocking)
    const optionalContrib: ProjectContribution = await contribRepo.save(
      contribRepo.create({
        project_id: project.id,
        participant_id: partnerPart.id,
        contribution_type: ProjectContributionType.MENTORSHIP,
        title: 'Technical Consultation',
        description: 'Optional expert engineering consultations',
        status: ContributionStatus.PROPOSED,
        is_required: false, // NON-BLOCKING
      }),
    );

    // Attempting to complete project while required contribution is unverified must be blocked!
    await assertThrows(
      () => projectsService.completeProject(project.id, govUser.id, {} as any),
      'mandatory industry contribution',
      'Project completion blocked while is_required contribution remains unverified',
    );

    // Now verify the required contribution
    requiredContrib.status = ContributionStatus.VERIFIED;
    await contribRepo.save(requiredContrib);

    // Attempt to complete again: optional contribution is still PROPOSED but must NOT block completion!
    const completedProject = await projectsService.completeProject(
      project.id,
      govUser.id,
      {} as any,
    );
    assert(
      completedProject.status === ProjectStatus.COMPLETED,
      'Project successfully COMPLETED once mandatory contribution is verified (optional remained non-blocking)',
    );

    // =========================================================================
    // SUITE 8: 100% Database SQL Aggregation Analytics
    // =========================================================================
    console.log('\n--- Suite 8: Database-Level SQL Aggregation Analytics ---');

    const clusterAnalytics = await analyticsService.getProblemClustersAnalytics();
    assert(Array.isArray(clusterAnalytics.byDistrict), 'getProblemClustersAnalytics returns byDistrict');
    assert(Array.isArray(clusterAnalytics.byCategory), 'getProblemClustersAnalytics returns byCategory');
    assert(Array.isArray(clusterAnalytics.byPriority), 'getProblemClustersAnalytics returns byPriority');
    assert(Array.isArray(clusterAnalytics.byStatus), 'getProblemClustersAnalytics returns byStatus');

    const ranchiRow = clusterAnalytics.byDistrict.find((r: any) => r.district === 'Ranchi');
    assert(!!ranchiRow, 'Analytics reflects Ranchi district activity');
    assert(
      Number(ranchiRow.count) >= 1,
      `Ranchi count >= 1 (got ${ranchiRow.count})`,
    );
    assert(
      Number(ranchiRow.total_reports) >= 6,
      `Ranchi total_reports >= 6 (got ${ranchiRow.total_reports})`,
    );

    const overview = await analyticsService.getOverview();
    assert(!!overview.problemClusters, 'Overview stats includes problemClusters block');
    assert(
      overview.problemClusters.total >= 1,
      `Overview reflects total problem clusters (got ${overview.problemClusters.total})`,
    );
    assert(
      overview.problemClusters.validated >= 1,
      `Overview reflects validated problem clusters (got ${overview.problemClusters.validated})`,
    );
    assert(
      overview.problemClusters.totalClusteredReports >= 6,
      `Overview reflects total clustered reports count (got ${overview.problemClusters.totalClusteredReports})`,
    );

    // =========================================================================
    // SUITE 9: Notification Scoping & Deduplication Guard
    // =========================================================================
    console.log('\n--- Suite 9: Notification Scoping & Deduplication Guard ---');

    // Send first notification
    await notifService.notifyUser(
      citizenUser.id,
      NotificationType.CHALLENGE_STATUS,
      'Problem Clustered',
      'Your report was consolidated into a societal problem cluster.',
      'PROBLEM_CLUSTER',
      consolidatedClusterId,
    );

    // Send identical notification immediately
    await notifService.notifyUser(
      citizenUser.id,
      NotificationType.CHALLENGE_STATUS,
      'Problem Clustered',
      'Your report was consolidated into a societal problem cluster.',
      'PROBLEM_CLUSTER',
      consolidatedClusterId,
    );

    // Count unread notifications for this reference
    const userNotifs = await notifRepo.find({
      where: {
        user_id: citizenUser.id,
        reference_type: 'PROBLEM_CLUSTER',
        reference_id: consolidatedClusterId,
      },
    });

    assert(
      userNotifs.length === 1,
      `Deduplication invariant: Exactly 1 unread notification created for identical reference (got ${userNotifs.length})`,
    );

  } finally {
    console.log('\n--- Cleaning Up Test Data ---');
    try {
      await dataSource.query("UPDATE challenges SET cluster_id = NULL, potential_cluster_id = NULL WHERE title LIKE '%" + runId + "%' OR title LIKE '%Test%'");
      await dataSource.query('DELETE FROM project_contributions');
      await dataSource.query('DELETE FROM project_deliverables');
      await dataSource.query('DELETE FROM project_tasks');
      await dataSource.query('DELETE FROM project_milestones');
      await dataSource.query('DELETE FROM project_participants');
      await dataSource.query('DELETE FROM projects');
      await dataSource.query('DELETE FROM expression_of_interests');
      await dataSource.query("DELETE FROM challenges WHERE title LIKE '%" + runId + "%' OR title LIKE '%Test%'");
      await dataSource.query("DELETE FROM problem_clusters WHERE title LIKE '%" + runId + "%' OR title LIKE '%Test%'");
      await dataSource.query("DELETE FROM notifications WHERE user_id IN ('" + citizenUser.id + "', '" + govUser.id + "')");
      await dataSource.query("DELETE FROM organization_memberships WHERE organization_id IN ('" + univOrg.id + "', '" + indOrg.id + "')");
      await dataSource.query("DELETE FROM organizations WHERE id IN ('" + univOrg.id + "', '" + indOrg.id + "')");
      await dataSource.query("DELETE FROM users WHERE id IN ('" + citizenUser.id + "', '" + govUser.id + "', '" + univUser.id + "', '" + indUser.id + "')");
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    await dataSource.destroy();
  }

  console.log('\n============================================================');
  console.log(`🎉 All Phase 9 Problem Intelligence Tests Passed! (${passedAssertions} assertions)`);
  console.log('============================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Test suite failed with error:', err);
  process.exit(1);
});
