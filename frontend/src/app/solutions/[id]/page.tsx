"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  Lightbulb,
  Building2,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  Sparkles,
  Download,
  Upload,
  PlusCircle,
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  Handshake,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  Layers,
  Share2,
  Trash2,
  Network,
  UserCheck,
  BookOpen,
  Target,
} from "lucide-react";
import { formatDateSafe } from "../../../lib/utils";

export default function SolutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const solutionId = params?.id as string;
  const { user, token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [solution, setSolution] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showCollabModal, setShowCollabModal] = useState<boolean>(false);
  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);

  // University members roster for searchable team member selector
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string>("");
  const [memberFilterRole, setMemberFilterRole] = useState<"ALL" | "FACULTY" | "STUDENT">("ALL");

  // Collaboration offer form state
  const [collabType, setCollabType] = useState<string>("TECHNOLOGY");
  const [collabTitle, setCollabTitle] = useState<string>("");
  const [collabDesc, setCollabDesc] = useState<string>("");
  const [collabFinancial, setCollabFinancial] = useState<string>("");
  const [collabResources, setCollabResources] = useState<string>("");
  const [collabTimeline, setCollabTimeline] = useState<string>("3 to 6 months");

  // Team member form state
  const [memberRole, setMemberRole] = useState<string>("FACULTY_MENTOR");
  const [memberName, setMemberName] = useState<string>("");
  const [memberEmail, setMemberEmail] = useState<string>("");
  const [memberDept, setMemberDept] = useState<string>("");
  const [memberDesignation, setMemberDesignation] = useState<string>("");
  const [memberDegree, setMemberDegree] = useState<string>("");
  const [memberYear, setMemberYear] = useState<number>(3);
  const [memberHours, setMemberHours] = useState<number>(10);

  // Document upload state
  const [docTitle, setDocTitle] = useState<string>("");
  const [docType, setDocType] = useState<string>("TECHNICAL_PROPOSAL");
  const [docFile, setDocFile] = useState<File | null>(null);

  const fetchSolution = useCallback(async () => {
    if (!solutionId) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/solutions/${solutionId}`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load proposed solution (HTTP ${res.status})`);
      }
      const data = await res.json();
      setSolution(data);

      // Fetch org members if proposing org matches user org
      if (data?.proposing_organization_id && token) {
        fetch(`${apiUrl}/organizations/${data.proposing_organization_id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((members) => {
            if (Array.isArray(members)) setOrgMembers(members);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || "Failed to load solution");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, solutionId, token]);

  useEffect(() => {
    fetchSolution();
  }, [fetchSolution]);

  // Authorization checks
  const userOrgId = user?.primaryOrganization?.id || user?.memberships?.[0]?.organization_id;
  const isProposingOrg = userOrgId && solution?.proposing_organization_id === userOrgId;
  const isGovOrAdmin =
    user?.role === "PLATFORM_ADMIN" ||
    user?.role === "GOVERNMENT_ADMIN" ||
    user?.role === "GOVERNMENT_OFFICER";

  // Handle Collaboration Submission
  const handleOfferCollaboration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !userOrgId) {
      setError("Please sign in with your organization account to offer collaboration.");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/solutions/${solutionId}/collaborations?orgId=${userOrgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collaboration_type: collabType,
          title: collabTitle,
          description: collabDesc,
          financial_contribution: collabFinancial ? Number(collabFinancial) : undefined,
          resources_offered: collabResources,
          estimated_timeline: collabTimeline,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to submit collaboration offer");
      }

      setShowCollabModal(false);
      setActionSuccess("Collaboration offer submitted successfully! The proposing university will review your proposal.");
      setCollabTitle("");
      setCollabDesc("");
      setCollabFinancial("");
      setCollabResources("");
      fetchSolution();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Offer Response (Accept / Decline / Discuss)
  const handleRespondOffer = async (
    offerId: string,
    action: "ACCEPT" | "DECLINE" | "DISCUSS",
    customNotes?: string,
  ) => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/solutions/${solutionId}/collaborations/${offerId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          response_notes:
            customNotes ||
            (action === "ACCEPT" ? "Welcome to the project consortium!" : "Thank you for your proposal."),
          discussion_notes:
            action === "DISCUSS"
              ? customNotes || "We would like to discuss technical specs and integration timelines."
              : undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update offer status");
      }
      setActionSuccess(`Collaboration offer marked as ${action}.`);
      fetchSolution();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Team Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/solutions/${solutionId}/team-members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedMemberUserId || undefined,
          name: memberName,
          email: memberEmail || undefined,
          role: memberRole,
          department: memberDept || undefined,
          designation: memberDesignation || undefined,
          degree_program: memberDegree || undefined,
          student_year: memberYear ? Number(memberYear) : undefined,
          weekly_commitment_hours: memberHours ? Number(memberHours) : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to assign team member");
      }

      setShowMemberModal(false);
      setMemberName("");
      setMemberEmail("");
      setSelectedMemberUserId("");
      setActionSuccess("Academic team member assigned successfully.");
      fetchSolution();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };
 
  // Handle Remove Team Member
  const handleRemoveMember = async (memberId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to remove this academic team member from the solution?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/solutions/${solutionId}/team-members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to remove team member");
      }
      setActionSuccess("Team member removed successfully.");
      fetchSolution();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Document Upload
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !docFile) return;
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("title", docTitle || docFile.name);
      formData.append("document_type", docType);

      const res = await fetch(`${apiUrl}/solutions/${solutionId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to upload document");
      }

      setShowDocModal(false);
      setDocFile(null);
      setDocTitle("");
      setActionSuccess("Supporting document uploaded to solution vault.");
      fetchSolution();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Publish Solution
  const handlePublish = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/solutions/${solutionId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to publish solution");
      }
      setActionSuccess("Solution published to the Open Solution Workspace!");
      fetchSolution();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Convert to Project
  const handleConvertToProject = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/solutions/${solutionId}/convert-to-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: solution?.title,
          description: solution?.executive_summary,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to convert solution to project");
      }

      const proj = await res.json();
      setShowConvertModal(false);
      router.push(`/projects/${proj.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center text-stone-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-xs font-medium">Loading Proposed Solution details...</p>
      </div>
    );
  }

  if (error || !solution) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-stone-900">Failed to Load Proposed Solution</h2>
        <p className="text-xs text-stone-600">{error || "The requested solution could not be found."}</p>
        <Link
          href="/solutions"
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-800 px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Solutions Workspace
        </Link>
      </div>
    );
  }

  const teamMembers = solution.teamMembers || [];
  const collaborations = solution.collaborations || [];
  const documents = solution.documents || [];
  const challenge = solution.challenge;
  const isConverted = solution.status === "CONVERTED_TO_PROJECT";

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/solutions"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Open Solution Workspace
          </Link>

          {isConverted && solution.project && (
            <Link
              href={`/projects/${solution.project.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition"
            >
              <ShieldCheck className="h-4 w-4" /> View Active Project Workspace
            </Link>
          )}
        </div>

        {/* Global Context Notice */}
        <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              <strong>SamadhanSetu Proposed Solution:</strong> This solution is proposed by{" "}
              <strong>{solution.proposingOrganization?.name || "an affiliated university"}</strong> to address an identified civic challenge.
            </span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded-md bg-white border border-emerald-200 font-mono text-[10px] font-bold text-emerald-800">
            {solution.status.replace(/_/g, " ")}
          </span>
        </div>

        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-700 font-bold">×</button>
          </div>
        )}

        {/* Main Solution Header Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                  {challenge?.category || "Civic Innovation"}
                </span>
                {challenge?.district && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                    <MapPin className="h-3 w-3 text-stone-400" />
                    {challenge.district}, Jharkhand
                  </span>
                )}
                {solution.estimated_timeline && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                    <Clock className="h-3 w-3 text-stone-400" />
                    {solution.estimated_timeline.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                {solution.title}
              </h1>

              <div className="flex items-center gap-2 text-xs text-stone-600 pt-1">
                <GraduationCap className="h-4 w-4 text-emerald-700" />
                <span>
                  Proposed by <strong>{solution.proposingOrganization?.name || "University"}</strong>
                </span>
                <span>•</span>
                <span>Submitted {formatDateSafe(solution.created_at)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start">
              {/* Proposing University Actions */}
              {isProposingOrg && solution.status === "DRAFT" && (
                <button
                  onClick={handlePublish}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Send className="h-3.5 w-3.5" /> Publish to Open Workspace
                </button>
              )}

              {(isProposingOrg || isGovOrAdmin) && !isConverted && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Convert to Active Project
                </button>
              )}

              {/* Ecosystem Partner Action: Offer Collaboration */}
              {!isProposingOrg && (solution.status === "PUBLISHED" || solution.status === "COLLABORATION_OPEN") && (
                <button
                  onClick={() => setShowCollabModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Handshake className="h-3.5 w-3.5" /> Offer Collaboration
                </button>
              )}
            </div>
          </div>

          {/* SECTION 1: ADDRESSED PROBLEM */}
          <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/70 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Civic Challenge Addressed
            </span>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-stone-900">
                {challenge?.title || "Community Problem"}
              </h3>
              {challenge?.id && (
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline shrink-0"
                >
                  View Problem <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            {challenge?.description && (
              <p className="text-xs text-stone-600 line-clamp-2">{challenge.description}</p>
            )}
          </div>
        </div>

        {/* 2-Column Body Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Core Technical Approach & Proposals */}
          <div className="lg:col-span-2 space-y-6">
            {/* SECTION 3a: PROBLEM UNDERSTANDING */}
            {solution.problem_understanding && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-stone-900">Problem Understanding</h3>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                  {solution.problem_understanding}
                </p>
              </div>
            )}

            {/* SECTION 3b: PROPOSED SOLUTION & EXECUTIVE SUMMARY */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <Lightbulb className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900">Proposed Solution - Executive Summary</h3>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                {solution.executive_summary || "No executive summary provided."}
              </p>
            </div>

            {/* SECTION 3c: HOW IT HELPS - PROPOSED APPROACH */}
            {solution.proposed_approach && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Target className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">How It Helps - Approach Overview</h3>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                  {solution.proposed_approach}
                </p>
              </div>
            )}

            {/* SECTION 4: TECHNICAL APPROACH */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <Layers className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900">Technical Approach & Methodology</h3>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                {solution.technical_approach || solution.proposed_approach || "Detailed engineering and technical deployment methodology."}
              </p>
            </div>

            {/* SECTION 8 & 9: OUTCOMES & SOCIAL IMPACT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Expected Verifiable Outcomes
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {solution.expected_outcomes || "Outcome specifications to be demonstrated in pilot testing."}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  Expected Social & Civic Impact
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {solution.expected_social_impact || "Target community benefits and civic problem resolution metrics."}
                </p>
              </div>
            </div>

            {/* SECTION 10: RESOURCES NEEDED & PROTOTYPE/DEPLOYMENT */}
            {(solution.required_resources || solution.prototype_requirements || solution.deployment_requirements) && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Users className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">Resources & Collaboration Needed</h3>
                </div>
                {solution.required_resources && (
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Required Resources & Partners</h4>
                    <p className="text-xs text-stone-700 leading-relaxed">{solution.required_resources}</p>
                  </div>
                )}
                {solution.prototype_requirements && (
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Prototype Requirements</h4>
                    <p className="text-xs text-stone-700 leading-relaxed">{solution.prototype_requirements}</p>
                  </div>
                )}
                {solution.deployment_requirements && (
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Deployment Requirements</h4>
                    <p className="text-xs text-stone-700 leading-relaxed">{solution.deployment_requirements}</p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 11: INNOVATION & IP POTENTIAL */}
            {(solution.innovation_potential || solution.ip_potential) && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">Innovation & IP Potential</h3>
                </div>
                {solution.innovation_potential && (
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Innovation Potential</h4>
                    <p className="text-xs text-stone-700 leading-relaxed">{solution.innovation_potential}</p>
                  </div>
                )}
                {solution.ip_potential && (
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> IP & Confidentiality Status
                    </h4>
                    <p className="text-xs text-stone-700 leading-relaxed">{solution.ip_potential}</p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 15: COLLABORATION OFFERS (ECOSYSTEM INVOLVEMENT) */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Ecosystem Collaboration Offers ({collaborations.length})
                  </h3>
                </div>

                {!isProposingOrg && (solution.status === "PUBLISHED" || solution.status === "COLLABORATION_OPEN") && (
                  <button
                    onClick={() => setShowCollabModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Submit Offer
                  </button>
                )}
              </div>

              {collaborations.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  <Handshake className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                  No collaboration offers submitted yet.
                  <p className="text-[11px] text-stone-400 mt-1">
                    Industry partners, MSMEs, CSR funds, and peer universities can offer financial, technical, or deployment support.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collaborations.map((collab: any) => {
                    const isAccepted = collab.status === "ACCEPTED" || collab.status === "CONVERTED_TO_PROJECT";
                    const org = collab.offeringOrganization;
                    return (
                      <div
                        key={collab.id}
                        className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-800">
                              {collab.collaboration_type?.replace(/_/g, " ")}
                            </span>
                            <h4 className="text-sm font-bold text-stone-900 mt-1">{collab.title}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-stone-500">
                              <span>By <strong>{org?.name || "Partner Organization"}</strong></span>
                              {org?.organization_type && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {org.organization_type}
                                </span>
                              )}
                              {org?.district && (
                                <span className="text-[10px] text-stone-400">• {org.district}</span>
                              )}
                              <Link
                                href={`/organizations/${collab.offering_organization_id}/passport`}
                                target="_blank"
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 underline ml-1"
                              >
                                View Capability Passport <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                              <span>• Submitted {formatDateSafe(collab.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isAccepted
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : collab.status === "DECLINED"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              {collab.status?.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-stone-700 whitespace-pre-line">{collab.description}</p>

                        {collab.financial_contribution && (
                          <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                            Funding Commitment: ₹{Number(collab.financial_contribution).toLocaleString()}
                          </div>
                        )}

                        {collab.resources_offered && (
                          <p className="text-[11px] text-stone-600">
                            <strong>Resources / Tools: </strong>{collab.resources_offered}
                          </p>
                        )}

                        {collab.discussion_notes && (
                          <div className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <div className="flex items-center gap-1 font-bold text-[10px] text-amber-800">
                              <MessageSquare className="h-3 w-3" /> Discussion & Clarification Notes:
                            </div>
                            <p className="text-xs text-amber-800">{collab.discussion_notes}</p>
                          </div>
                        )}

                        {collab.response_notes && !collab.discussion_notes && (
                          <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-700">
                            <strong>Notes: </strong>{collab.response_notes}
                          </div>
                        )}

                        {/* Proposing University Action Controls */}
                        {isProposingOrg && (collab.status === "OFFERED" || collab.status === "UNDER_DISCUSSION") && (
                          <div className="flex items-center gap-2 pt-2 border-t border-stone-200/60">
                            <button
                              onClick={() => handleRespondOffer(collab.id, "ACCEPT")}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                            >
                              Accept into Consortium
                            </button>
                            <button
                              onClick={() => {
                                const notes = window.prompt("Enter clarification request or discussion points for this offer:", "We would like to clarify technical specifications, integration requirements, and milestone timelines.");
                                if (notes !== null) handleRespondOffer(collab.id, "DISCUSS", notes);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
                            >
                              Request Discussion
                            </button>
                            <button
                              onClick={() => {
                                const notes = window.prompt("Reason for declining this offer (optional):", "Thank you for the proposal, but the scope does not align with our current focus.");
                                if (notes !== null) handleRespondOffer(collab.id, "DECLINE", notes);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 12: SUPPORTING DOCUMENTS VAULT */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Supporting Documents & Blueprints ({documents.length})
                  </h3>
                </div>

                {isProposingOrg && (
                  <button
                    onClick={() => setShowDocModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Document
                  </button>
                )}
              </div>

              {documents.length === 0 ? (
                <p className="text-xs text-stone-500 py-3">No supporting documents attached yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map((doc: any) => {
                    const isRestricted = doc.is_confidential || doc.storage_key === "[CONFIDENTIAL_RESTRICTED]" || !doc.url;
                    return (
                      <div
                        key={doc.id}
                        className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-900 truncate">{doc.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-stone-500">{doc.document_type?.replace(/_/g, " ")}</span>
                            {isRestricted && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Restricted IP
                              </span>
                            )}
                          </div>
                        </div>
                        {isRestricted ? (
                          <span
                            title="Restricted blueprint: Requires accepted consortium collaboration to access."
                            className="p-2 rounded-lg bg-stone-100 text-stone-400 cursor-not-allowed shrink-0"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-stone-400" />
                          </span>
                        ) : (
                          <a
                            href={`${apiUrl}${doc.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-stone-200/70 hover:bg-stone-300 text-stone-700 shrink-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Team, Capabilities, Budget & Timeline */}
          <div className="space-y-6">
            {/* SECTION 5: MULTIDISCIPLINARY COLLABORATION BADGE BOX */}
            {solution.multidisciplinary_summary && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Network className="h-4 w-4 text-emerald-700" />
                    Multidisciplinary Collaboration
                  </h4>
                  {solution.multidisciplinary_summary.has_multidisciplinary_team ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-700" /> Multi-Dept Verified
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-500 font-medium">
                      {solution.multidisciplinary_summary.total_departments} Department{solution.multidisciplinary_summary.total_departments === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {solution.multidisciplinary_summary.departments_represented?.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-stone-600">
                      Departments collaborating ({solution.multidisciplinary_summary.total_departments}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {solution.multidisciplinary_summary.departments_represented.map((deptName: string) => {
                        const count = solution.multidisciplinary_summary.department_counts[deptName] || 1;
                        return (
                          <span
                            key={deptName}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-medium border border-emerald-200"
                          >
                            <span>{deptName}</span>
                            <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-900 text-[10px] rounded-full font-bold">
                              {count} {count === 1 ? "member" : "members"}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500 italic">
                    Assign faculty mentors and student researchers across multiple academic departments to establish cross-disciplinary depth.
                  </p>
                )}
              </div>
            )}

            {/* SECTION 6: UNIVERSITY SOLUTION TEAM */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Solution Team ({teamMembers.length})
                  </h3>
                </div>

                {isProposingOrg && (
                  <button
                    onClick={() => setShowMemberModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add Member
                  </button>
                )}
              </div>

              {teamMembers.length === 0 ? (
                <p className="text-xs text-stone-500 py-2">
                  No faculty mentors or student researchers assigned yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Category 1: Faculty Mentors & Leads */}
                  {(() => {
                    const facultyMembers = teamMembers.filter((m: any) =>
                      ["FACULTY_MENTOR", "PROJECT_LEAD", "CO_INVESTIGATOR"].includes(m.role)
                    );
                    if (facultyMembers.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Faculty Mentors & PIs ({facultyMembers.length})
                        </span>
                        <div className="space-y-2">
                          {facultyMembers.map((m: any) => (
                            <div
                              key={m.id}
                              className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1 relative group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-900">{m.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                    {m.role?.replace(/_/g, " ")}
                                  </span>
                                  {isProposingOrg && (
                                    <button
                                      onClick={() => handleRemoveMember(m.id)}
                                      title="Remove from team"
                                      className="text-stone-400 hover:text-red-600 transition p-0.5"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {m.department && (
                                <p className="text-[11px] text-stone-600">
                                  Dept: <strong>{m.department}</strong> {m.designation ? `(${m.designation})` : ""}
                                </p>
                              )}
                              {m.email && (
                                <p className="text-[10px] text-stone-500">{m.email}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Category 2: Student Researchers */}
                  {(() => {
                    const studentMembers = teamMembers.filter((m: any) => m.role === "STUDENT_RESEARCHER");
                    if (studentMembers.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                          Student Researchers ({studentMembers.length})
                        </span>
                        <div className="space-y-2">
                          {studentMembers.map((m: any) => (
                            <div
                              key={m.id}
                              className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1 relative group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-900">{m.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                                    Student Researcher
                                  </span>
                                  {isProposingOrg && (
                                    <button
                                      onClick={() => handleRemoveMember(m.id)}
                                      title="Remove from team"
                                      className="text-stone-400 hover:text-red-600 transition p-0.5"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {m.department && (
                                <p className="text-[11px] text-stone-600">
                                  Dept: <strong>{m.department}</strong>
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
                                {m.degree_program && <span>{m.degree_program}</span>}
                                {m.student_year && <span>• Year {m.student_year}</span>}
                                {m.weekly_commitment_hours && <span>• {m.weekly_commitment_hours} hrs/week</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Category 3: Coordinators & Other */}
                  {(() => {
                    const otherMembers = teamMembers.filter(
                      (m: any) => !["FACULTY_MENTOR", "PROJECT_LEAD", "CO_INVESTIGATOR", "STUDENT_RESEARCHER"].includes(m.role)
                    );
                    if (otherMembers.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                          Coordinators & Staff ({otherMembers.length})
                        </span>
                        <div className="space-y-2">
                          {otherMembers.map((m: any) => (
                            <div
                              key={m.id}
                              className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1 relative group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-900">{m.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                                    {m.role?.replace(/_/g, " ")}
                                  </span>
                                  {isProposingOrg && (
                                    <button
                                      onClick={() => handleRemoveMember(m.id)}
                                      title="Remove from team"
                                      className="text-stone-400 hover:text-red-600 transition p-0.5"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {m.department && (
                                <p className="text-[11px] text-stone-600">
                                  Dept: <strong>{m.department}</strong> {m.designation ? `(${m.designation})` : ""}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* SECTION 7: REQUIRED CAPABILITIES */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                Required Capabilities & Domain Expertise
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(solution.required_capabilities || []).map((c: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* SECTION 10 & 11: BUDGET & TIMELINE */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-700" />
                Budget & Execution Phasing
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Estimated Budget:</span>
                  <span className="font-bold text-stone-900">
                    {solution.estimated_budget ? `₹${Number(solution.estimated_budget).toLocaleString()}` : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Estimated Timeline:</span>
                  <span className="font-medium text-stone-800">
                    {solution.estimated_timeline?.replace(/_/g, " ") || "3-6 months"}
                  </span>
                </div>
                {solution.required_resources && (
                  <div className="pt-1">
                    <span className="text-stone-500 block mb-0.5">Required Lab Resources:</span>
                    <p className="text-stone-700 text-[11px] leading-relaxed">{solution.required_resources}</p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 13: INNOVATION & IP POTENTIAL */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-2">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Innovation & IP Potential
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                {solution.innovation_potential || solution.ip_potential || "Patent potential, proprietary designs, and spin-off startup opportunity."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: OFFER COLLABORATION */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Handshake className="h-5 w-5 text-emerald-700" />
                Offer Ecosystem Collaboration
              </h3>
              <button onClick={() => setShowCollabModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOfferCollaboration} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Collaboration Type</label>
                <select
                  value={collabType}
                  onChange={(e) => setCollabType(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                >
                  <option value="FUNDING">Funding / Financial Sponsorship</option>
                  <option value="CSR_SUPPORT">CSR Foundation Grant / Support</option>
                  <option value="MENTORSHIP">Mentorship & Strategic Guidance</option>
                  <option value="TECHNICAL_EXPERTISE">Technical & Domain Engineering Expertise</option>
                  <option value="PROTOTYPING">Prototyping & Fabrication Facility Access</option>
                  <option value="TESTING">Testing, Quality Assurance & Certification</option>
                  <option value="MANUFACTURING">Manufacturing & Industrial Scaling</option>
                  <option value="TECHNOLOGY">Core Technology & Patent Licensing</option>
                  <option value="SOFTWARE">Software Tools, Licenses & Cloud Compute</option>
                  <option value="HARDWARE">Hardware Components, Sensors & Equipment</option>
                  <option value="PILOT_SUPPORT">Field Implementation & Pilot Site Access</option>
                  <option value="DEPLOYMENT_SUPPORT">Full-Scale Civic Deployment Support</option>
                  <option value="RESEARCH_COLLABORATION">Peer University Academic/Lab Research</option>
                  <option value="TECHNOLOGY_TRANSFER">Technology Transfer & Commercialization</option>
                  <option value="OTHER">Other Co-Development Contribution</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Contribution Title</label>
                <input
                  type="text"
                  required
                  value={collabTitle}
                  onChange={(e) => setCollabTitle(e.target.value)}
                  placeholder="e.g. CSR Grant for Water Quality Sensor Fabrication"
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Detailed Description of Offer</label>
                <textarea
                  required
                  rows={3}
                  value={collabDesc}
                  onChange={(e) => setCollabDesc(e.target.value)}
                  placeholder="Describe your organization's specific technical, financial, or operational contribution..."
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Financial Amount (₹ Optional)</label>
                  <input
                    type="number"
                    value={collabFinancial}
                    onChange={(e) => setCollabFinancial(e.target.value)}
                    placeholder="e.g. 250000"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Timeline</label>
                  <input
                    type="text"
                    value={collabTimeline}
                    onChange={(e) => setCollabTimeline(e.target.value)}
                    placeholder="e.g. 3 months"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Resources / Equipment Offered</label>
                <input
                  type="text"
                  value={collabResources}
                  onChange={(e) => setCollabResources(e.target.value)}
                  placeholder="e.g. 3D printer access, water testing spectrometers"
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCollabModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  {actionLoading ? "Submitting..." : "Submit Collaboration Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD TEAM MEMBER (WITH SEARCHABLE ROSTER) */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-emerald-700" />
                Assign Solution Team Member
              </h3>
              <button onClick={() => setShowMemberModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              {orgMembers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-stone-700">
                      Institutional Member Roster
                    </label>
                    <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[10px]">
                      {(["ALL", "FACULTY", "STUDENT"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setMemberFilterRole(r)}
                          className={`px-2 py-0.5 rounded-md font-semibold transition ${
                            memberFilterRole === r
                              ? "bg-white text-emerald-800 shadow-2xs"
                              : "text-stone-500 hover:text-stone-800"
                          }`}
                        >
                          {r === "ALL" ? "All" : r === "FACULTY" ? "Faculty" : "Students"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <select
                    value={selectedMemberUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setSelectedMemberUserId(uid);
                      const found = orgMembers.find((m) => m.user?.id === uid || m.user_id === uid);
                      if (found) {
                        setMemberName(found.user?.name || found.name || "");
                        setMemberEmail(found.user?.email || found.email || "");
                        setMemberDept(found.user?.department || found.department || "");
                        setMemberDesignation(found.user?.designation || found.designation || "");
                        const isStudent =
                          found.role === "STUDENT" ||
                          found.organization_role === "STUDENT" ||
                          found.user?.role === "STUDENT";
                        if (isStudent) {
                          setMemberRole("STUDENT_RESEARCHER");
                        } else {
                          setMemberRole("FACULTY_MENTOR");
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                  >
                    <option value="">-- Choose member or enter manually below --</option>
                    {orgMembers
                      .filter((m) => {
                        if (memberFilterRole === "ALL") return true;
                        const role = (m.role || m.organization_role || m.user?.role || "").toUpperCase();
                        return role === memberFilterRole;
                      })
                      .map((m) => {
                        const uid = m.user?.id || m.user_id;
                        const name = m.user?.name || m.name || "Member";
                        const dept = m.user?.department || m.department || "";
                        const role = m.role || m.organization_role || "MEMBER";
                        return (
                          <option key={m.id || uid} value={uid}>
                            {name} {dept ? `[${dept}]` : ""} - {role}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="e.g. ramesh@bau.edu.in"
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Role in Solution</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                >
                  {/* Phase 2 Rule: Students cannot be assigned as Faculty Mentors */}
                  {(() => {
                    const selectedMember = orgMembers.find(
                      (m) => m.user?.id === selectedMemberUserId || m.user_id === selectedMemberUserId
                    );
                    const isStudent =
                      selectedMember?.role === "STUDENT" ||
                      selectedMember?.organization_role === "STUDENT" ||
                      selectedMember?.user?.role === "STUDENT";
                    return (
                      <>
                        {!isStudent && <option value="FACULTY_MENTOR">Faculty Mentor / PI</option>}
                        <option value="STUDENT_RESEARCHER">Student Researcher</option>
                        {!isStudent && <option value="PROJECT_LEAD">Academic Project Lead</option>}
                        {!isStudent && <option value="CO_INVESTIGATOR">Co-Investigator</option>}
                        <option value="ACADEMIC_COORDINATOR">Academic Coordinator</option>
                      </>
                    );
                  })()}
                </select>
                {(() => {
                  const selectedMember = orgMembers.find(
                    (m) => m.user?.id === selectedMemberUserId || m.user_id === selectedMemberUserId
                  );
                  const isStudent =
                    selectedMember?.role === "STUDENT" ||
                    selectedMember?.organization_role === "STUDENT" ||
                    selectedMember?.user?.role === "STUDENT";
                  if (isStudent) {
                    return (
                      <p className="text-[10px] text-amber-700 mt-1">
                        Note: Student researchers cannot be assigned as Faculty Mentors.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={memberDept}
                    onChange={(e) => setMemberDept(e.target.value)}
                    placeholder="e.g. Civil Engineering"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={memberDesignation}
                    onChange={(e) => setMemberDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor / Student"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                  />
                </div>
              </div>

              {memberRole === "STUDENT_RESEARCHER" && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                    Student Researcher Details
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Degree Program</label>
                      <input
                        type="text"
                        value={memberDegree}
                        onChange={(e) => setMemberDegree(e.target.value)}
                        placeholder="e.g. B.Tech / M.Tech"
                        className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-white text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Year of Study</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={memberYear}
                        onChange={(e) => setMemberYear(Number(e.target.value))}
                        className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-white text-stone-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Weekly Commitment (Hours/Week)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={memberHours}
                      onChange={(e) => setMemberHours(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-white text-stone-900"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  {actionLoading ? "Adding..." : "Assign Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UPLOAD DOCUMENT */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-700" />
                Upload Supporting Document
              </h3>
              <button onClick={() => setShowDocModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDoc} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. System Architecture Blueprint"
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900"
                >
                  <option value="TECHNICAL_PROPOSAL">Technical Proposal</option>
                  <option value="BLUEPRINT">Engineering Blueprint / Diagram</option>
                  <option value="PROTOTYPE_SPECIFICATION">Prototype Specification</option>
                  <option value="COST_ESTIMATE">Budget & Cost Estimate</option>
                  <option value="SUPPORTING_LETTER">Endorsement / Recommendation Letter</option>
                  <option value="OTHER">Other Documentation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Select File (PDF / Images / Docs)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-stone-200 file:text-stone-800 file:font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  {actionLoading ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONVERT TO PROJECT */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Initiate Collaborative Project
              </h3>
              <button onClick={() => setShowConvertModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Converting this solution initiates a formally governed <strong>SamadhanSetu Project</strong>.
              All academic team members and accepted collaboration partners (with their funding and technical commitments) will automatically transition into active project participants.
            </p>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/70 text-xs text-blue-900 space-y-1">
              <p><strong>Lead University: </strong>{solution.proposingOrganization?.name}</p>
              <p><strong>Accepted Collaborators: </strong>{collaborations.filter((c: any) => c.status === "ACCEPTED").length} partner(s)</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertToProject}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                {actionLoading ? "Converting..." : "Confirm & Initiate Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
