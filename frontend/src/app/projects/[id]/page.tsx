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

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { user, token, loading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!token && !!user;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "milestones" | "tasks" | "deliverables" | "updates" | "governance" | "academic" | "contributions" | "outcomes">("overview");
  const [innovationOutcomes, setInnovationOutcomes] = useState<ProjectInnovationOutcome[]>([]);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showVerifyOutcomeModal, setShowVerifyOutcomeModal] = useState(false);
  const [selectedOutcomeForVerify, setSelectedOutcomeForVerify] = useState<ProjectInnovationOutcome | null>(null);

  // Outcome Form States
  const [outcomeType, setOutcomeType] = useState<"PATENT" | "PATENT_APPLICATION" | "IP_GENERATED" | "STARTUP_CREATED" | "INNOVATION_OUTCOME" | "TECHNOLOGY_TRANSFER">("PATENT");
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [outcomeDesc, setOutcomeDesc] = useState("");
  const [outcomeRefNumber, setOutcomeRefNumber] = useState("");
  const [outcomeOrgId, setOutcomeOrgId] = useState("");

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchProject();
      fetchInnovationOutcomes();
    }
  }, [isAuthenticated, fetchProject, fetchInnovationOutcomes]);


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

  // User role checking
  const isGovOrAdmin = user?.role === "GOVERNMENT_OFFICER" || user?.role === "GOVERNMENT_ADMIN" || user?.role === "PLATFORM_ADMIN";
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
      await fetchInnovationOutcomes();
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
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><Activity className="w-3.5 h-3.5 mr-1" /> Active Execution</span>;
      case "BLOCKED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Project Blocked</span>;
      case "KICKOFF_PENDING":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"><Clock className="w-3.5 h-3.5 mr-1" /> Kickoff Review Pending</span>;
      case "KICKOFF_REVISION":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30"><AlertCircle className="w-3.5 h-3.5 mr-1" /> Kickoff Revision Required</span>;
      case "COMPLETED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Execution Completed</span>;
      case "IMPACT_VERIFIED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30"><Shield className="w-3.5 h-3.5 mr-1" /> Impact Verified</span>;
      case "TERMINATED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-zinc-600/30 text-zinc-400 border border-zinc-600/50"><Ban className="w-3.5 h-3.5 mr-1" /> Terminated</span>;
      case "INITIATED":
      case "PROPOSED":
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/50"><Clock className="w-3.5 h-3.5 mr-1" /> Kickoff Preparation</span>;
    }
  };

  const getMilestoneBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Lock className="w-3 h-3 mr-1" /> Approved & Locked</span>;
      case "REVIEW_REQUESTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30"><Lock className="w-3 h-3 mr-1" /> Under Review (Locked)</span>;
      case "REVISION_REQUIRED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30"><Unlock className="w-3 h-3 mr-1" /> Revision Required</span>;
      case "IN_PROGRESS":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30"><Activity className="w-3 h-3 mr-1" /> In Progress</span>;
      case "PENDING":
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/40"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
    }
  };

  if (authLoading || (loading && !project && !error)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Loading Project Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-slate-400 mb-6 text-center max-w-md">Please sign in to access the collaborative project workspace.</p>
        <Link href="/login" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-medium rounded-lg transition">Sign In</Link>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
        <AlertTriangle className="w-14 h-14 text-red-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied or Not Found</h2>
        <p className="text-slate-400 mb-6 max-w-md text-center">{error || "Unable to access the requested project."}</p>
        <Link href="/my-eois" className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">Back to My Projects</Link>
      </div>
    );
  }

  // Active blockers list
  const activeBlockers = project.updates.filter(
    (u) => u.update_type === "BLOCKER" && u.blocker_status === "OPEN"
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                <Link href="/my-eois" className="hover:text-emerald-400 flex items-center transition">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Consortium Dashboard
                </Link>
                <span>/</span>
                <span className="text-slate-500">Project Workspace</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{project.title}</h1>
                {getStatusBadge(project.status)}
              </div>
            </div>

            {/* Global Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Kickoff button */}
              {(project.status === "INITIATED" || project.status === "PROPOSED" || project.status === "KICKOFF_REVISION") && isLead && (
                <button
                  onClick={() => setShowKickoffModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center transition"
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
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-lg flex items-center transition"
                >
                  <Upload className="w-4 h-4 mr-1.5 text-blue-400" />
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
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-lg flex items-center transition"
                >
                  <Activity className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Post Update / Blocker
                </button>
              )}
            </div>
          </div>

          {/* Blocked Emergency Alert Banner */}
          {project.status === "BLOCKED" && (
            <div className="mt-4 p-4 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 flex items-start space-x-3 shadow-lg animate-pulse">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-300 text-sm">Critical Blocker Declared — Project On Hold</h4>
                {activeBlockers.map((b) => (
                  <p key={b.id} className="text-xs text-red-200/90 mt-1">
                    <span className="font-semibold">{b.summary}</span>: {b.details || "Awaiting government review and resolution."}
                  </p>
                ))}
                <p className="text-xs text-red-300/70 mt-2">All milestone completions and deliverable submissions are suspended until resolved by government officers.</p>
              </div>
            </div>
          )}

          {/* Phase 8 Impact Verification Banner */}
          {project.status === "COMPLETED" && (
            <div className="mt-4 p-4 rounded-xl bg-purple-950/70 border border-purple-800/80 text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-purple-200 text-sm">Project Execution Completed — Impact Verification Ready</h4>
                  <p className="text-xs text-purple-300/80 mt-0.5">Consortium milestones are complete. Initiate the Impact Assessment to report real-world outcomes and obtain official government impact verification.</p>
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
            <div className="mt-4 p-4 rounded-xl bg-orange-950/60 border border-orange-800/70 text-orange-200 flex items-start space-x-3 shadow-md">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-300 text-sm">Kickoff Plan Revision Requested by Government</h4>
                <p className="text-xs text-orange-200/90 mt-1">
                  Please review the reviewer comments in the Governance tab, adjust objectives or milestones, and resubmit the kickoff plan.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 mt-6 border-b border-slate-800 overflow-x-auto text-sm">
            {[
              { id: "overview", label: "Overview & Roster", icon: Building2 },
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
                      ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Project Statement */}
              <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-200 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-emerald-400" />
                  Project Mandate & Scope
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {project.description || "No general description provided."}
                </p>

                <div className="border-t border-slate-800/80 pt-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objectives</h4>
                    <p className="text-sm text-slate-300 mt-1">{project.objectives || "Pending kickoff formulation."}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expected Outcomes</h4>
                    <p className="text-sm text-slate-300 mt-1">{project.expected_outcomes || "Pending kickoff formulation."}</p>
                  </div>
                </div>

                {project.challenge && (
                  <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Associated Citizen Problem:</span>
                    <Link
                      href={`/challenges/${project.challenge.id}`}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center font-medium"
                    >
                      {project.challenge.title} <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Key Timeline Info */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-slate-200 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                  Timeline & Budget
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Kickoff / Start Date</span>
                    <span className="font-medium text-slate-200">{formatDateSafe(project.start_date)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Target Completion</span>
                    <span className="font-medium text-slate-200">{formatDateSafe(project.target_completion_date)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Actual Completion</span>
                    <span className="font-medium text-slate-200">{formatDateSafe(project.actual_completion_date)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Total Milestones</span>
                    <span className="font-semibold text-emerald-400">{project.milestones.length} Defined</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Consortium Roster */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-semibold text-slate-200 flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-400" />
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
                          ? "bg-emerald-950/20 border-emerald-800/40"
                          : "bg-slate-800/40 border-slate-700/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white">{p.organization?.name || "Participant Org"}</span>
                            {isLeadPartner && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                CONSORTIUM LEAD
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Type: {p.organization?.organization_type || "Institution"} • Joined: {formatDateSafe(p.joined_at)}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
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
                <h3 className="text-base font-semibold text-slate-200">Execution Milestones & Cascading Locking</h3>
                <p className="text-xs text-slate-400">Milestones progress sequentially. Once submitted for review, deliverables and tasks freeze.</p>
              </div>
              {isLead && (project.status === "ACTIVE" || project.status === "INITIATED" || project.status === "KICKOFF_REVISION") && (
                <button
                  onClick={() => setShowMilestoneModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center transition"
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
                        ? "bg-slate-900/60 border-emerald-800/40"
                        : m.status === "IN_PROGRESS"
                        ? "bg-blue-950/20 border-blue-800/40 shadow-sm"
                        : m.status === "REVIEW_REQUESTED"
                        ? "bg-amber-950/20 border-amber-800/40"
                        : "bg-slate-900/40 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {m.order_index}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-slate-100 text-sm">{m.title}</h4>
                            {getMilestoneBadge(m.status)}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{m.description || "No description provided."}</p>
                          <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-500">
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
                          <span className="text-xs text-slate-500 italic flex items-center">
                            <Lock className="w-3 h-3 mr-1 text-slate-500" /> Read-Only
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
                <h3 className="text-base font-semibold text-slate-200">Consortium Task Board</h3>
                <p className="text-xs text-slate-400">Manage deliverables and workflow execution items across milestone schedules.</p>
              </div>
              {project.status === "ACTIVE" && (
                <button
                  onClick={() => {
                    const activeM = project.milestones.find((m) => m.status === "IN_PROGRESS") || project.milestones[0];
                    setTaskMilestoneId(activeM?.id || "");
                    setShowTaskModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center transition"
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
                  <div key={colStatus} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        {colStatus === "TODO" ? "To Do" : colStatus === "IN_PROGRESS" ? "In Progress" : "Completed"}
                      </h4>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400 font-semibold">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-600 italic">No tasks in this stage</div>
                      ) : (
                        colTasks.map((t) => {
                          const isMilestoneLocked = t.milestoneRef.status === "REVIEW_REQUESTED" || t.milestoneRef.status === "APPROVED";
                          return (
                            <div key={t.id} className="p-3.5 rounded-lg bg-slate-850 border border-slate-800 space-y-2 shadow-sm">
                              <div className="flex items-start justify-between">
                                <h5 className="text-xs font-semibold text-slate-200">{t.title}</h5>
                                {isMilestoneLocked && (
                                  <span title="Milestone locked">
                                    <Lock className="w-3 h-3 text-slate-500" />
                                  </span>
                                )}
                              </div>
                              {t.description && <p className="text-[11px] text-slate-400">{t.description}</p>}
                              <div className="text-[10px] text-slate-500 font-medium">
                                Milestone: {t.milestoneRef.title}
                              </div>

                              {/* Status Advancement if not locked */}
                              {!isMilestoneLocked && project.status === "ACTIVE" && (
                                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                                  {colStatus !== "TODO" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(t.id, "TODO")}
                                      className="text-[10px] text-slate-400 hover:text-slate-200"
                                    >
                                      ← To Do
                                    </button>
                                  )}
                                  {colStatus !== "IN_PROGRESS" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(t.id, "IN_PROGRESS")}
                                      className="text-[10px] text-blue-400 hover:text-blue-300"
                                    >
                                      In Progress
                                    </button>
                                  )}
                                  {colStatus !== "DONE" && (
                                    <button
                                      onClick={() => handleUpdateTaskStatus(t.id, "DONE")}
                                      className="text-[10px] text-emerald-400 hover:text-emerald-300"
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
                <h3 className="text-base font-semibold text-slate-200">Isolated Deliverables Vault</h3>
                <p className="text-xs text-slate-400">Formal project outputs, test data, prototype specifications, and certificates strictly quarantined from capability records.</p>
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
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
                <FileCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">No deliverables uploaded yet.</p>
                <p className="text-xs text-slate-500 mt-1">Formal project artifacts must be uploaded prior to final project completion.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.deliverables.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between space-x-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-blue-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-200 text-sm">{d.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {d.document_type}
                          </span>
                        </div>
                        {d.description && <p className="text-xs text-slate-400 mt-1">{d.description}</p>}
                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2">
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
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
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
                <h3 className="text-base font-semibold text-slate-200">Activity Log & Emergency Blockers</h3>
                <p className="text-xs text-slate-400">Log routine execution progress or declare critical roadblocks that warrant government intervention.</p>
              </div>
              {project.status !== "TERMINATED" && project.status !== "COMPLETED" && (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Post Update / Blocker
                </button>
              )}
            </div>

            {project.updates.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
                <Activity className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No project updates posted yet.</p>
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
                            ? "bg-red-950/30 border-red-800/50"
                            : "bg-slate-900/60 border-slate-700/60"
                          : "bg-slate-900/50 border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isBlocker
                                ? u.blocker_status === "OPEN"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-slate-800 text-slate-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {isBlocker ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-slate-200 text-sm">{u.summary}</h4>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isBlocker
                                    ? u.blocker_status === "OPEN"
                                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-emerald-500/10 text-emerald-400"
                                }`}
                              >
                                {isBlocker ? `BLOCKER (${u.blocker_status})` : "PROGRESS UPDATE"}
                              </span>
                            </div>
                            {u.details && <p className="text-xs text-slate-300 mt-1 whitespace-pre-line">{u.details}</p>}
                            <div className="text-[11px] text-slate-500 mt-2">
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
              <h3 className="text-base font-semibold text-slate-200">Official Government Review Trail</h3>
              <p className="text-xs text-slate-400">Formal decisions, review sign-offs, milestone approvals, and completion certifications.</p>
            </div>

            {project.reviews.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
                <Shield className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No government review actions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-200 text-sm">{r.action}</span>
                        <span className="text-xs text-slate-500">• {formatDateSafe(r.created_at)}</span>
                      </div>
                      {r.comments && <p className="text-xs text-slate-300 mt-1">{r.comments}</p>}
                      <div className="text-[11px] text-slate-500 mt-1.5">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  Academic Collaboration & Faculty Mentorship
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multidisciplinary student researchers, faculty mentors, and academic coordinators assigned from participating HEIs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAcadOrgId(project.participants[0]?.organization_id || "");
                  setShowAcademicModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Academic Member</span>
              </button>
            </div>

            {academicMembers.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 border border-slate-800 rounded-xl">
                <GraduationCap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-medium text-sm">No academic members assigned yet</p>
                <p className="text-slate-500 text-xs mt-1">
                  Participating universities and colleges can assign student researchers and faculty guides.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {academicMembers.map((am) => (
                  <div
                    key={am.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          am.role === "FACULTY_MENTOR"
                            ? "bg-purple-900/40 text-purple-300 border border-purple-800"
                            : am.role === "ACADEMIC_COORDINATOR"
                            ? "bg-blue-900/40 text-blue-300 border border-blue-800"
                            : "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
                        }`}>
                          {am.role.replace(/_/g, " ")}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">
                          {am.user?.name || "Academic Member"}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {am.organization?.name || "Participating HEI"}
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {am.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1 pt-1 border-t border-slate-800/80">
                      {am.department && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Department:</span>
                          <span className="font-medium">{am.department}</span>
                        </div>
                      )}
                      {am.degree_program && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Program:</span>
                          <span className="font-medium">{am.degree_program} {am.student_year ? `(Year ${am.student_year})` : ""}</span>
                        </div>
                      )}
                      {am.weekly_commitment_hours && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Commitment:</span>
                          <span className="font-medium">{am.weekly_commitment_hours} hrs/week</span>
                        </div>
                      )}
                    </div>

                    {am.specialization_skills && am.specialization_skills.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1">
                        {am.specialization_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Innovation, IP & Technology Outcomes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patents filed, proprietary IP generated, startups created, and technology transfer achievements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOutcomeOrgId(project.participants[0]?.organization_id || "");
                  setShowOutcomeModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Innovation Outcome</span>
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs text-slate-400">Total Recorded</div>
                <div className="text-xl font-bold text-white mt-1">{innovationOutcomes.length}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs text-slate-400">Gov Verified</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {innovationOutcomes.filter((o) => o.status === "VERIFIED").length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40">
                <div className="text-xs text-purple-300">Patents / Applications</div>
                <div className="text-xl font-bold text-purple-300 mt-1">
                  {innovationOutcomes.filter((o) => o.outcome_type === "PATENT" || o.outcome_type === "PATENT_APPLICATION").length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40">
                <div className="text-xs text-blue-300">Startups & Tech Transfer</div>
                <div className="text-xl font-bold text-blue-300 mt-1">
                  {innovationOutcomes.filter((o) => o.outcome_type === "STARTUP_CREATED" || o.outcome_type === "TECHNOLOGY_TRANSFER").length}
                </div>
              </div>
            </div>

            {innovationOutcomes.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 border border-slate-800 rounded-xl">
                <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-medium text-sm">No innovation outcomes recorded yet</p>
                <p className="text-slate-500 text-xs mt-1">
                  Consortium members can register patents, generated IP, and incubated startups emerging from this project.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {innovationOutcomes.map((o) => (
                  <div
                    key={o.id}
                    className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-900/40 text-purple-300 border border-purple-700/50">
                            {o.outcome_type.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.status === "VERIFIED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : o.status === "REJECTED"
                              ? "bg-red-950 text-red-400 border border-red-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}>
                            {o.status}
                          </span>
                          {o.reference_number && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              Ref: {o.reference_number}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-white mt-1.5">{o.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{o.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                          {o.organization?.name && (
                            <span>Institution / Org: <strong className="text-slate-300">{o.organization.name}</strong></span>
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-sm"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Verify Outcome
                          </button>
                        )}
                      </div>
                    </div>

                    {o.verification_notes && (
                      <div className="p-2.5 bg-slate-800/40 rounded-lg text-xs text-slate-400 border border-slate-700/40">
                        <span className="font-semibold text-slate-300">Gov Verification Notes: </span>
                        {o.verification_notes}
                        {o.verified_at && <span className="text-slate-500 ml-2">• {formatDateSafe(o.verified_at)}</span>}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  Industry & Ecosystem Contributions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mentorship, co-financing, technical equipment, testing facilities, and technology transfer commitments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContribOrgId(project.participants[0]?.organization_id || "");
                  setShowContributionModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Contribution</span>
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs text-slate-400">Total Commitments</div>
                <div className="text-xl font-bold text-white mt-1">{contributions.length}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-xs text-slate-400">Gov Verified & Approved</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {contributions.filter((c) => c.status === "APPROVED").length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                <div className="text-xs text-emerald-300">Total Monetized Valuation</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  ₹{contributions
                    .filter((c) => c.status === "APPROVED")
                    .reduce((sum, c) => sum + Number(c.monetary_value || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>

            {contributions.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 border border-slate-800 rounded-xl">
                <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-medium text-sm">No contributions registered yet</p>
                <p className="text-slate-500 text-xs mt-1">
                  Consortium partners and industry sponsors can commit mentorship, capital, and technical tools.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contributions.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {c.contribution_type.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === "APPROVED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : c.status === "REJECTED"
                              ? "bg-red-950 text-red-400 border border-red-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}>
                            {c.status}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Visibility: {c.visibility}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1.5">{c.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{c.description}</p>
                      </div>

                      <div className="text-right sm:self-start">
                        {c.monetary_value ? (
                          <div className="text-sm font-bold text-emerald-400">
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
                      <div className="p-2.5 bg-slate-800/60 rounded-lg text-xs text-slate-300 border border-slate-700/60">
                        <span className="font-semibold text-slate-400">Equipment / Resources: </span>
                        {c.resources_provided}
                      </div>
                    )}

                    {c.verification_notes && (
                      <div className="p-2.5 bg-slate-800/40 rounded-lg text-xs text-slate-400 border border-slate-700/40">
                        <span className="font-semibold text-slate-300">Gov Verification Notes: </span>
                        {c.verification_notes}
                        {c.verified_at && <span className="text-slate-500 ml-2">• {formatDateSafe(c.verified_at)}</span>}
                      </div>
                    )}
                  </div>
                ))}
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white">Record Innovation / IP Outcome</h3>
              <button onClick={() => setShowOutcomeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleCreateOutcome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Outcome Category</label>
                <select
                  value={outcomeType}
                  onChange={(e: any) => setOutcomeType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title / Identification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Solar Filtration Nano-Membrane Patent Application"
                  value={outcomeTitle}
                  onChange={(e) => setOutcomeTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reference / Filing / Incorporation Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Indian Patent App No. 202611099238 or CIN U72200JH2026PTC019"
                  value={outcomeRefNumber}
                  onChange={(e) => setOutcomeRefNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Technical Description & Provenance</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe technical specification, patent claim summary, startup business model, or transfer agreement terms..."
                  value={outcomeDesc}
                  onChange={(e) => setOutcomeDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                />
              </div>

              {project.participants.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Originating Consortium Organization</label>
                  <select
                    value={outcomeOrgId}
                    onChange={(e) => setOutcomeOrgId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                  >
                    {project.participants.map((p) => (
                      <option key={p.organization_id} value={p.organization_id}>
                        {p.organization?.name || "Participant Org"} ({p.participant_role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center"
                >
                  {actionLoading ? "Recording..." : "Record Outcome"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outcome Verification Modal */}
      {showVerifyOutcomeModal && selectedOutcomeForVerify && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Verify Innovation Outcome</h3>
              <button onClick={() => setShowVerifyOutcomeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-slate-300">
              <div className="font-bold text-white text-sm">{selectedOutcomeForVerify.title}</div>
              <div className="text-slate-400 mt-1">Type: {selectedOutcomeForVerify.outcome_type}</div>
            </div>
            <form onSubmit={handleVerifyOutcome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Verification Decision</label>
                <select
                  value={verifyOutcomeStatus}
                  onChange={(e: any) => setVerifyOutcomeStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                >
                  <option value="VERIFIED">VERIFIED (Confirm Authentic Real-World Outcome)</option>
                  <option value="REJECTED">REJECTED (Insufficient or Invalid Submission)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Reference / Patent / Registration #</label>
                <input
                  type="text"
                  placeholder="Confirm or provide official filing/patent number"
                  value={verifyOutcomeRefNumber}
                  onChange={(e) => setVerifyOutcomeRefNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reviewer Verification Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add evaluation findings, patent registry check, or governance remarks..."
                  value={verifyOutcomeNotes}
                  onChange={(e) => setVerifyOutcomeNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVerifyOutcomeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white">Formulate Project Kickoff Plan</h3>
              <button onClick={() => setShowKickoffModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleSubmitKickoff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Specific Execution Objectives</label>
                <textarea
                  required
                  rows={3}
                  value={kickoffObjectives}
                  onChange={(e) => setKickoffObjectives(e.target.value)}
                  placeholder="Detail primary technical and real-world implementation goals..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Deliverables & Impact Outcomes</label>
                <textarea
                  required
                  rows={3}
                  value={kickoffOutcomes}
                  onChange={(e) => setKickoffOutcomes(e.target.value)}
                  placeholder="Measurable outcomes (e.g. 10,000L/day filtered water, 5 villages covered)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  required
                  value={kickoffTargetDate}
                  onChange={(e) => setKickoffTargetDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowKickoffModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create New Milestone</h3>
              <button onClick={() => setShowMilestoneModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Milestone 3: Field Calibration"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Summary of objectives for this milestone stage..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={milestoneDueDate}
                  onChange={(e) => setMilestoneDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create Task</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Milestone</label>
                <select
                  required
                  value={taskMilestoneId}
                  onChange={(e) => setTaskMilestoneId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                >
                  {project.milestones.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.status === "REVIEW_REQUESTED" || m.status === "APPROVED"}>
                      {m.title} {m.status === "APPROVED" ? "(Locked - Approved)" : m.status === "REVIEW_REQUESTED" ? "(Locked - Under Review)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Assemble solar battery rack"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task steps and technical specifications..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Participant</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                >
                  <option value="">Unassigned</option>
                  {project.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.organization?.name} ({p.participant_role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Upload Project Deliverable</h3>
              <button onClick={() => setShowDeliverableModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleUploadDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Associated Milestone</label>
                <select
                  value={delivMilestoneId}
                  onChange={(e) => setDelivMilestoneId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Document Type</label>
                <select
                  value={delivDocType}
                  onChange={(e) => setDelivDocType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                >
                  <option value="REPORT">Official Progress / Impact Report</option>
                  <option value="PROTOTYPE_SPEC">Prototype Specification & Blueprint</option>
                  <option value="FIELD_PHOTO">Field Implementation Photo</option>
                  <option value="CERTIFICATION">Quality / Lab Certification</option>
                  <option value="OTHER">Other Supporting Output</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={delivTitle}
                  onChange={(e) => setDelivTitle(e.target.value)}
                  placeholder="e.g. Water Quality Test Verification Certificate"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">File Attachment (Max 50MB)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDelivFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeliverableModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                Assign Academic Team Member
              </h3>
              <button onClick={() => setShowAcademicModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleAddAcademicMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Participating Organization</label>
                <select
                  required
                  value={acadOrgId}
                  onChange={(e) => setAcadOrgId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">User / Student User ID</label>
                <input
                  type="text"
                  required
                  value={acadUserId}
                  onChange={(e) => setAcadUserId(e.target.value)}
                  placeholder="UUID of registered institutional user"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Role</label>
                <select
                  value={acadRole}
                  onChange={(e) => setAcadRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                >
                  <option value="STUDENT_RESEARCHER">Student Researcher</option>
                  <option value="FACULTY_MENTOR">Faculty Mentor / PI</option>
                  <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={acadDept}
                    onChange={(e) => setAcadDept(e.target.value)}
                    placeholder="e.g. Civil Engineering"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Program</label>
                  <input
                    type="text"
                    value={acadProgram}
                    onChange={(e) => setAcadProgram(e.target.value)}
                    placeholder="e.g. B.Tech / M.Tech"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Year (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={acadYear}
                    onChange={(e) => setAcadYear(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Weekly Commitment (Hrs)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={acadHours}
                    onChange={(e) => setAcadHours(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Specialization Skills (comma separated)</label>
                <input
                  type="text"
                  value={acadSkills}
                  onChange={(e) => setAcadSkills(e.target.value)}
                  placeholder="e.g. GIS, Sensor Calibration, Data Modeling"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAcademicModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                Register Ecosystem Contribution
              </h3>
              <button onClick={() => setShowContributionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleAddContribution} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contributing Organization</label>
                <select
                  required
                  value={contribOrgId}
                  onChange={(e) => setContribOrgId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contribution Type</label>
                <select
                  value={contribType}
                  onChange={(e) => setContribType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Headline Title</label>
                <input
                  type="text"
                  required
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                  placeholder="e.g. IoT Sensor Kits & Cloud Telemetry Access"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  rows={2}
                  required
                  value={contribDesc}
                  onChange={(e) => setContribDesc(e.target.value)}
                  placeholder="Explain the scope and schedule of this contribution..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monetary Value (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={contribValue}
                    onChange={(e) => setContribValue(e.target.value)}
                    placeholder="Optional valuation"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Visibility Scope</label>
                  <select
                    value={contribVisibility}
                    onChange={(e) => setContribVisibility(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                  >
                    <option value="CONSORTIUM">All Consortium Members</option>
                    <option value="LEAD_ONLY">Lead Institution Only</option>
                    <option value="GOVERNMENT_ONLY">Government Reviewers Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resources / Hardware Details</label>
                <input
                  type="text"
                  value={contribResources}
                  onChange={(e) => setContribResources(e.target.value)}
                  placeholder="e.g. 5x Water Spectrometers, 20 hrs cloud GPU"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowContributionModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Government Contribution Review
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handleVerifyContribution} className="space-y-4">
              <div className="p-3 bg-slate-800/60 rounded-xl space-y-1">
                <p className="text-xs font-bold text-white">{selectedContribForVerify.title}</p>
                <p className="text-xs text-slate-300">{selectedContribForVerify.description}</p>
                {selectedContribForVerify.monetary_value && (
                  <p className="text-xs font-semibold text-emerald-400">
                    Valuation: ₹{Number(selectedContribForVerify.monetary_value).toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Verification Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyStatus("APPROVED")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      verifyStatus === "APPROVED"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    Approve Contribution
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyStatus("REJECTED")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      verifyStatus === "REJECTED"
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    Reject / Flag
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Review Remarks</label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Notes on equipment readiness, co-financing terms, or justification..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-white ${
                    verifyStatus === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Post Update or Report Blocker</h3>
              <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs">{actionError}</div>}
            <form onSubmit={handlePostUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Update Severity</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateType("PROGRESS")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      updateType === "PROGRESS"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    Normal Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType("BLOCKER")}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                      updateType === "BLOCKER"
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    🚨 Emergency Blocker
                  </button>
                </div>
              </div>

              {updateType === "BLOCKER" && (
                <div className="p-2.5 bg-red-950/40 border border-red-900 rounded text-[11px] text-red-300">
                  Warning: Posting a blocker will immediately halt the project and set status to BLOCKED until resolved by government review.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Summary Headline</label>
                <input
                  type="text"
                  required
                  value={updateSummary}
                  onChange={(e) => setUpdateSummary(e.target.value)}
                  placeholder={updateType === "BLOCKER" ? "e.g. Pump power inverter circuit breakdown" : "e.g. First 5 pilot sites surveyed"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Details & Technical Context</label>
                <textarea
                  rows={3}
                  value={updateDetails}
                  onChange={(e) => setUpdateDetails(e.target.value)}
                  placeholder="Provide supporting logs, voltage readings, or schedule adjustments..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-white ${
                    updateType === "BLOCKER" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {actionLoading ? "Posting..." : updateType === "BLOCKER" ? "Report Blocker" : "Post Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
