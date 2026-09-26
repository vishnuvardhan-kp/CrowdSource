"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { formatDateSafe } from "../../../lib/utils";
import {
  FolderGit2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  Download,
  Plus,
  ArrowLeft,
  Users,
  Shield,
  Send,
  Lock,
  Unlock,
  AlertCircle,
  CheckSquare,
  Activity,
  Layers,
  FileCheck,
  ChevronRight,
  ExternalLink,
  Ban,
  Check,
  Building2,
  X,
  GraduationCap,
  Briefcase,
  DollarSign,
  UserCheck,
  Sparkles,
  Rocket,
  FlaskConical,
  Target,
  CheckCircle,
  MessageSquare,
} from "lucide-react";

interface ProjectParticipant {
  id: string;
  project_id: string;
  organization_id: string;
  participant_role: string;
  status: string;
  joined_at: string;
  organization?: {
    id: string;
    name: string;
    organization_type: string;
    district?: string;
    state?: string;
  };
}

interface ProjectTask {
  id: string;
  milestone_id: string;
  assigned_participant_id?: string | null;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  created_at: string;
  assignedParticipant?: ProjectParticipant;
}

interface ProjectDeliverable {
  id: string;
  project_id: string;
  milestone_id?: string | null;
  document_type: string;
  title: string;
  description?: string | null;
  storage_key: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  uploadedByParticipant?: ProjectParticipant;
  uploadedByUser?: {
    id: string;
    name: string;
  };
}

interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "REVIEW_REQUESTED" | "REVISION_REQUIRED" | "APPROVED";
  order_index: number;
  created_at: string;
  tasks?: ProjectTask[];
  deliverables?: ProjectDeliverable[];
}

interface ProjectUpdate {
  id: string;
  project_id: string;
  update_type: "PROGRESS" | "BLOCKER" | "RESOLUTION";
  summary: string;
  details?: string | null;
  blocker_status?: string | null;
  created_at: string;
  authorParticipant?: ProjectParticipant;
  authorUser?: {
    id: string;
    name: string;
  };
  resolvedByReview?: {
    id: string;
    comments?: string;
  };
}


interface ProjectAcademicMember {
  id: string;
  project_id: string;
  organization_id: string;
  user_id: string;
  role: "STUDENT_RESEARCHER" | "FACULTY_MENTOR" | "ACADEMIC_COORDINATOR";
  department?: string | null;
  degree_program?: string | null;
  student_year?: number | null;
  specialization_skills?: string[] | null;
  weekly_commitment_hours?: number | null;
  status: "ACTIVE" | "INACTIVE" | "COMPLETED";
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
    organization_type: string;
  };
}

interface ProjectInnovationOutcome {
  id: string;
  project_id: string;
  outcome_type: "PATENT" | "PATENT_APPLICATION" | "IP_GENERATED" | "STARTUP_CREATED" | "INNOVATION_OUTCOME" | "TECHNOLOGY_TRANSFER";
  title: string;
  description: string;
  reference_number?: string | null;
  organization_id?: string | null;
  status: "PROPOSED" | "VERIFIED" | "REJECTED";
  created_by_user_id?: string | null;
  verified_by_user_id?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    organization_type: string;
  };
  createdByUser?: {
    id: string;
    name: string;
  };
  verifiedByUser?: {
    id: string;
    name: string;
  };
}

interface ProjectContribution {
  id: string;
  project_id: string;
  organization_id: string;
  contributor_user_id: string;
  contribution_type: string;
  title: string;
  description: string;
  monetary_value?: number | null;
  resources_provided?: string | null;
  visibility: "CONSORTIUM" | "LEAD_ONLY" | "GOVERNMENT_ONLY";
  status: "PENDING" | "APPROVED" | "REJECTED";
  verified_by_user_id?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    organization_type: string;
  };
  contributorUser?: {
    id: string;
    name: string;
  };
  verifiedByUser?: {
    id: string;
    name: string;
  };
}

interface ProjectReview {
  id: string;
  project_id: string;
  milestone_id?: string | null;
  action: string;
  comments?: string | null;
  feedback?: any;
  created_at: string;
  reviewerUser?: {
    id: string;
    name: string;
  };
}

interface ProjectData {
  id: string;
  challenge_id: string;
  title: string;
  description?: string | null;
  objectives?: string | null;
  expected_outcomes?: string | null;
  status: string;
  start_date?: string | null;
  target_completion_date?: string | null;
  actual_completion_date?: string | null;
  budget_allocated?: number | null;
  challenge?: {
    id: string;
    title: string;
    district?: string;
  };
  participants: ProjectParticipant[];
  milestones: ProjectMilestone[];
  deliverables: ProjectDeliverable[];
  updates: ProjectUpdate[];
  reviews: ProjectReview[];
  academicMembers?: ProjectAcademicMember[];
  contributions?: ProjectContribution[];
}

