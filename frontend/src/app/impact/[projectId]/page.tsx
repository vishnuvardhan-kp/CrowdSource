"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { formatDateSafe } from "../../../lib/utils";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Users,
  DollarSign,
  Leaf,
  Building2,
  Download,
  Plus,
  Upload,
  MessageSquare,
  Star,
  Lock,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

interface Metric {
  id: string;
  metric_category: string;
  metric_name: string;
  baseline_value: string | null;
  target_value: string | null;
  actual_value: string;
  unit: string;
  measurement_method: string;
}

interface Evidence {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  checksum: string;
  description: string | null;
  created_at: string;
  uploadedBy?: { name: string; email?: string };
}

interface Feedback {
  id: string;
  rating: number;
  feedback: string;
  benefit_confirmed: boolean;
  created_at: string;
  submittedBy?: { name: string };
}

interface Review {
  id: string;
  decision: "APPROVED" | "REVISION_REQUIRED" | "REJECTED" | "REVOKED";
  notes: string | null;
  created_at: string;
  reviewer?: { name: string; email?: string };
}

export default function ImpactWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [project, setProject] = useState<any | null>(null);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [isLead, setIsLead] = useState<boolean>(false);
  const [isEligibleForFeedback, setIsEligibleForFeedback] = useState<boolean>(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState<boolean>(false);

  // Modals & form state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showMetricModal, setShowMetricModal] = useState<boolean>(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // New assessment form
  const [assessmentForm, setAssessmentForm] = useState({
    summary: "",
    problem_addressed: "",
    solution_implemented: "",
    beneficiaries_reached: "",
    geographic_coverage: "",
    implementation_cost: "",
    sustainability_notes: "",
  });

  // Metric form
  const [metricForm, setMetricForm] = useState({
    metric_category: "POPULATION_REACHED",
    metric_name: "",
    baseline_value: "",
    target_value: "",
    actual_value: "",
    unit: "",
    measurement_method: "",
  });

  // Evidence upload form
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDocType, setEvidenceDocType] = useState<string>("IMPACT_REPORT");
  const [evidenceDescription, setEvidenceDescription] = useState<string>("");

  // Feedback form
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [benefitConfirmed, setBenefitConfirmed] = useState<boolean>(true);

  const fetchImpactData = useCallback(async () => {
    if (!projectId || !token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/projects/${projectId}/impact`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load impact data (status ${res.status})`);
      }

      const data = await res.json();
      setProject(data.project);
      setAssessment(data.assessment);
      setMetrics(data.metrics || []);
      setEvidence(data.evidence || []);
      setFeedbackList(data.feedback || []);
      setReviews(data.reviews || []);
      setCanEdit(data.canEdit);
      setCanSubmit(data.canSubmit);
      setIsLead(data.isLead);
      setIsEligibleForFeedback(data.isEligibleForFeedback);
      setHasSubmittedFeedback(data.hasSubmittedFeedback);

      if (data.assessment) {
        setAssessmentForm({
          summary: data.assessment.summary || "",
          problem_addressed: data.assessment.problem_addressed || "",
          solution_implemented: data.assessment.solution_implemented || "",
          beneficiaries_reached: data.assessment.beneficiaries_reached?.toString() || "",
          geographic_coverage: data.assessment.geographic_coverage || "",
          implementation_cost: data.assessment.implementation_cost?.toString() || "",
          sustainability_notes: data.assessment.sustainability_notes || "",
        });
      }
    } catch (err: any) {
      setError(err.message || "Error loading impact data");
    } finally {
      setLoading(false);
    }
  }, [projectId, token, apiUrl]);

  useEffect(() => {
    fetchImpactData();
  }, [fetchImpactData]);

  // Create Assessment
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      setError(null);
      const res = await fetch(`${apiUrl}/projects/${projectId}/impact`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: assessmentForm.summary,
          problem_addressed: assessmentForm.problem_addressed,
          solution_implemented: assessmentForm.solution_implemented,
          beneficiaries_reached: assessmentForm.beneficiaries_reached
            ? parseInt(assessmentForm.beneficiaries_reached, 10)
            : undefined,
          geographic_coverage: assessmentForm.geographic_coverage || undefined,
          implementation_cost: assessmentForm.implementation_cost
            ? parseFloat(assessmentForm.implementation_cost)
            : undefined,
          sustainability_notes: assessmentForm.sustainability_notes || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create impact assessment");
      }

      setShowCreateModal(false);
      setSuccessMessage("Impact Assessment initiated successfully!");
      await fetchImpactData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Update Assessment
  const handleUpdateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      setError(null);
      const res = await fetch(`${apiUrl}/projects/${projectId}/impact`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: assessmentForm.summary,
          problem_addressed: assessmentForm.problem_addressed,
          solution_implemented: assessmentForm.solution_implemented,
          beneficiaries_reached: assessmentForm.beneficiaries_reached
            ? parseInt(assessmentForm.beneficiaries_reached, 10)
            : undefined,
          geographic_coverage: assessmentForm.geographic_coverage || undefined,
          implementation_cost: assessmentForm.implementation_cost
            ? parseFloat(assessmentForm.implementation_cost)
            : undefined,
          sustainability_notes: assessmentForm.sustainability_notes || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update impact assessment");
      }

      setSuccessMessage("Impact Assessment updated successfully.");
      await fetchImpactData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Assessment for Government Verification
  const handleSubmitVerification = async () => {
    if (!confirm("Are you sure you want to submit this Impact Assessment for administrative certification? It will be locked during review.")) {
      return;
    }
    try {
      setSubmittingAction(true);
      setError(null);
      const res = await fetch(`${apiUrl}/projects/${projectId}/impact/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Submission failed");
      }

      setSuccessMessage("Impact Assessment submitted for administrative certification!");
      await fetchImpactData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Add Metric
  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      setError(null);
      const res = await fetch(`${apiUrl}/projects/${projectId}/impact/metrics`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metricForm),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add metric");
      }

      setShowMetricModal(false);
      setMetricForm({
        metric_category: "POPULATION_REACHED",
        metric_name: "",
        baseline_value: "",
        target_value: "",
        actual_value: "",
        unit: "",
        measurement_method: "",
      });
      setSuccessMessage("Metric added successfully.");
      await fetchImpactData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Delete Metric
  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm("Are you sure you want to delete this metric?")) return;
    try {
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/impact/metrics/${metricId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete metric");
      await fetchImpactData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Upload Evidence
  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceFile) {
      setError("Please select a file to upload.");
      return;
    }
    try {
      setSubmittingAction(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", evidenceFile);
      formData.append("document_type", evidenceDocType);
      if (evidenceDescription) {
        formData.append("description", evidenceDescription);
      }

      const res = await fetch(`${apiUrl}/projects/${projectId}/impact/evidence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to upload evidence");
      }

      setShowEvidenceModal(false);
      setEvidenceFile(null);
      setEvidenceDescription("");
      setSuccessMessage("Impact evidence uploaded to isolated vault.");
      await fetchImpactData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      setError(null);
      const res = await fetch(`${apiUrl}/projects/${projectId}/impact/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: feedbackRating,
          feedback: feedbackText,
          benefit_confirmed: benefitConfirmed,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Feedback submission failed");
      }

      setSuccessMessage("Thank you! Your citizen community feedback has been recorded.");
      setFeedbackText("");
      await fetchImpactData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Download evidence
  const handleDownloadEvidence = async (evidenceId: string, filename: string) => {
    try {
      const res = await fetch(
        `${apiUrl}/projects/${projectId}/impact/evidence/${evidenceId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-600 font-medium">
            Loading Impact Verification Workspace...
          </p>
        </div>
      </div>
    );
  }

  const isVerified = assessment?.status === "VERIFIED";
  const isRejected = assessment?.status === "REJECTED";
  const isUnderReview = assessment?.status === "UNDER_REVIEW";
  const isRevisionRequired = assessment?.status === "REVISION_REQUIRED";
  const isPending = assessment?.status === "IMPACT_VERIFICATION_PENDING";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Header Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-1 hover:text-slate-800 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Project Workspace
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Impact Verification</span>
          </div>

          <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">
                  {project?.title || "Impact Verification Workspace"}
                </h1>
                {assessment && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      isVerified
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : isUnderReview
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : isRevisionRequired
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : isRejected
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-slate-100 text-slate-800 border border-slate-300"
                    }`}
                  >
                    {isVerified && <ShieldCheck className="h-3.5 w-3.5" />}
                    {isUnderReview && <Clock className="h-3.5 w-3.5" />}
                    {isRevisionRequired && <AlertTriangle className="h-3.5 w-3.5" />}
                    {isRejected && <XCircle className="h-3.5 w-3.5" />}
                    {assessment.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Challenge:{" "}
                <span className="font-medium text-slate-700">
                  {project?.challenge?.title || "Original Civic Challenge"}
                </span>{" "}
                • District:{" "}
                <span className="font-medium text-slate-700">
                  {project?.challenge?.district || "Jharkhand"}
                </span>
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {!assessment && isLead && project?.status === "COMPLETED" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Initiate Impact Assessment
                </button>
              )}

              {canSubmit && (
                <button
                  onClick={handleSubmitVerification}
                  disabled={submittingAction}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-lg shadow-md transition disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Submit for Administrative Certification
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
            <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {/* Narrative Lifecycle Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
                Phase 8 • Real-World Impact Verification
              </span>
              <h2 className="text-xl font-bold text-white">
                Closing the Civic Innovation Loop
              </h2>
              <p className="text-sm text-emerald-100/90 leading-relaxed">
                Project completion marks the finish of consortium engineering.
                Verified Impact confirms that real citizens experienced tangible,
                auditable improvements in their quality of life.
              </p>
            </div>

            {/* Stage Progress Bar */}
            <div className="flex items-center gap-2 text-xs font-semibold overflow-x-auto pb-2 lg:pb-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800/80 rounded-lg text-emerald-200 shrink-0">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Consortium Execution</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 ${
                  assessment
                    ? "bg-emerald-700 text-white font-bold"
                    : "bg-emerald-950/60 text-emerald-300"
                }`}
              >
                <span>Impact Assessment</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 ${
                  isUnderReview
                    ? "bg-blue-600 text-white font-bold"
                    : isVerified
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-950/60 text-emerald-300"
                }`}
              >
                <span>Government Review</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 ${
                  isVerified
                    ? "bg-emerald-500 text-slate-950 font-extrabold shadow-lg"
                    : "bg-emerald-950/60 text-emerald-400 opacity-60"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>IMPACT VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revision Alert if REVISION_REQUIRED */}
        {isRevisionRequired && reviews.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-base">Government Revision Requested</h3>
                <p className="text-sm text-amber-800">
                  {reviews[reviews.length - 1].notes ||
                    "Please address government feedback and update the required metrics or evidence."}
                </p>
                <p className="text-xs text-amber-700 pt-1">
                  Reviewed by Government Officer on{" "}
                  {formatDateSafe(reviews[reviews.length - 1].created_at)}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verified Notice if VERIFIED */}
        {isVerified && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 text-emerald-900">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-base">Impact Formally Verified & Sealed</h3>
                <p className="text-sm text-emerald-800">
                  This project has received official government impact verification. All
                  reported metrics and evidence documents have been validated and are
                  immutable for public auditability.
                </p>
                <p className="text-xs text-emerald-700 pt-1">
                  Verified on {formatDateSafe(assessment.verified_at)}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: IMPACT SUMMARY KPI CARDS */}
        {assessment && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Beneficiaries Reached
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  {assessment.beneficiaries_reached
                    ? assessment.beneficiaries_reached.toLocaleString()
                    : "Not reported"}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Geographic Coverage
                </p>
                <p className="text-base font-bold text-slate-900 mt-0.5 line-clamp-1">
                  {assessment.geographic_coverage || "District-wide"}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Implementation Cost
                </p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {assessment.implementation_cost
                    ? `₹ ${(assessment.implementation_cost / 100000).toFixed(2)} Lakhs`
                    : "Included in Grant"}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sustainability
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-2">
                  {assessment.sustainability_notes || "Self-sustaining operations"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: BEFORE / AFTER VISUALIZATIONS */}
        {metrics.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Before / After Outcomes Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Structured comparison of baseline conditions vs. verified real-world outcomes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                      {m.metric_category.replace(/_/g, " ")}
                    </span>
                    <h4 className="font-semibold text-sm text-slate-900 pt-1">
                      {m.metric_name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Baseline (Before)
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {m.baseline_value ? `${m.baseline_value} ${m.unit}` : "None / Zero"}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-emerald-600" />

                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase">
                        Actual (After)
                      </p>
                      <p className="text-base font-extrabold text-emerald-800">
                        {m.actual_value} {m.unit}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 italic">
                    Method: {m.measurement_method}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: STRUCTURED METRICS EDITOR & TABLE */}
        {assessment && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Structured Impact Metrics
                </h3>
                <p className="text-xs text-slate-500">
                  Normalized quantitative indicators for civic monitoring and analytics
                </p>
              </div>

              {canEdit && (
                <button
                  onClick={() => setShowMetricModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Metric
                </button>
              )}
            </div>

            {metrics.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <TrendingUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No impact metrics added yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  At least one structured metric is required before submitting for administrative certification.
                </p>
              </div>
            ) : (
              <div>
                {/* Mobile Card Representation (< md) */}
                <div className="block md:hidden space-y-3">
                  {metrics.map((m) => (
                    <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            {m.metric_category.replace(/_/g, " ")}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm break-words">{m.metric_name}</h4>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteMetric(m.id)}
                            className="text-rose-600 hover:text-rose-800 font-semibold p-1 shrink-0"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/80 text-center">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 block">Baseline</span>
                          <span className="font-medium text-slate-700 break-words">{m.baseline_value || "-"}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 block">Target</span>
                          <span className="font-medium text-slate-700 break-words">{m.target_value || "-"}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 block">Actual</span>
                          <span className="font-bold text-emerald-700 break-words">{m.actual_value} {m.unit}</span>
                        </div>
                      </div>
                      {m.measurement_method && (
                        <div className="text-[11px] text-slate-500 break-words">
                          <span className="font-medium text-slate-600">Method:</span> {m.measurement_method}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Tabular Matrix (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Metric Name</th>
                        <th className="py-2.5 px-3">Baseline</th>
                        <th className="py-2.5 px-3">Target</th>
                        <th className="py-2.5 px-3">Actual Achieved</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Measurement Method</th>
                        {canEdit && <th className="py-2.5 px-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {m.metric_category.replace(/_/g, " ")}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {m.metric_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {m.baseline_value || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {m.target_value || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">
                            {m.actual_value}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{m.unit}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {m.measurement_method}
                          </td>
                          {canEdit && (
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteMetric(m.id)}
                                className="text-rose-600 hover:text-rose-800 font-semibold"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: ISOLATED EVIDENCE VAULT */}
        {assessment && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Isolated Impact Evidence Vault
                </h3>
                <p className="text-xs text-slate-500">
                  Secure cryptographic store for field photos, testimonials, and lab certifications
                </p>
              </div>

              {canEdit && (
                <button
                  onClick={() => setShowEvidenceModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Evidence
                </button>
              )}
            </div>

            {evidence.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No evidence uploaded yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  At least one impact evidence document is required before submitting for administrative certification.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-emerald-700 shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          {ev.document_type.replace(/_/g, " ")}
                        </span>
                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {ev.file_name}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {ev.description}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">
                          Uploaded on {formatDateSafe(ev.created_at)} •{" "}
                          {(ev.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadEvidence(ev.id, ev.file_name)}
                      className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                      title="Download Evidence"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: COMMUNITY FEEDBACK & ANTI-ASTROTURFING */}
        {assessment && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Citizen Community Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  Structured reviews from the original Challenge Submitter confirming real-world benefits
                </p>
              </div>

              {/* Feedback Summary Tag */}
              {feedbackList.length > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  <span>
                    {(
                      feedbackList.reduce((acc, f) => acc + f.rating, 0) /
                      feedbackList.length
                    ).toFixed(1)}{" "}
                    / 5.0 Rating
                  </span>
                  <span>•</span>
                  <span>
                    {feedbackList.filter((f) => f.benefit_confirmed).length} Confirmed Benefits
                  </span>
                </div>
              )}
            </div>

            {/* Submission Form for Eligible Citizen Submitter */}
            {isEligibleForFeedback && !hasSubmittedFeedback && (
              <form
                onSubmit={handleSubmitFeedback}
                className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>Submit Citizen Community Feedback</span>
                </div>

                <p className="text-xs text-emerald-800 leading-relaxed">
                  As the original citizen who submitted this problem challenge, your review verifies whether this collaborative solution solved the issue in your community.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rate the Solution Impact (1 to 5 Stars)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="p-1 focus:outline-none"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= feedbackRating
                                ? "fill-amber-400 text-amber-500"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-2">
                        {feedbackRating} out of 5 Stars
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={benefitConfirmed}
                        onChange={(e) => setBenefitConfirmed(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span>I confirm that our community benefited from this solution</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Experience & Feedback Notes
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    required
                    placeholder="Describe how the solution functioned in your locality, whether it is currently operating, and what changes occurred..."
                    className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  Submit Citizen Feedback
                </button>
              </form>
            )}

            {/* Feedback List */}
            {feedbackList.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <MessageSquare className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-600">
                  No community feedback submitted yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  Reserved for the original citizen challenge submitter to prevent astroturfing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < f.rating
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {f.submittedBy?.name || "Original Challenge Submitter"}
                        </span>
                      </div>

                      {f.benefit_confirmed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                          <Check className="h-3 w-3" />
                          Benefit Confirmed
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {f.feedback}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Submitted on {formatDateSafe(f.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: GOVERNMENT AUDIT TRAIL */}
        {reviews.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Government Governance & Audit Trail
            </h3>
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3"
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      rev.decision === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700"
                        : rev.decision === "REVISION_REQUIRED"
                        ? "bg-amber-100 text-amber-700"
                        : rev.decision === "REVOKED"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">
                        {rev.decision.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        by {rev.reviewer?.name || "Government Authority"} on{" "}
                        {formatDateSafe(rev.created_at)}
                      </span>
                    </div>
                    {rev.notes && (
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {rev.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE IMPACT ASSESSMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 break-words">
                Initiate Impact Assessment
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Executive Summary of Impact *
                </label>
                <textarea
                  rows={2}
                  required
                  value={assessmentForm.summary}
                  onChange={(e) =>
                    setAssessmentForm({ ...assessmentForm, summary: e.target.value })
                  }
                  placeholder="Overview of results achieved in this project..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Problem Addressed *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={assessmentForm.problem_addressed}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        problem_addressed: e.target.value,
                      })
                    }
                    placeholder="Specific root problem solved..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Solution Implemented *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={assessmentForm.solution_implemented}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        solution_implemented: e.target.value,
                      })
                    }
                    placeholder="Technical or social intervention deployed..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Beneficiaries Reached
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assessmentForm.beneficiaries_reached}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        beneficiaries_reached: e.target.value,
                      })
                    }
                    placeholder="e.g. 5000"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Geographic Coverage
                  </label>
                  <input
                    type="text"
                    value={assessmentForm.geographic_coverage}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        geographic_coverage: e.target.value,
                      })
                    }
                    placeholder="e.g. 8 Villages, Ranchi"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Implementation Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={assessmentForm.implementation_cost}
                    onChange={(e) =>
                      setAssessmentForm({
                        ...assessmentForm,
                        implementation_cost: e.target.value,
                      })
                    }
                    placeholder="e.g. 450000"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sustainability & Handover Notes
                </label>
                <textarea
                  rows={2}
                  value={assessmentForm.sustainability_notes}
                  onChange={(e) =>
                    setAssessmentForm({
                      ...assessmentForm,
                      sustainability_notes: e.target.value,
                    })
                  }
                  placeholder="How will this solution operate post-project..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50 text-center"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD METRIC MODAL */}
      {showMetricModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 break-words">
                Add Structured Impact Metric
              </h3>
              <button
                onClick={() => setShowMetricModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMetric} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={metricForm.metric_category}
                  onChange={(e) =>
                    setMetricForm({ ...metricForm, metric_category: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="POPULATION_REACHED">Population Reached</option>
                  <option value="FINANCIAL_SAVINGS">Financial Savings</option>
                  <option value="ENVIRONMENTAL_IMPACT">Environmental Impact</option>
                  <option value="INFRASTRUCTURE_CREATED">Infrastructure Created</option>
                  <option value="HEALTH_OUTCOMES">Health Outcomes</option>
                  <option value="EFFICIENCY_IMPROVEMENT">Efficiency Improvement</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metric Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Clean Water Production"
                  value={metricForm.metric_name}
                  onChange={(e) =>
                    setMetricForm({ ...metricForm, metric_name: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Baseline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0"
                    value={metricForm.baseline_value}
                    onChange={(e) =>
                      setMetricForm({ ...metricForm, baseline_value: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10000"
                    value={metricForm.target_value}
                    onChange={(e) =>
                      setMetricForm({ ...metricForm, target_value: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Actual *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12400"
                    value={metricForm.actual_value}
                    onChange={(e) =>
                      setMetricForm({ ...metricForm, actual_value: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unit of Measurement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liters/Day, Villages, Families, Rupees"
                  value={metricForm.unit}
                  onChange={(e) =>
                    setMetricForm({ ...metricForm, unit: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Measurement Method *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flow meter telemetry & field audit"
                  value={metricForm.measurement_method}
                  onChange={(e) =>
                    setMetricForm({
                      ...metricForm,
                      measurement_method: e.target.value,
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowMetricModal(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold disabled:opacity-50 text-center"
                >
                  Save Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD EVIDENCE MODAL */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 break-words">
                Upload Impact Evidence
              </h3>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadEvidence} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={evidenceDocType}
                  onChange={(e) => setEvidenceDocType(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="IMPACT_REPORT">Impact Report / Summary</option>
                  <option value="FIELD_PHOTO">Field Implementation Photo</option>
                  <option value="BENEFICIARY_TESTIMONIAL">
                    Beneficiary Testimonial
                  </option>
                  <option value="GOVERNMENT_RECORD">Official Government Record</option>
                  <option value="MEASUREMENT_DATA">
                    Telemetry / Measurement Dataset
                  </option>
                  <option value="CERTIFICATION">Third-Party Lab Certification</option>
                  <option value="OTHER">Other Evidence Document</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select File (Max 50MB) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) =>
                    setEvidenceFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Context
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab water test results certified by NABL"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50 text-center"
                >
                  Upload Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
