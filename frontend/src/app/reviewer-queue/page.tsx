"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { formatUserRole, formatDateSafe } from "../../lib/utils";
import { ProblemClustersQueue } from "./ProblemClustersQueue";
import { PriUlbVerificationQueue } from "./PriUlbVerificationQueue";
import {
  Landmark,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Users,
  Building2,
  Sparkles,
  MessageSquare,
  Send,
  Layers,
  Check,
  FolderGit2,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle,
  FileCheck2,
  Ban,
  Award,
  Shield,
  TrendingUp,
  Star,
  Download,
  Eye,
  FileCheck,
  RefreshCw,
  Globe,
  Languages,
} from "lucide-react";
import { useTranslation, SUPPORTED_LANGUAGES } from "../../lib/i18n";

interface QueueChallenge {
  id: string;
  title: string;
  description: string;
  district: string;
  districtName?: string;
  blockName?: string | null;
  village_locality?: string | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "VALIDATED" | "REJECTED";
  citizen_severity: string | null;
  affected_population: string | null;
  submitted_at: string;
  evidence?: any[];
  submitter?: { name: string; email?: string };
  districtRef?: { name: string };
  blockRef?: { name: string };
  original_text?: string;
  original_language?: string;
  normalized_text?: string;
  processing_language?: string;
  translation_status?: string;
  translation_metadata?: any;
}

interface ProposedSolutionItem {
  id: string;
  challenge_id: string;
  organization_id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "PUBLISHED" | "COLLABORATION_OPEN" | "CONVERTED_TO_PROJECT" | "REJECTED" | "WITHDRAWN";
  title: string;
  abstract: string;
  proposed_methodology?: string;
  expected_outcomes?: string;
  budget_estimate?: number;
  timeline_months?: number;
  rejection_reason?: string;
  review_notes?: string;
  submitted_at?: string;
  published_at?: string;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    type: string;
    category?: string;
    contact_email?: string;
  };
  challenge?: {
    id: string;
    title: string;
    district: string;
    status: string;
    citizen_severity?: string;
  };
  team_members?: { id: string; role: string; user?: { name: string } }[];
  collaborations?: { id: string; status: string; organization?: { name: string }; collaboration_type: string }[];
}