interface ProjectLifecycleSummary {
  projectId: string;
  title: string;
  currentStage: string;
  progressPercentage: number;
  milestones: {
    total: number;
    approved: number;
    inProgress: number;
    pending: number;
    overdue?: number;
  };
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
  };
  deliverables: {
    total: number;
    byType: Record<string, number>;
  };
  prototype: any;
  tests: {
    total: number;
    passed: number;
    failed: number;
    records: Array<{
      id: string;
      testPlan: string;
      testType: string;
      parameters?: any;
      testerName: string;
      testerRole?: string;
      lab?: string;
      expectedResult?: string;
      observedResults: string;
      passed: boolean;
      issuesIdentified?: string[];
      correctiveAction?: string;
      notes?: string;
      recordedAt: string;
    }>;
  };
  pilot: any;
  deployment: any;
  blockers: {
    open: number;
    resolved: number;
  };
  completionChecklist: {
    hasMilestones: boolean;
    allMilestonesApproved: boolean;
    hasDeliverable: boolean;
    hasPrototype: boolean;
    hasTestValidation: boolean;
    hasPilotOrDeployment: boolean;
    noOpenBlockers: boolean;
    allRequiredContributionsVerified: boolean;
    readyForCompletion: boolean;
  };
  stageHistory: Array<{
    fromStage: string;
    toStage: string;
    transitionedBy: string;
    userRole?: string;
    reviewNotes?: string;
    timestamp: string;
  }>;
  ipAssessment?: {
    status: string;
    assessorName?: string;
    assessorRole?: string;
    protectionType?: string;
    referenceNumber?: string;
    assessmentNotes?: string;
    isConfidential?: boolean;
    commercializationPath?: string;
    assessedAt?: string;
  };
  innovationOutcomes?: {
    total: number;
    verified: number;
    patents: number;
    startups: number;
    technologyTransfers: number;
    records: Array<{
      id: string;
      outcomeType: string;
      title: string;
      referenceNumber?: string;
      status: string;
      organizationName?: string;
      recordedAt: string;
    }>;
  };
  nextRecommendedAction: string;
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { user, token, loading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!token && !!user;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "lifecycle" | "milestones" | "tasks" | "deliverables" | "updates" | "governance" | "academic" | "contributions" | "outcomes">("overview");
  const [lifecycleSummary, setLifecycleSummary] = useState<ProjectLifecycleSummary | null>(null);
  const [innovationOutcomes, setInnovationOutcomes] = useState<ProjectInnovationOutcome[]>([]);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showVerifyOutcomeModal, setShowVerifyOutcomeModal] = useState(false);
  const [selectedOutcomeForVerify, setSelectedOutcomeForVerify] = useState<ProjectInnovationOutcome | null>(null);

  // IP Assessment States (Phase 5)
  const [ipAssessment, setIpAssessment] = useState<{
    ip_status: string;
    assessor_name?: string;
    assessor_role?: string;
    protection_type?: string;
    reference_number?: string;
    assessment_notes?: string;
    is_confidential?: boolean;
    commercialization_path?: string;
    evidence_deliverable_id?: string;
    evidence_deliverable_title?: string;
    recorded_at?: string;
  } | null>(null);
  const [showIpAssessmentModal, setShowIpAssessmentModal] = useState(false);
  const [ipStatus, setIpStatus] = useState("POTENTIAL_IP_IDENTIFIED");
  const [ipAssessorName, setIpAssessorName] = useState("");
  const [ipAssessorRole, setIpAssessorRole] = useState("");
  const [ipProtectionType, setIpProtectionType] = useState("PATENT");
  const [ipRefNumber, setIpRefNumber] = useState("");
  const [ipAssessmentNotes, setIpAssessmentNotes] = useState("");
  const [ipIsConfidential, setIpIsConfidential] = useState(false);
  const [ipCommercializationPath, setIpCommercializationPath] = useState("STARTUP_SPINOFF");
  const [ipEvidenceDeliverableId, setIpEvidenceDeliverableId] = useState("");

  // Outcome Form States
  const [outcomeType, setOutcomeType] = useState<"PATENT" | "PATENT_APPLICATION" | "IP_GENERATED" | "STARTUP_CREATED" | "INNOVATION_OUTCOME" | "TECHNOLOGY_TRANSFER">("PATENT");
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [outcomeDesc, setOutcomeDesc] = useState("");
  const [outcomeRefNumber, setOutcomeRefNumber] = useState("");
  const [outcomeOrgId, setOutcomeOrgId] = useState("");

  // Startup & Tech Transfer Specific Outcome Fields (Phase 5)
  const [startupFoundingTeam, setStartupFoundingTeam] = useState("");
  const [startupTechBasis, setStartupTechBasis] = useState("");
  const [startupIncubatorOrgId, setStartupIncubatorOrgId] = useState("");
  const [transferReceivingOrgId, setTransferReceivingOrgId] = useState("");
  const [transferType, setTransferType] = useState("LICENSING");
  const [transferCommercialTerms, setTransferCommercialTerms] = useState("");
  const [outcomeEvidenceDeliverableId, setOutcomeEvidenceDeliverableId] = useState("");

  // Verify Outcome States
  const [verifyOutcomeStatus, setVerifyOutcomeStatus] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [verifyOutcomeNotes, setVerifyOutcomeNotes] = useState("");
  const [verifyOutcomeRefNumber, setVerifyOutcomeRefNumber] = useState("");
  const [academicMembers, setAcademicMembers] = useState<ProjectAcademicMember[]>([]);
  const [contributions, setContributions] = useState<ProjectContribution[]>([]);
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedContribForVerify, setSelectedContribForVerify] = useState<ProjectContribution | null>(null);

  // Academic Form States
  const [acadOrgId, setAcadOrgId] = useState("");
  const [acadUserId, setAcadUserId] = useState("");
  const [acadRole, setAcadRole] = useState<"STUDENT_RESEARCHER" | "FACULTY_MENTOR" | "ACADEMIC_COORDINATOR">("STUDENT_RESEARCHER");
  const [acadDept, setAcadDept] = useState("");
  const [acadProgram, setAcadProgram] = useState("");
  const [acadYear, setAcadYear] = useState<number>(3);
  const [acadSkills, setAcadSkills] = useState("");
  const [acadHours, setAcadHours] = useState<number>(10);

  // Contribution Form States
  const [contribOrgId, setContribOrgId] = useState("");
  const [contribType, setContribType] = useState("MENTORSHIP");
  const [contribTitle, setContribTitle] = useState("");
  const [contribDesc, setContribDesc] = useState("");
  const [contribValue, setContribValue] = useState<string>("");
  const [contribResources, setContribResources] = useState("");
  const [contribVisibility, setContribVisibility] = useState<"CONSORTIUM" | "LEAD_ONLY" | "GOVERNMENT_ONLY">("CONSORTIUM");

  // Verification Form States
  const [verifyStatus, setVerifyStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [verifyNotes, setVerifyNotes] = useState("");

  // Modals state
  const [showKickoffModal, setShowKickoffModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Phase 4 Lifecycle Modals State
  const [showProtoModal, setShowProtoModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showPilotModal, setShowPilotModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  // Prototype Form
  const [protoDesc, setProtoDesc] = useState("");
  const [protoVersion, setProtoVersion] = useState("1.0.0");
  const [protoStage, setProtoStage] = useState("working_prototype");
  const [protoSpecs, setProtoSpecs] = useState("");
  const [protoNeeds, setProtoNeeds] = useState("");

  // Test Validation Form
  const [testPlan, setTestPlan] = useState("");
  const [testType, setTestType] = useState("LAB_BENCH_TEST");
  const [testLab, setTestLab] = useState("");
  const [testerName, setTesterName] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [observedResults, setObservedResults] = useState("");
  const [testPassed, setTestPassed] = useState(true);
  const [testIssues, setTestIssues] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");

  // Pilot Deployment Form
  const [pilotLocation, setPilotLocation] = useState("");
  const [pilotDistrict, setPilotDistrict] = useState("");
  const [pilotOrg, setPilotOrg] = useState("");
  const [pilotDuration, setPilotDuration] = useState<number>(30);
  const [pilotCohort, setPilotCohort] = useState<number>(100);
  const [pilotScale, setPilotScale] = useState("COMMUNITY_FIELD_DEPLOYMENT");
  const [pilotObjectives, setPilotObjectives] = useState("");
  const [pilotFeedback, setPilotFeedback] = useState("");

  // Final Deployment Form
  const [deployChecklist, setDeployChecklist] = useState(true);
  const [finalValidationConfirmed, setFinalValidationConfirmed] = useState(true);
  const [deployLocation, setDeployLocation] = useState("");
  const [deployDate, setDeployDate] = useState("");
  const [handoverEntity, setHandoverEntity] = useState("");
  const [handoverRecipient, setHandoverRecipient] = useState("");
  const [deployOrg, setDeployOrg] = useState("");
  const [trainingDone, setTrainingDone] = useState(true);
  const [opStatus, setOpStatus] = useState("OPERATIONAL_HANDED_OVER");
  const [maintPlan, setMaintPlan] = useState("");

  // Transition Stage Form
  const [targetStage, setTargetStage] = useState("PROTOTYPE_DEVELOPMENT");
  const [transitionNotes, setTransitionNotes] = useState("");

  // Kickoff Form
  const [kickoffObjectives, setKickoffObjectives] = useState("");
  const [kickoffOutcomes, setKickoffOutcomes] = useState("");
  const [kickoffTargetDate, setKickoffTargetDate] = useState("");
  const [kickoffInitialMilestones, setKickoffInitialMilestones] = useState([
    { title: "Milestone 1: Preliminary Design & Validation", description: "Finalize engineering concept and specifications." },
    { title: "Milestone 2: Prototype Fabrication & Field Deployment", description: "Assemble pilot units and initiate field operation." },
  ]);

  // Milestone Form
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  // Task Form
  const [taskMilestoneId, setTaskMilestoneId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");

  // Deliverable Form
  const [delivMilestoneId, setDelivMilestoneId] = useState("");
  const [delivDocType, setDelivDocType] = useState("REPORT");
  const [delivTitle, setDelivTitle] = useState("");
  const [delivDesc, setDelivDesc] = useState("");
  const [delivFile, setDelivFile] = useState<File | null>(null);

  // Update Form
  const [updateType, setUpdateType] = useState<"PROGRESS" | "BLOCKER">("PROGRESS");
  const [updateSummary, setUpdateSummary] = useState("");
  const [updateDetails, setUpdateDetails] = useState("");

  const fetchProject = useCallback(async () => {
    if (!token || !projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load project details.");
      }
      const data: ProjectData = await res.json();
      setProject(data);
      if (data.academicMembers) setAcademicMembers(data.academicMembers);
      if (data.contributions) setContributions(data.contributions);

      // Fetch academic members if not in payload
      try {
        const aRes = await fetch(`/api/projects/${projectId}/academic-members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (aRes.ok) setAcademicMembers(await aRes.json());
      } catch {}

      // Fetch contributions if not in payload
      try {
        const cRes = await fetch(`/api/projects/${projectId}/contributions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cRes.ok) setContributions(await cRes.json());
      } catch {}

      // Fetch innovation outcomes if not in payload
      try {
        const oRes = await fetch(`/api/projects/${projectId}/innovation-outcomes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (oRes.ok) setInnovationOutcomes(await oRes.json());
      } catch {}

      // Fetch IP assessment
      try {
        const ipRes = await fetch(`/api/projects/${projectId}/ip-assessment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ipRes.ok) setIpAssessment(await ipRes.json());
      } catch {}

      // Fetch lifecycle summary
      try {
        const lRes = await fetch(`/api/projects/${projectId}/lifecycle`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (lRes.ok) setLifecycleSummary(await lRes.json());
      } catch {}

      if (data.objectives) setKickoffObjectives(data.objectives);
      if (data.expected_outcomes) setKickoffOutcomes(data.expected_outcomes);
      if (data.target_completion_date) setKickoffTargetDate(data.target_completion_date.split("T")[0]);
    } catch (err: any) {
      setError(err.message || "Error connecting to server.");
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  const fetchInnovationOutcomes = useCallback(async () => {
    if (!projectId || !token) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/innovation-outcomes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInnovationOutcomes(data);
      }
    } catch (err) {
      console.error("Failed to fetch innovation outcomes:", err);
    }
  }, [projectId, token]);

  const fetchIpAssessment = useCallback(async () => {
    if (!projectId || !token) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/ip-assessment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIpAssessment(data);
      }
    } catch (err) {
      console.error("Failed to fetch IP assessment:", err);
    }
  }, [projectId, token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProject();
      fetchInnovationOutcomes();
      fetchIpAssessment();
    }
  }, [isAuthenticated, fetchProject, fetchInnovationOutcomes, fetchIpAssessment]);


  // Handle Add Academic Member
  const handleAddAcademicMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const skillsArray = acadSkills ? acadSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const res = await fetch(`/api/projects/${projectId}/academic-members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organization_id: acadOrgId,
          user_id: acadUserId,
          role: acadRole,
          department: acadDept || undefined,
          degree_program: acadProgram || undefined,
          student_year: acadYear ? Number(acadYear) : undefined,
          specialization_skills: skillsArray.length ? skillsArray : undefined,
          weekly_commitment_hours: acadHours ? Number(acadHours) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add academic member.");
      }

      setShowAcademicModal(false);
      setAcadUserId("");
      setAcadDept("");
      setAcadProgram("");
      setAcadSkills("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Failed to assign academic team member.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Contribution
  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/contributions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organization_id: contribOrgId,
          contribution_type: contribType,
          title: contribTitle,
          description: contribDesc,
          monetary_value: contribValue ? Number(contribValue) : undefined,
          resources_provided: contribResources || undefined,
          visibility: contribVisibility,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to register contribution.");
      }

      setShowContributionModal(false);
      setContribTitle("");
      setContribDesc("");
      setContribValue("");
      setContribResources("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Failed to register contribution.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Verify Contribution (Admin/Gov)
  const handleVerifyContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContribForVerify) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/admin/projects/contributions/${selectedContribForVerify.id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: verifyStatus,
          verification_notes: verifyNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to verify contribution.");
      }

      setShowVerifyModal(false);
      setSelectedContribForVerify(null);
      setVerifyNotes("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Verification failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 4: Handle Record Prototype
  const handleRecordPrototype = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/lifecycle/prototype`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: protoDesc,
          version: protoVersion || "1.0.0",
          stage: protoStage,
          specifications: protoSpecs ? { details: protoSpecs } : undefined,
          resourceNeeds: protoNeeds ? protoNeeds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record prototype specifications.");
      }

      setShowProtoModal(false);
      setProtoDesc("");
      setProtoSpecs("");
      setProtoNeeds("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Failed to record prototype.");
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 4: Handle Record Test Validation
  const handleRecordTestValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/lifecycle/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testPlan,
          testType,
          testerName: testerName || user?.name || "Tester",
          lab: testLab || undefined,
          expectedResult: expectedResult || undefined,
          observedResults,
          passed: testPassed,
          issuesIdentified: testIssues ? testIssues.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          correctiveAction: correctiveAction || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record testing validation.");
      }

      setShowTestModal(false);
      setTestPlan("");
      setObservedResults("");
      setExpectedResult("");
      setTestIssues("");
      setCorrectiveAction("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Failed to record test validation.");
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 4: Handle Record Pilot Deployment
  const handleRecordPilotDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/lifecycle/pilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: pilotLocation,
          district: pilotDistrict || undefined,
          implementingOrg: pilotOrg || undefined,
          durationDays: Number(pilotDuration) || 30,
          targetCohortSize: Number(pilotCohort) || undefined,
          coverageScale: pilotScale || undefined,
          objectives: pilotObjectives ? pilotObjectives.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          feedbackSummary: pilotFeedback || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record pilot deployment.");
      }

      setShowPilotModal(false);
      setPilotLocation("");
      setPilotDistrict("");
      setPilotOrg("");
      setPilotObjectives("");
      setPilotFeedback("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Failed to record pilot deployment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 4: Handle Record Final Deployment
  const handleRecordFinalDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/lifecycle/deployment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          readinessChecklistConfirmed: deployChecklist,
          finalValidationConfirmed,
          deploymentLocation: deployLocation,
          deploymentDate: deployDate || undefined,
          handoverEntity,
          handoverRecipient,
          implementationOrg: deployOrg || undefined,
          trainingCompleted: trainingDone,
          operationalStatus: opStatus,
          maintenancePlan: maintPlan || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record final deployment.");
      }

      setShowDeployModal(false);
      setDeployLocation("");
      setHandoverEntity("");
      setHandoverRecipient("");
      setMaintPlan("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Failed to record final deployment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 4: Handle Transition Stage
  const handleTransitionStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/lifecycle/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStage,
          reviewNotes: transitionNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Stage transition failed.");
      }

      setShowTransitionModal(false);
      setTransitionNotes("");
      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Stage transition failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Phase 4: Direct Project Completion
  const handleCompleteProjectDirectly = async () => {
    if (!window.confirm("Are you sure you want to mark this project as COMPLETED? This locks all milestone execution.")) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comments: "Project marked COMPLETED after successful lifecycle validation.",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to complete project.");
      }

      fetchProject();
    } catch (err: any) {
      setActionError(err.message || "Failed to complete project.");
    } finally {
      setActionLoading(false);
    }
  };

  // User role checking
  const isGovOrAdmin = user?.role === "GOVERNMENT_OFFICER" || user?.role === "GOVERNMENT_ADMIN" || user?.role === "PLATFORM_ADMIN";
  const isStudent = user?.role === "STUDENT";
  const leadParticipant = project?.participants.find(
    (p) => p.participant_role?.toUpperCase() === "LEAD" || p.participant_role?.toUpperCase() === "LEAD_INSTITUTION"
  );
  const isLead =
    isGovOrAdmin ||
    (leadParticipant &&
      (user?.primaryOrganization?.id === leadParticipant.organization_id ||
        user?.memberships?.some(
          (m) =>
            m.organization_id === leadParticipant.organization_id &&
            m.membership_status === "ACTIVE",
        )));

  // Submit Kickoff
  const handleSubmitKickoff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/kickoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          objectives: kickoffObjectives,
          expected_outcomes: kickoffOutcomes,
          target_completion_date: kickoffTargetDate || undefined,
          initial_milestones: project?.milestones.length === 0 ? kickoffInitialMilestones : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit kickoff plan.");
      }
      setShowKickoffModal(false);
      await fetchProject();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Milestone
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: milestoneTitle,
          description: milestoneDesc || undefined,
          due_date: milestoneDueDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create milestone.");
      }
      setShowMilestoneModal(false);
      setMilestoneTitle("");
      setMilestoneDesc("");
      setMilestoneDueDate("");
      await fetchProject();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Start Milestone
  const handleStartMilestone = async (milestoneId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start milestone.");
      }
      await fetchProject();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Request Milestone Review (Cascading lock engages)
  const handleRequestMilestoneReview = async (milestoneId: string, title: string) => {
    if (!confirm(`Request government review for "${title}"?\n\nNOTE: This will freeze all tasks and deliverables linked to this milestone in read-only mode until review completes.`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}/request-review`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit milestone for review.");
      }
      await fetchProject();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          milestone_id: taskMilestoneId,
          title: taskTitle,
          description: taskDesc || undefined,
          assigned_participant_id: taskAssigneeId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create task.");
      }
      setShowTaskModal(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssigneeId("");
      await fetchProject();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update task.");
      }
      await fetchProject();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Upload Deliverable
  const handleUploadDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivFile) {
      setActionError("Please select a file to upload.");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      const formData = new FormData();
      formData.append("file", delivFile);
      formData.append("title", delivTitle);
      formData.append("document_type", delivDocType);
      if (delivDesc) formData.append("description", delivDesc);
      if (delivMilestoneId) formData.append("milestone_id", delivMilestoneId);

      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload deliverable.");
      }
      setShowDeliverableModal(false);
      setDelivTitle("");
      setDelivDesc("");
      setDelivFile(null);
      await fetchProject();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Download Deliverable
  const handleDownloadDeliverable = async (deliverableId: string, filename: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to download deliverable file.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Post Update or Blocker
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          update_type: updateType,
          summary: updateSummary,
          details: updateDetails || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to post update.");
      }
      setShowUpdateModal(false);
      setUpdateSummary("");
      setUpdateDetails("");
      setUpdateType("PROGRESS");
      await fetchProject();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Innovation Outcomes Handlers
  const handleCreateOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeTitle.trim() || !outcomeDesc.trim()) return;
    try {
      setActionLoading(true);
      setActionError(null);

      const metadata: Record<string, any> = {};
      if (outcomeType === "STARTUP_CREATED") {
        if (startupIncubatorOrgId) metadata.incubation_organization_id = startupIncubatorOrgId;
        if (startupFoundingTeam.trim()) {
          metadata.founding_team = startupFoundingTeam.split(",").map((s) => s.trim()).filter(Boolean);
        }
        if (startupTechBasis.trim()) metadata.technology_basis = startupTechBasis.trim();
      }
      if (outcomeType === "TECHNOLOGY_TRANSFER") {
        if (transferReceivingOrgId) metadata.receiving_organization_id = transferReceivingOrgId;
        if (transferType) metadata.transfer_type = transferType;
        if (transferCommercialTerms.trim()) metadata.commercial_terms = transferCommercialTerms.trim();
      }
      if (outcomeEvidenceDeliverableId) {
        metadata.evidenceDeliverableId = outcomeEvidenceDeliverableId;
        metadata.evidence_document_id = outcomeEvidenceDeliverableId;
      }

      const res = await fetch(`/api/projects/${projectId}/innovation-outcomes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          outcome_type: outcomeType,
          title: outcomeTitle.trim(),
          description: outcomeDesc.trim(),
          reference_number: outcomeRefNumber.trim() || undefined,
          organization_id: outcomeOrgId || undefined,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create innovation outcome.");
      }
      setShowOutcomeModal(false);
      setOutcomeTitle("");
      setOutcomeDesc("");
      setOutcomeRefNumber("");
      setStartupFoundingTeam("");
      setStartupTechBasis("");
      setStartupIncubatorOrgId("");
      setTransferReceivingOrgId("");
      setTransferCommercialTerms("");
      setOutcomeEvidenceDeliverableId("");
      await fetchInnovationOutcomes();
      await fetchProject();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordIpAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/projects/${projectId}/ip-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ip_status: ipStatus,
          assessor_name: ipAssessorName.trim() || user?.name || "Lead Assessor",
          assessor_role: ipAssessorRole.trim() || user?.role || "CONSORTIUM_LEAD",
          protection_type: ipProtectionType || undefined,
          reference_number: ipRefNumber.trim() || undefined,
          assessment_notes: ipAssessmentNotes.trim() || undefined,
          is_confidential: ipIsConfidential,
          commercialization_path: ipCommercializationPath || undefined,
          evidence_deliverable_id: ipEvidenceDeliverableId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record IP assessment.");
      }
      setShowIpAssessmentModal(false);
      await fetchIpAssessment();
      await fetchProject();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutcomeForVerify) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/admin/projects/${projectId}/innovation-outcomes/${selectedOutcomeForVerify.id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: verifyOutcomeStatus,
          verification_notes: verifyOutcomeNotes.trim() || undefined,
          reference_number: verifyOutcomeRefNumber.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to verify innovation outcome.");
      }
      setShowVerifyOutcomeModal(false);
      setSelectedOutcomeForVerify(null);
      setVerifyOutcomeNotes("");
      setVerifyOutcomeRefNumber("");
      await fetchInnovationOutcomes();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Status Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"><Activity className="w-3.5 h-3.5 mr-1" /> Active Execution</span>;
      case "BLOCKED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200 animate-pulse"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Project Blocked</span>;
      case "KICKOFF_PENDING":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"><Clock className="w-3.5 h-3.5 mr-1" /> Kickoff Review Pending</span>;
      case "KICKOFF_REVISION":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200"><AlertCircle className="w-3.5 h-3.5 mr-1" /> Kickoff Revision Required</span>;
      case "COMPLETED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Execution Completed</span>;
      case "IMPACT_VERIFIED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200"><Shield className="w-3.5 h-3.5 mr-1" /> Impact Verified</span>;
      case "TERMINATED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-300"><Ban className="w-3.5 h-3.5 mr-1" /> Terminated</span>;
      case "INITIATED":
      case "PROPOSED":
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200"><Clock className="w-3.5 h-3.5 mr-1" /> Kickoff Preparation</span>;
    }
  };

  const getMilestoneBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"><Lock className="w-3 h-3 mr-1" /> Approved & Locked</span>;
      case "REVIEW_REQUESTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"><Lock className="w-3 h-3 mr-1" /> Under Review (Locked)</span>;
      case "REVISION_REQUIRED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200"><Unlock className="w-3 h-3 mr-1" /> Revision Required</span>;
      case "IN_PROGRESS":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"><Activity className="w-3 h-3 mr-1" /> In Progress</span>;
      case "PENDING":
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
    }
  };

  if (authLoading || (loading && !project && !error)) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium">Loading Project Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-stone-500 mb-6 text-center max-w-md">Please sign in to access the collaborative project workspace.</p>
        <Link href="/login" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-medium rounded-lg transition">Sign In</Link>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 p-8 flex flex-col items-center justify-center">
        <AlertTriangle className="w-14 h-14 text-red-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied or Not Found</h2>
        <p className="text-stone-500 mb-6 max-w-md text-center">{error || "Unable to access the requested project."}</p>
        <Link href="/my-eois" className="px-5 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm transition">Back to My Projects</Link>
      </div>
    );
  }

  // Active blockers list
  const activeBlockers = project.updates.filter(
    (u) => u.update_type === "BLOCKER" && u.blocker_status === "OPEN"
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Top Header Navigation */}
      <div className="border-b border-stone-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs text-stone-500 mb-1">
                <Link href="/my-eois" className="hover:text-emerald-600 flex items-center transition">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Consortium Dashboard
                </Link>
                <span>/</span>
                <span className="text-stone-400">Project Workspace</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight break-words">{project.title}</h1>
                {getStatusBadge(project.status)}
              </div>
            </div>

            {/* Global Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Communication Forum button */}
              {(project.challenge_id || project.challenge?.id) && (
                <Link
                  href={`/challenges/${project.challenge_id || project.challenge?.id}/forum?projectId=${project.id}`}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-sm font-semibold rounded-xl flex items-center transition"
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Communication Forum
                </Link>
              )}

              {/* Kickoff button */}
              {(project.status === "INITIATED" || project.status === "PROPOSED" || project.status === "KICKOFF_REVISION") && isLead && (
                <button
                  onClick={() => setShowKickoffModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center transition"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {project.status === "KICKOFF_REVISION" ? "Resubmit Kickoff Plan" : "Submit Kickoff Plan"}
                </button>
              )}

              {/* Upload Deliverable button */}
              {project.status === "ACTIVE" && (
                <button
                  onClick={() => {
                    setDelivMilestoneId(project.milestones[0]?.id || "");
                    setShowDeliverableModal(true);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 text-sm font-medium rounded-xl flex items-center transition"
                >
                  <Upload className="w-4 h-4 mr-1.5 text-blue-600" />
                  Upload Deliverable
                </button>
              )}

              {/* Impact Verification Workspace button */}
              {(project.status === "COMPLETED" || project.status === "IMPACT_VERIFIED") && (
                <Link
                  href={`/impact/${project.id}`}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center transition"
                >
                  <Shield className="w-4 h-4 mr-1.5" />
                  {project.status === "IMPACT_VERIFIED" ? "View Verified Impact" : "Impact Verification Workspace"}
                </Link>
              )}

              {/* Post Update button */}
              {project.status !== "TERMINATED" && project.status !== "COMPLETED" && project.status !== "IMPACT_VERIFIED" && (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 text-sm font-medium rounded-xl flex items-center transition"
                >
                  <Activity className="w-4 h-4 mr-1.5 text-emerald-700" />
                  Post Update / Blocker
                </button>
              )}
            </div>
          </div>

          {/* Blocked Emergency Alert Banner */}
          {project.status === "BLOCKED" && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start space-x-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 text-sm">Critical Blocker Declared - Project On Hold</h4>
                {activeBlockers.map((b) => (
                  <p key={b.id} className="text-xs text-red-700 mt-1">
                    <span className="font-semibold">{b.summary}</span>: {b.details || "Awaiting government review and resolution."}
                  </p>
                ))}
                <p className="text-xs text-red-600 mt-2">All milestone completions and deliverable submissions are suspended until resolved by government officers.</p>
              </div>
            </div>
          )}

          {/* Phase 8 Impact Verification Banner */}
          {project.status === "COMPLETED" && (
            <div className="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-purple-700 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-purple-900 text-sm">Project Execution Completed - Impact Verification Ready</h4>
                  <p className="text-xs text-purple-700 mt-0.5">Consortium milestones are complete. Initiate the Impact Assessment to report real-world outcomes and obtain official government impact verification.</p>
                </div>
              </div>
              <Link
                href={`/impact/${project.id}`}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow transition whitespace-nowrap self-start sm:self-auto"
              >
                Go to Impact Workspace →
              </Link>
            </div>
          )}

          {/* Kickoff Revision Alert Banner */}
          {project.status === "KICKOFF_REVISION" && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 text-sm">Kickoff Plan Revision Requested by Government</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Please review the reviewer comments in the Governance tab, adjust objectives or milestones, and resubmit the kickoff plan.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 mt-6 border-b border-stone-200 overflow-x-auto text-sm">
            {[
              { id: "overview", label: "Overview & Roster", icon: Building2 },
              { id: "lifecycle", label: "Lifecycle & Deployment", icon: Rocket },
              { id: "milestones", label: `Milestones (${project.milestones.length})`, icon: Layers },
              { id: "tasks", label: "Task Board", icon: CheckSquare },
              { id: "deliverables", label: `Deliverables Vault (${project.deliverables.length})`, icon: FileCheck },
              { id: "updates", label: `Updates & Blockers (${project.updates.length})`, icon: Activity },
              { id: "governance", label: `Governance Audit (${project.reviews.length})`, icon: Shield },
              { id: "academic", label: `Academic Team (${academicMembers.length})`, icon: GraduationCap },
              { id: "contributions", label: `Contributions (${contributions.length})`, icon: Briefcase },
              { id: "outcomes", label: `Innovation & IP (${innovationOutcomes.length})`, icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium whitespace-nowrap transition ${
                    isActive
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                      : "border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* TAB 1: OVERVIEW & ROSTER */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 1. Shared Phase 4 Project Lifecycle Timeline */}
            {(() => {
              const status = project.status;
              const summary = lifecycleSummary;
              const progPercent = summary?.progressPercentage ?? (
                status === "COMPLETED" || status === "IMPACT_VERIFIED" ? 100 :
                status === "DEPLOYMENT" ? 85 :
                status === "PILOT" ? 65 :
                status === "TESTING" ? 45 :
                status === "PROTOTYPE_DEVELOPMENT" ? 25 : 10
              );

              const completedMilestones = summary?.milestones.approved ?? project.milestones.filter((m) => m.status === "APPROVED").length;
              const totalMilestones = summary?.milestones.total ?? project.milestones.length;
              const overdueCount = summary?.milestones.overdue ?? project.milestones.filter((m) => m.due_date && new Date(m.due_date) < new Date() && m.status !== "APPROVED").length;
              const openBlockersCount = summary?.blockers.open ?? activeBlockers.length;

              // Ordered 6 stages of Phase 4
              const stages = [
                { id: "PLANNING", label: "Planning", desc: "Milestones & Roster" },
                { id: "PROTOTYPE_DEVELOPMENT", label: "Prototype", desc: summary?.prototype ? `v${summary.prototype.version}` : "Engineering Spec" },
                { id: "TESTING", label: "Testing", desc: `${summary?.tests?.passed || 0} Passing Tests` },
                { id: "PILOT", label: "Pilot", desc: summary?.pilot?.location ? summary.pilot.location : "Field Cohort" },
                { id: "DEPLOYMENT", label: "Deployment", desc: summary?.deployment?.handoverEntity ? `To ${summary.deployment.handoverEntity}` : "Handover Plan" },
                { id: "COMPLETED", label: "Completed", desc: status === "COMPLETED" || status === "IMPACT_VERIFIED" ? "Verified" : "Final Signoff" },
              ];

              const stageOrder = ["PLANNING", "PROTOTYPE_DEVELOPMENT", "TESTING", "PILOT", "DEPLOYMENT", "COMPLETED"];
              const currentNorm = (status === "INITIATED" || status === "PROPOSED" || status === "ACTIVE") ? "PLANNING" : status;
              const currentIdx = stageOrder.indexOf(currentNorm);

              return (
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                  {/* Header bar: Stage, Progress & Quick Switch */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <Rocket className="w-5 h-5 text-emerald-700" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900">Project Lifecycle Progression</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold uppercase">
                            Stage: {currentNorm.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">Single source of truth from Planning through Handover & Impact.</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-stone-500 font-medium">Progress:</span>
                        <div className="w-24 bg-stone-200 rounded-full h-2 overflow-hidden border border-stone-300/80">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              status === "BLOCKED" ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${progPercent}%` }}
                          />
                        </div>
                        <strong className={`font-mono text-xs ${
                          status === "BLOCKED" ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"
                        }`}>{progPercent}%</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab("lifecycle")}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                      >
                        Manage Stages →
                      </button>
                    </div>
                  </div>

                  {/* 6-Stage Horizontal Stepper */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1">
                    {stages.map((st, idx) => {
                      const isCompleted = currentIdx > idx || status === "COMPLETED" || status === "IMPACT_VERIFIED";
                      const isCurrent = currentIdx === idx && status !== "COMPLETED" && status !== "IMPACT_VERIFIED";
                      const isStageBlocked = isCurrent && status === "BLOCKED";

                      return (
                        <div
                          key={st.id}
                          className={`p-3 rounded-lg border flex flex-col justify-between space-y-1.5 transition ${
                            isStageBlocked
                              ? "bg-amber-50 border-amber-300 text-stone-900 ring-1 ring-amber-400/40"
                              : isCurrent
                              ? "bg-emerald-50 border-emerald-300 text-stone-900 ring-1 ring-emerald-400/40 shadow-sm"
                              : isCompleted
                              ? "bg-emerald-50/60 border-emerald-200 text-stone-800"
                              : "bg-stone-50 border-stone-200 text-stone-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-mono uppercase ${
                              isStageBlocked ? "text-amber-700 font-semibold" : isCurrent ? "text-emerald-800 font-semibold" : "text-stone-500"
                            }`}>
                              Stage {idx + 1}
                            </span>
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            ) : isStageBlocked ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            ) : isCurrent ? (
                              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shadow-sm shadow-emerald-600/50" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-stone-400" />
                            )}
                          </div>
                          <p className={`text-xs font-bold leading-tight ${isCurrent ? "text-emerald-950 font-bold" : isCompleted ? "text-emerald-900 font-bold" : "text-stone-800"}`}>
                            {st.label}
                          </p>
                          <p className={`text-[10px] truncate ${isCurrent ? "text-stone-700 font-medium" : isCompleted ? "text-stone-600" : "text-stone-500"}`}>
                            {st.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Indicators Pill & Next Action Recommendation Banner */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-stone-200/80">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 font-medium">
                        Milestones:{" "}
                        <span className={completedMilestones > 0 ? "text-emerald-700 font-bold font-mono" : "text-stone-700 font-bold font-mono"}>
                          {completedMilestones}
                        </span>
                        <span className="text-stone-400 font-mono">/</span>
                        <span className="text-stone-700 font-bold font-mono">{totalMilestones}</span>{" "}
                        <span className="text-stone-500 font-normal">Approved</span>
                      </span>
                      {overdueCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" /> {overdueCount} Overdue
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-500">
                          0 Overdue
                        </span>
                      )}
                      {openBlockersCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> {openBlockersCount} Open Blocker{openBlockersCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                          No Blockers
                        </span>
                      )}
                    </div>

                    <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-stone-700 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                      <span>Next Action: <strong className="text-emerald-700 font-semibold">{summary?.nextRecommendedAction || "Review project progress and updates."}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. Your Responsibility Card */}
            {(() => {
              const myParticipant = project.participants.find(
                (p) =>
                  p.organization_id === user?.primaryOrganization?.id ||
                  user?.memberships?.some(
                    (m) => m.organization_id === p.organization_id && m.membership_status === "ACTIVE"
                  )
              );
              const activeMilestone =
                project.milestones.find((m) => m.status === "IN_PROGRESS") ||
                project.milestones.find((m) => m.status === "REVIEW_REQUESTED") ||
                project.milestones[0];

              if (!myParticipant && !isGovOrAdmin) return null;

              return (
                <div className="bg-gradient-to-r from-emerald-50 via-white to-white border border-emerald-200 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-700/30 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        📋
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900">
                          {isGovOrAdmin
                            ? "Government Review & Governance Mandate"
                            : `Your Institutional Responsibility (${myParticipant?.organization?.name || "Your Institution"})`}
                        </h4>
                        <p className="text-xs text-stone-500">
                          Role:{" "}
                          <strong className="text-emerald-700">
                            {isGovOrAdmin ? "Government Reviewer" : myParticipant?.participant_role || "Consortium Partner"}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        Status: {myParticipant?.status || "Active Partner"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block mb-1 text-[11px]">Active Milestone Focus</span>
                      <p className="font-semibold text-stone-800">
                        {activeMilestone ? activeMilestone.title : "No active milestone"}
                      </p>
                      {activeMilestone?.due_date && (
                        <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                          Due: {formatDateSafe(activeMilestone.due_date)}
                        </p>
                      )}
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block mb-1 text-[11px]">Deliverables Status</span>
                      <p className="font-semibold text-stone-800">
                        {project.deliverables.length} Deliverables Recorded
                      </p>
                      <button
                        onClick={() => setActiveTab("deliverables")}
                        className="text-[11px] text-emerald-700 hover:text-emerald-700 underline mt-0.5"
                      >
                        Inspect Deliverables Vault →
                      </button>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block mb-1 text-[11px]">Academic & Research Team</span>
                      <p className="font-semibold text-stone-800">
                        {academicMembers.length} Researchers Assigned
                      </p>
                      <button
                        onClick={() => setActiveTab("academic")}
                        className="text-[11px] text-purple-700 hover:text-purple-600 underline mt-0.5"
                      >
                        Manage Academic Roster →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Project Statement */}
              <div className="md:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-stone-900 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-emerald-700" />
                  Project Mandate & Scope
                </h3>
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                  {project.description || "No general description provided."}
                </p>

                <div className="border-t border-stone-200/80 pt-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Objectives</h4>
                    <p className="text-sm text-stone-700 mt-1">{project.objectives || "Pending kickoff formulation."}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Expected Outcomes</h4>
                    <p className="text-sm text-stone-700 mt-1">{project.expected_outcomes || "Pending kickoff formulation."}</p>
                  </div>
                </div>

                {project.challenge && (
                  <div className="border-t border-stone-200/80 pt-4 flex items-center justify-between text-xs">
                    <span className="text-stone-500">Associated Citizen Problem:</span>
                    <Link
                      href={`/challenges/${project.challenge.id}`}
                      className="text-emerald-700 hover:text-emerald-700 flex items-center font-medium"
                    >
                      {project.challenge.title} <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Key Timeline Info */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-stone-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  Timeline & Budget
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-stone-200">
                    <span className="text-stone-500">Kickoff / Start Date</span>
                    <span className="font-medium text-stone-800">{formatDateSafe(project.start_date)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-stone-200">
                    <span className="text-stone-500">Target Completion</span>
                    <span className="font-medium text-stone-800">{formatDateSafe(project.target_completion_date)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-stone-200">
                    <span className="text-stone-500">Actual Completion</span>
                    <span className="font-medium text-stone-800">{formatDateSafe(project.actual_completion_date)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-stone-500">Total Milestones</span>
                    <span className="font-semibold text-emerald-700">{project.milestones.length} Defined</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Consortium Roster */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-stone-900 flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-700" />
                Collaborative Consortium Participants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.participants.map((p) => {
                  const isLeadPartner = p.participant_role?.toUpperCase() === "LEAD" || p.participant_role?.toUpperCase() === "LEAD_INSTITUTION";
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl border ${
                        isLeadPartner
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-stone-50 border-stone-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-stone-900">{p.organization?.name || "Participant Org"}</span>
                            {isLeadPartner && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                CONSORTIUM LEAD
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            Type: {p.organization?.organization_type || "Institution"} • Joined: {formatDateSafe(p.joined_at)}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MILESTONES TIMELINE */}
        {activeTab === "milestones" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Execution Milestones & Cascading Locking</h3>
                <p className="text-xs text-stone-500">Milestones progress sequentially. Once submitted for review, deliverables and tasks freeze.</p>
              </div>
              {isLead && (project.status === "ACTIVE" || project.status === "INITIATED" || project.status === "KICKOFF_REVISION") && (
                <button
                  onClick={() => setShowMilestoneModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Milestone
                </button>
              )}
            </div>

            <div className="space-y-4">
              {project.milestones.map((m, idx) => {
                const isLocked = m.status === "REVIEW_REQUESTED" || m.status === "APPROVED";
                return (
                  <div
                    key={m.id}
                    className={`p-5 rounded-xl border transition ${
                      m.status === "APPROVED"
                        ? "bg-emerald-50/40 border-emerald-200"
                        : m.status === "IN_PROGRESS"
                        ? "bg-blue-50/40 border-blue-200 shadow-sm"
                        : m.status === "REVIEW_REQUESTED"
                        ? "bg-amber-50/40 border-amber-200"
                        : "bg-white border-stone-200"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <span className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {m.order_index}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-stone-900 text-sm">{m.title}</h4>
                            {getMilestoneBadge(m.status)}
                          </div>
                          <p className="text-xs text-stone-500 mt-1">{m.description || "No description provided."}</p>
                          <div className="flex items-center space-x-4 mt-2 text-[11px] text-stone-500">
                            <span>Target: {formatDateSafe(m.due_date)}</span>
                            <span>•</span>
                            <span>{m.tasks?.length || 0} Tasks</span>
                            <span>•</span>
                            <span>{m.deliverables?.length || 0} Deliverables</span>
                          </div>
                        </div>
                      </div>

                      {/* Milestone action buttons */}
                      <div className="flex items-center space-x-2 self-end md:self-center">
                        {m.status === "PENDING" && isLead && project.status === "ACTIVE" && (
                          <button
                            onClick={() => handleStartMilestone(m.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
                          >
                            Start Milestone
                          </button>
                        )}
                        {(m.status === "IN_PROGRESS" || m.status === "REVISION_REQUIRED") && isLead && project.status === "ACTIVE" && (
                          <button
                            onClick={() => handleRequestMilestoneReview(m.id, m.title)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center transition"
                          >
                            <Lock className="w-3 h-3 mr-1" /> Request Review
                          </button>
                        )}
                        {isLocked && (
                          <span className="text-xs text-stone-400 italic flex items-center">
                            <Lock className="w-3 h-3 mr-1 text-stone-400" /> Read-Only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TASK BOARD */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Consortium Task Board</h3>
                <p className="text-xs text-stone-500">Manage deliverables and workflow execution items across milestone schedules.</p>
              </div>
              {project.status === "ACTIVE" && (
                <button
                  onClick={() => {
                    const activeM = project.milestones.find((m) => m.status === "IN_PROGRESS") || project.milestones[0];
                    setTaskMilestoneId(activeM?.id || "");
                    setShowTaskModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                </button>
              )}
            </div>

            {/* Task Columns: TODO, IN_PROGRESS, DONE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["TODO", "IN_PROGRESS", "DONE"] as const).map((colStatus) => {
                // Flatten all tasks
                const colTasks = project.milestones.flatMap((m) =>
                  (m.tasks || []).map((t) => ({ ...t, milestoneRef: m }))
                ).filter((t) => t.status === colStatus);

                return (
                  <div key={colStatus} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
                      <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        {colStatus === "TODO" ? "To Do" : colStatus === "IN_PROGRESS" ? "In Progress" : "Completed"}
                      </h4>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-stone-200 text-stone-600 font-semibold">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="text-center py-8 text-xs text-stone-400 italic">No tasks in this stage</div>
                      ) : (
                        colTasks.map((t) => {
                          const isMilestoneLocked = t.milestoneRef.status === "REVIEW_REQUESTED" || t.milestoneRef.status === "APPROVED";
                          return (
                            <div key={t.id} className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2 shadow-2xs">
                              <div className="flex items-start justify-between">
                                <h5 className="text-xs font-semibold text-stone-900">{t.title}</h5>
                                {isMilestoneLocked && (
                                  <span title="Milestone locked">
                                    <Lock className="w-3 h-3 text-stone-400" />
                                  </span>
                                )}
                              </div>
                              {t.description && <p className="text-[11px] text-stone-500">{t.description}</p>}
                              <div className="text-[10px] text-stone-500 font-medium">
                                Milestone: {t.milestoneRef.title}
                              </div>

                              {/* Status Advancement if not locked */}
                              {!isMilestoneLocked && project.status === "ACTIVE" && (
                                <div className="flex items-center space-x-2 pt-2 border-t border-stone-200">
                                  {colStatus !== "TODO" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(t.id, "TODO")}
                                      className="text-[10px] text-stone-500 hover:text-stone-800"
                                    >
                                      ← To Do
                                    </button>
                                  )}
                                  {colStatus !== "IN_PROGRESS" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(t.id, "IN_PROGRESS")}
                                      className="text-[10px] text-blue-600 hover:text-blue-700"
                                    >
                                      In Progress
                                    </button>
                                  )}
                                  {colStatus !== "DONE" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(t.id, "DONE")}
                                      className="text-[10px] text-emerald-700 hover:text-emerald-700"
                                    >
                                      Complete ✓
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: DELIVERABLES VAULT */}
        {activeTab === "deliverables" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Isolated Deliverables Vault</h3>
                <p className="text-xs text-stone-500">Formal project outputs, empirical validation data, engineering specifications, and certificates strictly quarantined from capability records.</p>
              </div>
              {project.status === "ACTIVE" && (
                <button
                  onClick={() => setShowDeliverableModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center transition"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Upload Deliverable
                </button>
              )}
            </div>

            {project.deliverables.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-2xl">
                <FileCheck className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-500 font-medium">No deliverables uploaded yet.</p>
                <p className="text-xs text-stone-400 mt-1">Formal project artifacts must be uploaded prior to final project completion.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.deliverables.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-white border border-stone-200 flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-stone-900 text-sm">{d.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                            {d.document_type}
                          </span>
                        </div>
                        {d.description && <p className="text-xs text-stone-500 mt-1">{d.description}</p>}
                        <div className="flex items-center space-x-3 text-[11px] text-stone-500 mt-2">
                          <span>{d.file_name}</span>
                          <span>•</span>
                          <span>{Math.round(d.file_size / 1024)} KB</span>
                          <span>•</span>
                          <span>{formatDateSafe(d.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadDeliverable(d.id, d.file_name)}
                      className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition"
                      title="Download Deliverable"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: UPDATES & BLOCKERS */}
        {activeTab === "updates" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Activity Log & Emergency Blockers</h3>
                <p className="text-xs text-stone-500">Log routine execution progress or declare critical roadblocks that warrant government intervention.</p>
              </div>
              {project.status !== "TERMINATED" && project.status !== "COMPLETED" && (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Post Update / Blocker
                </button>
              )}
            </div>

            {project.updates.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-2xl">
                <Activity className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-500">No project updates posted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.updates.map((u) => {
                  const isBlocker = u.update_type === "BLOCKER";
                  return (
                    <div
                      key={u.id}
                      className={`p-4 rounded-xl border ${
                        isBlocker
                          ? u.blocker_status === "OPEN"
                            ? "bg-red-50 border-red-200"
                            : "bg-white border-stone-200"
                          : "bg-stone-50 border-stone-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isBlocker
                                ? u.blocker_status === "OPEN"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-stone-100 text-stone-500"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isBlocker ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-stone-900 text-sm">{u.summary}</h4>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isBlocker
                                    ? u.blocker_status === "OPEN"
                                      ? "bg-red-50 text-red-800 border border-red-200"
                                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {isBlocker ? `BLOCKER (${u.blocker_status})` : "PROGRESS UPDATE"}
                              </span>
                            </div>
                            {u.details && <p className="text-xs text-stone-700 mt-1 whitespace-pre-line">{u.details}</p>}
                            <div className="text-[11px] text-stone-400 mt-2">
                              By {u.authorUser?.name || "Participant"} ({u.authorParticipant?.organization?.name || "Consortium"}) • {formatDateSafe(u.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: GOVERNANCE AUDIT */}
        {activeTab === "governance" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-stone-900">Official Government Review Trail</h3>
              <p className="text-xs text-stone-500">Formal decisions, review sign-offs, milestone approvals, and completion certifications.</p>
            </div>

            {project.reviews.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-2xl">
                <Shield className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <p className="text-sm text-stone-500">No government review actions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-white border border-stone-200 flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-700 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-stone-900 text-sm">{r.action}</span>
                        <span className="text-xs text-stone-400">• {formatDateSafe(r.created_at)}</span>
                      </div>
                      {r.comments && <p className="text-xs text-stone-700 mt-1">{r.comments}</p>}
                      <div className="text-[11px] text-stone-400 mt-1.5">
                        Authorized Officer: {r.reviewerUser?.name || "Government Reviewer"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: ACADEMIC TEAM */}
        {activeTab === "academic" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  Academic Collaboration & Faculty Mentorship
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Multidisciplinary student researchers, faculty mentors, and academic coordinators assigned from participating HEIs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAcadOrgId(project.participants[0]?.organization_id || "");
                  setShowAcademicModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Academic Member</span>
              </button>
            </div>

            {academicMembers.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 border border-stone-200 rounded-2xl">
                <GraduationCap className="w-10 h-10 text-stone-400 mx-auto mb-3" />
                <p className="text-stone-700 font-medium text-sm">No academic members assigned yet</p>
                <p className="text-stone-500 text-xs mt-1">
                  Participating universities and colleges can assign student researchers and faculty guides.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {academicMembers.map((am) => (
                  <div
                    key={am.id}
                    className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl p-4 space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          am.role === "FACULTY_MENTOR"
                            ? "bg-purple-50 text-purple-800 border border-purple-200"
                            : am.role === "ACADEMIC_COORDINATOR"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}>
                          {am.role.replace(/_/g, " ")}
                        </span>
                        <h4 className="text-sm font-bold text-stone-900 mt-1.5">
                          {am.user?.name || "Academic Member"}
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          {am.organization?.name || "Participating HEI"}
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {am.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-700 space-y-1 pt-1 border-t border-stone-200/80">
                      {am.department && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Department:</span>
                          <span className="font-medium">{am.department}</span>
                        </div>
                      )}
                      {am.degree_program && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Program:</span>
                          <span className="font-medium">{am.degree_program} {am.student_year ? `(Year ${am.student_year})` : ""}</span>
                        </div>
                      )}
                      {am.weekly_commitment_hours && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Commitment:</span>
                          <span className="font-medium">{am.weekly_commitment_hours} hrs/week</span>
                        </div>
                      )}
                    </div>

                    {am.specialization_skills && am.specialization_skills.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1">
                        {am.specialization_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: INNOVATION & IP OUTCOMES (PHASE 9.1) */}
        {activeTab === "outcomes" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  Innovation, IP & Technology Outcomes
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Patents filed, proprietary IP generated, startups created, and technology transfer achievements.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isStudent ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIpAssessorName(user?.name || "");
                        setIpAssessorRole(user?.role || "CONSORTIUM_LEAD");
                        setShowIpAssessmentModal(true);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{ipAssessment?.ip_status ? "Update IP Assessment" : "Record IP Assessment"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOutcomeOrgId(project.participants[0]?.organization_id || "");
                        setShowOutcomeModal(true);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Innovation Outcome</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    Academic Policy: Outcomes are registered by Faculty & Consortium Leads
                  </span>
                )}
              </div>
            </div>

            {/* IP Assessment Overview Card */}
            <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">Project IP & Patent Assessment</h4>
                      {ipAssessment?.is_confidential && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Lock className="w-2.5 h-2.5" />
                          Confidential / Restricted
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Formal evaluation of intellectual property, patent claims, protectability, and commercialization pathway.
                    </p>
                  </div>
                </div>

                <div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                    ipAssessment?.ip_status === "PATENT_GRANTED" || ipAssessment?.ip_status === "PATENT_APPLICATION_FILED"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : ipAssessment?.ip_status === "POTENTIAL_IP_IDENTIFIED"
                      ? "bg-purple-50 text-purple-800 border border-purple-200"
                      : ipAssessment?.ip_status === "CONFIDENTIAL"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : ipAssessment?.ip_status === "NO_IP_IDENTIFIED"
                      ? "bg-stone-100 text-stone-500 border border-stone-200"
                      : "bg-white text-stone-500 border border-stone-200"
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    {ipAssessment?.ip_status ? ipAssessment.ip_status.replace(/_/g, " ") : "IP Assessment Pending"}
                  </span>
                </div>
              </div>

              {ipAssessment?.ip_status ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] text-stone-500 font-medium">Protection Classification</span>
                    <p className="text-xs font-semibold text-stone-900">
                      {ipAssessment.protection_type || "Standard Protection"}
                      {ipAssessment.reference_number && ` (${ipAssessment.reference_number})`}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-stone-500 font-medium">Assessed By</span>
                    <p className="text-xs font-semibold text-stone-900">
                      {ipAssessment.assessor_name || "Lead Assessor"}
                      {ipAssessment.assessor_role && ` • ${ipAssessment.assessor_role}`}
                    </p>
                    {ipAssessment.recorded_at && (
                      <span className="text-[10px] text-stone-500 block">{formatDateSafe(ipAssessment.recorded_at)}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-stone-500 font-medium">Commercialization Pathway</span>
                    <p className="text-xs font-semibold text-purple-700">
                      {ipAssessment.commercialization_path ? ipAssessment.commercialization_path.replace(/_/g, " ") : "Direct Deployment / Licensing"}
                    </p>
                  </div>

                  {ipAssessment.assessment_notes && (
                    <div className="sm:col-span-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700">
                      <span className="font-semibold text-stone-500 block mb-1">Assessment Notes & Recommendation:</span>
                      {ipAssessment.assessment_notes}
                    </div>
                  )}

                  {ipAssessment.evidence_deliverable_title && (
                    <div className="sm:col-span-3 text-xs text-stone-500 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Linked Deliverable Evidence: <strong className="text-stone-800">{ipAssessment.evidence_deliverable_title}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-stone-500 italic py-1">
                  No formal IP evaluation has been registered yet. Consortium leads or government reviewers can record patent claims, trade secrets, or public domain status.
                </div>
              )}
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-stone-200">
                <div className="text-xs text-stone-500">Total Recorded</div>
                <div className="text-xl font-bold text-stone-900 mt-1">{innovationOutcomes.length}</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-stone-200">
                <div className="text-xs text-stone-500">Gov Verified</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {innovationOutcomes.filter((o) => o.status === "VERIFIED").length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <div className="text-xs text-purple-700">Patents / Applications</div>
                <div className="text-xl font-bold text-purple-700 mt-1">
                  {innovationOutcomes.filter((o) => o.outcome_type === "PATENT" || o.outcome_type === "PATENT_APPLICATION").length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-xs text-blue-700">Startups & Tech Transfer</div>
                <div className="text-xl font-bold text-blue-700 mt-1">
                  {innovationOutcomes.filter((o) => o.outcome_type === "STARTUP_CREATED" || o.outcome_type === "TECHNOLOGY_TRANSFER").length}
                </div>
              </div>
            </div>

            {innovationOutcomes.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 border border-stone-200 rounded-2xl">
                <Sparkles className="w-10 h-10 text-stone-400 mx-auto mb-3" />
                <p className="text-stone-700 font-medium text-sm">No innovation outcomes recorded yet</p>
                <p className="text-stone-500 text-xs mt-1">
                  Consortium members can register patents, generated IP, and incubated startups emerging from this project.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {innovationOutcomes.map((o) => (
                  <div
                    key={o.id}
                    className="p-5 rounded-xl bg-white border border-stone-200 hover:border-stone-200 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                            {o.outcome_type.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : o.status === "REJECTED"
                              ? "bg-red-50 text-red-800 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {o.status}
                          </span>
                          {o.reference_number && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-700 border border-stone-200">
                              Ref: {o.reference_number}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-stone-900 mt-1.5">{o.title}</h4>
                        <p className="text-xs text-stone-600 mt-1">{o.description}</p>

                        {/* Extra Phase 5 outcome details */}
                        {o.metadata?.founding_team && (
                          <div className="text-xs text-stone-700 mt-2 bg-stone-50 p-2 rounded border border-stone-200">
                            <span className="text-stone-500 font-semibold">Founding Team: </span>
                            {Array.isArray(o.metadata.founding_team) ? o.metadata.founding_team.join(", ") : o.metadata.founding_team}
                          </div>
                        )}
                        {o.metadata?.technology_basis && (
                          <div className="text-xs text-stone-700 mt-1">
                            <span className="text-stone-400">Tech Basis: </span>
                            {o.metadata.technology_basis}
                          </div>
                        )}
                        {o.metadata?.transfer_type && (
                          <div className="text-xs text-stone-700 mt-2 bg-stone-50 p-2 rounded border border-stone-200">
                            <span className="text-stone-500 font-semibold">Transfer Type: </span>
                            {o.metadata.transfer_type}
                            {o.metadata.commercial_terms && <span className="text-stone-500 ml-2">• Terms: {o.metadata.commercial_terms}</span>}
                          </div>
                        )}
                        {o.metadata?.evidence_deliverable_title && (
                          <div className="text-xs text-emerald-700 flex items-center gap-1.5 mt-2">
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Deliverable Evidence: <strong>{o.metadata.evidence_deliverable_title}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-2">
                          {o.organization?.name && (
                            <span>Institution / Org: <strong className="text-stone-700">{o.organization.name}</strong></span>
                          )}
                          <span>Recorded: {formatDateSafe(o.created_at)}</span>
                        </div>
                      </div>

                      <div className="text-right sm:self-start">
                        {isGovOrAdmin && o.status === "PROPOSED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOutcomeForVerify(o);
                              setVerifyOutcomeStatus("VERIFIED");
                              setVerifyOutcomeNotes("");
                              setVerifyOutcomeRefNumber(o.reference_number || "");
                              setShowVerifyOutcomeModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Verify Outcome
                          </button>
                        )}
                      </div>
                    </div>

                    {o.verification_notes && (
                      <div className="p-2.5 bg-stone-100 rounded-lg text-xs text-stone-500 border border-stone-200">
                        <span className="font-semibold text-stone-700">Gov Verification Notes: </span>
                        {o.verification_notes}
                        {o.verified_at && <span className="text-stone-400 ml-2">• {formatDateSafe(o.verified_at)}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: ECOSYSTEM CONTRIBUTIONS */}
        {activeTab === "contributions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  Industry & Ecosystem Contributions
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Mentorship, co-financing, technical equipment, testing facilities, and technology transfer commitments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContribOrgId(project.participants[0]?.organization_id || "");
                  setShowContributionModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Contribution</span>
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-stone-200">
                <div className="text-xs text-stone-500">Total Commitments</div>
                <div className="text-xl font-bold text-stone-900 mt-1">{contributions.length}</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-stone-200">
                <div className="text-xs text-stone-500">Gov Verified & Approved</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {contributions.filter((c) => c.status === "APPROVED").length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-xs text-emerald-700">Total Monetized Valuation</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  ₹{contributions
                    .filter((c) => c.status === "APPROVED")
                    .reduce((sum, c) => sum + Number(c.monetary_value || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>

            {contributions.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 border border-stone-200 rounded-2xl">
                <Briefcase className="w-10 h-10 text-stone-400 mx-auto mb-3" />
                <p className="text-stone-700 font-medium text-sm">No contributions registered yet</p>
                <p className="text-stone-500 text-xs mt-1">
                  Consortium partners and industry sponsors can commit mentorship, capital, and technical tools.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contributions.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-xl bg-white border border-stone-200 hover:border-stone-200 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                            {c.contribution_type.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : c.status === "REJECTED"
                              ? "bg-red-50 text-red-800 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {c.status}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Visibility: {c.visibility}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-stone-900 mt-1.5">{c.title}</h4>
                        <p className="text-xs text-stone-600 mt-1">{c.description}</p>
                      </div>

                      <div className="text-right sm:self-start">
                        {c.monetary_value ? (
                          <div className="text-sm font-bold text-emerald-700">
                            ₹{Number(c.monetary_value).toLocaleString()}
                          </div>
                        ) : null}
                        {isGovOrAdmin && c.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContribForVerify(c);
                              setShowVerifyModal(true);
                            }}
                            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition shadow-sm"
                          >
                            <Shield className="w-3 h-3" />
                            Verify / Review
                          </button>
                        )}
                      </div>
                    </div>

                    {c.resources_provided && (
                      <div className="p-2.5 bg-stone-50 rounded-xl text-xs text-stone-700 border border-stone-200/60">
                        <span className="font-semibold text-stone-500">Equipment / Resources: </span>
                        {c.resources_provided}
                      </div>
                    )}

                    {c.verification_notes && (
                      <div className="p-2.5 bg-stone-100 rounded-lg text-xs text-stone-500 border border-stone-200">
                        <span className="font-semibold text-stone-700">Gov Verification Notes: </span>
                        {c.verification_notes}
                        {c.verified_at && <span className="text-stone-400 ml-2">• {formatDateSafe(c.verified_at)}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: LIFECYCLE & DEPLOYMENT (PHASE 4) */}
        {activeTab === "lifecycle" && (
          <div className="space-y-6">
            {/* Top Lifecycle Header & Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-stone-900">Project Lifecycle & Field Deployment</h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-500/20 font-mono uppercase">
                    Stage: {project.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Manage prototype engineering, lab/field testing validation, pilot cohort deployment, and operational handover.
                </p>
              </div>

              {isLead && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStage(
                        project.status === "PLANNING" || project.status === "ACTIVE" || project.status === "INITIATED"
                          ? "PROTOTYPE_DEVELOPMENT"
                          : project.status === "PROTOTYPE_DEVELOPMENT"
                          ? "TESTING"
                          : project.status === "TESTING"
                          ? "PILOT"
                          : project.status === "PILOT"
                          ? "DEPLOYMENT"
                          : "COMPLETED"
                      );
                      setShowTransitionModal(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Advance / Transition Stage</span>
                  </button>

                  {lifecycleSummary?.completionChecklist?.readyForCompletion && project.status !== "COMPLETED" && project.status !== "IMPACT_VERIFIED" && (
                    <button
                      type="button"
                      onClick={handleCompleteProjectDirectly}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Complete Project</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Completion Readiness Checklist */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-sm font-semibold text-stone-800">Lifecycle Completion & Governance Checklist</h4>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  lifecycleSummary?.completionChecklist?.readyForCompletion
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-stone-100 text-stone-500 border-stone-200"
                }`}>
                  {lifecycleSummary?.completionChecklist?.readyForCompletion ? "Ready for Completion" : "Prerequisites Incomplete"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
                {[
                  { label: "Milestones Defined", ok: lifecycleSummary?.completionChecklist?.hasMilestones ?? project.milestones.length > 0 },
                  { label: "All Milestones Approved", ok: lifecycleSummary?.completionChecklist?.allMilestonesApproved ?? false },
                  { label: "Deliverables In Vault", ok: lifecycleSummary?.completionChecklist?.hasDeliverable ?? project.deliverables.length > 0 },
                  { label: "Prototype Specs Logged", ok: lifecycleSummary?.completionChecklist?.hasPrototype ?? !!lifecycleSummary?.prototype },
                  { label: "Test Validation Executed", ok: lifecycleSummary?.completionChecklist?.hasTestValidation ?? ((lifecycleSummary?.tests?.passed || 0) > 0) },
                  { label: "Pilot / Deployment Staged", ok: lifecycleSummary?.completionChecklist?.hasPilotOrDeployment ?? (!!lifecycleSummary?.pilot || !!lifecycleSummary?.deployment) },
                  { label: "Zero Open Blockers", ok: lifecycleSummary?.completionChecklist?.noOpenBlockers ?? (activeBlockers.length === 0) },
                  { label: "Required Contribs Verified", ok: lifecycleSummary?.completionChecklist?.allRequiredContributionsVerified ?? true },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      item.ok
                        ? "bg-emerald-50/60 border-emerald-200 text-stone-800"
                        : "bg-stone-50 border-stone-200 text-stone-500"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4 Core Lifecycle Workspaces */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Prototype Development */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <Rocket className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold text-stone-900">1. Prototype Engineering</h4>
                  </div>
                  {isLead && (
                    <button
                      type="button"
                      onClick={() => setShowProtoModal(true)}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      {lifecycleSummary?.prototype ? "Update Specs" : "Record Prototype"}
                    </button>
                  )}
                </div>

                {lifecycleSummary?.prototype ? (
                  <div className="space-y-2.5 text-xs text-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Version:</span>
                      <strong className="text-stone-900 font-mono">{lifecycleSummary.prototype.version || "1.0.0"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Readiness Stage:</span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 capitalize">
                        {(lifecycleSummary.prototype.stage || "working_prototype").replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block mb-0.5">Description:</span>
                      <p className="bg-stone-50 p-2 rounded border border-stone-200 text-stone-800">
                        {lifecycleSummary.prototype.description}
                      </p>
                    </div>
                    {lifecycleSummary.prototype.resourceNeeds && lifecycleSummary.prototype.resourceNeeds.length > 0 && (
                      <div>
                        <span className="text-stone-500 block mb-0.5">Resource Requirements:</span>
                        <div className="flex flex-wrap gap-1">
                          {lifecycleSummary.prototype.resourceNeeds.map((rn: string, rIdx: number) => (
                            <span key={rIdx} className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px]">
                              {rn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    <p>No prototype specifications recorded yet.</p>
                    <p className="mt-1 text-[11px]">Define architecture, version, and component requirements to advance.</p>
                  </div>
                )}
              </div>

              {/* Card 2: Testing & Validation */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <FlaskConical className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-stone-900">2. Testing & Validation Protocol</h4>
                  </div>
                  {isLead && (
                    <button
                      type="button"
                      onClick={() => setShowTestModal(true)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      Record Test Result
                    </button>
                  )}
                </div>

                {lifecycleSummary?.tests?.records && lifecycleSummary.tests.records.length > 0 ? (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {lifecycleSummary.tests.records.map((tr: any) => (
                      <div key={tr.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-stone-900">{tr.testPlan}</strong>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tr.passed ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
                          }`}>
                            {tr.passed ? "PASSED" : "FAILED"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-stone-500">
                          <span>Type: <strong className="text-stone-700">{tr.testType}</strong></span>
                          <span>Tester: <strong className="text-stone-700">{tr.testerName}</strong></span>
                          {tr.lab && <span>Lab: <strong className="text-stone-700">{tr.lab}</strong></span>}
                        </div>
                        <p className="text-stone-700 text-[11px]">Observed: {tr.observedResults}</p>
                        {tr.correctiveAction && (
                          <p className="text-amber-800 text-[11px] font-medium">Action: {tr.correctiveAction}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    <p>No testing validation records logged.</p>
                    <p className="mt-1 text-[11px]">Record lab bench, field, or environmental testing results.</p>
                  </div>
                )}
              </div>

              {/* Card 3: Pilot Deployment */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-bold text-stone-900">3. Pilot Cohort Deployment</h4>
                  </div>
                  {isLead && (
                    <button
                      type="button"
                      onClick={() => setShowPilotModal(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      {lifecycleSummary?.pilot ? "Update Pilot" : "Initiate Pilot"}
                    </button>
                  )}
                </div>

                {lifecycleSummary?.pilot ? (
                  <div className="space-y-2.5 text-xs text-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Location / District:</span>
                      <strong className="text-stone-900">
                        {lifecycleSummary.pilot.location} {lifecycleSummary.pilot.district ? `(${lifecycleSummary.pilot.district})` : ""}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Target Cohort / Beneficiaries:</span>
                      <strong className="text-stone-900">
                        {lifecycleSummary.pilot.targetCohortSize ? `${lifecycleSummary.pilot.targetCohortSize} people` : "Community scale"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Duration:</span>
                      <strong className="text-stone-900">{lifecycleSummary.pilot.durationDays || 30} days</strong>
                    </div>
                    {lifecycleSummary.pilot.implementingOrg && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Implementing Org:</span>
                        <strong className="text-stone-800">{lifecycleSummary.pilot.implementingOrg}</strong>
                      </div>
                    )}
                    {lifecycleSummary.pilot.feedbackSummary && (
                      <div>
                        <span className="text-stone-500 block mb-0.5">Beneficiary / Stakeholder Feedback:</span>
                        <p className="bg-stone-50 p-2 rounded border border-stone-200 text-stone-800">
                          {lifecycleSummary.pilot.feedbackSummary}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    <p>No pilot deployment initiated yet.</p>
                    <p className="mt-1 text-[11px]">Define pilot site, duration, and target community cohort.</p>
                  </div>
                )}
              </div>

              {/* Card 4: Final Deployment & Handover */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-purple-700" />
                    <h4 className="text-sm font-bold text-stone-900">4. Final Handover & Deployment</h4>
                  </div>
                  {isLead && (
                    <button
                      type="button"
                      onClick={() => setShowDeployModal(true)}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      {lifecycleSummary?.deployment ? "Update Handover" : "Record Handover"}
                    </button>
                  )}
                </div>

                {lifecycleSummary?.deployment ? (
                  <div className="space-y-2.5 text-xs text-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Handover Entity:</span>
                      <strong className="text-stone-900">{lifecycleSummary.deployment.handoverEntity}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Designated Recipient:</span>
                      <strong className="text-stone-900">{lifecycleSummary.deployment.handoverRecipient}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Operational Status:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase font-semibold">
                        {(lifecycleSummary.deployment.operationalStatus || "OPERATIONAL").replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Staff Training Completed:</span>
                      <span className={lifecycleSummary.deployment.trainingCompleted ? "text-emerald-700 font-semibold" : "text-amber-700 font-medium"}>
                        {lifecycleSummary.deployment.trainingCompleted ? "✓ Yes" : "Pending"}
                      </span>
                    </div>
                    {lifecycleSummary.deployment.maintenancePlan && (
                      <div>
                        <span className="text-stone-500 block mb-0.5">Sustainment & Maintenance Plan:</span>
                        <p className="bg-stone-50 p-2 rounded border border-stone-200 text-stone-800">
                          {lifecycleSummary.deployment.maintenancePlan}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    <p>Final handover not yet executed.</p>
                    <p className="mt-1 text-[11px]">Record recipient department, training completion, and maintenance plan.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stage Transition History Audit */}
            {lifecycleSummary?.stageHistory && lifecycleSummary.stageHistory.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  Stage Transition Audit Trail
                </h4>
                <div className="space-y-2 text-xs">
                  {lifecycleSummary.stageHistory.map((sh, shIdx) => (
                    <div key={shIdx} className="p-2.5 rounded bg-stone-100 border border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-500 font-mono">
                          {sh.fromStage} → <strong className="text-emerald-700">{sh.toStage}</strong>
                        </span>
                        {sh.reviewNotes && <span className="text-stone-700">&quot;{sh.reviewNotes}&quot;</span>}
                      </div>
                      <span className="text-[11px] text-stone-400">{formatDateSafe(sh.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* Outcome Creation Modal */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-lg text-stone-900">Record Innovation / IP Outcome</h3>
              <button onClick={() => setShowOutcomeModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleCreateOutcome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Outcome Category</label>
                <select
                  value={outcomeType}
                  onChange={(e: any) => setOutcomeType(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                >
                  <option value="PATENT">Patent Granted / Registered</option>
                  <option value="PATENT_APPLICATION">Patent Application Filed</option>
                  <option value="IP_GENERATED">Intellectual Property Generated (Copyright / Design)</option>
                  <option value="STARTUP_CREATED">Startup / Spin-off Incorporated</option>
                  <option value="INNOVATION_OUTCOME">Demonstrated Field Innovation</option>
                  <option value="TECHNOLOGY_TRANSFER">Technology Transfer / Commercialization</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Title / Identification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Solar Filtration Nano-Membrane Patent Application"
                  value={outcomeTitle}
                  onChange={(e) => setOutcomeTitle(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Reference / Filing / CIN Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Indian Patent App No. 202611099238 or CIN U72200JH2026PTC019"
                  value={outcomeRefNumber}
                  onChange={(e) => setOutcomeRefNumber(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Detailed Technical Description & Provenance</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe technical specification, patent claim summary, startup business model, or transfer agreement terms..."
                  value={outcomeDesc}
                  onChange={(e) => setOutcomeDesc(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                />
              </div>

              {/* Startup Specific Fields */}
              {outcomeType === "STARTUP_CREATED" && (
                <div className="space-y-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-blue-700" />
                    Startup & Incubation Details
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Founding Team Members (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., Dr. R. Sharma (Faculty), Priya Nair (Student Lead), Aarav Patel"
                      value={startupFoundingTeam}
                      onChange={(e) => setStartupFoundingTeam(e.target.value)}
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Technology Basis</label>
                    <input
                      type="text"
                      placeholder="e.g., Low-cost filtration membranes developed in Milestone 3"
                      value={startupTechBasis}
                      onChange={(e) => setStartupTechBasis(e.target.value)}
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Incubation Center / Organization ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="Organization UUID or university incubation cell name"
                      value={startupIncubatorOrgId}
                      onChange={(e) => setStartupIncubatorOrgId(e.target.value)}
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                    />
                  </div>
                </div>
              )}

              {/* Tech Transfer Specific Fields */}
              {outcomeType === "TECHNOLOGY_TRANSFER" && (
                <div className="space-y-3 p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-700" />
                    Technology Transfer & Commercialization Details
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Transfer Agreement Type</label>
                    <select
                      value={transferType}
                      onChange={(e) => setTransferType(e.target.value)}
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                    >
                      <option value="LICENSING">Commercial Licensing Agreement</option>
                      <option value="ASSIGNMENT">Complete Technology Assignment</option>
                      <option value="ROYALTY_BEARING">Royalty-Bearing Commercial Deployment</option>
                      <option value="PUBLIC_COMMISSION">Public Utility / Open Deployment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Receiving Industry Partner / Organization ID</label>
                    <input
                      type="text"
                      placeholder="Organization ID of industrial recipient or public entity"
                      value={transferReceivingOrgId}
                      onChange={(e) => setTransferReceivingOrgId(e.target.value)}
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Commercial / Transfer Terms Summary</label>
                    <input
                      type="text"
                      placeholder="e.g., Non-exclusive 5-year license with 3% royalty on state distribution"
                      value={transferCommercialTerms}
                      onChange={(e) => setTransferCommercialTerms(e.target.value)}
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                    />
                  </div>
                </div>
              )}

              {/* Evidence Deliverable Vault Linkage */}
              {project.deliverables && project.deliverables.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Link Deliverable Evidence (Deliverable Vault)</label>
                  <select
                    value={outcomeEvidenceDeliverableId}
                    onChange={(e) => setOutcomeEvidenceDeliverableId(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                  >
                    <option value="">-- No deliverable linked --</option>
                    {project.deliverables.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.document_type || "DOCUMENT"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {project.participants.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Originating Consortium Organization</label>
                  <select
                    value={outcomeOrgId}
                    onChange={(e) => setOutcomeOrgId(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                  >
                    {project.participants.map((p) => (
                      <option key={p.organization_id} value={p.organization_id}>
                        {p.organization?.name || "Participant Org"} ({p.participant_role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Recording..." : "Record Outcome"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IP Assessment Modal (Phase 5) */}
      {showIpAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-base text-stone-900">Record Project IP Assessment</h3>
              </div>
              <button onClick={() => setShowIpAssessmentModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleRecordIpAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">IP Classification Status</label>
                <select
                  value={ipStatus}
                  onChange={(e) => setIpStatus(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                >
                  <option value="POTENTIAL_IP_IDENTIFIED">Potential IP Identified (Novel Technical Work)</option>
                  <option value="PATENT_APPLICATION_FILED">Patent Application Filed (Provisional / Non-Provisional)</option>
                  <option value="PATENT_GRANTED">Patent Granted (Official IP Office Registration)</option>
                  <option value="OTHER_PROTECTION">Other Legal Protection (Copyright / Design / Trade Secret)</option>
                  <option value="CONFIDENTIAL">Confidential Know-How / Restricted Technical Asset</option>
                  <option value="NO_IP_IDENTIFIED">No Proprietary IP Identified / Open Source</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Assessor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Dr. Rajesh Sharma"
                    value={ipAssessorName}
                    onChange={(e) => setIpAssessorName(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Assessor Role / Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Lead Academic PI / Patent Attorney"
                    value={ipAssessorRole}
                    onChange={(e) => setIpAssessorRole(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Protection Type</label>
                  <select
                    value={ipProtectionType}
                    onChange={(e) => setIpProtectionType(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                  >
                    <option value="PATENT">Patent (Indian / International)</option>
                    <option value="COPYRIGHT">Copyright / Software Source</option>
                    <option value="INDUSTRIAL_DESIGN">Industrial / Hardware Design</option>
                    <option value="CONFIDENTIAL_KNOW_HOW">Confidential Know-How / Trade Secret</option>
                    <option value="OPEN_SOURCE">Open Source / Public Domain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Application / Reference #</label>
                  <input
                    type="text"
                    placeholder="e.g., IN-2026/09123-PAT"
                    value={ipRefNumber}
                    onChange={(e) => setIpRefNumber(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Commercialization Pathway</label>
                <select
                  value={ipCommercializationPath}
                  onChange={(e) => setIpCommercializationPath(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                >
                  <option value="STARTUP_SPINOFF">Campus Startup / Spin-off Incubation</option>
                  <option value="INDUSTRY_LICENSING">Industry Licensing to Participating Partner</option>
                  <option value="GOVERNMENT_DEPLOYMENT">Direct State / Municipal Government Deployment</option>
                  <option value="OPEN_INNOVATION">Public Commons / Open Innovation</option>
                </select>
              </div>

              {/* Evidence Deliverable Vault Linkage */}
              {project.deliverables && project.deliverables.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Deliverable Evidence Attachment</label>
                  <select
                    value={ipEvidenceDeliverableId}
                    onChange={(e) => setIpEvidenceDeliverableId(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                  >
                    <option value="">-- No specific deliverable attached --</option>
                    {project.deliverables.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.document_type || "DOCUMENT"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ipIsConfidential"
                  checked={ipIsConfidential}
                  onChange={(e) => setIpIsConfidential(e.target.checked)}
                  className="rounded border-stone-200 bg-stone-100 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="ipIsConfidential" className="text-xs text-stone-700 cursor-pointer">
                  Mark technical details as confidential (Restricted from public/external viewers)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Assessment Notes & Analysis</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record prior art review, patentability justification, novelty analysis, or commercial deployment recommendations..."
                  value={ipAssessmentNotes}
                  onChange={(e) => setIpAssessmentNotes(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowIpAssessmentModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Recording..." : "Save IP Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outcome Verification Modal */}
      {showVerifyOutcomeModal && selectedOutcomeForVerify && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">Verify Innovation Outcome</h3>
              <button onClick={() => setShowVerifyOutcomeModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-xs text-stone-700">
              <div className="font-bold text-stone-900 text-sm">{selectedOutcomeForVerify.title}</div>
              <div className="text-stone-500 mt-1">Type: {selectedOutcomeForVerify.outcome_type}</div>
            </div>
            <form onSubmit={handleVerifyOutcome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Verification Decision</label>
                <select
                  value={verifyOutcomeStatus}
                  onChange={(e: any) => setVerifyOutcomeStatus(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                >
                  <option value="VERIFIED">VERIFIED (Confirm Authentic Real-World Outcome)</option>
                  <option value="REJECTED">REJECTED (Insufficient or Invalid Submission)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Official Reference / Patent / Registration #</label>
                <input
                  type="text"
                  placeholder="Confirm or provide official filing/patent number"
                  value={verifyOutcomeRefNumber}
                  onChange={(e) => setVerifyOutcomeRefNumber(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Reviewer Verification Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add evaluation findings, patent registry check, or governance remarks..."
                  value={verifyOutcomeNotes}
                  onChange={(e) => setVerifyOutcomeNotes(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowVerifyOutcomeModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Submitting..." : "Submit Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Kickoff Submission Modal */}
      {showKickoffModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-lg text-stone-900">Formulate Project Kickoff Plan</h3>
              <button onClick={() => setShowKickoffModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleSubmitKickoff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Specific Execution Objectives</label>
                <textarea
                  required
                  rows={3}
                  value={kickoffObjectives}
                  onChange={(e) => setKickoffObjectives(e.target.value)}
                  placeholder="Detail primary technical and real-world implementation goals..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Expected Deliverables & Impact Outcomes</label>
                <textarea
                  required
                  rows={3}
                  value={kickoffOutcomes}
                  onChange={(e) => setKickoffOutcomes(e.target.value)}
                  placeholder="Measurable outcomes (e.g. 10,000L/day filtered water, 5 villages covered)..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-sm text-stone-900 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  required
                  value={kickoffTargetDate}
                  onChange={(e) => setKickoffTargetDate(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowKickoffModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Submitting..." : "Submit Kickoff for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">Create New Milestone</h3>
              <button onClick={() => setShowMilestoneModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Milestone 3: Field Calibration"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Summary of objectives for this milestone stage..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={milestoneDueDate}
                  onChange={(e) => setMilestoneDueDate(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Saving..." : "Create Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">Create Task</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Target Milestone</label>
                <select
                  required
                  value={taskMilestoneId}
                  onChange={(e) => setTaskMilestoneId(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                >
                  {project.milestones.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.status === "REVIEW_REQUESTED" || m.status === "APPROVED"}>
                      {m.title} {m.status === "APPROVED" ? "(Locked - Approved)" : m.status === "REVIEW_REQUESTED" ? "(Locked - Under Review)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Assemble solar battery rack"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task steps and technical specifications..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Assigned Participant</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                >
                  <option value="">Unassigned</option>
                  {project.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.organization?.name} ({p.participant_role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Upload Deliverable Modal */}
      {showDeliverableModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">Upload Project Deliverable</h3>
              <button onClick={() => setShowDeliverableModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleUploadDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Associated Milestone</label>
                <select
                  value={delivMilestoneId}
                  onChange={(e) => setDelivMilestoneId(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                >
                  <option value="">General Project Deliverable</option>
                  {project.milestones.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.status === "REVIEW_REQUESTED" || m.status === "APPROVED"}>
                      {m.title} {m.status === "APPROVED" ? "(Locked)" : m.status === "REVIEW_REQUESTED" ? "(Under Review - Locked)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Document Type</label>
                <select
                  value={delivDocType}
                  onChange={(e) => setDelivDocType(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                >
                  <option value="REPORT">Official Progress / Impact Report</option>
                  <option value="PROTOTYPE_SPEC">Prototype Specification & Blueprint</option>
                  <option value="FIELD_PHOTO">Field Implementation Photo</option>
                  <option value="CERTIFICATION">Quality / Lab Certification</option>
                  <option value="OTHER">Other Supporting Output</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={delivTitle}
                  onChange={(e) => setDelivTitle(e.target.value)}
                  placeholder="e.g. Water Quality Test Verification Certificate"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">File Attachment (Max 50MB)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDelivFile(e.target.files?.[0] || null)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-stone-200 file:text-stone-800"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowDeliverableModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Uploading..." : "Upload Deliverable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {/* 6. Add Academic Member Modal */}
      {showAcademicModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
                Assign Academic Team Member
              </h3>
              <button onClick={() => setShowAcademicModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleAddAcademicMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Participating Organization</label>
                <select
                  required
                  value={acadOrgId}
                  onChange={(e) => setAcadOrgId(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                >
                  <option value="">Select Organization</option>
                  {project.participants.map((p) => (
                    <option key={p.organization_id} value={p.organization_id}>
                      {p.organization?.name || p.organization_id} ({p.participant_role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">User / Student User ID</label>
                <input
                  type="text"
                  required
                  value={acadUserId}
                  onChange={(e) => setAcadUserId(e.target.value)}
                  placeholder="UUID of registered institutional user"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Academic Role</label>
                <select
                  value={acadRole}
                  onChange={(e) => setAcadRole(e.target.value as any)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                >
                  <option value="STUDENT_RESEARCHER">Student Researcher</option>
                  <option value="FACULTY_MENTOR">Faculty Mentor / PI</option>
                  <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={acadDept}
                    onChange={(e) => setAcadDept(e.target.value)}
                    placeholder="e.g. Civil Engineering"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Program</label>
                  <input
                    type="text"
                    value={acadProgram}
                    onChange={(e) => setAcadProgram(e.target.value)}
                    placeholder="e.g. B.Tech / M.Tech"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Year (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={acadYear}
                    onChange={(e) => setAcadYear(Number(e.target.value))}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Weekly Commitment (Hrs)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={acadHours}
                    onChange={(e) => setAcadHours(Number(e.target.value))}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Specialization Skills (comma separated)</label>
                <input
                  type="text"
                  value={acadSkills}
                  onChange={(e) => setAcadSkills(e.target.value)}
                  placeholder="e.g. GIS, Sensor Calibration, Data Modeling"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAcademicModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Assigning..." : "Assign to Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Add Contribution Modal */}
      {showContributionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-700" />
                Register Ecosystem Contribution
              </h3>
              <button onClick={() => setShowContributionModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleAddContribution} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Contributing Organization</label>
                <select
                  required
                  value={contribOrgId}
                  onChange={(e) => setContribOrgId(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                >
                  <option value="">Select Organization</option>
                  {project.participants.map((p) => (
                    <option key={p.organization_id} value={p.organization_id}>
                      {p.organization?.name || p.organization_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Contribution Type</label>
                <select
                  value={contribType}
                  onChange={(e) => setContribType(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                >
                  <option value="MENTORSHIP">Mentorship & Advisory</option>
                  <option value="FUNDING">Co-Funding / Grant</option>
                  <option value="TECHNOLOGY">Technology & Software Licences</option>
                  <option value="PROTOTYPING">Prototyping & Workshop Access</option>
                  <option value="TESTING">Laboratory & Testing Facilities</option>
                  <option value="PILOT_SUPPORT">Field Pilot Support</option>
                  <option value="TECH_TRANSFER">Technology Transfer Rights</option>
                  <option value="DEPLOYMENT_SUPPORT">Deployment & Maintenance Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Headline Title</label>
                <input
                  type="text"
                  required
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                  placeholder="e.g. IoT Sensor Kits & Cloud Telemetry Access"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Detailed Description</label>
                <textarea
                  rows={2}
                  required
                  value={contribDesc}
                  onChange={(e) => setContribDesc(e.target.value)}
                  placeholder="Explain the scope and schedule of this contribution..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Monetary Value (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={contribValue}
                    onChange={(e) => setContribValue(e.target.value)}
                    placeholder="Optional valuation"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Visibility Scope</label>
                  <select
                    value={contribVisibility}
                    onChange={(e) => setContribVisibility(e.target.value as any)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                  >
                    <option value="CONSORTIUM">All Consortium Members</option>
                    <option value="LEAD_ONLY">Lead Institution Only</option>
                    <option value="GOVERNMENT_ONLY">Government Reviewers Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Resources / Hardware Details</label>
                <input
                  type="text"
                  value={contribResources}
                  onChange={(e) => setContribResources(e.target.value)}
                  placeholder="e.g. 5x Water Spectrometers, 20 hrs cloud GPU"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowContributionModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Registering..." : "Commit Contribution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Verify Contribution Modal (Government Reviewer) */}
      {showVerifyModal && selectedContribForVerify && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-700" />
                Government Contribution Review
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleVerifyContribution} className="space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <p className="text-xs font-bold text-stone-900">{selectedContribForVerify.title}</p>
                <p className="text-xs text-stone-700">{selectedContribForVerify.description}</p>
                {selectedContribForVerify.monetary_value && (
                  <p className="text-xs font-semibold text-emerald-700">
                    Valuation: ₹{Number(selectedContribForVerify.monetary_value).toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Verification Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyStatus("APPROVED")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      verifyStatus === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-500/40"
                        : "bg-stone-100 text-stone-500 border-stone-200"
                    }`}
                  >
                    Approve Contribution
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyStatus("REJECTED")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      verifyStatus === "REJECTED"
                        ? "bg-red-50 text-red-700 border-red-500/40"
                        : "bg-stone-100 text-stone-500 border-stone-200"
                    }`}
                  >
                    Reject / Flag
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Official Review Remarks</label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Notes on equipment readiness, co-financing terms, or justification..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-stone-900 ${
                    verifyStatus === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {actionLoading ? "Submitting..." : `Confirm ${verifyStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Post Update or Blocker Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">Post Update or Report Blocker</h3>
              <button onClick={() => setShowUpdateModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handlePostUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Update Severity</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateType("PROGRESS")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      updateType === "PROGRESS"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-500/40"
                        : "bg-stone-100 text-stone-500 border-stone-200"
                    }`}
                  >
                    Normal Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType("BLOCKER")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      updateType === "BLOCKER"
                        ? "bg-red-50 text-red-700 border-red-500/40"
                        : "bg-stone-100 text-stone-500 border-stone-200"
                    }`}
                  >
                    🚨 Emergency Blocker
                  </button>
                </div>
              </div>

              {updateType === "BLOCKER" && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
                  Warning: Posting a blocker will immediately halt the project and set status to BLOCKED until resolved by government review.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Summary Headline</label>
                <input
                  type="text"
                  required
                  value={updateSummary}
                  onChange={(e) => setUpdateSummary(e.target.value)}
                  placeholder={updateType === "BLOCKER" ? "e.g. Pump power inverter circuit breakdown" : "e.g. First 5 pilot sites surveyed"}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Details & Technical Context</label>
                <textarea
                  rows={3}
                  value={updateDetails}
                  onChange={(e) => setUpdateDetails(e.target.value)}
                  placeholder="Provide supporting logs, voltage readings, or schedule adjustments..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-stone-900 ${
                    updateType === "BLOCKER" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {actionLoading ? "Posting..." : updateType === "BLOCKER" ? "Report Blocker" : "Post Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PHASE 4: LIFECYCLE MODALS */}
      {/* ============================================================ */}

      {/* 9. Prototype Modal */}
      {showProtoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-teal-600" />
                Record Prototype Specifications
              </h3>
              <button onClick={() => setShowProtoModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleRecordPrototype} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Architecture & Engineering Description</label>
                <textarea
                  required
                  rows={3}
                  value={protoDesc}
                  onChange={(e) => setProtoDesc(e.target.value)}
                  placeholder="Describe hardware/software engineering design, micro-controller schematics, algorithms..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Version / Revision</label>
                  <input
                    type="text"
                    value={protoVersion}
                    onChange={(e) => setProtoVersion(e.target.value)}
                    placeholder="e.g. 1.0.0"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Maturity Stage</label>
                  <select
                    value={protoStage}
                    onChange={(e) => setProtoStage(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  >
                    <option value="concept_model">Concept / Simulation</option>
                    <option value="working_prototype">Working Prototype</option>
                    <option value="lab_validated">Lab Validated</option>
                    <option value="pilot_ready">Pilot Ready</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Technical Specifications</label>
                <textarea
                  rows={2}
                  value={protoSpecs}
                  onChange={(e) => setProtoSpecs(e.target.value)}
                  placeholder="Flow rate: 1000L/hr, Sensor accuracy: 99.2%, Power: Solar 24V DC..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Resource Needs (comma-separated)</label>
                <input
                  type="text"
                  value={protoNeeds}
                  onChange={(e) => setProtoNeeds(e.target.value)}
                  placeholder="Sensors, 3D printing, Cloud GPU compute, Fabrication lab"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowProtoModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Saving..." : "Save Prototype Specs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Test Validation Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-700" />
                Record Testing & Validation Protocol
              </h3>
              <button onClick={() => setShowTestModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleRecordTestValidation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Test Plan / Protocol Name</label>
                <input
                  type="text"
                  required
                  value={testPlan}
                  onChange={(e) => setTestPlan(e.target.value)}
                  placeholder="e.g. Total Dissolved Solids & Pathogen Assay Verification"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Test Environment</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  >
                    <option value="LAB_BENCH_TEST">Lab Bench Test</option>
                    <option value="FIELD_STRESS_TEST">Field Stress Test</option>
                    <option value="ENVIRONMENTAL_SIMULATION">Environmental Simulation</option>
                    <option value="SAFETY_COMPLIANCE">Safety & Regulatory Compliance</option>
                    <option value="USER_ACCEPTANCE">User Acceptance Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Testing Facility / Lab</label>
                  <input
                    type="text"
                    value={testLab}
                    onChange={(e) => setTestLab(e.target.value)}
                    placeholder="e.g. NABL Accredited Water Lab"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Responsible Tester / Lab Lead</label>
                <input
                  type="text"
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                  placeholder={user?.name || "Tester Name"}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Expected Standard / Result</label>
                <input
                  type="text"
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  placeholder="e.g. Turbidity < 1 NTU, E. coli undetectable"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Observed Results</label>
                <textarea
                  required
                  rows={2}
                  value={observedResults}
                  onChange={(e) => setObservedResults(e.target.value)}
                  placeholder="e.g. Turbidity measured 0.8 NTU across 10 trials. Filter efficiency verified."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Validation Outcome</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-emerald-700 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="testPassed"
                      checked={testPassed === true}
                      onChange={() => setTestPassed(true)}
                    />
                    PASS (Validation Criteria Satisfied)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-red-400 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="testPassed"
                      checked={testPassed === false}
                      onChange={() => setTestPassed(false)}
                    />
                    FAIL (Creates Project Blocker)
                  </label>
                </div>
              </div>

              {!testPassed && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Issues Identified (comma-separated)</label>
                    <input
                      type="text"
                      value={testIssues}
                      onChange={(e) => setTestIssues(e.target.value)}
                      placeholder="e.g. High pressure leak, membrane seal degradation"
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Corrective Action Plan</label>
                    <textarea
                      rows={2}
                      value={correctiveAction}
                      onChange={(e) => setCorrectiveAction(e.target.value)}
                      placeholder="e.g. Replace silicone O-ring with viton gasket and retest at 4 bar"
                      className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Logging..." : "Record Test Validation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Pilot Deployment Modal */}
      {showPilotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600" />
                Initiate Pilot Deployment & Monitoring
              </h3>
              <button onClick={() => setShowPilotModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleRecordPilotDeployment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Pilot Field Location / Community</label>
                <input
                  type="text"
                  required
                  value={pilotLocation}
                  onChange={(e) => setPilotLocation(e.target.value)}
                  placeholder="e.g. Kanke Primary Health Centre & Surrounding Hamlet"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">District</label>
                  <input
                    type="text"
                    value={pilotDistrict}
                    onChange={(e) => setPilotDistrict(e.target.value)}
                    placeholder={project.challenge?.district || "Ranchi"}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Implementing Organization</label>
                  <input
                    type="text"
                    value={pilotOrg}
                    onChange={(e) => setPilotOrg(e.target.value)}
                    placeholder="e.g. NIT Jamshedpur Clean Energy Lab"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pilot Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={pilotDuration}
                    onChange={(e) => setPilotDuration(Number(e.target.value))}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Target Beneficiary Cohort Size</label>
                  <input
                    type="number"
                    min={1}
                    value={pilotCohort}
                    onChange={(e) => setPilotCohort(Number(e.target.value))}
                    placeholder="e.g. 250"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Pilot Objectives (comma-separated)</label>
                <input
                  type="text"
                  value={pilotObjectives}
                  onChange={(e) => setPilotObjectives(e.target.value)}
                  placeholder="Daily water throughput, filter replacement cycle, community satisfaction"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Beneficiary & Stakeholder Feedback</label>
                <textarea
                  rows={2}
                  value={pilotFeedback}
                  onChange={(e) => setPilotFeedback(e.target.value)}
                  placeholder="Record community reception, local PRI endorsement, daily reliability logs..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowPilotModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Deploying..." : "Record Pilot Deployment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Final Deployment Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-700" />
                Record Final Deployment & Handover
              </h3>
              <button onClick={() => setShowDeployModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleRecordFinalDeployment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Deployment Location</label>
                <input
                  type="text"
                  required
                  value={deployLocation}
                  onChange={(e) => setDeployLocation(e.target.value)}
                  placeholder="e.g. Kanke Rural Water Supply Pumping Station, Ranchi"
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Handover Recipient Entity</label>
                  <input
                    type="text"
                    required
                    value={handoverEntity}
                    onChange={(e) => setHandoverEntity(e.target.value)}
                    placeholder="e.g. Drinking Water & Sanitation Dept"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Designated Officer / Contact</label>
                  <input
                    type="text"
                    required
                    value={handoverRecipient}
                    onChange={(e) => setHandoverRecipient(e.target.value)}
                    placeholder="e.g. Executive Engineer, DWSD"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Operational Status</label>
                  <select
                    value={opStatus}
                    onChange={(e) => setOpStatus(e.target.value)}
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  >
                    <option value="OPERATIONAL_HANDED_OVER">Operational & Handed Over</option>
                    <option value="COMMISSIONED">Commissioned (Active Service)</option>
                    <option value="STAGED_FOR_GOV">Staged for Government Integration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Implementation Org</label>
                  <input
                    type="text"
                    value={deployOrg}
                    onChange={(e) => setDeployOrg(e.target.value)}
                    placeholder="e.g. NIT Jamshedpur / Tata Steel Consortium"
                    className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Sustainment & Maintenance Plan</label>
                <textarea
                  rows={2}
                  value={maintPlan}
                  onChange={(e) => setMaintPlan(e.target.value)}
                  placeholder="Outline preventive maintenance schedule, spare parts vendor, warranty terms..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-stone-200 text-xs">
                <label className="flex items-center gap-2 text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deployChecklist}
                    onChange={(e) => setDeployChecklist(e.target.checked)}
                    className="rounded border-stone-200 text-purple-600"
                  />
                  <span>Readiness checklist verified (safety, operational testing, documentation complete)</span>
                </label>
                <label className="flex items-center gap-2 text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trainingDone}
                    onChange={(e) => setTrainingDone(e.target.checked)}
                    className="rounded border-stone-200 text-purple-600"
                  />
                  <span>Recipient department staff training successfully conducted</span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Recording..." : "Record Handover & Deployment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. Transition Stage Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-emerald-700" />
                Transition Lifecycle Stage
              </h3>
              <button onClick={() => setShowTransitionModal(false)} className="text-stone-500 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleTransitionStage} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Target Lifecycle Stage</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="PROTOTYPE_DEVELOPMENT">Prototype Development</option>
                  <option value="TESTING">Testing & Validation</option>
                  <option value="PILOT">Pilot Deployment</option>
                  <option value="DEPLOYMENT">Deployment & Handover</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Transitions enforce prerequisite lifecycle evidence (e.g. testing requires prototype; pilot requires passing test).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Review & Stage Approval Notes</label>
                <textarea
                  rows={3}
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="Record rationale, lead mentor approval notes, or government sign-off details..."
                  className="w-full bg-stone-100 border border-stone-200 rounded-lg p-2 text-sm text-stone-900"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowTransitionModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Transitioning..." : "Approve Stage Transition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
