"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth-context";
import {
  formatOrganizationType,
  formatGeographicReach,
  formatVerificationStatus,
  formatAvailabilityStatus,
  formatEvidenceType,
  formatDateSafe,
} from "../../../../lib/utils";
import {
  Building2,
  MapPin,
  Globe2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  FlaskConical,
  Award,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  Lock,
  Unlock,
  Sliders,
  Send,
  ArrowLeft,
  Loader2,
  BadgeAlert,
} from "lucide-react";

interface Capability {
  id: string;
  capability_id?: string;
  name: string;
  category: string;
  description?: string;
  department?: string | null;
  laboratory?: string | null;
  support_type?: string | null;
  support_type_code?: string | null;
  verification_status: "UNVERIFIED" | "PENDING_VERIFICATION" | "VERIFIED" | string;
  verified_at?: string;
  evidence_summary?: string | null;
  notes?: string | null;
}

interface Evidence {
  id: string;
  title: string;
  evidence_type: string;
  url: string;
  verification_status: string;
  is_public: boolean;
  created_at: string;
  capability_id?: string;
}

interface Department {
  id: string;
  name: string;
  head_of_department?: string | null;
}

interface Lab {
  id: string;
  name: string;
  specialization?: string | null;
}

interface ResearchArea {
  id: string;
  title: string;
}

interface OrganizationInfo {
  id: string;
  name: string;
  organization_type: string;
  registration_number?: string | null;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  district: string;
  state: string;
  geographic_reach: string;
  is_claimed: boolean;
  is_verified: boolean;
  is_demo: boolean;
  available_capacity: number;
  availability_status: string;
  availability_confirmed_at?: string | null;
  availability_expires_at?: string | null;
  description?: string | null;
  verification_status: string;
}

interface AiIndexingMeta {
  indexing_status?: string;
  last_indexed_at?: string | null;
  dimensions?: number;
  model_name?: string;
  is_active?: boolean;
}

interface PassportData {
  organization: OrganizationInfo;
  passport_type: "HEI_PASSPORT" | "INDUSTRY_PASSPORT";
  profile_details: any;
  departments: Department[];
  laboratories: Lab[];
  researchAreas: ResearchArea[];
  capabilities: Capability[];
  evidence: Evidence[];
  ai_indexing: AiIndexingMeta;
}

