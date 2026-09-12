"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  MapPin,
  HeartHandshake,
  CheckCircle2,
  Clock,
  FileCheck2,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  ArrowLeft,
  ArrowRight,
  Edit3,
  ExternalLink,
  Shield,
  User as UserIcon,
  Sparkles,
  Brain,
  Cpu,
  Layers,
  Loader2,
  AlertCircle,
  Info,
  ShieldCheck,
  Award,
  Send,
  Users,
  Globe,
  Languages,
} from "lucide-react";
import { formatDateSafe } from "../../../lib/utils";
import { useTranslation, SUPPORTED_LANGUAGES } from "../../../lib/i18n";

interface AiAnalysisData {
  category: string;
  sub_category: string;
  summary: string;
  priority_score: number;
  severity_score: number;
  affected_population: string;
  required_capabilities: string[];
  confidence: number;
  model_name: string;
  model_version: string;
  domain?: string;
  subdomain?: string;
  keywords?: string[];
  required_technologies?: string[];
  ai_processing_status?: "SUCCESS" | "FALLBACK";
  raw_analysis?: {
    problem_factors?: string[];
    solution_domains?: string[];
    prompt_version?: string;
    taxonomy_version?: string;
    model_provider?: string;
  };
}

interface RecommendationItem {
  review_id?: string;
  organization_id: string;
  organization_name: string;
  organization_type: string;
  total_score: number;
  reasons: string[];
  confidence_category: "HIGH_CONFIDENCE" | "MEDIUM_CONFIDENCE" | "LOW_CONFIDENCE";
  human_review_status?: string;
}

interface EvidenceItem {
  id: string;
  title: string;
  description: string | null;
  evidence_type: "IMAGE" | "VIDEO" | "DOCUMENT" | "OTHER";
  url: string;
  mime_type: string;
  created_at: string;
}

interface ChallengeDetail {
  id: string;
  title: string;
  description: string;
  district: string;
  districtName: string;
  blockName: string | null;
  village_locality: string | null;
  latitude: number | null;
  longitude: number | null;
  citizen_severity: "NOT_SURE" | "MODERATE" | "SERIOUS" | null;
  affected_population: string | null;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "VALIDATED" | "REJECTED" | "PROJECT_INITIATED";
  created_at: string;
  submitted_at: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  evidence: EvidenceItem[];
  confirmationsCount: number;
  hasConfirmed: boolean;
  isOwner: boolean;
  submitter: { name: string };
  aiAnalysis?: AiAnalysisData | null;
  verification_display_status?: string;
  original_text?: string;
  original_language?: string;
  normalized_text?: string;
  processing_language?: string;
  translation_status?: string;
  translation_metadata?: any;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params?.id as string;
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const userOrgId = user?.primaryOrganization?.id || user?.memberships?.[0]?.organization_id;

  const isReviewer =
    user?.role === "PLATFORM_ADMIN" ||
    user?.role === "GOVERNMENT_OFFICER" ||
    user?.role === "GOVERNMENT_ADMIN";

