"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { formatUserRole, formatDateSafe } from "../../lib/utils";
import { ProblemClustersQueue } from "./ProblemClustersQueue";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  HeartHandshake,
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

interface EoiContribution {
  id: string;
  contribution_type: string;
  description: string;
  estimated_monetary_value?: number;
  quantity?: number;
  unit?: string;
}

interface EoiItem {
  id: string;
  challenge_id: string;
  organization_id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "DISCUSSION_REQUIRED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "PROJECT_FORMED";
  motivation: string;
  proposed_contribution: string;
  proposed_approach: string;
  resource_summary?: string;
  timeline: string;
  timeline_notes?: string;
  collaboration_lead_name?: string;
  collaboration_lead_designation?: string;
  collaboration_lead_email?: string;
  collaboration_lead_phone?: string;
  rejection_reason?: string;
  discussion_notes?: string;
  submitted_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    type: string;
    category?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  challenge?: {
    id: string;
    title: string;
    district: string;
    status: string;
    citizen_severity?: string;
  };
  contributions?: EoiContribution[];
  evidence?: any[];
  reviews?: any[];
}

export default function ReviewerQueuePage() {
  const { user, token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  // Primary Tab: 'clusters' | 'challenges' | 'eois' | 'consortium' | 'projects' | 'impact' | 'innovations' | 'capabilities'
  const [primaryTab, setPrimaryTab] = useState<
    "clusters" | "challenges" | "eois" | "consortium" | "projects" | "impact" | "innovations" | "capabilities"
  >("clusters");

  // Sync tab from URL query param if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        ["clusters", "challenges", "eois", "consortium", "projects", "impact", "innovations", "capabilities"].includes(tabParam)
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

  // Tab 2: EOI Review State
  const [eoisQueue, setEoisQueue] = useState<EoiItem[]>([]);
  const [eoisLoading, setEoisLoading] = useState<boolean>(false);
  const [selectedEoiStatus, setSelectedEoiStatus] = useState<string>("SUBMITTED");
  const [activeEoi, setActiveEoi] = useState<EoiItem | null>(null);
  const [discussionMessage, setDiscussionMessage] = useState<string>("");
  const [eoiRejectionReason, setEoiRejectionReason] = useState<string>("");
  const [eoiActionModal, setEoiActionModal] = useState<"discussion" | "reject" | null>(null);

  // Tab 3: Collaborative Project Formation State
  const [acceptedEois, setAcceptedEois] = useState<EoiItem[]>([]);
  const [formationLoading, setFormationLoading] = useState<boolean>(false);
  const [selectedFormationChallengeId, setSelectedFormationChallengeId] = useState<string>("");
  const [selectedEoiIds, setSelectedEoiIds] = useState<string[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [projectDescription, setProjectDescription] = useState<string>("");

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

  // Fetch EOIs Queue
  const fetchEoisQueue = useCallback(async () => {
    if (!token || !isReviewer) return;
    setEoisLoading(true);
    try {
      const url = selectedEoiStatus && selectedEoiStatus !== "ALL"
        ? `${apiUrl}/admin/eois?status=${selectedEoiStatus}`
        : `${apiUrl}/admin/eois`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEoisQueue(data);
        if (data.length > 0) {
          setActiveEoi(data[0]);
        } else {
          setActiveEoi(null);
        }
      }
    } catch (err) {
      console.error("Failed to load EOIs queue:", err);
    } finally {
      setEoisLoading(false);
    }
  }, [apiUrl, isReviewer, selectedEoiStatus, token]);

  // Fetch Accepted EOIs for Project Formation
  const fetchFormationData = useCallback(async () => {
    if (!token || !isReviewer) return;
    setFormationLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/eois?status=ACCEPTED`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: EoiItem[] = await res.json();
        setAcceptedEois(data);
        if (data.length > 0 && !selectedFormationChallengeId) {
          const firstChallengeId = data[0].challenge_id;
          setSelectedFormationChallengeId(firstChallengeId);
          setProjectTitle(`Collaborative Project: ${data[0].challenge?.title || "Consortium Initiative"}`);
          setProjectDescription(`Multi-institutional consortium formed to address challenge: ${data[0].challenge?.title || ""}.`);
        }
      }
    } catch (err) {
      console.error("Failed to load accepted EOIs for formation:", err);
    } finally {
      setFormationLoading(false);
    }
  }, [apiUrl, isReviewer, token, selectedFormationChallengeId]);

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
    } else if (primaryTab === "eois") {
      fetchEoisQueue();
    } else if (primaryTab === "consortium") {
      fetchFormationData();
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
    fetchEoisQueue,
    fetchFormationData,
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

  // Handle EOI Review Actions
  const handleEoiAction = async (
    action: "ACCEPT" | "REQUEST_DISCUSSION" | "REJECT",
  ) => {
    if (!activeEoi || !token) return;

    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      let url = "";
      let body: any = {};

      if (action === "ACCEPT") {
        url = `${apiUrl}/admin/eois/${activeEoi.id}/accept`;
      } else if (action === "REQUEST_DISCUSSION") {
        if (!discussionMessage.trim()) {
          setActionError("Discussion feedback message is required.");
          setProcessingAction(false);
          return;
        }
        url = `${apiUrl}/admin/eois/${activeEoi.id}/request-discussion`;
        body = { message: discussionMessage.trim() };
      } else if (action === "REJECT") {
        if (!eoiRejectionReason.trim()) {
          setActionError("A rejection reason is mandatory.");
          setProcessingAction(false);
          return;
        }
        url = `${apiUrl}/admin/eois/${activeEoi.id}/reject`;
        body = { reason: eoiRejectionReason.trim() };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update EOI review status.");
      }

      const updatedEoi = await res.json();
      setActionSuccess(
        action === "ACCEPT"
          ? "EOI Accepted! It is now in the approved candidate pool for project formation."
          : action === "REQUEST_DISCUSSION"
          ? "Discussion requested. The organization has been notified to revise their EOI."
          : "EOI Rejected."
      );

      setEoiActionModal(null);
      setDiscussionMessage("");
      setEoiRejectionReason("");

      // Update in queue
      setEoisQueue((prev) =>
        prev.map((item) => (item.id === activeEoi.id ? { ...item, ...updatedEoi } : item))
      );
      setActiveEoi((prev) => (prev ? { ...prev, ...updatedEoi } : null));
    } catch (err: any) {
      setActionError(err.message || "Failed to process EOI review.");
    } finally {
      setProcessingAction(false);
    }
  };

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

  // Handle Collaborative Project Formation
  const handleFormCollaborativeProject = async () => {
    if (!token || !selectedFormationChallengeId) return;

    if (selectedEoiIds.length === 0) {
      setActionError("Please select at least one accepted EOI to form a collaborative project.");
      return;
    }

    if (!projectTitle.trim()) {
      setActionError("Project title is required.");
      return;
    }

    setProcessingAction(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const res = await fetch(`${apiUrl}/admin/challenges/${selectedFormationChallengeId}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eoi_ids: selectedEoiIds,
          title: projectTitle.trim(),
          description: projectDescription.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to form collaborative project.");
      }

      const formedProject = await res.json();
      setActionSuccess(
        `Collaborative Project successfully formed! "${formedProject.title || projectTitle}" created. Challenge intake closed (PROJECT_INITIATED) and ${selectedEoiIds.length} participant organization(s) bound.`
      );

      // Reset selection
      setSelectedEoiIds([]);
      // Refresh formation data
      fetchFormationData();
    } catch (err: any) {
      setActionError(err.message || "Error forming collaborative project.");
    } finally {
      setProcessingAction(false);
    }
  };

  if (!user && !challengeLoading && !eoisLoading) {
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

  if (!isReviewer && !challengeLoading && !eoisLoading) {
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

  // Helper: Group accepted EOIs by challenge for Project Formation
  const challengesWithAcceptedEois: { [challengeId: string]: { challenge: any; eois: EoiItem[] } } = {};
  acceptedEois.forEach((eoi) => {
    if (!challengesWithAcceptedEois[eoi.challenge_id]) {
      challengesWithAcceptedEois[eoi.challenge_id] = {
        challenge: eoi.challenge,
        eois: [],
      };
    }
    challengesWithAcceptedEois[eoi.challenge_id].eois.push(eoi);
  });

  const currentFormationGroup = challengesWithAcceptedEois[selectedFormationChallengeId];

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
            Review citizen problems, evaluate institutional Expressions of Interest, and assemble multi-organization collaborative projects.
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
            setPrimaryTab("eois");
            setActionSuccess(null);
            setActionError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "eois"
              ? "bg-emerald-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <HeartHandshake className="h-4 w-4" />
          3. EOI Candidate Pool
          {eoisQueue.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {eoisQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setPrimaryTab("consortium");
            setActionSuccess(null);
            setActionError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            primaryTab === "consortium"
              ? "bg-emerald-700 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Users className="h-4 w-4" />
          4. Consortium Formation
          {acceptedEois.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              {acceptedEois.length} Ready
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
          5. Project Governance
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
          7. Innovation & IP Review
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
          8. Capability Verification
          {((verificationQueue?.pending_evidence_count || 0) + (verificationQueue?.pending_capabilities_count || 0)) > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-stone-950 font-bold">
              {(verificationQueue?.pending_evidence_count || 0) + (verificationQueue?.pending_capabilities_count || 0)}
            </span>
          )}
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
      {/* TAB 2: EXPRESSION OF INTEREST (EOI) REVIEW QUEUE */}
      {/* ========================================================= */}
      {primaryTab === "eois" && (
        <div className="space-y-6">
          {/* EOI Status Filter Bar */}
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-xs">
            {[
              { key: "SUBMITTED", label: "New EOIs" },
              { key: "UNDER_REVIEW", label: "Under Review" },
              { key: "DISCUSSION_REQUIRED", label: "Discussion Pending" },
              { key: "ACCEPTED", label: "Accepted Candidates" },
              { key: "PROJECT_FORMED", label: "Project Formed" },
              { key: "REJECTED", label: "Rejected" },
              { key: "ALL", label: "All EOIs" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedEoiStatus(tab.key);
                  setActiveEoi(null);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedEoiStatus === tab.key
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs"
                    : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: EOI Queue List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  EOI Queue ({eoisQueue.length})
                </h3>
              </div>

              {eoisLoading ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-stone-400" />
                  Loading Expression of Interests...
                </div>
              ) : eoisQueue.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  No Expressions of Interest in this queue.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                  {eoisQueue.map((item) => {
                    const isSelected = activeEoi?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveEoi(item);
                          setActionSuccess(null);
                          setActionError(null);
                          setEoiActionModal(null);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-600/20"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-500 pb-1">
                          <span className="font-bold text-stone-900 truncate max-w-[180px]">
                            {item.organization?.name || "Institution"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'DISCUSSION_REQUIRED' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'PROJECT_FORMED' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-stone-800 line-clamp-1">
                          Re: {item.challenge?.title || "Civic Challenge"}
                        </h4>
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                          {item.proposed_contribution || item.motivation}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-stone-400">
                          <span>{item.organization?.type?.replace(/_/g, " ")}</span>
                          <span>•</span>
                          <span>{formatDateSafe(item.submitted_at || item.created_at)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: EOI Inspection & Reviewer Actions */}
            <div className="lg:col-span-8">
              {activeEoi ? (
                <div className="p-6 rounded-2xl border border-stone-200 bg-white space-y-6 shadow-sm">
                  {/* Title & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400">EOI ID: {activeEoi.id}</span>
                      <h2 className="text-xl font-bold text-stone-900 mt-0.5">
                        {activeEoi.organization?.name || "Proposing Institution"}
                      </h2>
                      <p className="text-xs text-stone-600 mt-1 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-stone-400" />
                        <span className="font-semibold">{activeEoi.organization?.type?.replace(/_/g, " ")}</span>
                        <span>•</span>
                        <span>Challenge:</span>
                        <Link
                          href={`/challenges/${activeEoi.challenge_id}`}
                          target="_blank"
                          className="font-semibold text-emerald-800 hover:underline flex items-center gap-1"
                        >
                          {activeEoi.challenge?.title} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </p>
                    </div>

                    <div className="shrink-0">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        activeEoi.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        activeEoi.status === 'DISCUSSION_REQUIRED' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        activeEoi.status === 'PROJECT_FORMED' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                        activeEoi.status === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-300' :
                        'bg-stone-50 text-stone-700 border-stone-300'
                      }`}>
                        {activeEoi.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Proposing Lead Metadata Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Collaboration Lead</span>
                      <span className="font-semibold text-stone-800">{activeEoi.collaboration_lead_name || "Unspecified"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Designation</span>
                      <span className="font-semibold text-stone-800">{activeEoi.collaboration_lead_designation || "Faculty / Director"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Email Contact</span>
                      <span className="font-semibold text-stone-800">{activeEoi.collaboration_lead_email || activeEoi.organization?.contact_email || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Proposed Timeline</span>
                      <span className="font-semibold text-stone-800">{activeEoi.timeline?.replace(/_/g, " ")}</span>
                    </div>
                  </div>

                  {/* Proposal Details */}
                  <div className="space-y-4 text-xs">
                    <div>
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1">
                        Motivation &amp; Institutional Alignment
                      </h4>
                      <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {activeEoi.motivation}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1">
                        Proposed Technical Approach &amp; Methodology
                      </h4>
                      <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {activeEoi.proposed_approach}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1">
                        Proposed Contribution &amp; Scope
                      </h4>
                      <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {activeEoi.proposed_contribution}
                      </p>
                    </div>

                    {activeEoi.resource_summary && (
                      <div>
                        <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1">
                          Resource Requirements &amp; Infrastructure
                        </h4>
                        <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed whitespace-pre-wrap">
                          {activeEoi.resource_summary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Itemized Contributions Table */}
                  {activeEoi.contributions && activeEoi.contributions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                        Itemized Contributions ({activeEoi.contributions.length})
                      </h4>
                      <div className="overflow-x-auto border border-stone-200 rounded-xl">
                        <table className="min-w-full divide-y divide-stone-200 text-xs text-left">
                          <thead className="bg-stone-50 font-bold text-stone-600">
                            <tr>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Description</th>
                              <th className="px-3 py-2">Qty / Unit</th>
                              <th className="px-3 py-2">Est. Value (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 bg-white">
                            {activeEoi.contributions.map((c, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-semibold text-emerald-800">{c.contribution_type}</td>
                                <td className="px-3 py-2 text-stone-700">{c.description}</td>
                                <td className="px-3 py-2 text-stone-600">{c.quantity ? `${c.quantity} ${c.unit || ''}` : '—'}</td>
                                <td className="px-3 py-2 text-stone-800 font-mono">
                                  {c.estimated_monetary_value ? `₹${Number(c.estimated_monetary_value).toLocaleString('en-IN')}` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Discussion Notes / Rejection Reason Display */}
                  {activeEoi.discussion_notes && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-amber-700" /> Active Discussion Notes:
                      </span>
                      <p className="leading-relaxed">{activeEoi.discussion_notes}</p>
                    </div>
                  )}

                  {activeEoi.rejection_reason && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-700" /> Rejection Reason:
                      </span>
                      <p className="leading-relaxed">{activeEoi.rejection_reason}</p>
                    </div>
                  )}

                  {/* Review Action Controls */}
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                        Governance Review Actions
                      </h4>
                      <span className="text-[11px] text-stone-500">
                        Acceptance bundles into candidate pool (does not form project)
                      </span>
                    </div>

                    {/* Modal Input for Discussion */}
                    {eoiActionModal === "discussion" && (
                      <div className="p-4 rounded-xl bg-white border border-amber-300 space-y-3 shadow-xs">
                        <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4 text-amber-700" /> Request Clarification / Scope Modification
                        </h5>
                        <p className="text-[11px] text-amber-800">
                          State what technical information, resource commitment, or methodology adjustments are required before acceptance.
                        </p>
                        <textarea
                          rows={3}
                          value={discussionMessage}
                          onChange={(e) => setDiscussionMessage(e.target.value)}
                          placeholder="e.g. Please clarify deployment methodology for the pilot sensor nodes in Block A..."
                          className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-amber-600 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEoiActionModal(null)}
                            className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={processingAction || !discussionMessage.trim()}
                            onClick={() => handleEoiAction("REQUEST_DISCUSSION")}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-700 text-xs font-bold text-white hover:bg-amber-800 transition disabled:opacity-50"
                          >
                            {processingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Send Discussion Request
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Modal Input for Reject */}
                    {eoiActionModal === "reject" && (
                      <div className="p-4 rounded-xl bg-white border border-red-300 space-y-3 shadow-xs">
                        <h5 className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-red-700" /> Reject Expression of Interest
                        </h5>
                        <p className="text-[11px] text-red-800">
                          A clear and explicit rejection reason is mandatory and will be visible to the submitting institution.
                        </p>
                        <textarea
                          rows={3}
                          value={eoiRejectionReason}
                          onChange={(e) => setEoiRejectionReason(e.target.value)}
                          placeholder="State the governance justification for rejecting this EOI..."
                          className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-red-600 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEoiActionModal(null)}
                            className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={processingAction || !eoiRejectionReason.trim()}
                            onClick={() => handleEoiAction("REJECT")}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-700 text-xs font-bold text-white hover:bg-red-800 transition disabled:opacity-50"
                          >
                            {processingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Button Controls */}
                    {eoiActionModal === null && (
                      <div className="flex flex-wrap items-center gap-3">
                        {activeEoi.status !== "ACCEPTED" && activeEoi.status !== "PROJECT_FORMED" && (
                          <button
                            type="button"
                            disabled={processingAction}
                            onClick={() => handleEoiAction("ACCEPT")}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Accept EOI into Consortium Pool
                          </button>
                        )}

                        {activeEoi.status !== "PROJECT_FORMED" && activeEoi.status !== "REJECTED" && (
                          <button
                            type="button"
                            disabled={processingAction}
                            onClick={() => setEoiActionModal("discussion")}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm transition disabled:opacity-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Request Discussion / Changes
                          </button>
                        )}

                        {activeEoi.status !== "REJECTED" && activeEoi.status !== "PROJECT_FORMED" && (
                          <button
                            type="button"
                            disabled={processingAction}
                            onClick={() => setEoiActionModal("reject")}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject EOI
                          </button>
                        )}

                        {activeEoi.status === "ACCEPTED" && (
                          <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                            <Check className="h-4 w-4 text-emerald-700" /> Ready for project bundling in Tab 3
                          </span>
                        )}

                        {activeEoi.status === "PROJECT_FORMED" && (
                          <span className="text-xs text-blue-800 font-semibold flex items-center gap-1">
                            <Users className="h-4 w-4 text-blue-700" /> Formally committed to active project
                          </span>
                        )}

                        {processingAction && <Loader2 className="h-4 w-4 animate-spin text-emerald-700 ml-2" />}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                  Select an Expression of Interest from the queue to inspect technical scope and record governance decisions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: COLLABORATIVE PROJECT FORMATION WORKSPACE */}
      {/* ========================================================= */}
      {primaryTab === "consortium" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-700 text-white shadow-xs">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">
                  Collaborative Project Formation Workspace
                </h3>
                <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
                  Phase 6 Invariant: Accepting an EOI does NOT form a project. Here, reviewers explicitly select and bundle approved institutional candidates into a unified collaborative project, binding multiple institutions simultaneously and transitioning the challenge into <strong>PROJECT_INITIATED</strong>.
                </p>
              </div>
            </div>
          </div>

          {formationLoading ? (
            <div className="p-16 text-center text-xs text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-stone-400" />
              Loading accepted candidate pools...
            </div>
          ) : Object.keys(challengesWithAcceptedEois).length === 0 ? (
            <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center space-y-3">
              <FileCheck2 className="h-10 w-10 text-stone-400 mx-auto" />
              <h3 className="text-sm font-bold text-stone-800">No Accepted Candidates Available</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                No challenges currently have accepted EOIs awaiting project formation. Review incoming EOIs in Tab 2 and accept qualified candidates to build a consortium.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPrimaryTab("eois")}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  Go to EOI Review Queue
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Challenge Selector */}
              <div className="lg:col-span-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Challenges with Accepted Candidates ({Object.keys(challengesWithAcceptedEois).length})
                </h3>

                <div className="space-y-2.5">
                  {Object.entries(challengesWithAcceptedEois).map(([cId, data]) => {
                    const isSelected = selectedFormationChallengeId === cId;
                    return (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => {
                          setSelectedFormationChallengeId(cId);
                          setSelectedEoiIds([]);
                          setProjectTitle(`Collaborative Project: ${data.challenge?.title || ""}`);
                          setProjectDescription(`Consortium project addressing: ${data.challenge?.title || ""}.`);
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
                          <span className="font-semibold text-emerald-800">
                            {data.eois.length} Accepted EOI{data.eois.length > 1 ? "s" : ""}
                          </span>
                          <span className="font-mono text-[10px] text-stone-400">
                            {data.challenge?.district || "District"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-stone-900 line-clamp-2">
                          {data.challenge?.title || "Challenge"}
                        </h4>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Multi-select Consortium Builder */}
              <div className="lg:col-span-8">
                {currentFormationGroup ? (
                  <div className="p-6 rounded-2xl border border-stone-200 bg-white space-y-6 shadow-sm">
                    {/* Header */}
                    <div>
                      <span className="text-[10px] font-mono text-stone-400">
                        Target Challenge: {currentFormationGroup.challenge?.id}
                      </span>
                      <h2 className="text-xl font-bold text-stone-900 mt-0.5">
                        {currentFormationGroup.challenge?.title}
                      </h2>
                      <p className="text-xs text-stone-600 mt-1">
                        Select which approved institutional partners to bundle into this collaborative project.
                      </p>
                    </div>

                    {/* Candidate Pool Checklist */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                          Accepted Institutional Candidates ({currentFormationGroup.eois.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedEoiIds.length === currentFormationGroup.eois.length) {
                              setSelectedEoiIds([]);
                            } else {
                              setSelectedEoiIds(currentFormationGroup.eois.map((e) => e.id));
                            }
                          }}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          {selectedEoiIds.length === currentFormationGroup.eois.length
                            ? "Deselect All"
                            : "Select All Candidates"}
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {currentFormationGroup.eois.map((eoi) => {
                          const isChecked = selectedEoiIds.includes(eoi.id);
                          return (
                            <div
                              key={eoi.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedEoiIds((prev) => prev.filter((id) => id !== eoi.id));
                                } else {
                                  setSelectedEoiIds((prev) => [...prev, eoi.id]);
                                }
                              }}
                              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                                isChecked
                                  ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600/20"
                                  : "border-stone-200 bg-white hover:border-stone-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent onClick
                                className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-600"
                              />

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-stone-900">
                                    {eoi.organization?.name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                                    {eoi.organization?.type?.replace(/_/g, " ")}
                                  </span>
                                </div>

                                <p className="text-xs text-stone-600 line-clamp-2">
                                  {eoi.proposed_contribution || eoi.proposed_approach}
                                </p>

                                <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-500">
                                  <span>Lead: <strong>{eoi.collaboration_lead_name || "Unspecified"}</strong></span>
                                  <span>•</span>
                                  <span>Timeline: <strong>{eoi.timeline?.replace(/_/g, " ")}</strong></span>
                                  {eoi.contributions && eoi.contributions.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-700 font-medium">
                                        {eoi.contributions.length} contribution item{eoi.contributions.length > 1 ? "s" : ""}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Consortium Formation Form & Submit */}
                    <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                          Consortium Project Details
                        </h4>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {selectedEoiIds.length} candidate{selectedEoiIds.length === 1 ? "" : "s"} selected
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-semibold text-stone-700 block mb-1">
                            Collaborative Project Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="Enter formalized project title..."
                            className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-stone-700 block mb-1">
                            Project Description / Objective Summary
                          </label>
                          <textarea
                            rows={3}
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            placeholder="State the collaborative mission, target outcome, and consortium governance plan..."
                            className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={processingAction || selectedEoiIds.length === 0}
                          onClick={handleFormCollaborativeProject}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
                        >
                          {processingAction ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FolderGit2 className="h-4 w-4" />
                          )}
                          Form Collaborative Project ({selectedEoiIds.length} Institutional Partners)
                        </button>
                        <p className="text-[11px] text-stone-500 text-center mt-2">
                          This will transition the challenge to PROJECT_INITIATED, close further EOI intake, and bind selected institutions to the project.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-16 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
                    Select a challenge on the left to review candidate pool and form a consortium.
                  </div>
                )}
              </div>
            </div>
          )}
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
                                  {m.baseline_value ? `${m.baseline_value} ${m.unit}` : "—"}
                                </td>
                                <td className="py-2 px-3 text-stone-600">
                                  {m.target_value ? `${m.target_value} ${m.unit}` : "—"}
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-stone-900">Government Review: Kickoff Formulation</h3>
            <p className="text-xs text-stone-600">Review the consortium's objectives and timeline before activating real-world project execution.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("APPROVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      reviewDecision === "APPROVE" ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    ✓ Approve Kickoff Plan (Set Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("REQUEST_REVISION")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={handleKickoffReview} disabled={processingAction} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold">
                {processingAction ? "Processing..." : "Submit Kickoff Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Milestone Review Modal */}
      {projectActionModal === "milestone" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-stone-900">Government Review: Milestone Completion</h3>
            <p className="text-xs text-stone-600">Approval permanently locks the milestone and advances to the next stage. Requesting revision unlocks it for editing.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("APPROVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      reviewDecision === "APPROVE" ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    ✓ Approve Milestone (Permanent Lock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("REQUEST_REVISION")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={handleMilestoneReview} disabled={processingAction} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
                {processingAction ? "Processing..." : "Submit Milestone Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Blocker Review Modal */}
      {projectActionModal === "blocker" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-stone-900">Government Resolution: Blocker Emergency</h3>
            <p className="text-xs text-stone-600">Resolving the blocker will automatically unfreeze the project and restore status to ACTIVE.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("RESOLVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      reviewDecision === "RESOLVE" ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    ✓ Resolve & Restore to Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("ACKNOWLEDGE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={handleBlockerReview} disabled={processingAction} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold">
                {processingAction ? "Saving..." : "Save Blocker Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Project Modal */}
      {projectActionModal === "complete" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-stone-900">Zero-Milestone Completion Guard Check</h3>
            <p className="text-xs text-stone-600">The server verifies all milestones are APPROVED, at least one deliverable is uploaded, and no blockers remain open.</p>
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={handleCompleteProject} disabled={processingAction} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold">
                {processingAction ? "Validating..." : "Certify Project Completion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Impact Verify Modal */}
      {projectActionModal === "impact" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-stone-900">Verify Real-World Project Impact</h3>
            <p className="text-xs text-stone-600">Final handoff point: Confirm real-world outcomes and beneficiaries served.</p>
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={handleImpactVerify} disabled={processingAction} className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold">
                {processingAction ? "Saving..." : "Verify Impact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Terminate Project Modal */}
      {projectActionModal === "terminate" && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-red-700">Project Termination Order</h3>
            <p className="text-xs text-stone-600">This will permanently and irreversibly terminate execution. A detailed, valid reason is mandatory.</p>
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button onClick={() => setProjectActionModal(null)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold">Cancel</button>
              <button onClick={handleTerminateProject} disabled={processingAction} className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold">
                {processingAction ? "Terminating..." : "Confirm Project Termination"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Approve Impact Verification Modal */}
      {impactActionModal === "approve" && activeImpactAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Approve Real-World Impact Verification
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              This action verifies that the reported metrics, isolated evidence, and community outcomes are genuine and satisfactory. The project will transition to <span className="font-bold text-emerald-800">IMPACT_VERIFIED</span> and become permanently immutable.
            </p>
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Official Government Verification Endorsement Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={impactReviewNotes}
                onChange={(e) => setImpactReviewNotes(e.target.value)}
                placeholder="Official sign-off comments or publication notes..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveImpactAction}
                disabled={processingAction}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <h3 className="font-bold text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Request Revision on Impact Assessment
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequireRevisionImpactAction}
                disabled={processingAction}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <h3 className="font-bold text-sm text-rose-800 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              Reject Impact Verification
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectImpactAction}
                disabled={processingAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-purple-300">
            <h3 className="font-bold text-sm text-purple-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-700" />
              Audit Revocation of Verified Impact (Platform Administrator)
            </h3>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setImpactActionModal(null)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeImpactAction}
                disabled={processingAction}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-rose-300">
            <h3 className="font-bold text-sm text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              Rejection of Capability / Evidence Submission
            </h3>
            <p className="text-xs text-stone-600">
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
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setVerificationRejectModal(false)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectVerification}
                disabled={processingAction || !verificationRejectionNotes.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {processingAction ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
