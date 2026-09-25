import { UserProfile } from "./auth-context";
import { ForumRole } from "./forum-storage";

export interface ForumParticipantInfo {
  id: string;
  name: string;
  role: ForumRole;
  roleLabel: string;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationType?: string | null;
  collaborationType?: string | null;
  statusText: string;
  isCurrentUser: boolean;
  avatarIcon: "citizen" | "university" | "industry" | "admin";
}

export interface ForumAccessEvaluation {
  canAccess: boolean;
  isCitizen: boolean;
  isUniversity: boolean;
  isIndustry: boolean;
  isAdmin: boolean;
  userForumRole: ForumRole | null;
  effectiveOrgId?: string | null;
  effectiveOrgName?: string | null;
  effectiveOrgType?: string | null;

  // Forum availability lifecycle state:
  // STATE 1: Citizen submitted only (Not available yet)
  // STATE 2: University accepted problem (Available: Citizen + University)
  // STATE 3: Industry accepted collaboration (Available: Citizen + University + Collaborators)
  // STATE 4: Formal Project active in execution
  forumState: 1 | 2 | 3 | 4;
  isAvailable: boolean;

  // Resolved Participants
  citizen: { id: string; name: string } | null;
  acceptedUniversity: { id: string; name: string; type?: string } | null;
  acceptedCollaborators: Array<{
    id: string;
    name: string;
    type?: string;
    collaborationType?: string;
  }>;
  participantsList: ForumParticipantInfo[];

  // Associated Project if converted
  projectId?: string | null;
  projectTitle?: string | null;
}