  const isInstitutionUser =
    user?.role === "UNIVERSITY_ADMIN" ||
    user?.role === "FACULTY" ||
    user?.role === "STUDENT" ||
    user?.primaryOrganization?.organization_type === "INSTITUTION" ||
    user?.memberships?.some((m) => m.organization_type === "INSTITUTION");

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);

  // Multilingual On-Demand Translation State
  const [onDemandTranslation, setOnDemandTranslation] = useState<{
    target_language: string;
    translated_title: string;
    translated_description: string;
    cached: boolean;
  } | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const handleOnDemandTranslate = async (targetLang: string) => {
    if (!challengeId) return;
    if (onDemandTranslation && onDemandTranslation.target_language === targetLang) {
      setOnDemandTranslation(null);
      return;
    }
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const res = await fetch(`${apiUrl}/challenges/${challengeId}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ target_language: targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        setOnDemandTranslation(data);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setTranslationError(errJson.message || "Failed to translate challenge.");
      }
    } catch (err: any) {
      setTranslationError(err.message || "Translation service unavailable.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Phase 5 AI Problem Intelligence & Recommendations State
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<any>(null);

  const fetchAiAnalysis = useCallback(async () => {
    if (!challengeId) return;
    try {
      const res = await fetch(`${apiUrl}/ai/challenges/${challengeId}/analysis`);
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch {
      // Analysis might not have run yet
    }
  }, [apiUrl, challengeId]);

  const fetchRecommendations = useCallback(async () => {
    if (!challengeId || !token) return;
    try {
      const res = await fetch(`${apiUrl}/reviews/challenge/${challengeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch {
      // Recommendations not generated yet
    }
  }, [apiUrl, challengeId, token]);

  const [myEoi, setMyEoi] = useState<any>(null);

  const fetchMyEoi = useCallback(async () => {
    if (!challengeId || !token) return;
    try {
      const res = await fetch(`${apiUrl}/eois/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const match = data.find((e: any) => e.challenge_id === challengeId);
        setMyEoi(match || null);
      }
    } catch {
      // Silently handle
    }
  }, [apiUrl, challengeId, token]);

  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState<boolean>(false);

  const triggerAiAnalysis = async () => {
    if (!challengeId || !token) return;
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(false);
    try {
      const res = await fetch(`${apiUrl}/ai/challenges/${challengeId}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
        setAnalysisSuccess(true);
        await fetchRecommendations();
        setTimeout(() => setAnalysisSuccess(false), 6000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAnalysisError(errJson.message || "Failed to run AI problem analysis. Please verify server connectivity.");
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Error communicating with AI service. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchChallenge = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/challenges/${challengeId}`, { headers });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Challenge not found or you do not have permission to view this draft.");
        }
        throw new Error("Failed to load challenge details.");
      }

      const data = await res.json();
      setChallenge(data);
      if (data.aiAnalysis) {
        setAiAnalysis(data.aiAnalysis);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, challengeId, token]);

  useEffect(() => {
    fetchChallenge();
    fetchAiAnalysis();
    if (token) {
      fetchRecommendations();
      fetchMyEoi();
    }
  }, [fetchChallenge, fetchAiAnalysis, fetchRecommendations, fetchMyEoi, token]);

  const handleToggleConfirm = async () => {
    if (!token) {
      alert("Please sign in or register to confirm this problem.");
      return;
    }
    if (!challenge || challenge.isOwner) return;

    setConfirming(true);
    try {
      const method = challenge.hasConfirmed ? "DELETE" : "POST";
      const res = await fetch(`${apiUrl}/challenges/${challenge.id}/confirm`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setChallenge((prev) =>
          prev
            ? {
                ...prev,
                hasConfirmed: !prev.hasConfirmed,
                confirmationsCount: data.confirmationsCount,
              }
            : null,
        );
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to update confirmation.");
      }
    } catch (err) {
      console.error("Confirmation error:", err);
    } finally {
      setConfirming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Validated by Reviewer
          </span>
        );
      case "PROJECT_INITIATED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-800">
            <CheckCircle2 className="h-4 w-4 text-teal-700" /> Collaboration Formed
          </span>
        );
      case "UNDER_REVIEW":
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
            <Clock className="h-4 w-4 text-amber-700" /> Pending Government Verification
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" /> Rejected
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">
            Draft (Not yet submitted)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
            <Clock className="h-4 w-4 text-amber-700" /> Pending Government Verification
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-xs text-stone-500">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-2"></div>
        <p>Loading challenge details...</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
        <h2 className="text-xl font-bold text-stone-900">Challenge Unavailable</h2>
        <p className="text-xs text-stone-600">{error || "Could not find requested challenge."}</p>
        <Link
          href="/challenges"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Challenges
        </Link>
      </div>
    );
  }

  const backendHost = apiUrl.replace("/api", "");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/challenges"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Challenges
        </Link>
      </div>

      {/* Draft Banner */}
      {challenge.status === "DRAFT" && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>This challenge is currently a <strong>Private Draft</strong> and is only visible to you.</span>
          </div>
          <Link
            href={`/challenges/new?draftId=${challenge.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shrink-0 shadow-2xs"
          >
            <Edit3 className="h-3.5 w-3.5" /> Continue Editing
          </Link>
        </div>
      )}

      {/* Main Card */}
      <div className="civic-card p-6 sm:p-8 space-y-6">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2">
            {getStatusBadge(challenge.status)}
            {challenge.citizen_severity && (
              <span className="rounded-md bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                Severity: {challenge.citizen_severity.replace("_", " ").toLowerCase()}
              </span>
            )}
          </div>

          <div className="text-right text-[11px] text-stone-500">
            {challenge.submitted_at ? (
              <span>Submitted on {formatDateSafe(challenge.submitted_at)}</span>
            ) : (
              <span>Created on {formatDateSafe(challenge.created_at)}</span>
            )}
          </div>
        </div>

        {/* Multilingual Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="text-xs text-stone-600 font-medium">Original Language:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              {challenge.original_language
                ? `${SUPPORTED_LANGUAGES[challenge.original_language]?.nativeName || challenge.original_language.toUpperCase()} (${SUPPORTED_LANGUAGES[challenge.original_language]?.name || challenge.original_language})`
                : "English"}
            </span>
          </div>

          {/* On-Demand Translation Buttons */}
          <div className="flex items-center gap-2">
            {challenge.original_language !== "hi" && (
              <button
                type="button"
                disabled={isTranslating}
                onClick={() => handleOnDemandTranslate("hi")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  onDemandTranslation?.target_language === "hi"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Languages className="h-3.5 w-3.5" />
                {onDemandTranslation?.target_language === "hi" ? "Original View" : "View in Hindi (हिन्दी)"}
              </button>
            )}

            {challenge.original_language !== "en" && (
              <button
                type="button"
                disabled={isTranslating}
                onClick={() => handleOnDemandTranslate("en")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  onDemandTranslation?.target_language === "en"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Languages className="h-3.5 w-3.5" />
                {onDemandTranslation?.target_language === "en" ? "Original View" : "View in English"}
              </button>
            )}

            {isTranslating && <Loader2 className="h-4 w-4 animate-spin text-emerald-700 ml-1" />}
          </div>
        </div>

        {translationError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{translationError}</span>
          </div>
        )}

        {/* Title */}
        <div>
          {onDemandTranslation && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-2">
              <Sparkles className="h-3 w-3" />
              Viewing {SUPPORTED_LANGUAGES[onDemandTranslation.target_language]?.name || onDemandTranslation.target_language} Translation
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight leading-tight">
            {onDemandTranslation ? onDemandTranslation.translated_title : challenge.title}
          </h1>
          <p className="text-xs text-stone-500 mt-2 flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5 text-stone-400" />
            Reported by: <span className="text-stone-800 font-semibold">{challenge.submitter.name}</span>
          </p>
        </div>

        {/* Rejection notice if applicable */}
        {challenge.status === "REJECTED" && challenge.rejection_reason && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
            <span className="font-semibold text-red-700">Reviewer Rejection Reason:</span>
            <p className="text-stone-700 leading-relaxed">{challenge.rejection_reason}</p>
          </div>
        )}

        {/* Location Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <div>
            <span className="text-[11px] text-stone-500 block">District</span>
            <span className="font-semibold text-stone-900">{challenge.districtName}</span>
          </div>
          <div>
            <span className="text-[11px] text-stone-500 block">Block</span>
            <span className="font-semibold text-stone-900">{challenge.blockName || "Not specified"}</span>
          </div>
          <div>
            <span className="text-[11px] text-stone-500 block">Village / Locality</span>
            <span className="font-semibold text-stone-900">{challenge.village_locality || "Not specified"}</span>
          </div>
          <div>
            <span className="text-[11px] text-stone-500 block">Affected Population</span>
            <span className="font-semibold text-stone-900">{challenge.affected_population || "Unspecified"}</span>
          </div>
        </div>

        {/* Problem Description */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {onDemandTranslation ? "Translated Problem Description" : "Citizen's Original Problem Description"}
            </h3>
            {challenge.original_language && (
              <span className="text-[11px] text-stone-500 font-mono">
                Script: {SUPPORTED_LANGUAGES[challenge.original_language]?.script || "Native"}
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-stone-800 whitespace-pre-wrap leading-relaxed bg-stone-50/50 p-4 rounded-xl border border-stone-200">
            {onDemandTranslation
              ? onDemandTranslation.translated_description
              : (challenge.original_text || challenge.description)}
          </p>
        </div>

        {/* Normalized English Translation Box (if different from original) */}
        {!onDemandTranslation && challenge.normalized_text && challenge.normalized_text !== (challenge.original_text || challenge.description) && (
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                English Normalized Translation (AI Derived for District Review)
              </span>
              {challenge.translation_status === "VERIFIED" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Automated Verified Translation
                </span>
              )}
              {challenge.translation_status === "REQUIRES_HUMAN_REVIEW" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Requires Human Review (Low-resource / Uncertain Dialect)
                </span>
              )}
            </div>
            <p className="text-stone-800 whitespace-pre-wrap leading-relaxed font-sans bg-white p-3 rounded-lg border border-emerald-100">
              {challenge.normalized_text}
            </p>
            {challenge.translation_status === "REQUIRES_HUMAN_REVIEW" && (
              <p className="text-[11px] text-amber-800 font-medium">
                ⚠️ Note: This problem statement was submitted in a regional/tribal language with low-resource machine translation confidence. District reviewers should corroborate key details with the citizen.
              </p>
            )}
          </div>
        )}

        {/* Evidence Section */}
        {challenge.evidence && challenge.evidence.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-stone-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Community Evidence ({challenge.evidence.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {challenge.evidence.map((ev) => {
                const fullUrl = `${backendHost}${ev.url}`;
                const isImage = ev.mime_type.startsWith("image/");
                const isVideo = ev.mime_type.startsWith("video/");
                return (
                  <div
                    key={ev.id}
                    className="flex flex-col rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        {isImage ? (
                          <ImageIcon className="h-4 w-4 text-emerald-700 shrink-0" />
                        ) : isVideo ? (
                          <Video className="h-4 w-4 text-purple-700 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-700 shrink-0" />
                        )}
                        <span className="font-semibold text-stone-900 truncate">{ev.title}</span>
                        {isVideo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
                            VIDEO EVIDENCE
                          </span>
                        )}
                        {isImage && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                            PHOTO
                          </span>
                        )}
                      </div>
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="text-stone-500 hover:text-stone-900 p-1 transition-colors"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>

                    {isImage && (
                      <div className="relative rounded-lg overflow-hidden border border-stone-200 aspect-video bg-stone-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fullUrl}
                          alt={ev.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {isVideo && (
                      <video controls className="w-full rounded-lg max-h-48 bg-black">
                        <source src={fullUrl} type={ev.mime_type} />
                      </video>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dedicated Educational Institution Recommendation View (Institutional Portal) */}
        {(challenge.status === "VALIDATED" || challenge.status === "PROJECT_INITIATED") && isInstitutionUser && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white font-bold text-sm">
                    🎓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      AI Problem Recommendation for {recommendations[0]?.organization_name || user?.primaryOrganization?.name || "Your Institution"}
                    </h3>
                    <span className="text-[11px] text-emerald-800 font-medium">
                      Institutional Portal Matching Engine
                    </span>
                  </div>
                </div>
              </div>
              {recommendations[0] && (
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold border ${
                      recommendations[0].confidence_category === "HIGH_CONFIDENCE"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                        : "bg-blue-100 border-blue-300 text-blue-900"
                    }`}
                  >
                    {recommendations[0].confidence_category.replace("_", " ")}
                  </span>
                  <div className="rounded-xl bg-emerald-700 px-3 py-1 text-white text-center">
                    <span className="text-base font-extrabold">{recommendations[0].total_score}%</span>
                    <span className="text-[10px] block text-emerald-100">Capability Match</span>
                  </div>
                </div>
              )}
            </div>

            {/* Why this was recommended */}
            {recommendations[0] ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    Why this problem was matched with your institution:
                  </h4>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recommendations[0].reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-emerald-100 text-xs text-stone-800 shadow-2xs">
                        <span className="text-emerald-700 font-bold mt-0.5">✓</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Problem Synthesis & Required Capabilities */}
                {aiAnalysis && (
                  <div className="p-3.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-700 space-y-2 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 font-semibold text-stone-800 text-[11px]">
                        Domain: {aiAnalysis.category}
                      </span>
                      {aiAnalysis.sub_category && (
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-600 text-[11px]">
                          Sub-domain: {aiAnalysis.sub_category}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed"><strong className="text-stone-900">AI Problem Summary:</strong> {aiAnalysis.summary}</p>
                    {aiAnalysis.required_capabilities && aiAnalysis.required_capabilities.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-stone-500">Matched Capabilities:</span>
                        {aiAnalysis.required_capabilities.map((c, ci) => (
                          <span key={ci} className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Direct Action: Submit EOI */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-emerald-100">
                  <div className="text-xs text-stone-600">
                    {myEoi ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        Expression of Interest submitted (Status: {myEoi.status})
                      </span>
                    ) : (
                      <span>Your institution has the research &amp; engineering capabilities to solve this problem.</span>
                    )}
                  </div>
                  {myEoi ? (
                    <Link
                      href="/my-eois"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs shrink-0"
                    >
                      View My EOIs <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/challenges/${challenge.id}/eoi`}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all shrink-0"
                    >
                      <span>Express Interest (Submit EOI)</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-stone-500 space-y-2">
                <p>No active institutional recommendation for your organization on this specific problem.</p>
                {!myEoi && (
                  <Link
                    href={`/challenges/${challenge.id}/eoi`}
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold underline hover:text-emerald-800"
                  >
                    Explore submitting an Expression of Interest <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Problem Intelligence Section (Citizen & Reviewer Visible) */}
        {challenge.status !== "DRAFT" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/20 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-700" />
                  <h3 className="text-base font-bold text-stone-900">AI Problem Intelligence</h3>
                  <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-800 border border-blue-200">
                    {isReviewer ? "Reviewer & Citizen Intelligence" : "Structured Intelligence"}
                  </span>
                </div>
                <p className="text-xs text-stone-600">
                  Automated problem decomposition, standardized capability taxonomy mapping, and key technology requirements.
                </p>
              </div>

              {isReviewer && token && (
                <button
                  onClick={triggerAiAnalysis}
                  disabled={analyzing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xs shrink-0"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Analyzing Problem Intelligence...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-emerald-100" />
                      <span>{aiAnalysis ? "Re-Analyze with AI" : "Analyze with AI"}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Inline Success Feedback */}
            {analysisSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Problem intelligence refreshed successfully.</span>
              </div>
            )}

            {/* Inline Error Feedback */}
            {analysisError && (
              <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{analysisError}</span>
                </div>
                <button
                  onClick={() => setAnalysisError(null)}
                  className="text-xs text-red-700 hover:text-red-900 underline shrink-0 ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            {aiAnalysis ? (
              <div className="space-y-4">
                {aiAnalysis.ai_processing_status === "FALLBACK" ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900">AI Structuring Temporarily Unavailable</h4>
                      <p className="mt-1 leading-relaxed text-amber-800">
                        AI structuring is temporarily unavailable. Your problem has still been submitted successfully and will continue through the verification workflow.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 font-semibold text-blue-800">
                        Domain: {aiAnalysis.domain || aiAnalysis.category}
                      </span>
                      {(aiAnalysis.subdomain || aiAnalysis.sub_category) && (
                        <span className="rounded-lg bg-stone-100 border border-stone-200 px-3 py-1 font-semibold text-stone-700">
                          Sub-domain: {aiAnalysis.subdomain || aiAnalysis.sub_category}
                        </span>
                      )}
                      <span className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-1 text-stone-700">
                        Category: {aiAnalysis.category}
                      </span>
                      {aiAnalysis.confidence !== undefined && (
                        <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-mono text-emerald-800 font-semibold">
                          Confidence: {Math.round(aiAnalysis.confidence * 100)}%
                        </span>
                      )}
                      {aiAnalysis.model_name && (
                        <span className="rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-mono text-stone-600">
                          Model: {aiAnalysis.model_name}
                        </span>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm text-stone-700 leading-relaxed space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-blue-800 font-semibold text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        <span>AI Problem Synthesis:</span>
                      </div>
                      <p>{aiAnalysis.summary}</p>
                    </div>

                    {((aiAnalysis.required_technologies && aiAnalysis.required_technologies.length > 0) ||
                      (aiAnalysis.required_capabilities && aiAnalysis.required_capabilities.length > 0)) && (
                      <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2 text-xs shadow-2xs">
                        <span className="font-bold text-stone-800 block">Required Technologies / Capabilities:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(aiAnalysis.required_technologies || aiAnalysis.required_capabilities || []).map((tech, idx) => (
                            <span key={idx} className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.keywords && aiAnalysis.keywords.length > 0 && (
                      <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2 text-xs shadow-2xs">
                        <span className="font-bold text-stone-800 block">Keywords:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {aiAnalysis.keywords.map((kw, idx) => (
                            <span key={idx} className="rounded-md bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 text-[11px] font-mono">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Candidate Pool Recommendations - STRICTLY for Reviewers and STRICTLY POST-VALIDATION */}
                {isReviewer && (challenge.status === "VALIDATED" || challenge.status === "PROJECT_INITIATED") && recommendations && recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-stone-900 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-emerald-700" />
                        Top Recommended Ecosystem Partners (Candidate Pool)
                      </h5>
                    </div>

                    <div className="space-y-2.5">
                      {recommendations.slice(0, 3).map((rec, idx) => (
                        <div
                          key={rec.organization_id || idx}
                          className="p-3.5 rounded-xl bg-white border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-emerald-300 hover:shadow-xs transition-all shadow-2xs"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">{rec.organization_name}</span>
                              <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                                {rec.organization_type}
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                  rec.confidence_category === "HIGH_CONFIDENCE"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-blue-50 border-blue-200 text-blue-800"
                                }`}
                              >
                                {rec.confidence_category.replace("_", " ")}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-600 flex flex-wrap gap-x-3 gap-y-1">
                              {rec.reasons.slice(0, 3).map((r, ri) => (
                                <span key={ri} className="inline-flex items-center gap-1 text-stone-600">
                                  <span className="text-emerald-700 font-bold">✓</span> {r}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right sm:shrink-0">
                            <span className="text-lg font-extrabold text-emerald-700">{rec.total_score}%</span>
                            <span className="text-[10px] text-stone-500 block">Match Score</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-stone-500 space-y-2">
                <Brain className="h-8 w-8 text-blue-400/60 mx-auto" />
                <p>No AI analysis has been generated for this challenge yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Expression of Interest (EOI) / Consortium Section */}
        {challenge.status === "PROJECT_INITIATED" ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 mt-6 flex items-start gap-4 shadow-xs">
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-700 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-blue-950">
                EOI Intake Closed — Collaborative Project Initiated
              </h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                A multi-institutional consortium project has already been formally initiated for this challenge. Expressions of Interest are now closed.
              </p>
              {myEoi && (
                <div className="pt-2">
                  <Link
                    href={`/challenges/${challenge.id}/eoi`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                  >
                    View your institution&apos;s EOI ({myEoi.status.replace(/_/g, " ")}) <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : challenge.status !== "DRAFT" && challenge.status !== "REJECTED" ? (
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-stone-50 p-6 mt-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/60 px-2.5 py-0.5 rounded-md">
                  <Sparkles className="h-3 w-3" /> Phase 6 Consortium Opportunity
                </div>
                <h4 className="text-base font-bold text-stone-900">
                  Express Interest in Solving this Challenge
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Verified Higher Education Institutions (HEIs), R&amp;D Labs, and Impact Startups can propose collaborative solutions, deploy testbeds, or contribute technical capacity to solve this verified civic challenge.
                </p>
              </div>

              <div className="shrink-0">
                {myEoi ? (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 font-medium">Your EOI:</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        myEoi.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        myEoi.status === 'DISCUSSION_REQUIRED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        myEoi.status === 'PROJECT_FORMED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        myEoi.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-300' :
                        myEoi.status === 'WITHDRAWN' ? 'bg-stone-100 text-stone-600 border border-stone-300' :
                        'bg-indigo-100 text-indigo-800 border border-indigo-300'
                      }`}>
                        {myEoi.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Link
                      href={`/challenges/${challenge.id}/eoi`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition"
                    >
                      {myEoi.status === 'DISCUSSION_REQUIRED' ? 'Respond to Discussion' :
                       myEoi.status === 'DRAFT' ? 'Continue Draft' : 'View / Edit EOI'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : token ? (
                  <Link
                    href={`/challenges/${challenge.id}/eoi`}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition"
                  >
                    <Send className="h-4 w-4" /> Express Interest (EOI)
                  </Link>
                ) : (
                  <Link
                    href={`/login?redirectTo=/challenges/${challenge.id}/eoi`}
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-800 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-900 transition"
                  >
                    Sign In to Express Interest
                  </Link>
                )}
              </div>
            </div>

            {myEoi && myEoi.status === "DISCUSSION_REQUIRED" && myEoi.discussion_notes && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold">Reviewer Feedback:</span> {myEoi.discussion_notes}
              </div>
            )}
          </div>
        ) : null}

        {/* Community Confirmation Section ("I experience this problem too") */}
        {challenge.status !== "DRAFT" && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-3 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-emerald-700" />
                  Community Confirmation
                </h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  Confirm if you or your family experience this exact issue in this locality.
                </p>
              </div>

              <button
                onClick={handleToggleConfirm}
                disabled={confirming || challenge.isOwner}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all shadow-xs ${
                  challenge.isOwner
                    ? "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                    : challenge.hasConfirmed
                    ? "bg-emerald-700 text-white border border-emerald-700 shadow-xs"
                    : "bg-white text-stone-800 border border-stone-300 hover:bg-stone-100"
                }`}
              >
                <HeartHandshake className="h-4 w-4" />
                <span>
                  {challenge.hasConfirmed
                    ? "You confirmed this issue"
                    : "I experience this problem too"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                  challenge.hasConfirmed ? "bg-emerald-800 text-white" : "bg-stone-100 text-stone-700"
                }`}>
                  {challenge.confirmationsCount}
                </span>
              </button>
            </div>

            {challenge.isOwner && (
              <p className="text-[11px] text-amber-700">
                You reported this challenge. Self-confirmation is prohibited to ensure honest community metrics.
              </p>
            )}

            {!token && (
              <p className="text-[11px] text-stone-500">
                <Link href="/login" className="text-emerald-700 underline hover:text-emerald-800 font-semibold">
                  Sign in
                </Link>{" "}
                to confirm this challenge.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