export default function ReviewerQueuePage() {
  const { user, token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  // Primary Tab: 'clusters' | 'challenges' | 'solutions' | 'projects' | 'impact' | 'innovations' | 'capabilities' | 'pri_ulb'
  const [primaryTab, setPrimaryTab] = useState<
    "clusters" | "challenges" | "solutions" | "projects" | "impact" | "innovations" | "capabilities" | "pri_ulb"
  >("clusters");

  // Sync tab from URL query param if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        ["clusters", "challenges", "solutions", "projects", "impact", "innovations", "capabilities", "pri_ulb"].includes(tabParam)
      ) {
        setPrimaryTab(tabParam as any);
      }
    }
  }, []);

  // Tab 8: Institutional Capability & Evidence Verification State
  const [verificationQueue, setVerificationQueue] = useState<{
    pending_evidence_count: number;
    pending_capabilities_count: number;
    pending_claims_count: number;
    evidence: any[];
    institution_capabilities: any[];
    industry_capabilities: any[];
    claim_requests: any[];
  } | null>(null);
  const [verificationLoading, setVerificationLoading] = useState<boolean>(false);
  const [activeVerificationItem, setActiveVerificationItem] = useState<any | null>(null);
  const [activeVerificationType, setActiveVerificationType] = useState<
    "EVIDENCE" | "INSTITUTION_CAPABILITY" | "INDUSTRY_CAPABILITY" | "ORGANIZATION_CLAIM"
  >("EVIDENCE");
  const [verificationFilter, setVerificationFilter] = useState<
    "ALL" | "EVIDENCE" | "INSTITUTION_CAPABILITY" | "INDUSTRY_CAPABILITY"
  >("ALL");
  const [verificationRejectModal, setVerificationRejectModal] = useState<boolean>(false);
  const [verificationRejectionNotes, setVerificationRejectionNotes] = useState<string>("");
  const [verificationApprovalNotes, setVerificationApprovalNotes] = useState<string>("");

  // Tab 6: Innovation & IP Outcomes Review State (Phase 9.1)
  const [innovationsQueue, setInnovationsQueue] = useState<any[]>([]);
  const [innovationsLoading, setInnovationsLoading] = useState<boolean>(false);
  const [selectedInnovationStatus, setSelectedInnovationStatus] = useState<string>("ALL");
  const [activeInnovation, setActiveInnovation] = useState<any | null>(null);
  const [innovationVerifyModal, setInnovationVerifyModal] = useState<boolean>(false);
  const [innovationDecision, setInnovationDecision] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [innovationVerifyNotes, setInnovationVerifyNotes] = useState<string>("");
  const [innovationVerifyRef, setInnovationVerifyRef] = useState<string>("");

  // Tab 5: Real-World Impact Verification State (Phase 8)
  const [impactQueue, setImpactQueue] = useState<any[]>([]);
  const [impactLoading, setImpactLoading] = useState<boolean>(false);
  const [selectedImpactStatus, setSelectedImpactStatus] = useState<string>("ALL");
  const [activeImpactAssessment, setActiveImpactAssessment] = useState<any | null>(null);
  const [activeImpactProjectDetail, setActiveImpactProjectDetail] = useState<any | null>(null);
  const [impactDetailLoading, setImpactDetailLoading] = useState<boolean>(false);
  const [impactActionModal, setImpactActionModal] = useState<
    "approve" | "revision" | "reject" | "revoke" | null
  >(null);
  const [impactReviewNotes, setImpactReviewNotes] = useState<string>("");
  const [impactRevocationReason, setImpactRevocationReason] = useState<string>("");

  // Tab 4: Collaborative Projects Governance State
  const [projectsQueue, setProjectsQueue] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [selectedProjectStatus, setSelectedProjectStatus] = useState<string>("ALL");
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [projectActionModal, setProjectActionModal] = useState<
    "kickoff" | "milestone" | "blocker" | "complete" | "impact" | "terminate" | null
  >(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>("");
  const [activeBlockerId, setActiveBlockerId] = useState<string>("");
  const [reviewDecision, setReviewDecision] = useState<string>("APPROVE");
  const [reviewComments, setReviewComments] = useState<string>("");
  const [terminationReason, setTerminationReason] = useState<string>("");

  // Tab 1: Challenge Review State
  const [challengesQueue, setChallengesQueue] = useState<QueueChallenge[]>([]);
  const [challengeLoading, setChallengeLoading] = useState<boolean>(true);
  const [selectedChallengeStatus, setSelectedChallengeStatus] = useState<string>("SUBMITTED");
  const [activeChallenge, setActiveChallenge] = useState<QueueChallenge | null>(null);
  const [challengeRejectionReason, setChallengeRejectionReason] = useState<string>("");

  // Multilingual On-Demand Translation State for Reviewer
  const [reviewerTranslating, setReviewerTranslating] = useState<boolean>(false);
  const [activeChallengeTranslation, setActiveChallengeTranslation] = useState<{
    target_language: string;
    translated_title: string;
    translated_description: string;
  } | null>(null);

  const handleReviewerTranslate = async (targetLang: string) => {
    if (!activeChallenge?.id) return;
    if (activeChallengeTranslation && activeChallengeTranslation.target_language === targetLang) {
      setActiveChallengeTranslation(null);
      return;
    }
    setReviewerTranslating(true);
    try {
      const res = await fetch(`${apiUrl}/challenges/${activeChallenge.id}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_language: targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveChallengeTranslation(data);
      }
    } catch {
      // safe fallback
    } finally {
      setReviewerTranslating(false);
    }
  };

  // Tab 3: Proposed Solutions Review State
  const [solutionsQueue, setSolutionsQueue] = useState<ProposedSolutionItem[]>([]);
  const [solutionsLoading, setSolutionsLoading] = useState<boolean>(false);
  const [selectedSolutionStatus, setSelectedSolutionStatus] = useState<string>("SUBMITTED");
  const [activeSolution, setActiveSolution] = useState<ProposedSolutionItem | null>(null);
  const [solutionReviewNotes, setSolutionReviewNotes] = useState<string>("");
  const [solutionActionModal, setSolutionActionModal] = useState<"reject" | null>(null);

  // Action status / feedback
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isReviewer =
    user?.role === "PLATFORM_ADMIN" ||
    user?.role === "GOVERNMENT_OFFICER" ||
    user?.role === "GOVERNMENT_ADMIN";
  const isPlatformAdmin = user?.role === "PLATFORM_ADMIN";

  // Fetch Innovations Queue
  const fetchInnovationsQueue = useCallback(async () => {
    if (!token || !isReviewer) return;
    setInnovationsLoading(true);
    try {
      const url = selectedInnovationStatus && selectedInnovationStatus !== "ALL"
        ? `${apiUrl}/admin/projects/innovation-outcomes/queue?status=${selectedInnovationStatus}`
        : `${apiUrl}/admin/projects/innovation-outcomes/queue`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInnovationsQueue(data);
        if (data.length > 0 && !activeInnovation) {
          setActiveInnovation(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load innovations queue:", err);
    } finally {
      setInnovationsLoading(false);
    }
  }, [apiUrl, isReviewer, selectedInnovationStatus, token, activeInnovation]);

  // Fetch Challenges Queue
  const fetchChallengesQueue = useCallback(async () => {
    if (!token || !isReviewer) {
      setChallengeLoading(false);
      return;
    }
    setChallengeLoading(true);
    try {
      const url = selectedChallengeStatus
        ? `${apiUrl}/challenges/review/queue?status=${selectedChallengeStatus}`
        : `${apiUrl}/challenges/review/queue`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChallengesQueue(data);
        if (data.length > 0 && !activeChallenge) {
          setActiveChallenge(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load challenges queue:", err);
    } finally {
      setChallengeLoading(false);
    }
  }, [apiUrl, isReviewer, selectedChallengeStatus, token, activeChallenge]);

  // Fetch Proposed Solutions Queue (Tab 3)
  const fetchSolutionsQueue = useCallback(async () => {
    if (!token || !isReviewer) return;
    setSolutionsLoading(true);
    try {
      const url = selectedSolutionStatus && selectedSolutionStatus !== "ALL"
        ? `${apiUrl}/admin/solutions?status=${selectedSolutionStatus}`
        : `${apiUrl}/admin/solutions`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSolutionsQueue(data);
        if (data.length > 0) {
          setActiveSolution(data[0]);
        } else {
          setActiveSolution(null);
        }
      }
    } catch (err) {
      console.error("Failed to load solutions queue:", err);
    } finally {
      setSolutionsLoading(false);
    }
  }, [apiUrl, isReviewer, selectedSolutionStatus, token]);



  // Fetch Projects Queue for Tab 4
  const fetchProjectsQueue = useCallback(async () => {
    if (!token || !isReviewer) return;
    setProjectsLoading(true);
    try {
      const url =
        selectedProjectStatus && selectedProjectStatus !== "ALL"
          ? `${apiUrl}/admin/projects?status=${selectedProjectStatus}`
          : `${apiUrl}/admin/projects`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjectsQueue(data);
        if (data.length > 0) {
          setActiveProject((prev: any) => {
            if (!prev) return data[0];
            const found = data.find((p: any) => p.id === prev.id);
            return found || data[0];
          });
        } else {
          setActiveProject(null);
        }
      }
    } catch (err) {
      console.error("Failed to load projects queue:", err);
    } finally {
      setProjectsLoading(false);
    }
  }, [apiUrl, isReviewer, selectedProjectStatus, token]);

  // Tab 5: Fetch Impact Verification Queue
  const fetchImpactQueue = useCallback(async () => {
    if (!token || !isReviewer) {
      setImpactLoading(false);
      return;
    }
    try {
      setImpactLoading(true);
      const url =
        selectedImpactStatus === "ALL"
          ? `${apiUrl}/admin/impact/queue`
          : `${apiUrl}/admin/impact/queue?status=${selectedImpactStatus}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load impact verification queue.");
      const data = await res.json();
      setImpactQueue(data || []);
      if (data && data.length > 0) {
        setActiveImpactAssessment((prev: any) => {
          if (!prev) return data[0];
          const found = data.find((item: any) => item.id === prev.id);
          return found || data[0];
        });
      } else {
        setActiveImpactAssessment(null);
        setActiveImpactProjectDetail(null);
      }
    } catch (err) {
      console.error("Failed to load impact queue:", err);
    } finally {
      setImpactLoading(false);
    }
  }, [apiUrl, isReviewer, selectedImpactStatus, token]);

  const fetchImpactProjectDetail = useCallback(
    async (projectId: string) => {
      if (!token || !projectId) return;
      setImpactDetailLoading(true);
      try {
        const res = await fetch(`${apiUrl}/admin/projects/${projectId}/impact`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load project impact detail.");
        const data = await res.json();
        setActiveImpactProjectDetail(data);
      } catch (err) {
        console.error("Failed to load impact detail:", err);
      } finally {
        setImpactDetailLoading(false);
      }
    },
    [apiUrl, token]
  );

  useEffect(() => {
    if (activeImpactAssessment?.project_id) {
      fetchImpactProjectDetail(activeImpactAssessment.project_id);
    }
  }, [activeImpactAssessment, fetchImpactProjectDetail]);

  // Tab 8: Institutional Capability Verification Handlers
  const fetchVerificationQueue = useCallback(async () => {
    if (!token || !isReviewer) return;
    setVerificationLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/verification/queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVerificationQueue(data);
        if (!activeVerificationItem) {
          if (data.evidence && data.evidence.length > 0) {
            setActiveVerificationItem(data.evidence[0]);
            setActiveVerificationType("EVIDENCE");
          } else if (data.institution_capabilities && data.institution_capabilities.length > 0) {
            setActiveVerificationItem(data.institution_capabilities[0]);
            setActiveVerificationType("INSTITUTION_CAPABILITY");
          } else if (data.industry_capabilities && data.industry_capabilities.length > 0) {
            setActiveVerificationItem(data.industry_capabilities[0]);
            setActiveVerificationType("INDUSTRY_CAPABILITY");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load verification queue:", err);
    } finally {
      setVerificationLoading(false);
    }
  }, [apiUrl, isReviewer, token, activeVerificationItem]);

  useEffect(() => {
    if (primaryTab === "challenges") {
      fetchChallengesQueue();
    } else if (primaryTab === "solutions") {
      fetchSolutionsQueue();
    } else if (primaryTab === "projects") {
      fetchProjectsQueue();
    } else if (primaryTab === "impact") {
      fetchImpactQueue();
      fetchInnovationsQueue();
    } else if (primaryTab === "capabilities") {
      fetchVerificationQueue();
    }
  }, [
    primaryTab,
    fetchChallengesQueue,
    fetchSolutionsQueue,
    fetchProjectsQueue,
    fetchImpactQueue,
    fetchInnovationsQueue,
    fetchVerificationQueue,
  ]);

  const handleApproveVerification = async (targetId: string, targetType: string, notes?: string) => {
    if (!token || !isReviewer) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/verification/${targetId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_type: targetType,
          notes: notes || "Approved during administrative capability verification review.",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to approve verification item.");
      }
      setActionSuccess(`Successfully VERIFIED ${targetType.replace(/_/g, " ")}. Status cascaded and AI index updated.`);
      setActiveVerificationItem(null);
      await fetchVerificationQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!activeVerificationItem || !token || !isReviewer) return;
    if (!verificationRejectionNotes.trim()) {
      setActionError("Mandatory rejection reason explaining grounds for decision is required.");
      return;
    }
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/verification/${activeVerificationItem.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_type: activeVerificationType,
          notes: verificationRejectionNotes.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reject verification item.");
      }
      setActionSuccess(`Item marked as REJECTED. Reviewer audit reason recorded and capability trust downgraded.`);
      setVerificationRejectModal(false);
      setVerificationRejectionNotes("");
      setActiveVerificationItem(null);
      await fetchVerificationQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Phase 8 Governance Handlers
  const handleApproveImpactAction = async () => {
    if (!activeImpactAssessment || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(
        `${apiUrl}/admin/impact/${activeImpactAssessment.id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: impactReviewNotes || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to approve impact verification.");
      }
      setActionSuccess("Impact Assessment officially VERIFIED! Project marked IMPACT_VERIFIED.");
      setImpactActionModal(null);
      setImpactReviewNotes("");
      await fetchImpactQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRequireRevisionImpactAction = async () => {
    if (!activeImpactAssessment || !token) return;
    if (!impactReviewNotes.trim()) {
      setActionError("Mandatory reviewer notes are required to request revision.");
      return;
    }
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(
        `${apiUrl}/admin/impact/${activeImpactAssessment.id}/require-revision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: impactReviewNotes,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to request revision.");
      }
      setActionSuccess("Revision requested. Consortium Lead has been notified with reviewer notes.");
      setImpactActionModal(null);
      setImpactReviewNotes("");
      await fetchImpactQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectImpactAction = async () => {
    if (!activeImpactAssessment || !token) return;
    if (!impactReviewNotes.trim()) {
      setActionError("Mandatory rejection reason is required.");
      return;
    }
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(
        `${apiUrl}/admin/impact/${activeImpactAssessment.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: impactReviewNotes,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reject impact verification.");
      }
      setActionSuccess("Impact verification REJECTED (terminal state). Permanent audit record created.");
      setImpactActionModal(null);
      setImpactReviewNotes("");
      await fetchImpactQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRevokeImpactAction = async () => {
    if (!activeImpactAssessment || !token) return;
    if (!impactRevocationReason.trim()) {
      setActionError("Mandatory revocation reason is required to revoke verified impact.");
      return;
    }
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(
        `${apiUrl}/admin/impact/${activeImpactAssessment.id}/revoke`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: impactRevocationReason,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to revoke impact verification.");
      }
      setActionSuccess("Verified impact REVOKED by Platform Administrator. Project downgraded to COMPLETED.");
      setImpactActionModal(null);
      setImpactRevocationReason("");
      await fetchImpactQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Project Governance Actions
  const handleKickoffReview = async () => {
    if (!activeProject || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/projects/${activeProject.id}/kickoff-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: reviewDecision,
          comments: reviewComments || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit kickoff review.");
      }
      setActionSuccess(`Kickoff plan ${reviewDecision === "APPROVE" ? "APPROVED" : "returned for revision"}.`);
      setProjectActionModal(null);
      setReviewComments("");
      await fetchProjectsQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMilestoneReview = async () => {
    if (!activeProject || !activeMilestoneId || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/projects/${activeProject.id}/milestones/${activeMilestoneId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: reviewDecision,
          comments: reviewComments || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit milestone review.");
      }
      setActionSuccess(`Milestone review completed (${reviewDecision}).`);
      setProjectActionModal(null);
      setReviewComments("");
      await fetchProjectsQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBlockerReview = async () => {
    if (!activeProject || !activeBlockerId || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/projects/${activeProject.id}/blockers/${activeBlockerId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: reviewDecision === "RESOLVE" ? "RESOLVE" : "ACKNOWLEDGE",
          comments: reviewComments || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit blocker review.");
      }
      setActionSuccess(reviewDecision === "RESOLVE" ? "Blocker RESOLVED. Project restored to Active." : "Blocker acknowledged.");
      setProjectActionModal(null);
      setReviewComments("");
      await fetchProjectsQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!activeProject || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/projects/${activeProject.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comments: reviewComments || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to complete project.");
      }
      setActionSuccess("Zero-Milestone Completion Guard verified. Project marked COMPLETED!");
      setProjectActionModal(null);
      setReviewComments("");
      await fetchProjectsQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleImpactVerify = async () => {
    if (!activeProject || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/projects/${activeProject.id}/impact-verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comments: reviewComments || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to verify impact.");
      }
      setActionSuccess("Project IMPACT_VERIFIED. Clean handoff complete!");
      setProjectActionModal(null);
      setReviewComments("");
      await fetchProjectsQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleTerminateProject = async () => {
    if (!activeProject || !token) return;
    if (!terminationReason.trim()) {
      setActionError("A valid termination reason is strictly mandatory.");
      return;
    }
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/projects/${activeProject.id}/terminate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: terminationReason.trim(),
          comments: reviewComments || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to terminate project.");
      }
      setActionSuccess("Project TERMINATED.");
      setProjectActionModal(null);
      setTerminationReason("");
      setReviewComments("");
      await fetchProjectsQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Challenge Review Actions
  const handleChallengeReviewAction = async (
    targetStatus: "UNDER_REVIEW" | "VALIDATED" | "REJECTED",
  ) => {
    if (!activeChallenge || !token) return;

    if (targetStatus === "REJECTED" && !challengeRejectionReason.trim()) {
      setActionError("A valid rejection reason is mandatory.");
      return;
    }

    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const res = await fetch(`${apiUrl}/challenges/${activeChallenge.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: targetStatus === "REJECTED" ? challengeRejectionReason.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to process challenge review action.");
      }

      setActionSuccess(`Challenge successfully updated to ${targetStatus}.`);
      setChallengeRejectionReason("");
      setChallengesQueue((prev) => prev.filter((c) => c.id !== activeChallenge.id));
      setActiveChallenge(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to execute challenge review action.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Solution Review: Publish (approve) to Open Workspace
  const handleSolutionPublish = async () => {
    if (!activeSolution || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/solutions/${activeSolution.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: solutionReviewNotes.trim() || undefined }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to publish solution.");
      }
      setActionSuccess(`Solution "${activeSolution.title}" published to Open Collaboration Workspace. Universities and industry partners can now discover and offer collaboration.`);
      setSolutionReviewNotes("");
      await fetchSolutionsQueue();
    } catch (err: any) {
      setActionError(err.message || "Failed to publish solution.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Solution Review: Reject
  const handleSolutionReject = async () => {
    if (!activeSolution || !token) return;
    if (!solutionReviewNotes.trim()) {
      setActionError("A rejection reason is mandatory.");
      return;
    }
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/solutions/${activeSolution.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: solutionReviewNotes.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to reject solution.");
      }
      setActionSuccess("Solution rejected. University has been notified with the reviewer notes.");
      setSolutionActionModal(null);
      setSolutionReviewNotes("");
      await fetchSolutionsQueue();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject solution.");
    } finally {
      setProcessingAction(false);
    }
  };

  if (!user && !challengeLoading && !solutionsLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Sign In Required</h2>
        <p className="text-xs text-stone-600 max-w-sm mx-auto">Please sign in with administrative or government credentials.</p>
        <div className="pt-2">
          <Link href="/login" className="inline-flex rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!isReviewer && !challengeLoading && !solutionsLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-700 shadow-sm">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Access Restricted</h2>
        <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
          The reviewer queue is strictly restricted to authorized Government Officers and Platform Administrators. Your current role is: <span className="font-semibold text-stone-800">{formatUserRole(user?.role)}</span>.
        </p>
        <div className="pt-2">
          <Link href="/" className="inline-flex rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Innovation Outcome Verification
  const handleVerifyInnovationOutcome = async () => {
    if (!activeInnovation || !token) return;
    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/projects/${activeInnovation.project_id}/innovation-outcomes/${activeInnovation.id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: innovationDecision,
          verification_notes: innovationVerifyNotes.trim() || undefined,
          reference_number: innovationVerifyRef.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to verify innovation outcome.");
      }
      setActionSuccess(`Innovation outcome "${activeInnovation.title}" marked as ${innovationDecision}.`);
      setInnovationVerifyModal(false);
      setInnovationVerifyNotes("");
      setInnovationVerifyRef("");
      await fetchInnovationsQueue();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };



  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60 uppercase tracking-wide">
              Official Governance Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-emerald-700" />
            Government Reviewer Queue
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
            Review citizen challenges, evaluate proposed solutions, and govern collaborative innovation projects.
          </p>
        </div>


        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-medium text-stone-600 bg-stone-50 border border-stone-200 px-3.5 py-2 rounded-xl self-start sm:self-auto shadow-xs">
          <div className="flex items-center gap-2">
            <span>Officer:</span>
            <span className="text-stone-900 font-semibold">{user?.name}</span>
            <span className="text-stone-300">|</span>
            <span className="text-emerald-800 font-semibold">{formatUserRole(user?.role)}</span>
          </div>
          <span className="text-stone-300 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-lg text-[11px]">
            <MapPin className="h-3 w-3 text-amber-700" />
            <span>
              {user?.role === "GOVERNMENT_OFFICER"
                ? `${user?.districtRef?.name || user?.district || "Assigned"} District Jurisdiction`
                : user?.role === "GOVERNMENT_ADMIN"
                ? `${user?.state || "Jharkhand"} State Jurisdiction`
                : "Universal Jurisdiction"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-1 overflow-x-auto">
        <button
          onClick={() => {
            setPrimaryTab("clusters");
            setActionSuccess(null);
            setActionError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "clusters"
              ? "bg-emerald-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          1. Problem Intelligence (Clusters)
        </button>

        <button
          onClick={() => {
            setPrimaryTab("challenges");
            setActionSuccess(null);
            setActionError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "challenges"
              ? "bg-emerald-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <FileText className="h-4 w-4" />
          2. Citizen Reports
          {challengesQueue.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {challengesQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setPrimaryTab("solutions");
            setActionSuccess(null);
            setActionError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "solutions"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          3. Proposed Solutions
          {solutionsQueue.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {solutionsQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setPrimaryTab("projects");
            setActionSuccess(null);
            setActionError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "projects"
              ? "bg-emerald-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <FolderGit2 className="h-4 w-4" />
          4. Project Governance
          {projectsQueue.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {projectsQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setPrimaryTab("impact");
            setActionSuccess(null);
            setActionError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "impact"
              ? "bg-purple-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Award className="h-4 w-4" />
          6. Impact Verification
          {impactQueue.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {impactQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setPrimaryTab("innovations");
            setActionSuccess(null);
            setActionError(null);
            fetchInnovationsQueue();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "innovations"
              ? "bg-indigo-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          6. Innovation & IP Review
          {innovationsQueue.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {innovationsQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setPrimaryTab("capabilities");
            setActionSuccess(null);
            setActionError(null);
            fetchVerificationQueue();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "capabilities"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          7. Capability Verification
          {((verificationQueue?.pending_evidence_count || 0) + (verificationQueue?.pending_capabilities_count || 0)) > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-stone-950 font-bold">
              {(verificationQueue?.pending_evidence_count || 0) + (verificationQueue?.pending_capabilities_count || 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setPrimaryTab("pri_ulb")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "pri_ulb"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Landmark className="h-4 w-4" />
          8. PRI & ULB Authority
        </button>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 shadow-xs">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 0: PROBLEM INTELLIGENCE (CLUSTERS) */}
      {/* ========================================================= */}
      {primaryTab === "clusters" && (
        <ProblemClustersQueue
          token={token}
          apiUrl={apiUrl}
          isReviewer={isReviewer}
          onActionSuccess={(msg) => {
            setActionSuccess(msg);
            setActionError(null);
          }}
          onActionError={(msg) => {
            setActionError(msg);
            setActionSuccess(null);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* TAB 1: CHALLENGE SUBMISSIONS QUEUE */}
      {/* ========================================================= */}
      {primaryTab === "challenges" && (
        <div className="space-y-6">
          {/* Status Sub-tabs */}
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-xs">
            {[
              { key: "SUBMITTED", label: "New Submissions" },
              { key: "UNDER_REVIEW", label: "Under Review" },
              { key: "VALIDATED", label: "Validated History" },
              { key: "REJECTED", label: "Rejected History" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedChallengeStatus(tab.key);
                  setActiveChallenge(null);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedChallengeStatus === tab.key
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs"
                    : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Queue List */}
            <div className="lg:col-span-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Pending Queue ({challengesQueue.length})
              </h3>

              {challengeLoading ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-stone-400" />
                  Loading challenges queue...
                </div>
              ) : challengesQueue.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  No challenges pending in this status queue.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                  {challengesQueue.map((item) => {
                    const isSelected = activeChallenge?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveChallenge(item);
                          setActionSuccess(null);
                          setActionError(null);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-600/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-500 pb-1">
                          <span className="font-medium text-stone-700">{item.districtRef?.name || item.district}</span>
                          <span>{formatDateSafe(item.submitted_at)}</span>
                        </div>
                        <h4 className="text-xs font-bold text-stone-900 line-clamp-2">{item.title}</h4>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-1">{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Challenge Detail View */}
            <div className="lg:col-span-8">
              {activeChallenge ? (
                <div className="p-6 rounded-2xl border border-stone-200 bg-white space-y-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400 block">
                        Challenge ID: {activeChallenge.id}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <Globe className="h-3.5 w-3.5 text-emerald-700" />
                        <span className="text-xs text-stone-500 font-medium">Citizen Language:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {activeChallenge.original_language
                            ? `${SUPPORTED_LANGUAGES[activeChallenge.original_language]?.nativeName || activeChallenge.original_language.toUpperCase()} (${SUPPORTED_LANGUAGES[activeChallenge.original_language]?.name || activeChallenge.original_language})`
                            : "English"}
                        </span>
                      </div>
                    </div>

                    {/* Reviewer On-Demand Translation Buttons */}
                    <div className="flex items-center gap-2">
                      {activeChallenge.original_language !== "hi" && (
                        <button
                          type="button"
                          disabled={reviewerTranslating}
                          onClick={() => handleReviewerTranslate("hi")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            activeChallengeTranslation?.target_language === "hi"
                              ? "bg-emerald-700 text-white shadow-xs"
                              : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          <Languages className="h-3.5 w-3.5" />
                          {activeChallengeTranslation?.target_language === "hi" ? "Original View" : "Translate to Hindi"}
                        </button>
                      )}

                      {activeChallenge.original_language !== "en" && (
                        <button
                          type="button"
                          disabled={reviewerTranslating}
                          onClick={() => handleReviewerTranslate("en")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            activeChallengeTranslation?.target_language === "en"
                              ? "bg-emerald-700 text-white shadow-xs"
                              : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          <Languages className="h-3.5 w-3.5" />
                          {activeChallengeTranslation?.target_language === "en" ? "Original View" : "Translate to English"}
                        </button>
                      )}

                      {reviewerTranslating && <Loader2 className="h-4 w-4 animate-spin text-emerald-700 ml-1" />}
                    </div>
                  </div>

                  <div>
                    {activeChallengeTranslation && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-2">
                        <Sparkles className="h-3 w-3" />
                        Viewing {SUPPORTED_LANGUAGES[activeChallengeTranslation.target_language]?.name || activeChallengeTranslation.target_language} Translation
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-stone-900">
                      {activeChallengeTranslation ? activeChallengeTranslation.translated_title : activeChallenge.title}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">District</span>
                      <span className="font-semibold text-stone-800">
                        {activeChallenge.districtRef?.name || activeChallenge.district}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Block</span>
                      <span className="font-semibold text-stone-800">
                        {activeChallenge.blockRef?.name || "Unspecified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Locality</span>
                      <span className="font-semibold text-stone-800">
                        {activeChallenge.village_locality || "Unspecified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Citizen Severity</span>
                      <span className="font-semibold text-stone-800 capitalize">
                        {activeChallenge.citizen_severity?.replace("_", " ").toLowerCase() || "Unspecified"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      {activeChallengeTranslation ? "Translated Description" : "Citizen's Original Problem Description"}
                    </h4>
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                      {activeChallengeTranslation
                        ? activeChallengeTranslation.translated_description
                        : (activeChallenge.original_text || activeChallenge.description)}
                    </div>
                  </div>

                  {/* Normalized English Translation Box if different */}
                  {!activeChallengeTranslation && activeChallenge.normalized_text && activeChallenge.normalized_text !== (activeChallenge.original_text || activeChallenge.description) && (
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                          English Normalized Translation (AI Derived for District Review)
                        </span>
                        {activeChallenge.translation_status === "VERIFIED" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Automated Verified Translation
                          </span>
                        )}
                        {activeChallenge.translation_status === "REQUIRES_HUMAN_REVIEW" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Requires Human Review (Low-resource / Uncertain Dialect)
                          </span>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-emerald-100 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {activeChallenge.normalized_text}
                      </div>
                      {activeChallenge.translation_status === "REQUIRES_HUMAN_REVIEW" && (
                        <p className="text-[11px] text-amber-800 font-medium">
                          ⚠️ Note: Machine translation for low-resource tribal language has low confidence. Corroborate terms with citizen during ground verification.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Challenge Action Controls */}
                  <div className="p-5 rounded-xl bg-stone-50 border border-stone-200 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Reviewer Decision Controls
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700">
                        Rejection / Modification Reason <span className="text-stone-400 font-normal">(Mandatory if rejecting)</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Enter explicit reason if rejecting challenge..."
                        value={challengeRejectionReason}
                        onChange={(e) => setChallengeRejectionReason(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {activeChallenge.status === "SUBMITTED" && (
                        <button
                          type="button"
                          disabled={processingAction}
                          onClick={() => handleChallengeReviewAction("UNDER_REVIEW")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm transition disabled:opacity-50"
                        >
                          <Clock className="h-3.5 w-3.5" /> Mark Under Review
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={processingAction}
                        onClick={() => handleChallengeReviewAction("VALIDATED")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Validate Challenge
                      </button>

                      <button
                        type="button"
                        disabled={processingAction}
                        onClick={() => handleChallengeReviewAction("REJECTED")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject Challenge
                      </button>

                      {processingAction && <Loader2 className="h-4 w-4 animate-spin text-emerald-700 ml-2" />}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  Select a challenge from the queue to inspect details and record validation decisions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PROPOSED SOLUTIONS REVIEW */}
      {/* ========================================================= */}
      {primaryTab === "solutions" && (
        <div className="space-y-6">
          {/* Solution Status Filter Bar */}
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-xs">
            {[
              { key: "SUBMITTED", label: "Awaiting Review" },
              { key: "UNDER_REVIEW", label: "Under Review" },
              { key: "PUBLISHED", label: "Published" },
              { key: "COLLABORATION_OPEN", label: "Collaboration Open" },
              { key: "CONVERTED_TO_PROJECT", label: "Converted to Project" },
              { key: "REJECTED", label: "Rejected" },
              { key: "ALL", label: "All Solutions" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedSolutionStatus(tab.key);
                  setActiveSolution(null);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedSolutionStatus === tab.key
                    ? "bg-teal-50 text-teal-900 border border-teal-300 shadow-xs"
                    : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Solution Queue List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Solutions Queue ({solutionsQueue.length})
                </h3>
                <button
                  onClick={() => fetchSolutionsQueue()}
                  className="text-xs text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>

              {solutionsLoading ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-stone-400" />
                  Loading proposed solutions...
                </div>
              ) : solutionsQueue.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  No proposed solutions in this queue.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                  {solutionsQueue.map((item) => {
                    const isSelected = activeSolution?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSolution(item);
                          setActionSuccess(null);
                          setActionError(null);
                          setSolutionActionModal(null);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-teal-600 bg-teal-50/60 shadow-xs ring-1 ring-teal-600/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-500 pb-1">
                          <span className="font-bold text-stone-900 truncate max-w-[160px]">
                            {item.organization?.name || "Institution"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'PUBLISHED' ? 'bg-teal-100 text-teal-800' :
                            item.status === 'COLLABORATION_OPEN' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'CONVERTED_TO_PROJECT' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            item.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-stone-800 line-clamp-1">
                          {item.title || "Untitled Solution"}
                        </h4>
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                          {item.abstract || "No abstract provided."}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-stone-400">
                          <span>{item.organization?.type?.replace(/_/g, " ")}</span>
                          <span>•</span>
                          <span className="text-stone-500 font-medium">Re: {item.challenge?.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400">
                          <span>{formatDateSafe(item.submitted_at || item.created_at)}</span>
                          {item.team_members && item.team_members.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{item.team_members.length} team member{item.team_members.length > 1 ? "s" : ""}</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Solution Inspection & Reviewer Actions */}
            <div className="lg:col-span-8">
              {activeSolution ? (
                <div className="p-6 rounded-2xl border border-stone-200 bg-white space-y-6 shadow-sm">
                  {/* Title & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400">Solution ID: {activeSolution.id}</span>
                      <h2 className="text-xl font-bold text-stone-900 mt-0.5">
                        {activeSolution.title || "Untitled Proposed Solution"}
                      </h2>
                      <p className="text-xs text-stone-600 mt-1 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-stone-400" />
                        <span className="font-semibold">{activeSolution.organization?.name}</span>
                        <span>•</span>
                        <span className="text-stone-500">{activeSolution.organization?.type?.replace(/_/g, " ")}</span>
                      </p>
                      {activeSolution.challenge && (
                        <p className="text-xs text-stone-600 mt-1 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-stone-400" />
                          <span>Challenge:</span>
                          <Link
                            href={`/challenges/${activeSolution.challenge_id}`}
                            target="_blank"
                            className="font-semibold text-teal-800 hover:underline flex items-center gap-1"
                          >
                            {activeSolution.challenge.title} <ExternalLink className="h-3 w-3" />
                          </Link>
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        activeSolution.status === 'PUBLISHED' ? 'bg-teal-50 text-teal-800 border-teal-300' :
                        activeSolution.status === 'COLLABORATION_OPEN' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        activeSolution.status === 'CONVERTED_TO_PROJECT' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                        activeSolution.status === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-300' :
                        activeSolution.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        'bg-stone-50 text-stone-700 border-stone-300'
                      }`}>
                        {activeSolution.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Budget Estimate</span>
                      <span className="font-semibold text-stone-800">
                        {activeSolution.budget_estimate ? `₹${Number(activeSolution.budget_estimate).toLocaleString("en-IN")}` : "Not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Timeline</span>
                      <span className="font-semibold text-stone-800">
                        {activeSolution.timeline_months ? `${activeSolution.timeline_months} months` : "Not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Team Size</span>
                      <span className="font-semibold text-stone-800">
                        {activeSolution.team_members?.length || 0} member{(activeSolution.team_members?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Collaboration Offers</span>
                      <span className="font-semibold text-stone-800">
                        {activeSolution.collaborations?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Abstract */}
                  <div className="space-y-1.5 text-xs">
                    <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                      Solution Abstract
                    </h4>
                    <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed whitespace-pre-wrap">
                      {activeSolution.abstract || "No abstract provided."}
                    </p>
                  </div>

                  {/* Methodology */}
                  {activeSolution.proposed_methodology && (
                    <div className="space-y-1.5 text-xs">
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                        Proposed Methodology
                      </h4>
                      <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {activeSolution.proposed_methodology}
                      </p>
                    </div>
                  )}

                  {/* Expected Outcomes */}
                  {activeSolution.expected_outcomes && (
                    <div className="space-y-1.5 text-xs">
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                        Expected Outcomes
                      </h4>
                      <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {activeSolution.expected_outcomes}
                      </p>
                    </div>
                  )}

                  {/* Rejection reason if rejected */}
                  {activeSolution.rejection_reason && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-700" /> Rejection Reason:
                      </span>
                      <p className="leading-relaxed">{activeSolution.rejection_reason}</p>
                    </div>
                  )}

                  {/* Collaboration Offers */}
                  {activeSolution.collaborations && activeSolution.collaborations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                        Collaboration Offers ({activeSolution.collaborations.length})
                      </h4>
                      <div className="space-y-2">
                        {activeSolution.collaborations.map((c, i) => (
                          <div key={i} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-stone-900">{c.organization?.name || "External Partner"}</span>
                              <span className="text-stone-500 ml-2">· {c.collaboration_type?.replace(/_/g, " ")}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                              c.status === 'UNDER_DISCUSSION' ? 'bg-amber-100 text-amber-800' :
                              c.status === 'DECLINED' ? 'bg-red-100 text-red-800' :
                              'bg-stone-100 text-stone-700'
                            }`}>
                              {c.status?.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Action Controls */}
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                        Governance Review Actions
                      </h4>
                      <span className="text-[11px] text-stone-500">
                        Publishing makes the solution visible in the Open Collaboration Workspace
                      </span>
                    </div>

                    {/* Reviewer Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700">
                        Reviewer Notes {solutionActionModal === "reject" ? <span className="text-red-500">* (Mandatory for rejection)</span> : <span className="text-stone-400 font-normal">(Optional for publishing)</span>}
                      </label>
                      <textarea
                        rows={2}
                        value={solutionReviewNotes}
                        onChange={(e) => setSolutionReviewNotes(e.target.value)}
                        placeholder={solutionActionModal === "reject" ? "State the governance justification for rejecting this solution..." : "Optional notes to accompany the publish decision..."}
                        className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-900 placeholder-stone-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/10 transition"
                      />
                    </div>

                    {/* Reject confirmation panel */}
                    {solutionActionModal === "reject" && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
                        <p className="font-semibold">⚠️ Confirm rejection of this proposed solution. This action will notify the university.</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSolutionActionModal(null)}
                            className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={processingAction || !solutionReviewNotes.trim()}
                            onClick={handleSolutionReject}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-700 text-xs font-bold text-white hover:bg-red-800 transition disabled:opacity-50"
                          >
                            {processingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {solutionActionModal === null && (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {(activeSolution.status === "SUBMITTED" || activeSolution.status === "UNDER_REVIEW") && (
                          <button
                            type="button"
                            disabled={processingAction}
                            onClick={handleSolutionPublish}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800 shadow-sm transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Publish to Open Workspace
                          </button>
                        )}

                        {activeSolution.status !== "REJECTED" && activeSolution.status !== "CONVERTED_TO_PROJECT" && (
                          <button
                            type="button"
                            disabled={processingAction}
                            onClick={() => setSolutionActionModal("reject")}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject Solution
                          </button>
                        )}

                        <Link
                          href={`/solutions/${activeSolution.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View Full Solution
                        </Link>

                        {activeSolution.status === "PUBLISHED" && (
                          <span className="text-xs text-teal-800 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-teal-700" /> Live in Open Collaboration Workspace
                          </span>
                        )}

                        {activeSolution.status === "CONVERTED_TO_PROJECT" && (
                          <span className="text-xs text-blue-800 font-semibold flex items-center gap-1">
                            <FolderGit2 className="h-4 w-4 text-blue-700" /> Converted to Active Project
                          </span>
                        )}

                        {processingAction && <Loader2 className="h-4 w-4 animate-spin text-teal-700 ml-2" />}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  Select a proposed solution from the queue to inspect and record governance decisions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}




      {/* ========================================================= */}
      {/* TAB 4: COLLABORATIVE PROJECTS GOVERNANCE */}
      {/* ========================================================= */}
      {primaryTab === "projects" && (
        <div className="space-y-6">
          {/* Status filter bar */}
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-xs">
            {[
              { key: "ALL", label: "All Projects" },
              { key: "KICKOFF_PENDING", label: "Kickoff Pending" },
              { key: "ACTIVE", label: "Active Execution" },
              { key: "BLOCKED", label: "Blocked Projects" },
              { key: "COMPLETED", label: "Completed" },
              { key: "IMPACT_VERIFIED", label: "Impact Verified" },
              { key: "TERMINATED", label: "Terminated" },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => {
                  setSelectedProjectStatus(st.key);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedProjectStatus === st.key
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs"
                    : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Projects Queue */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Collaborative Projects ({projectsQueue.length})
              </h3>

              {projectsLoading ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-stone-400" />
                  Loading projects...
                </div>
              ) : projectsQueue.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-200">
                  No projects match this status filter.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  {projectsQueue.map((p) => {
                    const isSelected = activeProject?.id === p.id;
                    const isBlocked = p.status === "BLOCKED";
                    const isKickoffPending = p.status === "KICKOFF_PENDING";
                    const reviewReqMilestones = (p.milestones || []).filter(
                      (m: any) => m.status === "REVIEW_REQUESTED"
                    ).length;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setActiveProject(p)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "bg-emerald-50/70 border-emerald-400 shadow-sm"
                            : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-stone-900 line-clamp-1">{p.title}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              p.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "BLOCKED"
                                ? "bg-red-100 text-red-800 animate-pulse"
                                : p.status === "KICKOFF_PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : p.status === "COMPLETED"
                                ? "bg-blue-100 text-blue-800"
                                : p.status === "IMPACT_VERIFIED"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{p.description || "Collaborative innovation project."}</p>

                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-stone-100 text-[10px] text-stone-500">
                          <span>{(p.participants || []).length} Institutions</span>
                          <span>•</span>
                          <span>
                            {(p.milestones || []).filter((m: any) => m.status === "APPROVED").length} / {(p.milestones || []).length} Milestones
                          </span>
                          {isBlocked && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">
                              🚨 Blocker Open
                            </span>
                          )}
                          {isKickoffPending && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">
                              Kickoff Pending
                            </span>
                          )}
                          {reviewReqMilestones > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                              {reviewReqMilestones} Milestone Review
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Governance Detail View */}
            <div className="lg:col-span-7">
              {activeProject ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-stone-900">{activeProject.title}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              activeProject.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : activeProject.status === "BLOCKED"
                                ? "bg-red-100 text-red-800"
                                : activeProject.status === "KICKOFF_PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : activeProject.status === "COMPLETED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {activeProject.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">{activeProject.description}</p>
                      </div>

                      <Link
                        href={`/projects/${activeProject.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
                      >
                        Workspace <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {/* Governance Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-100 text-xs">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-[11px] text-stone-500 block">Milestones</span>
                        <span className="font-bold text-stone-900 text-sm">
                          {(activeProject.milestones || []).filter((m: any) => m.status === "APPROVED").length} / {(activeProject.milestones || []).length} Approved
                        </span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-[11px] text-stone-500 block">Deliverables</span>
                        <span className="font-bold text-stone-900 text-sm">
                          {(activeProject.deliverables || []).length} Submitted
                        </span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-[11px] text-stone-500 block">Blockers</span>
                        <span
                          className={`font-bold text-sm ${
                            (activeProject.updates || []).filter((u: any) => u.update_type === "BLOCKER" && u.blocker_status === "OPEN").length > 0
                              ? "text-red-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {(activeProject.updates || []).filter((u: any) => u.update_type === "BLOCKER" && u.blocker_status === "OPEN").length} Open
                        </span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-[11px] text-stone-500 block">Target Date</span>
                        <span className="font-bold text-stone-900 text-sm">
                          {formatDateSafe(activeProject.target_completion_date)}
                        </span>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                      {/* Review Kickoff */}
                      {activeProject.status === "KICKOFF_PENDING" && (
                        <button
                          onClick={() => {
                            setReviewDecision("APPROVE");
                            setReviewComments("");
                            setProjectActionModal("kickoff");
                          }}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <ShieldCheck className="h-4 w-4" /> Review Kickoff Plan
                        </button>
                      )}

                      {/* Review Milestones Pending */}
                      {(activeProject.milestones || []).some((m: any) => m.status === "REVIEW_REQUESTED") && (
                        <button
                          onClick={() => {
                            const pendingM = activeProject.milestones.find((m: any) => m.status === "REVIEW_REQUESTED");
                            if (pendingM) {
                              setActiveMilestoneId(pendingM.id);
                              setReviewDecision("APPROVE");
                              setReviewComments("");
                              setProjectActionModal("milestone");
                            }
                          }}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Review Milestone Submission
                        </button>
                      )}

                      {/* Review Open Blocker */}
                      {(activeProject.updates || []).some((u: any) => u.update_type === "BLOCKER" && u.blocker_status === "OPEN") && (
                        <button
                          onClick={() => {
                            const openB = activeProject.updates.find((u: any) => u.update_type === "BLOCKER" && u.blocker_status === "OPEN");
                            if (openB) {
                              setActiveBlockerId(openB.id);
                              setReviewDecision("RESOLVE");
                              setReviewComments("");
                              setProjectActionModal("blocker");
                            }
                          }}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <AlertTriangle className="h-4 w-4" /> Resolve Blocker Emergency
                        </button>
                      )}

                      {/* Complete Project */}
                      {activeProject.status === "ACTIVE" && (
                        <button
                          onClick={() => {
                            setReviewComments("");
                            setProjectActionModal("complete");
                          }}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <FileCheck2 className="h-4 w-4" /> Complete Project (Guard Check)
                        </button>
                      )}

                      {/* Impact Verify */}
                      {activeProject.status === "COMPLETED" && (
                        <button
                          onClick={() => {
                            setReviewComments("");
                            setProjectActionModal("impact");
                          }}
                          className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Sparkles className="h-4 w-4" /> Verify Impact (Clean Handoff)
                        </button>
                      )}

                      {/* Terminate Project */}
                      {activeProject.status !== "COMPLETED" && activeProject.status !== "IMPACT_VERIFIED" && activeProject.status !== "TERMINATED" && (
                        <button
                          onClick={() => {
                            setTerminationReason("");
                            setReviewComments("");
                            setProjectActionModal("terminate");
                          }}
                          className="px-3.5 py-2 bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 border border-stone-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Ban className="h-4 w-4" /> Terminate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Consortium & Milestones list preview */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
                    <h4 className="font-bold text-xs text-stone-800">Consortium Institutional Participants</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(activeProject.participants || []).map((p: any) => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center">
                          <span className="font-semibold text-stone-800">{p.organization?.name || "Participant"}</span>
                          <span className="text-[10px] font-bold text-emerald-800 px-1.5 py-0.5 bg-emerald-100 rounded">
                            {p.participant_role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  Select a collaborative project on the left to review status and perform governance sign-offs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: REAL-WORLD IMPACT VERIFICATION GOVERNANCE */}
      {/* ============================================================ */}
      {primaryTab === "impact" && (
        <div className="space-y-6">
          {/* Status filter bar */}
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-xs">
            {[
              { key: "ALL", label: "All Assessments" },
              { key: "UNDER_REVIEW", label: "Under Review" },
              { key: "REVISION_REQUIRED", label: "Revision Required" },
              { key: "VERIFIED", label: "Verified" },
              { key: "REJECTED", label: "Rejected" },
              { key: "IMPACT_VERIFICATION_PENDING", label: "Pending Submission" },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setSelectedImpactStatus(st.key)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedImpactStatus === st.key
                    ? "bg-purple-700 text-white shadow-xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Queue List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 px-1">
                <span>Impact Assessments ({impactQueue.length})</span>
                {impactLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-700" />}
              </div>

              {impactQueue.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  No impact assessments found in this status queue.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                  {impactQueue.map((item) => {
                    const isSelected = activeImpactAssessment?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveImpactAssessment(item);
                          setActionSuccess(null);
                          setActionError(null);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-purple-600 bg-purple-50/60 shadow-xs ring-1 ring-purple-600/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-500 pb-1">
                          <span className="font-semibold text-stone-800 line-clamp-1">
                            {item.projectTitle || "Project Impact"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              item.status === "VERIFIED"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "UNDER_REVIEW"
                                ? "bg-blue-100 text-blue-800"
                                : item.status === "REVISION_REQUIRED"
                                ? "bg-amber-100 text-amber-800"
                                : item.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-900 line-clamp-1 mt-0.5">
                          {item.challengeTitle || "Challenge"}
                        </p>
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                          {item.summary}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-stone-400 mt-2.5 pt-2 border-t border-stone-100">
                          <span>📊 {item.metricsCount} Metrics</span>
                          <span>📁 {item.evidenceCount} Evidence</span>
                          <span>💬 {item.feedbackCount} Feedback</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Detail & Evaluation */}
            <div className="lg:col-span-8">
              {activeImpactAssessment ? (
                <div className="space-y-6">
                  {/* Assessment Card Header */}
                  <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            Phase 8 Impact Review
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              activeImpactAssessment.status === "VERIFIED"
                                ? "bg-emerald-100 text-emerald-800"
                                : activeImpactAssessment.status === "UNDER_REVIEW"
                                ? "bg-blue-100 text-blue-800"
                                : activeImpactAssessment.status === "REVISION_REQUIRED"
                                ? "bg-amber-100 text-amber-800"
                                : activeImpactAssessment.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {activeImpactAssessment.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 mt-2">
                          {activeImpactAssessment.projectTitle}
                        </h2>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Original Challenge:{" "}
                          <span className="font-semibold text-stone-700">
                            {activeImpactAssessment.challengeTitle}
                          </span>{" "}
                          • District:{" "}
                          <span className="font-semibold text-stone-700">
                            {activeImpactAssessment.district || "Jharkhand"}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/impact/${activeImpactAssessment.project_id}`}
                          target="_blank"
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Full Workspace
                        </Link>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-xs space-y-2">
                      <p className="font-bold text-purple-900">Executive Impact Summary</p>
                      <p className="text-purple-950/90 leading-relaxed">
                        {activeImpactAssessment.summary}
                      </p>
                    </div>

                    {/* Problem & Solution Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                        <span className="font-bold text-stone-700 block">Problem Addressed</span>
                        <p className="text-stone-600 leading-relaxed">
                          {activeImpactProjectDetail?.assessment?.problem_addressed ||
                            "Societal problem resolved by this initiative."}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                        <span className="font-bold text-stone-700 block">Solution Implemented</span>
                        <p className="text-stone-600 leading-relaxed">
                          {activeImpactProjectDetail?.assessment?.solution_implemented ||
                            "Deployed technology or intervention."}
                        </p>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                        <span className="text-[10px] text-stone-500 font-semibold block uppercase">
                          Beneficiaries
                        </span>
                        <span className="text-base font-bold text-stone-900">
                          {activeImpactAssessment.beneficiaries_reached
                            ? activeImpactAssessment.beneficiaries_reached.toLocaleString()
                            : "Not specified"}
                        </span>
                      </div>

                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                        <span className="text-[10px] text-stone-500 font-semibold block uppercase">
                          Coverage
                        </span>
                        <span className="text-sm font-bold text-stone-900 line-clamp-1">
                          {activeImpactAssessment.geographic_coverage || "District-wide"}
                        </span>
                      </div>

                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                        <span className="text-[10px] text-stone-500 font-semibold block uppercase">
                          Cost
                        </span>
                        <span className="text-sm font-bold text-stone-900">
                          {activeImpactAssessment.implementation_cost
                            ? `₹ ${(activeImpactAssessment.implementation_cost / 100000).toFixed(2)}L`
                            : "Included"}
                        </span>
                      </div>

                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                        <span className="text-[10px] text-stone-500 font-semibold block uppercase">
                          Milestones
                        </span>
                        <span className="text-sm font-bold text-emerald-700">
                          {activeImpactProjectDetail?.completedMilestonesCount || "All"} Completed
                        </span>
                      </div>
                    </div>

                    {/* Governance Actions Bar */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2 justify-end">
                      {activeImpactAssessment.status === "UNDER_REVIEW" && (
                        <>
                          <button
                            onClick={() => {
                              setImpactReviewNotes("");
                              setImpactActionModal("approve");
                            }}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Approve Impact Verification
                          </button>

                          <button
                            onClick={() => {
                              setImpactReviewNotes("");
                              setImpactActionModal("revision");
                            }}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Request Revision
                          </button>

                          <button
                            onClick={() => {
                              setImpactReviewNotes("");
                              setImpactActionModal("reject");
                            }}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject Assessment
                          </button>
                        </>
                      )}

                      {activeImpactAssessment.status === "VERIFIED" && isPlatformAdmin && (
                        <button
                          onClick={() => {
                            setImpactRevocationReason("");
                            setImpactActionModal("revoke");
                          }}
                          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Shield className="h-4 w-4" />
                          Revoke Verification (Admin Only)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Structured Metrics Table */}
                  {activeImpactProjectDetail?.assessment?.metrics?.length > 0 && (
                    <div className="p-5 rounded-2xl border border-stone-200 bg-white space-y-3 shadow-sm">
                      <h4 className="font-bold text-xs text-stone-800">
                        Structured Impact Metrics ({activeImpactProjectDetail.assessment.metrics.length})
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-stone-700">
                          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3">Metric Name</th>
                              <th className="py-2 px-3">Baseline</th>
                              <th className="py-2 px-3">Target</th>
                              <th className="py-2 px-3">Actual Achieved</th>
                              <th className="py-2 px-3">Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {activeImpactProjectDetail.assessment.metrics.map((m: any) => (
                              <tr key={m.id}>
                                <td className="py-2 px-3 font-semibold text-stone-800">
                                  {m.metric_category.replace(/_/g, " ")}
                                </td>
                                <td className="py-2 px-3 font-medium text-stone-900">{m.metric_name}</td>
                                <td className="py-2 px-3 text-stone-600">
                                  {m.baseline_value ? `${m.baseline_value} ${m.unit}` : "-"}
                                </td>
                                <td className="py-2 px-3 text-stone-600">
                                  {m.target_value ? `${m.target_value} ${m.unit}` : "-"}
                                </td>
                                <td className="py-2 px-3 font-bold text-emerald-700">
                                  {m.actual_value} {m.unit}
                                </td>
                                <td className="py-2 px-3 text-stone-500">{m.measurement_method}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Impact Evidence Items */}
                  {activeImpactProjectDetail?.assessment?.evidence?.length > 0 && (
                    <div className="p-5 rounded-2xl border border-stone-200 bg-white space-y-3 shadow-sm">
                      <h4 className="font-bold text-xs text-stone-800">
                        Impact Evidence Documents ({activeImpactProjectDetail.assessment.evidence.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {activeImpactProjectDetail.assessment.evidence.map((ev: any) => (
                          <div
                            key={ev.id}
                            className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold uppercase text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                {ev.document_type.replace(/_/g, " ")}
                              </span>
                              <p className="font-semibold text-stone-900 line-clamp-1">{ev.file_name}</p>
                              <p className="text-[10px] text-stone-400">
                                Size: {(ev.file_size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <a
                              href={`${apiUrl}/projects/${activeImpactAssessment.project_id}/impact/evidence/${ev.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-purple-700 hover:bg-purple-100 rounded-lg transition"
                              title="Download File"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Citizen Community Feedback */}
                  {activeImpactProjectDetail?.assessment?.feedback?.length > 0 && (
                    <div className="p-5 rounded-2xl border border-stone-200 bg-white space-y-3 shadow-sm">
                      <h4 className="font-bold text-xs text-stone-800">
                        Citizen Community Feedback ({activeImpactProjectDetail.assessment.feedback.length})
                      </h4>
                      <div className="space-y-2 text-xs">
                        {activeImpactProjectDetail.assessment.feedback.map((f: any) => (
                          <div
                            key={f.id}
                            className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-stone-800">
                                ⭐ {f.rating} / 5 Stars
                              </span>
                              {f.benefit_confirmed && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                  ✓ Benefit Confirmed
                                </span>
                              )}
                            </div>
                            <p className="text-stone-700">{f.feedback}</p>
                            <p className="text-[10px] text-stone-400">
                              By {f.submittedBy?.name || "Original Challenge Submitter"} on{" "}
                              {formatDateSafe(f.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  Select an impact assessment on the left to inspect outcomes and verify.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: INSTITUTIONAL CAPABILITY & EVIDENCE VERIFICATION */}
      {/* ========================================================= */}
      {primaryTab === "capabilities" && (
        <div className="space-y-6">
          {/* Sub-filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                {
                  key: "ALL",
                  label: "All Items",
                  count:
                    (verificationQueue?.pending_evidence_count || 0) +
                    (verificationQueue?.pending_capabilities_count || 0),
                },
                {
                  key: "EVIDENCE",
                  label: "Evidence Documents",
                  count: verificationQueue?.evidence?.length || 0,
                },
                {
                  key: "INSTITUTION_CAPABILITY",
                  label: "HEI Capabilities",
                  count: verificationQueue?.institution_capabilities?.length || 0,
                },
                {
                  key: "INDUSTRY_CAPABILITY",
                  label: "Industry Capabilities",
                  count: verificationQueue?.industry_capabilities?.length || 0,
                },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setVerificationFilter(f.key as any);
                    setActiveVerificationItem(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                    verificationFilter === f.key
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      verificationFilter === f.key
                        ? "bg-white/20 text-white"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchVerificationQueue()}
              disabled={verificationLoading}
              className="px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verificationLoading ? "animate-spin" : ""}`} />
              Refresh Queue
            </button>
          </div>

          {/* Queue Body: 2 Columns */}
          {verificationLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
            </div>
          ) : (
            (() => {
              // Combine items according to filter
              const filteredItems: Array<{
                id: string;
                type: "EVIDENCE" | "INSTITUTION_CAPABILITY" | "INDUSTRY_CAPABILITY";
                raw: any;
              }> = [];

              if (verificationFilter === "ALL" || verificationFilter === "EVIDENCE") {
                (verificationQueue?.evidence || []).forEach((ev) => {
                  filteredItems.push({ id: ev.id, type: "EVIDENCE", raw: ev });
                });
              }
              if (verificationFilter === "ALL" || verificationFilter === "INSTITUTION_CAPABILITY") {
                (verificationQueue?.institution_capabilities || []).forEach((ic) => {
                  filteredItems.push({ id: ic.id, type: "INSTITUTION_CAPABILITY", raw: ic });
                });
              }
              if (verificationFilter === "ALL" || verificationFilter === "INDUSTRY_CAPABILITY") {
                (verificationQueue?.industry_capabilities || []).forEach((ind) => {
                  filteredItems.push({ id: ind.id, type: "INDUSTRY_CAPABILITY", raw: ind });
                });
              }

              if (filteredItems.length === 0) {
                return (
                  <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center space-y-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                    <h3 className="text-base font-bold text-stone-900">Verification Queue Clear</h3>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      All institutional capabilities and documentary evidence submissions have been reviewed and verified.
                    </p>
                  </div>
                );
              }

              const currentSelected = activeVerificationItem || filteredItems[0]?.raw;
              const currentType = activeVerificationItem
                ? activeVerificationType
                : filteredItems[0]?.type || "EVIDENCE";

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Queue Items List */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
                      {filteredItems.map(({ id, type, raw }) => {
                        const isSelected = currentSelected?.id === id;
                        const orgName =
                          raw.organization?.name ||
                          raw.institution?.organization?.name ||
                          raw.industry?.organization?.name ||
                          "Institution";
                        const orgType =
                          raw.organization?.organization_type ||
                          (type === "INSTITUTION_CAPABILITY" ? "INSTITUTION" : "INDUSTRY");

                        let itemTitle = "";
                        let itemSubtitle = "";
                        if (type === "EVIDENCE") {
                          itemTitle = raw.title;
                          itemSubtitle = raw.institutionCapability?.capability?.name || raw.capability?.name || raw.evidence_type;
                        } else {
                          itemTitle = raw.capability?.name || "Capability Claim";
                          itemSubtitle =
                            raw.department?.name ||
                            raw.laboratory?.name ||
                            raw.supportType?.name ||
                            raw.capability?.category ||
                            "Technical Claim";
                        }

                        return (
                          <div
                            key={id}
                            onClick={() => {
                              setActiveVerificationItem(raw);
                              setActiveVerificationType(type);
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? "border-emerald-700 bg-emerald-50/50 shadow-xs"
                                : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    type === "EVIDENCE"
                                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                                      : type === "INSTITUTION_CAPABILITY"
                                      ? "bg-purple-50 text-purple-800 border border-purple-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {type === "EVIDENCE"
                                    ? "EVIDENCE DOC"
                                    : type === "INSTITUTION_CAPABILITY"
                                    ? "HEI CAPABILITY"
                                    : "INDUSTRY CAPABILITY"}
                                </span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    raw.verification_status === "VERIFIED"
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      : raw.verification_status === "PENDING_VERIFICATION"
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : "bg-stone-100 text-stone-700 border border-stone-200"
                                  }`}
                                >
                                  {raw.verification_status === "PENDING_VERIFICATION"
                                    ? "PENDING VERIFICATION"
                                    : raw.verification_status || "UNVERIFIED"}
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-400">
                                {formatDateSafe(raw.created_at, "Recently")}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-stone-900 line-clamp-1">{itemTitle}</h4>
                            <p className="text-xs text-stone-600 line-clamp-1 mt-0.5">{itemSubtitle}</p>

                            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 mt-2 border-t border-stone-100">
                              <span className="font-semibold text-stone-700 line-clamp-1">{orgName}</span>
                              <span className="shrink-0">{orgType}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Detailed Review & Decision Pane */}
                  <div className="lg:col-span-7">
                    {currentSelected ? (
                      <div className="p-6 rounded-2xl border border-stone-200 bg-white space-y-6 shadow-xs">
                        {/* Header */}
                        <div className="border-b border-stone-200 pb-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              {currentType === "EVIDENCE" ? "Evidence Verification Review" : "Capability Claim Review"}
                            </span>
                            <span className="text-xs text-stone-500">
                              Submitted: {formatDateSafe(currentSelected.created_at)}
                            </span>
                          </div>
                          <h2 className="text-xl font-bold text-stone-900">
                            {currentType === "EVIDENCE"
                              ? currentSelected.title
                              : currentSelected.capability?.name || "Capability Claim"}
                          </h2>
                          <div className="flex items-center gap-3 text-xs text-stone-600 mt-1">
                            <span className="font-semibold text-stone-800">
                              {currentSelected.organization?.name ||
                                currentSelected.institution?.organization?.name ||
                                currentSelected.industry?.organization?.name}
                            </span>
                            <span>•</span>
                            <span>
                              {currentSelected.organization?.district ||
                                currentSelected.institution?.organization?.district ||
                                "Jharkhand"}
                            </span>
                          </div>
                        </div>

                        {/* Evidence Specific Details */}
                        {currentType === "EVIDENCE" && (
                          <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Evidence Type</span>
                                <span className="font-bold text-stone-900 mt-0.5 block">{currentSelected.evidence_type}</span>
                              </div>
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Access Policy</span>
                                <span className="font-bold text-stone-900 mt-0.5 block">
                                  {currentSelected.is_public ? "Public on Passport" : "Internal / Confidential"}
                                </span>
                              </div>
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">MIME / Format</span>
                                <span className="font-bold text-stone-900 mt-0.5 block line-clamp-1">
                                  {currentSelected.mime_type || "Document / URL"}
                                </span>
                              </div>
                            </div>

                            {currentSelected.description && (
                              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold mb-1">Description</span>
                                <p className="text-stone-700 leading-relaxed">{currentSelected.description}</p>
                              </div>
                            )}

                            {/* Linked Capability Callout */}
                            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                              <span className="text-[10px] font-bold text-emerald-900 uppercase">Linked Capability Claim</span>
                              <p className="font-bold text-sm text-emerald-950">
                                {currentSelected.institutionCapability?.capability?.name ||
                                  currentSelected.industryCapability?.capability?.name ||
                                  currentSelected.capability?.name ||
                                  "Organization-Wide General Evidence"}
                              </p>
                              {(currentSelected.institutionCapability?.department?.name ||
                                currentSelected.institutionCapability?.laboratory?.name) && (
                                <p className="text-xs text-emerald-800">
                                  Department: {currentSelected.institutionCapability?.department?.name || "N/A"} | Lab:{" "}
                                  {currentSelected.institutionCapability?.laboratory?.name || "N/A"}
                                </p>
                              )}
                              <p className="text-[11px] text-emerald-700 pt-1">
                                ✓ Approving this evidence will automatically transition this linked capability to VERIFIED (0.95 confidence).
                              </p>
                            </div>

                            {/* Document Access Button */}
                            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="font-bold text-blue-950">Document Access & Verification Proof</p>
                                <p className="text-[11px] text-blue-800">
                                  Access the uploaded document via the secure authorized endpoint.
                                </p>
                              </div>
                              <a
                                href={`${apiUrl}/evidence/${currentSelected.id}/view`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl text-xs transition shadow-xs"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Proof Document
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Capability Claim Specific Details */}
                        {currentType !== "EVIDENCE" && (
                          <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Category</span>
                                <span className="font-bold text-stone-900 mt-0.5 block">{currentSelected.capability?.category || "Technical"}</span>
                              </div>
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Source</span>
                                <span className="font-bold text-stone-900 mt-0.5 block">{currentSelected.source || "Self-Reported"}</span>
                              </div>
                              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Confidence Score</span>
                                <span className="font-bold text-stone-900 mt-0.5 block">
                                  {Math.round((currentSelected.confidence_score || 0.5) * 100)}%
                                </span>
                              </div>
                            </div>

                            {currentSelected.evidence_summary && (
                              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold mb-1">Declared Evidence Summary</span>
                                <p className="text-stone-700 leading-relaxed">{currentSelected.evidence_summary}</p>
                              </div>
                            )}

                            {(currentSelected.department?.name || currentSelected.laboratory?.name) && (
                              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Academic Facilities</span>
                                <p className="text-stone-800">
                                  Department: <span className="font-semibold">{currentSelected.department?.name || "N/A"}</span>
                                </p>
                                <p className="text-stone-800">
                                  Laboratory: <span className="font-semibold">{currentSelected.laboratory?.name || "N/A"}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Audit Log / Actions */}
                        <div className="border-t border-stone-200 pt-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setVerificationRejectModal(true);
                                setVerificationRejectionNotes("");
                              }}
                              disabled={processingAction}
                              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                            >
                              <XCircle className="h-4 w-4" /> Reject With Reason
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleApproveVerification(
                                  currentSelected.id,
                                  currentType,
                                  verificationApprovalNotes || "Approved during official capability review.",
                                )
                              }
                              disabled={processingAction}
                              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                            >
                              {processingAction ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4" /> Approve & Verify
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                        Select an item from the verification queue to inspect evidence and approve or reject.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* GOVERNANCE MODALS */}
      {/* ============================================================ */}

      {/* 1. Kickoff Review Modal */}
      {projectActionModal === "kickoff" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-stone-900 break-words">Government Review: Kickoff Formulation</h3>
            <p className="text-xs text-stone-600 break-words">Review the consortium&apos;s objectives and timeline before activating real-world project execution.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Decision</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("APPROVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center break-words ${
                      reviewDecision === "APPROVE" ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    ✓ Approve Kickoff Plan (Set Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("REQUEST_REVISION")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center break-words ${
                      reviewDecision === "REQUEST_REVISION" ? "bg-orange-50 text-orange-900 border-orange-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    Request Revision
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Review Comments & Guidance</label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Notes for the consortium lead..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center">Cancel</button>
              <button onClick={handleKickoffReview} disabled={processingAction} className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold text-center">
                {processingAction ? "Processing..." : "Submit Kickoff Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Milestone Review Modal */}
      {projectActionModal === "milestone" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-stone-900 break-words">Government Review: Milestone Completion</h3>
            <p className="text-xs text-stone-600 break-words">Approval permanently locks the milestone and advances to the next stage. Requesting revision unlocks it for editing.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Decision</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("APPROVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center break-words ${
                      reviewDecision === "APPROVE" ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    ✓ Approve Milestone (Permanent Lock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("REQUEST_REVISION")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center break-words ${
                      reviewDecision === "REQUEST_REVISION" ? "bg-orange-50 text-orange-900 border-orange-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    Request Revision (Unlock)
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Feedback & Notes</label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Official comments on deliverables and validation..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center">Cancel</button>
              <button onClick={handleMilestoneReview} disabled={processingAction} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center">
                {processingAction ? "Processing..." : "Submit Milestone Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Blocker Review Modal */}
      {projectActionModal === "blocker" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-stone-900 break-words">Government Resolution: Blocker Emergency</h3>
            <p className="text-xs text-stone-600 break-words">Resolving the blocker will automatically unfreeze the project and restore status to ACTIVE.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Action</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("RESOLVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center break-words ${
                      reviewDecision === "RESOLVE" ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    ✓ Resolve & Restore to Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("ACKNOWLEDGE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center break-words ${
                      reviewDecision === "ACKNOWLEDGE" ? "bg-stone-100 text-stone-800 border-stone-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    Acknowledge Only (Keep Blocked)
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Intervention / Resolution Notes</label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Describe resolution measures taken..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center">Cancel</button>
              <button onClick={handleBlockerReview} disabled={processingAction} className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold text-center">
                {processingAction ? "Saving..." : "Save Blocker Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Project Modal */}
      {projectActionModal === "complete" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-stone-900 break-words">Zero-Milestone Completion Guard Check</h3>
            <p className="text-xs text-stone-600 break-words">The server verifies all milestones are APPROVED, at least one deliverable is uploaded, and no blockers remain open.</p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Final Completion Endorsement Comments</label>
              <textarea
                rows={3}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Official sign-off comments..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center">Cancel</button>
              <button onClick={handleCompleteProject} disabled={processingAction} className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold text-center">
                {processingAction ? "Validating..." : "Certify Project Completion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Impact Verify Modal */}
      {projectActionModal === "impact" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-stone-900 break-words">Verify Real-World Project Impact</h3>
            <p className="text-xs text-stone-600 break-words">Final handoff point: Confirm real-world outcomes and beneficiaries served.</p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Impact Verification Statement</label>
              <textarea
                rows={3}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Document population impact, measured metrics, and outcomes..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center">Cancel</button>
              <button onClick={handleImpactVerify} disabled={processingAction} className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold text-center">
                {processingAction ? "Saving..." : "Verify Impact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Terminate Project Modal */}
      {projectActionModal === "terminate" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-red-700 break-words">Project Termination Order</h3>
            <p className="text-xs text-stone-600 break-words">This will permanently and irreversibly terminate execution. A detailed, valid reason is mandatory.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Termination Reason <span className="text-red-500">*</span></label>
                <textarea
                  rows={2}
                  required
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="State the formal grounds for termination..."
                  className="w-full rounded-xl border border-red-300 p-2.5 text-xs focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Additional Official Notes</label>
                <textarea
                  rows={2}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Reference official notice / memo ID..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-stone-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center">Cancel</button>
              <button onClick={handleTerminateProject} disabled={processingAction} className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold text-center">
                {processingAction ? "Terminating..." : "Confirm Project Termination"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Approve Impact Verification Modal */}
      {impactActionModal === "approve" && activeImpactAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2 break-words">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Approve Real-World Impact Verification</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed break-words">
              This action verifies that the reported metrics, isolated evidence, and community outcomes are genuine and satisfactory. The project will transition to <span className="font-bold text-emerald-800">IMPACT_VERIFIED</span> and become permanently immutable.
            </p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Administrative Review & Oversight Endorsement Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={impactReviewNotes}
                onChange={(e) => setImpactReviewNotes(e.target.value)}
                placeholder="Official sign-off comments or publication notes..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveImpactAction}
                disabled={processingAction}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm text-center"
              >
                {processingAction ? "Verifying..." : "Confirm & Seal Impact Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Require Revision on Impact Modal */}
      {impactActionModal === "revision" && activeImpactAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-amber-800 flex items-center gap-2 break-words">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Request Revision on Impact Assessment</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed break-words">
              The assessment will transition to <span className="font-bold text-amber-800">REVISION_REQUIRED</span> and unlock for the Consortium Lead to update metrics or provide additional evidence.
            </p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Mandatory Reviewer Notes & Revision Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={impactReviewNotes}
                onChange={(e) => setImpactReviewNotes(e.target.value)}
                placeholder="Explain what metrics or evidence require correction..."
                className="w-full rounded-xl border border-amber-300 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleRequireRevisionImpactAction}
                disabled={processingAction}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm text-center"
              >
                {processingAction ? "Sending..." : "Submit Revision Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Reject Impact Modal */}
      {impactActionModal === "reject" && activeImpactAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-rose-800 flex items-center gap-2 break-words">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>Reject Impact Verification</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed break-words">
              This is a <span className="font-bold text-rose-700">permanent terminal decision</span>. The assessment will be marked <span className="font-bold text-rose-800">REJECTED</span>. The project will remain in COMPLETED state and cannot become IMPACT_VERIFIED.
            </p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Mandatory Rejection Grounds & Findings <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={impactReviewNotes}
                onChange={(e) => setImpactReviewNotes(e.target.value)}
                placeholder="State the formal reasons for rejecting verification..."
                className="w-full rounded-xl border border-rose-300 p-2.5 text-xs focus:border-rose-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectImpactAction}
                disabled={processingAction}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm text-center"
              >
                {processingAction ? "Rejecting..." : "Confirm Final Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Audit Revocation Modal (PLATFORM_ADMIN Only) */}
      {impactActionModal === "revoke" && activeImpactAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-purple-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-purple-900 flex items-center gap-2 break-words">
              <Shield className="h-5 w-5 text-purple-700 shrink-0" />
              <span>Audit Revocation of Verified Impact (Platform Administrator)</span>
            </h3>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1 break-words">
              <p className="font-bold">⚠️ Warning: Controlled Administrative Downgrade</p>
              <p>
                This administrative action will immediately downgrade the project from <span className="font-bold">IMPACT_VERIFIED</span> back to <span className="font-bold">COMPLETED</span>, and return the Impact Assessment to <span className="font-bold">REVISION_REQUIRED</span>. The original verification will remain permanently logged in the audit history.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Mandatory Revocation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={impactRevocationReason}
                onChange={(e) => setImpactRevocationReason(e.target.value)}
                placeholder="State the audit findings or grounds warranting revocation..."
                className="w-full rounded-xl border border-purple-300 p-2.5 text-xs focus:border-purple-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeImpactAction}
                disabled={processingAction}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm text-center"
              >
                {processingAction ? "Revoking..." : "Execute Audit Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Institutional Capability / Evidence Rejection Modal */}
      {verificationRejectModal && activeVerificationItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-rose-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-rose-900 flex items-center gap-2 break-words">
              <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0" />
              <span>Rejection of Capability / Evidence Submission</span>
            </h3>
            <p className="text-xs text-stone-600 break-words">
              State the audit grounds or deficiencies found. A mandatory explanation is permanently recorded in the verification audit ledger.
            </p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Mandatory Rejection Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={verificationRejectionNotes}
                onChange={(e) => setVerificationRejectionNotes(e.target.value)}
                placeholder="e.g., The submitted accreditation certificate is expired or does not substantiate the specific technical capability claim..."
                className="w-full rounded-xl border border-rose-300 p-2.5 text-xs focus:border-rose-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setVerificationRejectModal(false)}
                className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectVerification}
                disabled={processingAction || !verificationRejectionNotes.trim()}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 text-center"
              >
                {processingAction ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 9: PRI & ULB REPRESENTATIVE AUTHORITY VERIFICATION */}
      {/* ========================================================= */}
      {primaryTab === "pri_ulb" && (
        <PriUlbVerificationQueue apiUrl={apiUrl} token={token} />
      )}
    </div>
  );
}