export function evaluateForumAccess(
  challenge: any,
  solutions: any[] = [],
  projects: any[] = [],
  currentUser: UserProfile | null
): ForumAccessEvaluation {
  if (!challenge) {
    return {
      canAccess: false,
      isCitizen: false,
      isUniversity: false,
      isIndustry: false,
      isAdmin: false,
      userForumRole: null,
      forumState: 1,
      isAvailable: false,
      citizen: null,
      acceptedUniversity: null,
      acceptedCollaborators: [],
      participantsList: [],
    };
  }

  // 1. Resolve Citizen
  const submitterId = challenge.submitter_id || challenge.submitter?.id;
  const isOwner = Boolean(challenge.isOwner || (currentUser && currentUser.id === submitterId));
  const citizenName =
    challenge.submitter?.name && challenge.submitter.name !== "Community Member"
      ? challenge.submitter.name
      : isOwner && currentUser?.name
      ? currentUser.name
      : "Citizen Submitter";

  const citizenObj = {
    id: submitterId || "citizen",
    name: citizenName,
  };

  // 2. Resolve Associated Project
  const projectList: any[] = Array.isArray(projects)
    ? projects
    : projects
    ? [projects]
    : [];

  const matchedProject =
    projectList.find(
      (p) =>
        p &&
        (p.challenge_id === challenge.id ||
          p.challenge?.id === challenge.id ||
          p.id === challenge.project_id ||
          p.id === challenge.projectId ||
          solutions.some((s) => s.project_id && s.project_id === p.id))
    ) ||
    (challenge.projects && challenge.projects.length > 0
      ? challenge.projects[0]
      : null) ||
    challenge.project ||
    solutions.find((s) => s.project)?.project ||
    projectList[0] ||
    null;

  const projectId = matchedProject?.id || null;
  const projectTitle = matchedProject?.title || null;

  // 3. Resolve Accepted University
  // A university has accepted if:
  // a) A proposed solution exists with status PUBLISHED, COLLABORATION_OPEN, CONVERTED_TO_PROJECT, SUBMITTED
  // b) Or a project has lead_institution_id / leadInstitution
  // c) Or challenge status is PROJECT_INITIATED
  const acceptedSolution =
    solutions.find((s) =>
      [
        "CONVERTED_TO_PROJECT",
        "COLLABORATION_OPEN",
        "PUBLISHED",
        "SUBMITTED",
        "UNDER_REVIEW",
      ].includes(s.status)
    ) ||
    solutions[0] ||
    null;

  let universityObj: { id: string; name: string; type?: string } | null = null;

  if (matchedProject && (matchedProject.lead_institution_id || matchedProject.leadInstitution)) {
    universityObj = {
      id: matchedProject.lead_institution_id || matchedProject.leadInstitution?.id,
      name:
        matchedProject.lead_institution_name ||
        matchedProject.leadInstitution?.name ||
        "Lead University Partner",
      type: "Higher Education Institution",
    };
  } else if (
    acceptedSolution &&
    (acceptedSolution.proposing_organization_id ||
      acceptedSolution.organization_id ||
      acceptedSolution.proposingOrganization?.id)
  ) {
    universityObj = {
      id:
        acceptedSolution.proposing_organization_id ||
        acceptedSolution.organization_id ||
        acceptedSolution.proposingOrganization?.id,
      name:
        acceptedSolution.proposingOrganization?.name ||
        acceptedSolution.organization?.name ||
        "Academic Institution",
      type:
        acceptedSolution.proposingOrganization?.organization_type ||
        "Higher Education Institution",
    };
  } else if (matchedProject && Array.isArray(matchedProject.participants)) {
    const leadP = matchedProject.participants.find(
      (p: any) =>
        p.status === "ACTIVE" &&
        (p.participant_role === "LEAD" ||
          p.participant_role === "LEAD_INSTITUTION" ||
          p.participant_role === "ACADEMIC")
    );
    if (leadP) {
      universityObj = {
        id: leadP.organization_id,
        name: leadP.organization?.name || "Lead University Partner",
        type: leadP.organization?.organization_type || "Higher Education Institution",
      };
    }
  } else if (challenge.status === "PROJECT_INITIATED") {
    universityObj = {
      id: "univ-lead",
      name: "Assigned University Lead",
      type: "Higher Education Institution",
    };
  }

  // 4. Resolve Accepted Industry / Organization Collaborators
  const collaboratorsMap = new Map<
    string,
    { id: string; name: string; type?: string; collaborationType?: string }
  >();

  // From accepted solution collaborations
  if (acceptedSolution && Array.isArray(acceptedSolution.collaborations)) {
    for (const collab of acceptedSolution.collaborations) {
      if (
        collab.status === "ACCEPTED" ||
        collab.status === "VERIFIED" ||
        collab.status === "CONVERTED_TO_PROJECT"
      ) {
        const orgId =
          collab.offering_organization_id || collab.offeringOrganization?.id;
        const orgName =
          collab.offeringOrganization?.name ||
          collab.title ||
          "Industry Collaboration Partner";
        const orgType =
          collab.offeringOrganization?.organization_type || "Industry / CSR Partner";

        if (orgId && !collaboratorsMap.has(orgId)) {
          collaboratorsMap.set(orgId, {
            id: orgId,
            name: orgName,
            type: orgType,
            collaborationType: collab.collaboration_type || "Technical Support",
          });
        }
      }
    }
  }

  // From project participants (partners, industry)
  if (matchedProject && Array.isArray(matchedProject.participants)) {
    for (const part of matchedProject.participants) {
      const isLead =
        part.participant_role === "LEAD" ||
        part.participant_role === "LEAD_INSTITUTION";
      if (!isLead && part.status === "ACTIVE") {
        const orgId = part.organization_id;
        const orgName = part.organization?.name || "Project Industry Partner";
        const orgType = part.organization?.organization_type || "Industry Partner";
        if (orgId && !collaboratorsMap.has(orgId)) {
          collaboratorsMap.set(orgId, {
            id: orgId,
            name: orgName,
            type: orgType,
            collaborationType: part.participant_role || "Collaborator",
          });
        }
      }
    }
  }

  if (
    matchedProject &&
    matchedProject.partner_industry_id &&
    !collaboratorsMap.has(matchedProject.partner_industry_id)
  ) {
    collaboratorsMap.set(matchedProject.partner_industry_id, {
      id: matchedProject.partner_industry_id,
      name: matchedProject.partner_industry_name || "Partner Industry",
      type: "Industry Partner",
      collaborationType: "Industrial Collaboration",
    });
  }

  const acceptedCollaborators = Array.from(collaboratorsMap.values());

  // 5. Determine Forum Lifecycle State
  let forumState: 1 | 2 | 3 | 4 = 1;
  if (
    matchedProject ||
    challenge.status === "PROJECT_INITIATED" ||
    acceptedSolution?.status === "CONVERTED_TO_PROJECT" ||
    Boolean(acceptedSolution?.project_id)
  ) {
    forumState = 4;
  } else if (acceptedCollaborators.length > 0) {
    forumState = 3;
  } else if (universityObj || (acceptedSolution && acceptedSolution.status !== "DRAFT")) {
    forumState = 2;
  } else {
    forumState = 1;
  }

  const isAvailable = forumState >= 2;

  // 6. Current User Organization Membership Check
  const currentUserOrgIds: string[] = [];
  if (currentUser?.primaryOrganization?.id) {
    currentUserOrgIds.push(currentUser.primaryOrganization.id);
  }
  if ((currentUser as any)?.organization_id) {
    currentUserOrgIds.push((currentUser as any).organization_id);
  }
  if ((currentUser as any)?.organizationId) {
    currentUserOrgIds.push((currentUser as any).organizationId);
  }
  if (currentUser?.memberships && Array.isArray(currentUser.memberships)) {
    for (const m of currentUser.memberships) {
      if (m.membership_status === "ACTIVE" && m.organization_id) {
        currentUserOrgIds.push(m.organization_id);
      }
    }
  }

  // 7. Role & Access Checks
  // Citizen submitter check
  const isCitizen = Boolean(
    currentUser &&
      (currentUser.id === submitterId ||
        isOwner ||
        (challenge.submitter_id && currentUser.id === challenge.submitter_id) ||
        (challenge.submitter?.id && currentUser.id === challenge.submitter?.id))
  );

  // Academic team member / proposing user check
  const isAcademicMember = Boolean(
    currentUser &&
      ((matchedProject?.academicMembers &&
        Array.isArray(matchedProject.academicMembers) &&
        matchedProject.academicMembers.some(
          (am: any) =>
            (am.user_id && am.user_id === currentUser.id) ||
            (am.user?.id && am.user?.id === currentUser.id)
        )) ||
        (acceptedSolution?.teamMembers &&
          Array.isArray(acceptedSolution.teamMembers) &&
          acceptedSolution.teamMembers.some(
            (tm: any) =>
              (tm.user_id && tm.user_id === currentUser.id) ||
              (tm.user?.id && tm.user?.id === currentUser.id)
          )) ||
        (acceptedSolution &&
          (acceptedSolution.proposing_user_id === currentUser.id ||
            acceptedSolution.author_id === currentUser.id ||
            acceptedSolution.created_by === currentUser.id ||
            acceptedSolution.userId === currentUser.id)))
  );

  // Lead / academic participant in project
  const isLeadParticipant = Boolean(
    currentUser &&
      matchedProject?.participants &&
      Array.isArray(matchedProject.participants) &&
      matchedProject.participants.some(
        (p: any) =>
          p.status === "ACTIVE" &&
          (p.participant_role === "LEAD" ||
            p.participant_role === "LEAD_INSTITUTION" ||
            p.participant_role === "ACADEMIC") &&
          ((p.user_id && p.user_id === currentUser.id) ||
            (p.organization_id && currentUserOrgIds.includes(p.organization_id)))
      )
  );

  const isUniversity = Boolean(
    (universityObj && currentUserOrgIds.includes(universityObj.id)) ||
      (acceptedSolution?.proposing_organization_id &&
        currentUserOrgIds.includes(acceptedSolution.proposing_organization_id)) ||
      (matchedProject?.lead_institution_id &&
        currentUserOrgIds.includes(matchedProject.lead_institution_id)) ||
      isAcademicMember ||
      isLeadParticipant
  );

  // Partner / industry collaborator check
  const isPartnerParticipant = Boolean(
    currentUser &&
      matchedProject?.participants &&
      Array.isArray(matchedProject.participants) &&
      matchedProject.participants.some(
        (p: any) =>
          p.status === "ACTIVE" &&
          (p.participant_role === "PARTNER" ||
            p.participant_role === "INDUSTRY" ||
            p.participant_role === "COLLABORATOR") &&
          ((p.user_id && p.user_id === currentUser.id) ||
            (p.organization_id && currentUserOrgIds.includes(p.organization_id)))
      )
  );

  const isIndustry = Boolean(
    acceptedCollaborators.some((collab) => currentUserOrgIds.includes(collab.id)) ||
      (matchedProject?.partner_industry_id &&
        currentUserOrgIds.includes(matchedProject.partner_industry_id)) ||
      isPartnerParticipant
  );

  // Admin / government
  const isAdmin = Boolean(
    currentUser &&
      ["PLATFORM_ADMIN", "GOVERNMENT_ADMIN", "GOVERNMENT_OFFICER"].includes(
        currentUser.role
      )
  );

  const canAccess = isAvailable && (isCitizen || isUniversity || isIndustry || isAdmin);

  let userForumRole: ForumRole | null = null;
  let effectiveOrgId: string | null = null;
  let effectiveOrgName: string | null = null;
  let effectiveOrgType: string | null = null;

  if (isCitizen) {
    userForumRole = "CITIZEN";
  } else if (isUniversity) {
    userForumRole = "UNIVERSITY";
    effectiveOrgId =
      universityObj?.id ||
      matchedProject?.lead_institution_id ||
      acceptedSolution?.proposing_organization_id ||
      null;
    effectiveOrgName =
      universityObj?.name ||
      matchedProject?.lead_institution_name ||
      acceptedSolution?.proposingOrganization?.name ||
      "Lead University Partner";
    effectiveOrgType = universityObj?.type || "Higher Education Institution";
  } else if (isIndustry) {
    userForumRole = "INDUSTRY";
    const matchedCollab = acceptedCollaborators.find((c) =>
      currentUserOrgIds.includes(c.id)
    );
    effectiveOrgId =
      matchedCollab?.id || matchedProject?.partner_industry_id || null;
    effectiveOrgName =
      matchedCollab?.name ||
      matchedProject?.partner_industry_name ||
      "Industry Partner";
    effectiveOrgType = matchedCollab?.type || "Industry Partner";
  } else if (isAdmin) {
    userForumRole = "ADMIN";
    effectiveOrgName = "District / Government Administrative Office";
    effectiveOrgType = "Administrative Authority";
  }

  // 8. Build List of Allowed Participants for UI Display
  const participantsList: ForumParticipantInfo[] = [];

  // Add Citizen
  participantsList.push({
    id: citizenObj.id,
    name: citizenObj.name,
    role: "CITIZEN",
    roleLabel: "Citizen Submitter",
    organizationId: null,
    organizationName: null,
    organizationType: null,
    statusText: "Active",
    isCurrentUser: isCitizen,
    avatarIcon: "citizen",
  });

  // Add University
  if (universityObj) {
    participantsList.push({
      id: universityObj.id,
      name: universityObj.name,
      role: "UNIVERSITY",
      roleLabel: "University Team",
      organizationId: universityObj.id,
      organizationName: universityObj.name,
      organizationType: universityObj.type || "Higher Education Institution",
      statusText: "Participating",
      isCurrentUser: isUniversity,
      avatarIcon: "university",
    });
  }

  // Add Industry Collaborator(s)
  for (const collab of acceptedCollaborators) {
    participantsList.push({
      id: collab.id,
      name: collab.name,
      role: "INDUSTRY",
      roleLabel: collab.type || "Industry Partner",
      organizationId: collab.id,
      organizationName: collab.name,
      organizationType: collab.type || "Industry Partner",
      collaborationType: collab.collaborationType,
      statusText: "Collaborating",
      isCurrentUser: currentUserOrgIds.includes(collab.id),
      avatarIcon: "industry",
    });
  }

  return {
    canAccess,
    isCitizen,
    isUniversity,
    isIndustry,
    isAdmin,
    userForumRole,
    effectiveOrgId,
    effectiveOrgName,
    effectiveOrgType,
    forumState,
    isAvailable,
    citizen: citizenObj,
    acceptedUniversity: universityObj,
    acceptedCollaborators,
    participantsList,
    projectId,
    projectTitle,
  };
}