export default function CapabilityPassportPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const { user, token } = useAuth();

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const org = passport?.organization;

  // Modals & Action States
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [renewCapacity, setRenewCapacity] = useState<number>(10);
  const [renewTtlDays, setRenewTtlDays] = useState<number>(30);
  const [renewLoading, setRenewLoading] = useState<boolean>(false);

  const [showAddCapModal, setShowAddCapModal] = useState<boolean>(false);
  const [newCapName, setNewCapName] = useState<string>("");
  const [newCapCategory, setNewCapCategory] = useState<string>("ENGINEERING");
  const [newCapDesc, setNewCapDesc] = useState<string>("");
  const [capLoading, setCapLoading] = useState<boolean>(false);

  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [evidenceMode, setEvidenceMode] = useState<"file" | "url">("file");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState<string>("");
  const [evidenceType, setEvidenceType] = useState<string>("DOCUMENT");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [evidenceIsPublic, setEvidenceIsPublic] = useState<boolean>(true);
  const [selectedCapId, setSelectedCapId] = useState<string>("");
  const [evidenceLoading, setEvidenceLoading] = useState<boolean>(false);

  const [reindexing, setReindexing] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [claimReason, setClaimReason] = useState<string>("");
  const [claimProofUrl, setClaimProofUrl] = useState<string>("");
  const [claimLoading, setClaimLoading] = useState<boolean>(false);
  const [claimSuccess, setClaimSuccess] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const isOrgMember = user?.memberships?.some(
    (m) => m.organization_id === orgId && m.membership_status === "ACTIVE"
  );
  const isOrgAdmin =
    user?.role === "PLATFORM_ADMIN" ||
    user?.memberships?.some(
      (m) =>
        m.organization_id === orgId &&
        m.membership_status === "ACTIVE" &&
        m.organization_role === "ADMIN"
    );

  const fetchOrgDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/organizations/${orgId}/passport`);
      if (!res.ok) {
        throw new Error(`Failed to load organization passport (HTTP ${res.status})`);
      }
      const data = await res.json();

      const rawOrg = data.organization || data;
      const orgInfo: OrganizationInfo = {
        id: rawOrg.id || orgId,
        name: rawOrg.name || "Unnamed Organization",
        organization_type: rawOrg.organization_type || "OTHER",
        registration_number: rawOrg.registration_number || rawOrg.company_registration_number || null,
        email: rawOrg.email || null,
        website: rawOrg.website || null,
        phone: rawOrg.phone || null,
        address: rawOrg.address || null,
        district: rawOrg.district || "District Not Specified",
        state: rawOrg.state || "Jharkhand",
        geographic_reach: rawOrg.geographic_reach || "DISTRICT",
        is_claimed: Boolean(rawOrg.is_claimed),
        is_verified: rawOrg.verification_status === "VERIFIED" || Boolean(rawOrg.is_verified),
        is_demo: Boolean(rawOrg.is_demo),
        available_capacity: typeof rawOrg.available_capacity === "number" ? rawOrg.available_capacity : 0,
        availability_status: rawOrg.availability_status || "UNKNOWN",
        availability_confirmed_at: rawOrg.availability_confirmed_at || null,
        availability_expires_at: rawOrg.availability_expires_at || null,
        description: rawOrg.description || null,
        verification_status: rawOrg.verification_status || "UNVERIFIED",
      };

      const isHei = data.passport_type === "HEI_PASSPORT" || orgInfo.organization_type === "INSTITUTION";
      const profile = data.profile_details || {};

      const parsedPassport: PassportData = {
        organization: orgInfo,
        passport_type: isHei ? "HEI_PASSPORT" : "INDUSTRY_PASSPORT",
        profile_details: profile,
        departments: Array.isArray(profile.departments)
          ? profile.departments
          : Array.isArray(data.departments)
          ? data.departments
          : [],
        laboratories: Array.isArray(profile.laboratories)
          ? profile.laboratories
          : Array.isArray(profile.labs)
          ? profile.labs
          : Array.isArray(data.labs)
          ? data.labs
          : [],
        researchAreas: Array.isArray(profile.researchAreas)
          ? profile.researchAreas
          : Array.isArray(profile.research_areas)
          ? profile.research_areas
          : Array.isArray(data.research_areas)
          ? data.research_areas
          : [],
        capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
        evidence: Array.isArray(data.evidence) ? data.evidence : [],
        ai_indexing: data.ai_indexing || {
          indexing_status: "ACTIVE",
          is_active: true,
        },
      };

      setPassport(parsedPassport);
      if (typeof orgInfo.available_capacity === "number") {
        setRenewCapacity(orgInfo.available_capacity);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load capability passport.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, orgId]);

  useEffect(() => {
    if (orgId) {
      fetchOrgDetails();
    }
  }, [orgId, fetchOrgDetails]);

  const handleConfirmAvailability = async () => {
    if (!token) return;
    try {
      setRenewLoading(true);
      const res = await fetch(`${apiUrl}/organizations/${orgId}/availability/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          capacity: Number(renewCapacity),
          ttlDays: Number(renewTtlDays),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to confirm availability");
      }

      setShowRenewModal(false);
      await fetchOrgDetails();
    } catch (err: any) {
      alert(err.message || "Error confirming availability");
    } finally {
      setRenewLoading(false);
    }
  };

  const handleAddCapability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCapName) return;
    try {
      setCapLoading(true);
      const res = await fetch(`${apiUrl}/organizations/${orgId}/capabilities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCapName,
          category: newCapCategory,
          description: newCapDesc,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add capability");
      }

      setNewCapName("");
      setNewCapDesc("");
      setShowAddCapModal(false);
      await fetchOrgDetails();
    } catch (err: any) {
      alert(err.message || "Error adding capability");
    } finally {
      setCapLoading(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !evidenceTitle.trim()) return;

    if (evidenceMode === "file" && !evidenceFile) {
      alert("Please select a document file (PDF, JPG, PNG, max 15MB) to upload.");
      return;
    }
    if (evidenceMode === "url" && !evidenceUrl.trim()) {
      alert("Please provide a valid document URL.");
      return;
    }

    try {
      setEvidenceLoading(true);
      let res: Response;

      if (evidenceMode === "file" && evidenceFile) {
        const formData = new FormData();
        formData.append("title", evidenceTitle.trim());
        formData.append("evidence_type", evidenceType);
        formData.append("is_public", String(evidenceIsPublic));
        formData.append("file", evidenceFile);

        if (selectedCapId) {
          if (passport?.passport_type === "HEI_PASSPORT") {
            formData.append("institution_capability_id", selectedCapId);
          } else {
            formData.append("industry_capability_id", selectedCapId);
          }
        }

        res = await fetch(`${apiUrl}/organizations/${orgId}/evidence`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        const bodyPayload: any = {
          title: evidenceTitle.trim(),
          evidence_type: evidenceType,
          url: evidenceUrl.trim(),
          is_public: evidenceIsPublic,
        };

        if (selectedCapId) {
          if (passport?.passport_type === "HEI_PASSPORT") {
            bodyPayload.institution_capability_id = selectedCapId;
          } else {
            bodyPayload.industry_capability_id = selectedCapId;
          }
        }

        res = await fetch(`${apiUrl}/organizations/${orgId}/evidence`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to upload evidence");
      }

      setEvidenceTitle("");
      setEvidenceUrl("");
      setEvidenceFile(null);
      setSelectedCapId("");
      setShowEvidenceModal(false);
      await fetchOrgDetails();
    } catch (err: any) {
      alert(err.message || "Error adding evidence");
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleReindex = async () => {
    if (!token) return;
    try {
      setReindexing(true);
      const res = await fetch(`${apiUrl}/organizations/${orgId}/reindex`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Re-indexing failed");
      }

      alert("Indexing successfully scheduled! AI capability profile is synchronizing.");
      await fetchOrgDetails();
    } catch (err: any) {
      alert(err.message || "Re-indexing error");
    } finally {
      setReindexing(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !claimReason) return;
    try {
      setClaimLoading(true);
      const res = await fetch(`${apiUrl}/organizations/${orgId}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          claim_reason: claimReason,
          proof_document_url: claimProofUrl || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to submit claim request");
      }

      setClaimSuccess(true);
      setTimeout(() => {
        setShowClaimModal(false);
        setClaimSuccess(false);
      }, 2500);
    } catch (err: any) {
      alert(err.message || "Error submitting claim");
    } finally {
      setClaimLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
          <p className="text-sm">Loading Capability Passport...</p>
        </div>
      </div>
    );
  }

  if (error || !passport || !org) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-10 w-10 text-red-600 mb-3" />
          <h2 className="text-lg font-bold text-red-900 mb-1">Organization Passport Not Found</h2>
          <p className="text-sm text-red-700 mb-4">{error || "The requested organization passport could not be loaded."}</p>
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  const daysRemaining = org.availability_expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(org.availability_expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header breadcrumb & back */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/challenges"
          className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Directory
        </Link>

        {isOrgAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
            <Lock className="h-3 w-3" /> Organization Administrator
          </span>
        )}
      </div>

      {/* Main Passport Header Card */}
      <div className="civic-card p-6 sm:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-bold tracking-wider text-stone-800 border border-stone-200">
                {formatOrganizationType(org.organization_type)}
              </span>

              {/* Geographic Reach */}
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 border border-blue-200">
                <Globe2 className="h-3 w-3" />
                {formatGeographicReach(org.geographic_reach)}
              </span>

              {/* Claimed / Unclaimed Status */}
              {org.is_claimed ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" /> Claimed Institution
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
                  <ShieldAlert className="h-3 w-3" /> Unclaimed Registry Record
                </span>
              )}

              {/* Verified Trust Badge */}
              {org.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                  <Award className="h-3 w-3" /> {formatVerificationStatus(org.verification_status)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600 border border-stone-200">
                  {formatVerificationStatus(org.verification_status)}
                </span>
              )}

              {org.is_demo && (
                <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-500 border border-stone-200">
                  Demo Record
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              {org.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                {org.district || "District Not Specified"}, {org.state || "Jharkhand"}
              </span>
              {org.registration_number && (
                <span className="font-mono text-stone-500">
                  Reg: {org.registration_number}
                </span>
              )}
              {org.website && (
                <a
                  href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:underline font-medium"
                >
                  <ExternalLink className="h-3 w-3" /> Official Website
                </a>
              )}
              {org.email && (
                <span className="text-stone-600">
                  Email: {org.email}
                </span>
              )}
            </div>

            {org.description && (
              <p className="text-xs sm:text-sm text-stone-700 max-w-3xl leading-relaxed pt-1">
                {org.description}
              </p>
            )}
          </div>

          {/* Action Button: Claim or Sync */}
          <div className="flex flex-col items-end gap-2">
            {!org.is_claimed && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all"
              >
                <ShieldCheck className="h-4 w-4" /> Claim This Profile
              </button>
            )}

            {isOrgAdmin && (
              <button
                onClick={handleReindex}
                disabled={reindexing}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-700 ${reindexing ? "animate-spin" : ""}`} />
                {reindexing ? "Synchronizing..." : "Sync AI Capability Index"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Availability + AI Indexing Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Availability Card */}
        <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-stone-900">Availability & Freshness Status</h2>
              </div>
              {org.availability_status === "FRESH" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> Fresh & Available
                </span>
              ) : org.availability_status === "STALE" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                  <Clock className="h-3.5 w-3.5 text-amber-700" /> Stale (Renewal Required)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 border border-stone-200">
                  Availability Not Confirmed
                </span>
              )}
            </div>

            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              Real-time availability signal used by the matching engine to score partner responsiveness and active project bandwidth.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl bg-stone-50 p-3 border border-stone-200">
                <p className="text-[11px] text-stone-500 mb-1">Available Capacity</p>
                <p className="text-xl font-bold text-stone-900">{org.available_capacity || 0} active slots</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-3 border border-stone-200">
                <p className="text-[11px] text-stone-500 mb-1">Days Remaining</p>
                <p className={`text-xl font-bold ${daysRemaining > 7 ? "text-emerald-700" : daysRemaining > 0 ? "text-amber-700" : "text-stone-500"}`}>
                  {daysRemaining > 0 ? `${daysRemaining} days` : "Not Active"}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl bg-stone-50 p-3 border border-stone-200">
                <p className="text-[11px] text-stone-500 mb-1">Confirmed At</p>
                <p className="text-xs text-stone-800 font-mono">
                  {formatDateSafe(org.availability_confirmed_at, "Never Confirmed")}
                </p>
              </div>
            </div>
          </div>

          {isOrgAdmin && (
            <button
              onClick={() => setShowRenewModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs mt-2"
            >
              <Sliders className="h-3.5 w-3.5" /> Confirm Active Availability & Renew TTL
            </button>
          )}
        </div>

        {/* AI Capability Intelligence Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-stone-900">AI Capability Intelligence</h2>
            </div>
            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              AI-powered capability representation enables intelligent matching between societal problems and institutional expertise.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Intelligence Status:</span>
                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  {passport.ai_indexing?.indexing_status === "ACTIVE" || passport.ai_indexing?.is_active
                    ? "Active & Indexed"
                    : (passport.ai_indexing?.indexing_status || "Active & Indexed")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Matching:</span>
                <span className="text-stone-800 font-medium">Semantic + Capability-based</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Recommendation Status:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500">
            Automatically aligns institutional competencies with validated community problems.
          </div>
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-base font-bold text-stone-900">Verified Capabilities Passport</h2>
              <p className="text-xs text-stone-600">
                {passport.passport_type === "HEI_PASSPORT"
                  ? "Academic research assets, specialized laboratories, and institutional domain competencies."
                  : "Industrial technology assets, technical support capabilities, and engineering capacity."}
              </p>
            </div>
          </div>

          {isOrgAdmin && (
            <button
              onClick={() => setShowAddCapModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Capability
            </button>
          )}
        </div>

        {passport.capabilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {passport.capabilities.map((cap) => (
              <div
                key={cap.id}
                className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 hover:border-emerald-300 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="rounded-md bg-stone-200/70 px-2 py-0.5 text-[10px] font-semibold text-stone-700 uppercase tracking-wide">
                        {cap.category || "General"}
                      </span>
                      <h3 className="text-sm font-semibold text-stone-900 mt-1.5">{cap.name}</h3>
                    </div>

                    {cap.verification_status === "VERIFIED" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-700" /> VERIFIED
                      </span>
                    ) : cap.verification_status === "PENDING_VERIFICATION" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                        <Clock className="h-3 w-3 text-amber-700" /> PENDING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 border border-stone-200">
                        UNVERIFIED
                      </span>
                    )}
                  </div>

                  {/* Polymorphic metadata: Department/Lab for HEI, Support Type for Industry */}
                  <div className="space-y-1 mb-3 text-[11px] text-stone-600">
                    {cap.department && (
                      <p><strong className="text-stone-800">Department:</strong> {cap.department}</p>
                    )}
                    {cap.laboratory && (
                      <p><strong className="text-stone-800">Laboratory:</strong> {cap.laboratory}</p>
                    )}
                    {cap.support_type && (
                      <p><strong className="text-stone-800">Support Mode:</strong> {cap.support_type}</p>
                    )}
                    {cap.notes && (
                      <p className="text-xs text-stone-600 mt-1 italic">{cap.notes}</p>
                    )}
                    {cap.description && !cap.notes && (
                      <p className="text-xs text-stone-600 mt-1">{cap.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-[11px] text-stone-500">
                  <span>
                    Evidence: {passport.evidence.filter((e) => e.capability_id === cap.id).length} item(s)
                  </span>
                  {isOrgAdmin && (
                    <button
                      onClick={() => {
                        setSelectedCapId(cap.id);
                        setShowEvidenceModal(true);
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
                    >
                      Attach Evidence
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500 text-xs">
            No specific capabilities catalogued yet for this organization.
          </div>
        )}
      </div>

      {/* Evidence & Verification Documents */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-base font-bold text-stone-900">Evidence & Verification Documents</h2>
              <p className="text-xs text-stone-600">Accreditations, test reports, facility proofs, and certifications.</p>
            </div>
          </div>

          {isOrgAdmin && (
            <button
              onClick={() => {
                setSelectedCapId("");
                setShowEvidenceModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Upload Evidence
            </button>
          )}
        </div>

        {passport.evidence.length > 0 ? (
          <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {passport.evidence.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">{item.title}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                      <span className="uppercase text-stone-600 font-medium">{formatEvidenceType(item.evidence_type)}</span>
                      <span>•</span>
                      <span>{formatDateSafe(item.created_at, "Recently")}</span>
                      <span>•</span>
                      {item.is_public ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Unlock className="h-3 w-3" /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <Lock className="h-3 w-3" /> Internal Only
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.verification_status === "VERIFIED" ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600 border border-stone-200">
                      PENDING REVIEW
                    </span>
                  )}

                  <a
                    href={`${apiUrl}/evidence/${item.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-stone-200 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors shadow-2xs"
                    title="View Document"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500 text-xs">
            No evidence documents submitted yet.
          </div>
        )}
      </div>

      {/* Role-Specific Institutional Infrastructure Section */}
      {passport.passport_type === "HEI_PASSPORT" ? (
        /* Academic & Research Infrastructure (HEI) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Departments */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-blue-700" />
              <h3 className="text-sm font-bold text-stone-900">Academic Departments</h3>
            </div>
            {passport.departments.length > 0 ? (
              <ul className="space-y-2">
                {passport.departments.map((dept) => (
                  <li key={dept.id} className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-700 border border-stone-200">
                    <p className="font-semibold text-stone-900">{dept.name}</p>
                    {dept.head_of_department && (
                      <p className="text-[10px] text-stone-500 mt-0.5">Head: {dept.head_of_department}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-500">None registered.</p>
            )}
          </div>

          {/* Labs & Facilities */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Research Labs & Facilities</h3>
            </div>
            {passport.laboratories.length > 0 ? (
              <ul className="space-y-2">
                {passport.laboratories.map((lab) => (
                  <li key={lab.id} className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-700 border border-stone-200">
                    <p className="font-semibold text-stone-900">{lab.name}</p>
                    {lab.specialization && (
                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5">{lab.specialization}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-500">None registered.</p>
            )}
          </div>

          {/* Research Areas */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-700" />
              <h3 className="text-sm font-bold text-stone-900">Focus Research Areas</h3>
            </div>
            {passport.researchAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {passport.researchAreas.map((ra) => (
                  <span key={ra.id} className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 border border-purple-200">
                    {ra.title}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500">None registered.</p>
            )}
          </div>
        </div>
      ) : (
        /* Industry / Enterprise Collaboration Pillars (Industry) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sector Profile */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-amber-700" />
              <h3 className="text-sm font-bold text-stone-900">Industry Sector</h3>
            </div>
            <div className="space-y-2 text-xs text-stone-700">
              <div className="rounded-xl bg-stone-50 px-3 py-2 border border-stone-200">
                <p className="text-[10px] text-stone-500">Classification</p>
                <p className="font-semibold text-stone-900 mt-0.5">
                  {passport.profile_details?.industry_type || "Commercial Enterprise / Innovation Partner"}
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 px-3 py-2 border border-stone-200">
                <p className="text-[10px] text-stone-500">Headquarters / Operational Base</p>
                <p className="font-semibold text-stone-900 mt-0.5">
                  {passport.profile_details?.headquarters || `${org.district}, ${org.state}`}
                </p>
              </div>
            </div>
          </div>

          {/* Collaboration Modes */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Supported Collaboration Modes</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Prototyping & Testing Support",
                "Technical Advisory & Mentorship",
                "Pilot Deployment Capacity",
                "Hardware & Lab Access",
                "Manufacturing Support",
              ].map((mode, idx) => (
                <span key={idx} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  {mode}
                </span>
              ))}
            </div>
          </div>

          {/* Geographic Operational Mandate */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="h-4 w-4 text-blue-700" />
              <h3 className="text-sm font-bold text-stone-900">Geographic Reach</h3>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2.5 border border-stone-200 space-y-1">
              <p className="font-semibold text-blue-800 text-xs">{formatGeographicReach(org.geographic_reach)}</p>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Eligible to support regional challenges across {org.geographic_reach === "NATIONAL" ? "all states and union territories" : org.geographic_reach === "STATEWIDE" ? "all 24 districts of Jharkhand" : `${org.district} district`}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Availability */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Confirm Active Capacity</h3>
            <p className="text-xs text-stone-600 mb-4">
              Confirming availability keeps your institution fresh in matching recommendations for the next {renewTtlDays} days.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Active Collaboration Capacity (Concurrent Projects/Inquiries)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={renewCapacity}
                  onChange={(e) => setRenewCapacity(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Freshness Duration (Days)
                </label>
                <select
                  value={renewTtlDays}
                  onChange={(e) => setRenewTtlDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                >
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days (Recommended)</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowRenewModal(false)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAvailability}
                disabled={renewLoading}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition"
              >
                {renewLoading ? "Confirming..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Capability */}
      {showAddCapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <form onSubmit={handleAddCapability} className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Add Capability</h3>
            <p className="text-xs text-stone-600 mb-4">
              Add a specialized domain or technical asset to your institution&apos;s passport.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Capability Name *</label>
                <input
                  type="text"
                  required
                  value={newCapName}
                  onChange={(e) => setNewCapName(e.target.value)}
                  placeholder="e.g., Soil Nutrient Chemistry Analysis"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Category *</label>
                <select
                  value={newCapCategory}
                  onChange={(e) => setNewCapCategory(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                >
                  <option value="AGRICULTURE">AGRICULTURE</option>
                  <option value="WATER">WATER</option>
                  <option value="HEALTHCARE">HEALTHCARE</option>
                  <option value="ENERGY">ENERGY</option>
                  <option value="MINING">MINING</option>
                  <option value="EDUCATION">EDUCATION</option>
                  <option value="ENVIRONMENT">ENVIRONMENT</option>
                  <option value="ENGINEERING">ENGINEERING</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={newCapDesc}
                  onChange={(e) => setNewCapDesc(e.target.value)}
                  placeholder="Details on methodology, equipment, or certified parameters"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddCapModal(false)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={capLoading}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition"
              >
                {capLoading ? "Saving..." : "Add Capability"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Upload Evidence */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <form onSubmit={handleAddEvidence} className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Upload Verification Evidence</h3>
            <p className="text-xs text-stone-600 mb-4">
              Submit proof documentation to verify capability passport entries.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Document Title *</label>
                <input
                  type="text"
                  required
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  placeholder="e.g., ISO 17025 Water Testing Accreditation"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Evidence Type *</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                >
                  <option value="DOCUMENT">Document / Certificate / Accreditation</option>
                  <option value="IMAGE">Image / Facility Photograph</option>
                  <option value="LINK">Official Verification Link / URL</option>
                  <option value="SURVEY_DATA">Test Report / Laboratory Data</option>
                  <option value="OTHER">Other Documentary Evidence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Evidence Submission Source *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEvidenceMode("file")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      evidenceMode === "file"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <FileCheck className="h-3.5 w-3.5" /> File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceMode("url")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      evidenceMode === "url"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> External URL
                  </button>
                </div>
              </div>

              {evidenceMode === "file" ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Document File (PDF, JPG, PNG, WEBP — Max 15MB) *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 15 * 1024 * 1024) {
                          alert("File size exceeds 15MB limit. Please choose a smaller file.");
                          e.target.value = "";
                          return;
                        }
                        setEvidenceFile(file);
                        if (!evidenceTitle) {
                          setEvidenceTitle(file.name.replace(/\.[^/.]+$/, ""));
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2 text-xs text-stone-900 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 transition"
                  />
                  {evidenceFile && (
                    <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                      Selected: {evidenceFile.name} ({(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">Document / Proof URL *</label>
                  <input
                    type="url"
                    required
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://... or official verification link"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                  />
                </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Upon submission, this evidence and any linked capability claim will enter <strong>PENDING_VERIFICATION</strong> status awaiting official administrative review.
                </p>
              </div>

              {passport.capabilities.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">Link to Capability (Optional)</label>
                  <select
                    value={selectedCapId}
                    onChange={(e) => setSelectedCapId(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                  >
                    <option value="">-- None (Organization Wide) --</option>
                    {passport.capabilities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="evidenceIsPublic"
                  checked={evidenceIsPublic}
                  onChange={(e) => setEvidenceIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                />
                <label htmlFor="evidenceIsPublic" className="text-xs text-stone-600">
                  Make document publicly visible on ecosystem passport
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEvidenceModal(false)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={evidenceLoading}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition"
              >
                {evidenceLoading ? "Uploading..." : "Save Evidence"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Claim Institution */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <form onSubmit={handleClaimSubmit} className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Claim {org?.name || "Organization"}</h3>
            <p className="text-xs text-stone-600 mb-4">
              Submit your affiliation details. Platform administrators will review your credentials and authorize administrative access.
            </p>

            {claimSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-sm font-semibold text-emerald-900">Claim Request Submitted!</p>
                <p className="text-xs text-emerald-700 mt-1">Our team will verify your institutional credentials promptly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Your Official Role & Affiliation *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    placeholder="e.g. Dean of Research / Authorized Technical Director with official email..."
                    className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Proof of Affiliation Document URL
                  </label>
                  <input
                    type="url"
                    value={claimProofUrl}
                    onChange={(e) => setClaimProofUrl(e.target.value)}
                    placeholder="https://... (Letter of authorization or institutional ID)"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={claimLoading}
                    className="rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition"
                  >
                    {claimLoading ? "Submitting..." : "Submit Claim"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
