"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  formatDateSafe,
} from "../../lib/utils";
import {
  Building2,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  FileCheck2,
  Sparkles,
  MapPin,
  ArrowRight,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  Sliders,
  CheckCircle,
  XCircle,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Users,
  UserPlus,
  Trash2,
  Search,
  Filter,
  Plus,
  Network,
  FolderGit2,
  Activity,
  TrendingUp,
  Target,
  BarChart2,
} from "lucide-react";
import { ResearchIntelligenceCard } from "../components/research/ResearchIntelligenceCard";

interface ProfileCompletenessChecklist {
  key: string;
  label: string;
  completed: boolean;
  weight: number;
  action: string;
}

interface ProfileCompleteness {
  score: number;
  checklist: ProfileCompletenessChecklist[];
  missing_actions: string[];
}

interface PassportSummary {
  organization: {
    id: string;
    name: string;
    organization_type: string;
    district: string;
    state: string;
    is_verified: boolean;
    verification_status: string;
    available_capacity: number;
    availability_status: string;
    availability_expires_at?: string | null;
    is_claimed: boolean;
    description?: string | null;
    website?: string | null;
  };
  institutionProfile?: {
    institution_type?: string;
    aishe_code?: string;
    naac_accreditation?: string;
    nirf_ranking?: number;
    autonomous_status?: boolean;
    research_centers_count?: number;
  };
  departments?: any[];
  faculty?: any[];
  laboratories?: any[];
  researchAreas?: any[];
  capabilities?: any[];
  profile_completeness?: ProfileCompleteness;
  days_until_expiry?: number;
}

interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  district: string;
  challenge_id: string;
  created_at: string;
  consortium_lead_id?: string;
  memberships?: Array<{
    organization_id: string;
    organization_name?: string;
    role: string;
  }>;
  milestones?: Array<{
    id: string;
    title: string;
    status: string;
    due_date?: string;
    order_index: number;
  }>;
}

interface ProposedSolutionSummary {
  id: string;
  title: string;
  executive_summary?: string;
  proposed_approach?: string;
  technical_approach?: string;
  status: string;
  visibility: string;
  estimated_budget?: number;
  estimated_timeline?: string;
  expected_outcomes?: string;
  challenge_id: string;
  created_at: string;
  project_id?: string | null;
  challenge?: {
    id: string;
    title: string;
    category?: string;
    domain?: string;
    district?: string;
  };
  teamMembers?: Array<{
    id: string;
    user_id?: string;
    name: string;
    email?: string;
    role: string;
    department?: string;
    designation?: string;
  }>;
  collaborations?: Array<{
    id: string;
    organization_id: string;
    collaboration_type: string;
    status: string;
    offered_resources?: string;
    notes?: string;
    created_at: string;
    offeringOrganization?: {
      id: string;
      name: string;
      organization_type: string;
    };
  }>;
}

interface ChallengeRecommendation {
  id: string;
  title: string;
  domain: string;
  district: string;
  status: string;
  urgency?: string;
  match_score?: number;
  matched_capabilities?: string[];
  created_at: string;
}

export default function UniversityDashboardPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [passport, setPassport] = useState<PassportSummary | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [solutions, setSolutions] = useState<ProposedSolutionSummary[]>([]);
  const [openChallenges, setOpenChallenges] = useState<ChallengeRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    "projects" | "ongoingProjects" | "solutions" | "challenges" | "passport" | "research" | "roster"
  >("ongoingProjects");
  const [ongoingProjects, setOngoingProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [selectedResearchChallengeId, setSelectedResearchChallengeId] = useState<string>("");

  // Academic Roster & Department Management state
  const [rosterMembers, setRosterMembers] = useState<any[]>([]);
  const [rosterDepartments, setRosterDepartments] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>("");
  const [rosterRoleFilter, setRosterRoleFilter] = useState<string>("");
  const [rosterDeptFilter, setRosterDeptFilter] = useState<string>("");

  // Modals for roster
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<"FACULTY" | "STUDENT">("FACULTY");
  const [newMemberDept, setNewMemberDept] = useState<string>("");
  const [newMemberDesignation, setNewMemberDesignation] = useState<string>("");
  const [newMemberSpecializations, setNewMemberSpecializations] = useState<string>("");
  const [memberActionLoading, setMemberActionLoading] = useState<boolean>(false);

  // New Department form state
  const [newDeptName, setNewDeptName] = useState<string>("");
  const [newDeptCode, setNewDeptCode] = useState<string>("");
  const [newDeptDesc, setNewDeptDesc] = useState<string>("");
  const [deptActionLoading, setDeptActionLoading] = useState<boolean>(false);

  // Renew capacity modal state
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [renewCapacity, setRenewCapacity] = useState<number>(10);
  const [renewTtlDays, setRenewTtlDays] = useState<number>(30);
  const [renewLoading, setRenewLoading] = useState<boolean>(false);

  const orgId = user?.primaryOrganization?.id || user?.memberships?.[0]?.organization_id;

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch Passport if organization is linked
      if (orgId) {
        try {
          const passRes = await fetch(`${apiUrl}/organizations/${orgId}/passport`);
          if (passRes.ok) {
            const passData = await passRes.json();
            setPassport(passData);
            if (typeof passData.organization?.available_capacity === "number") {
              setRenewCapacity(passData.organization.available_capacity);
            }
          }
        } catch (e) {
          console.error("Passport fetch error:", e);
        }
      }

      // 2. Fetch Active Projects
      try {
        const projRes = await fetch(`${apiUrl}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          const allProjects = Array.isArray(projData) ? projData : [];
          setProjects(allProjects);
          const terminalStatuses = ["COMPLETED", "IMPACT_VERIFIED", "TERMINATED"];
          setOngoingProjects(allProjects.filter((p: any) => !terminalStatuses.includes(p.status)));
          setCompletedProjects(allProjects.filter((p: any) => ["COMPLETED", "IMPACT_VERIFIED"].includes(p.status)));
        }
      } catch (e) {
        console.error("Projects fetch error:", e);
      }

      // 3. Fetch Proposed Solutions
      try {
        const url = orgId ? `${apiUrl}/solutions/my?orgId=${orgId}` : `${apiUrl}/solutions/my`;
        const solRes = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (solRes.ok) {
          const solData = await solRes.json();
          setSolutions(Array.isArray(solData) ? solData : []);
        }
      } catch (e) {
        console.error("Proposed solutions fetch error:", e);
      }

      // 4. Fetch Open / Validated Challenges
      try {
        const chalRes = await fetch(`${apiUrl}/challenges?status=VALIDATED`);
        if (chalRes.ok) {
          const chalData = await chalRes.json();
          const items = chalData.items || (Array.isArray(chalData) ? chalData : []);
          const slice = items.slice(0, 10);
          setOpenChallenges(slice);
          if (slice.length > 0) {
            setSelectedResearchChallengeId((prev) => prev || slice[0].id);
          }
        }
      } catch (e) {
        console.error("Challenges fetch error:", e);
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, orgId, token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadDashboardData();
    } else if (!authLoading && !token) {
      setLoading(false);
    }
  }, [authLoading, token, loadDashboardData]);

  const fetchRosterData = useCallback(async () => {
    if (!token || !orgId) return;
    setRosterLoading(true);
    try {
      let url = `${apiUrl}/organizations/${orgId}/members?`;
      if (rosterSearch) url += `search=${encodeURIComponent(rosterSearch)}&`;
      if (rosterRoleFilter) url += `role=${encodeURIComponent(rosterRoleFilter)}&`;
      if (rosterDeptFilter) url += `department=${encodeURIComponent(rosterDeptFilter)}&`;

      const [membersRes, deptsRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/organizations/${orgId}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setRosterMembers(Array.isArray(data) ? data : []);
      }
      if (deptsRes.ok) {
        const depts = await deptsRes.json();
        setRosterDepartments(Array.isArray(depts) ? depts : []);
      }
    } catch (e) {
      console.error("Error loading roster:", e);
    } finally {
      setRosterLoading(false);
    }
  }, [apiUrl, orgId, token, rosterSearch, rosterRoleFilter, rosterDeptFilter]);

  useEffect(() => {
    if (!authLoading && token && orgId) {
      fetchRosterData();
    }
  }, [authLoading, token, orgId, fetchRosterData]);

  const handleAddRosterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId) return;
    setMemberActionLoading(true);
    try {
      const specs = newMemberSpecializations
        ? newMemberSpecializations.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const res = await fetch(`${apiUrl}/organizations/${orgId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newMemberName,
          email: newMemberEmail,
          role: newMemberRole,
          department: newMemberDept,
          designation: newMemberDesignation,
          specializations: specs,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add institutional member");
      }

      setShowAddMemberModal(false);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberDept("");
      setNewMemberDesignation("");
      setNewMemberSpecializations("");
      await fetchRosterData();
    } catch (err: any) {
      alert(err.message || "Error adding member");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveRosterMember = async (memberId: string) => {
    if (!token || !orgId) return;
    if (!confirm("Are you sure you want to deactivate this institutional member?")) return;
    try {
      const res = await fetch(`${apiUrl}/organizations/${orgId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to remove member");
      }
      await fetchRosterData();
    } catch (err: any) {
      alert(err.message || "Error removing member");
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId) return;
    setDeptActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/organizations/${orgId}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDeptName,
          code: newDeptCode || undefined,
          description: newDeptDesc || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create department");
      }
      setShowAddDeptModal(false);
      setNewDeptName("");
      setNewDeptCode("");
      setNewDeptDesc("");
      await fetchRosterData();
    } catch (err: any) {
      alert(err.message || "Error creating department");
    } finally {
      setDeptActionLoading(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!token || !orgId) return;
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const res = await fetch(`${apiUrl}/organizations/${orgId}/departments/${deptId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete department");
      }
      await fetchRosterData();
    } catch (err: any) {
      alert(err.message || "Error deleting department");
    }
  };

  const handleConfirmAvailability = async () => {
    if (!token || !orgId) return;
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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to renew availability");
      }

      setShowRenewModal(false);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Error updating availability");
    } finally {
      setRenewLoading(false);
    }
  };

  const handleRespondToOffer = async (
    solutionId: string,
    offerId: string,
    status: "ACCEPTED" | "DECLINED" | "UNDER_DISCUSSION"
  ) => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/solutions/${solutionId}/collaborations/${offerId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to respond to collaboration offer.");
      }
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Error processing collaboration offer.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="rounded-full bg-stone-100 text-stone-700 px-2.5 py-0.5 text-[11px] font-bold border border-stone-200">Draft</span>;
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[11px] font-bold border border-blue-200">Under Review</span>;
      case "PUBLISHED":
        return <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-300">Published</span>;
      case "COLLABORATION_OPEN":
        return <span className="rounded-full bg-teal-50 text-teal-800 px-2.5 py-0.5 text-[11px] font-bold border border-teal-300">Open for Collaboration</span>;
      case "CONVERTED_TO_PROJECT":
      case "PROJECT_FORMED":
        return <span className="rounded-full bg-indigo-50 text-indigo-800 px-2.5 py-0.5 text-[11px] font-bold border border-indigo-300">Active Project</span>;
      case "ACCEPTED":
        return <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-300">Accepted</span>;
      case "OFFERED":
        return <span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold border border-amber-300">Offer Received</span>;
      case "UNDER_DISCUSSION":
      case "DISCUSSION_REQUIRED":
        return <span className="rounded-full bg-blue-50 text-blue-800 px-2.5 py-0.5 text-[11px] font-bold border border-blue-300">Discussion</span>;
      case "DECLINED":
      case "REJECTED":
        return <span className="rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-[11px] font-bold border border-red-200">Declined</span>;
      case "ACTIVE":
      case "IN_PROGRESS":
        return <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-300">Active</span>;
      case "COMPLETED":
        return <span className="rounded-full bg-purple-50 text-purple-800 px-2.5 py-0.5 text-[11px] font-bold border border-purple-300">Completed</span>;
      default:
        return <span className="rounded-full bg-stone-100 text-stone-700 px-2.5 py-0.5 text-[11px] font-bold">{status}</span>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen py-16 flex flex-col items-center justify-center text-stone-500 gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-sm font-medium">Loading University Experience Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50/60 py-16 px-4">
        <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center space-y-4">
          <GraduationCap className="h-12 w-12 text-emerald-700 mx-auto" />
          <h2 className="text-lg font-bold text-stone-900">University Authentication Required</h2>
          <p className="text-xs text-stone-600">
            Sign in with an academic, faculty, or institutional account to access the University Experience Grid.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition"
          >
            Sign In to University Portal
          </Link>
        </div>
      </div>
    );
  }

  const org = passport?.organization;
  const orgName = org?.name || user.primaryOrganization?.name || user.name;
  const orgDistrict = org?.district || user.primaryOrganization?.district || "Ranchi";
  const orgState = org?.state || user.primaryOrganization?.state || "Jharkhand";
  const verificationStatus = org?.verification_status || "UNVERIFIED";
  const availabilityStatus = org?.availability_status || "UNKNOWN";
  const availableCapacity = org?.available_capacity ?? 0;
  const completeness = passport?.profile_completeness;
  const daysRemaining = passport?.days_until_expiry ?? 0;

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6">
      <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0">
        {/* Welcome Header */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-700" /> Academic & Innovation Hub
                </span>
                {verificationStatus === "VERIFIED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-700" /> Verified HEI
                  </span>
                )}
                {availabilityStatus === "FRESH" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> Active Matching ({daysRemaining}d left)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" /> Availability Expired / Stale
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                {orgName}&apos;s University Workspace
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-stone-400" />
                  {orgDistrict}, {orgState}
                </span>
                {passport?.institutionProfile?.aishe_code && (
                  <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-[11px] text-stone-700">
                    AISHE: {passport.institutionProfile.aishe_code}
                  </span>
                )}
                {passport?.institutionProfile?.naac_accreditation && (
                  <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                    NAAC: {passport.institutionProfile.naac_accreditation}
                  </span>
                )}
                {passport?.institutionProfile?.nirf_ranking && (
                  <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200">
                    NIRF: #{passport.institutionProfile.nirf_ranking}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap lg:flex-col items-stretch sm:items-end gap-2.5 shrink-0">
              {orgId ? (
                <Link
                  href={`/organizations/${orgId}/passport`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm transition"
                >
                  <Award className="h-4 w-4" /> Capability Passport
                </Link>
              ) : (
                <Link
                  href="/organizations/onboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm transition"
                >
                  <Building2 className="h-4 w-4" /> Onboard Institution
                </Link>
              )}

              <button
                onClick={() => setShowRenewModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <Sliders className="h-4 w-4" /> Confirm Availability ({availableCapacity} slots)
              </button>
            </div>
          </div>

          {/* Profile Completeness Interactive Bar */}
          {completeness && (
            <div className="mt-6 pt-6 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-bold text-stone-800">
                    AI Capability Passport Completeness: {completeness.score}%
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 font-medium">
                  {completeness.score >= 80 ? "High Match Readiness" : "Complete Profile for Optimal Matching"}
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    completeness.score >= 80
                      ? "bg-emerald-600"
                      : completeness.score >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, completeness.score)}%` }}
                />
              </div>

              {/* Checklist Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {completeness.checklist.map((item) => (
                  <div
                    key={item.key}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                      item.completed
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-stone-50 text-stone-600 border-stone-200"
                    }`}
                  >
                    {item.completed ? (
                      <CheckCircle className="h-3 w-3 text-emerald-700 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-stone-400 shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
              <FolderKanban className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{projects.length}</p>
            <p className="text-[11px] text-stone-500">Collaborative civic engagements</p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Proposed Solutions</span>
              <FileCheck2 className="h-4 w-4 text-blue-700" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{solutions.length}</p>
            <p className="text-[11px] text-stone-500">
              {solutions.filter((s) => s.status === "PUBLISHED" || s.status === "COLLABORATION_OPEN").length} active in Open Workspace
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Research Assets</span>
              <FlaskConical className="h-4 w-4 text-purple-700" />
            </div>
            <p className="text-2xl font-bold text-stone-900">
              {(passport?.departments?.length ?? 0) + (passport?.laboratories?.length ?? 0)}
            </p>
            <p className="text-[11px] text-stone-500">
              {passport?.departments?.length ?? 0} depts, {passport?.laboratories?.length ?? 0} specialized labs
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Availability TTL</span>
              <Clock className="h-4 w-4 text-amber-700" />
            </div>
            <p className={`text-2xl font-bold ${daysRemaining > 7 ? "text-emerald-700" : daysRemaining > 0 ? "text-amber-700" : "text-stone-400"}`}>
              {daysRemaining > 0 ? `${daysRemaining} Days` : "Expired"}
            </p>
            <p className="text-[11px] text-stone-500">
              {availableCapacity} active slots registered
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto max-w-full min-w-0">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "projects"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Consortium Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("ongoingProjects")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              activeTab === "ongoingProjects"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Ongoing Projects ({ongoingProjects.length})
          </button>
          <button
            onClick={() => setActiveTab("solutions")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "solutions"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Proposed Solutions & Collaborations ({solutions.length})
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "challenges"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Validated Civic Challenges ({openChallenges.length})
          </button>
          {orgId && (
            <button
              onClick={() => setActiveTab("passport")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "passport"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Capability Overview
            </button>
          )}
          <button
            onClick={() => setActiveTab("research")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "research"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Research Intelligence
          </button>
          {orgId && (
            <button
              onClick={() => setActiveTab("roster")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "roster"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Academic Roster & Departments ({rosterMembers.length})
            </button>
          )}
        </div>

        {/* TAB 1: Active Consortium Projects */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3">
                <FolderKanban className="h-10 w-10 text-stone-400 mx-auto" />
                <h3 className="text-sm font-bold text-stone-900">No Active Consortium Projects</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  When your Expressions of Interest are accepted and grouped by the government into collaborative initiatives, your project workspaces will appear here.
                </p>
                <button
                  onClick={() => setActiveTab("challenges")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                >
                  Explore Validated Challenges <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {projects.map((proj) => {
                  const activeMilestone = proj.milestones?.find((m) => m.status === "IN_PROGRESS") || proj.milestones?.[0];
                  return (
                    <div
                      key={proj.id}
                      className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4 hover:border-emerald-300 transition shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(proj.status)}
                          <span className="text-xs text-stone-500">
                            District: <strong className="text-stone-800">{proj.district || "Jharkhand"}</strong>
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400">
                          Initiated {formatDateSafe(proj.created_at)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-stone-900">
                          {proj.title}
                        </h3>
                        <p className="text-xs text-stone-600 line-clamp-2">
                          {proj.description}
                        </p>
                      </div>

                      {/* Active Milestone Card */}
                      {activeMilestone && (
                        <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              Active Milestone
                            </span>
                            <p className="text-xs font-semibold text-stone-900">
                              {activeMilestone.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(activeMilestone.status)}
                            {activeMilestone.due_date && (
                              <span className="text-[11px] text-stone-500 font-mono">
                                Due {formatDateSafe(activeMilestone.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <span className="text-[11px] text-stone-500">
                          {proj.memberships?.length ? `${proj.memberships.length} Consortium Partners` : "Consortium Member"}
                        </span>

                        <Link
                          href={`/projects/${proj.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-1 transition"
                        >
                          Open Project Workspace <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 1b: Ongoing Projects */}
        {activeTab === "ongoingProjects" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
              <div>
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-emerald-600" />
                  Ongoing Project Workspaces
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Active project workspaces where your institution is a lead or partner. Excludes completed and terminated projects.
                </p>
              </div>
              {completedProjects.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-xs font-semibold text-stone-600 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {completedProjects.length} Completed
                </span>
              )}
            </div>

            {ongoingProjects.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3">
                <FolderGit2 className="h-10 w-10 text-stone-300 mx-auto" />
                <h3 className="text-sm font-bold text-stone-900">No Ongoing Projects Yet</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Your institution doesn&apos;t have any active project workspaces right now. Join a validated civic challenge and submit an Expression of Interest to get started.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab("challenges")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                  >
                    Explore Open Solutions <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {ongoingProjects.map((proj: any) => {
                  // Lifecycle stage progress mapping
                  const stageProgress: Record<string, number> = {
                    INITIATED: 5, PROPOSED: 10, ACTIVE: 15, KICKOFF_PENDING: 18, KICKOFF_REVISION: 20,
                    PLANNING: 25, PROTOTYPE_DEVELOPMENT: 40, TESTING: 55, PILOT: 70, DEPLOYMENT: 85, BLOCKED: 0,
                  };
                  const progress = stageProgress[proj.status] ?? 10;
                  const isBlocked = proj.status === "BLOCKED";

                  const totalMilestones = proj.milestones?.length ?? 0;
                  const approvedMilestones = proj.milestones?.filter((m: any) =>
                    ["APPROVED", "COMPLETED"].includes(m.status)
                  ).length ?? 0;
                  const inProgressMilestone = proj.milestones?.find((m: any) => m.status === "IN_PROGRESS");

                  const academicCount = proj.academicMembers?.length ?? 0;
                  const partnerCount = proj.participants?.length ?? 0;

                  const stageLabelMap: Record<string, string> = {
                    INITIATED: "Stage 0 - Initiated", PROPOSED: "Stage 0 - Proposed",
                    ACTIVE: "Stage 0 - Active", KICKOFF_PENDING: "Stage 1 - Kickoff Pending",
                    KICKOFF_REVISION: "Stage 1 - Kickoff Revision", PLANNING: "Stage 1 - Planning",
                    PROTOTYPE_DEVELOPMENT: "Stage 2 - Prototype Development",
                    TESTING: "Stage 3 - Testing", PILOT: "Stage 4 - Pilot",
                    DEPLOYMENT: "Stage 5 - Deployment", BLOCKED: "⚠ Blocked",
                    ON_HOLD: "On Hold",
                  };
                  const stageLabel = stageLabelMap[proj.status] ?? proj.status;

                  return (
                    <div
                      key={proj.id}
                      className={`rounded-2xl border bg-white p-6 space-y-4 transition shadow-2xs ${
                        isBlocked
                          ? "border-amber-300 hover:border-amber-400"
                          : "border-stone-200 hover:border-emerald-300"
                      }`}
                    >
                      {/* Header row */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-3">
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-base font-bold text-stone-900 leading-snug">{proj.title}</h3>
                          {proj.challenge?.title && (
                            <p className="text-xs text-stone-500">
                              Challenge: <span className="text-stone-700 font-medium">{proj.challenge.title}</span>
                            </p>
                          )}
                          {(proj.district || proj.challenge?.district) && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                              <MapPin className="h-3 w-3" />
                              {proj.district || proj.challenge?.district}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isBlocked
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}>
                            {isBlocked ? <AlertTriangle className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                            {stageLabel}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Started {formatDateSafe(proj.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Lifecycle Progress
                          </span>
                          <span className={`text-[11px] font-bold ${isBlocked ? "text-amber-700" : "text-emerald-700"}`}>
                            {isBlocked ? "Blocked" : `${progress}%`}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                          {!isBlocked && (
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          )}
                          {isBlocked && (
                            <div className="h-full rounded-full bg-amber-400 w-full animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl bg-stone-50 border border-stone-100 p-2.5 text-center">
                          <p className={`text-sm font-bold ${approvedMilestones > 0 ? "text-emerald-700" : "text-stone-600"}`}>
                            {approvedMilestones}/{totalMilestones}
                          </p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Milestones</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 border border-stone-100 p-2.5 text-center">
                          <p className="text-sm font-bold text-stone-700">{academicCount || "-"}</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Academic Team</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 border border-stone-100 p-2.5 text-center">
                          <p className="text-sm font-bold text-stone-700">{partnerCount || "-"}</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Participants</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 border border-stone-100 p-2.5 text-center">
                          <p className="text-sm font-bold text-stone-700">
                            {proj.challenge?.district || "-"}
                          </p>
                          <p className="text-[10px] text-stone-500 mt-0.5">District</p>
                        </div>
                      </div>

                      {/* Next milestone */}
                      {inProgressMilestone && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                              <Target className="h-3 w-3" /> Active Milestone
                            </span>
                            <p className="text-xs font-semibold text-stone-900 mt-0.5">{inProgressMilestone.title}</p>
                          </div>
                          {inProgressMilestone.due_date && (
                            <span className="text-[11px] text-stone-500 font-mono shrink-0">
                              Due {formatDateSafe(inProgressMilestone.due_date)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/projects/${proj.id}?tab=milestones`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-emerald-700 transition"
                          >
                            <BarChart2 className="h-3 w-3" /> Milestones
                          </Link>
                          <span className="text-stone-300">·</span>
                          <Link
                            href={`/projects/${proj.id}?tab=tasks`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-emerald-700 transition"
                          >
                            Tasks
                          </Link>
                          <span className="text-stone-300">·</span>
                          <Link
                            href={`/projects/${proj.id}?tab=deliverables`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-emerald-700 transition"
                          >
                            Deliverables
                          </Link>
                        </div>
                        <Link
                          href={`/projects/${proj.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                        >
                          Open Project Workspace <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Proposed Solutions & Open Collaborations */}
        {activeTab === "solutions" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Open Collaborative Solutions
                </h2>
                <p className="text-xs text-stone-500">
                  Formulate technical solutions with faculty &amp; students, invite cross-sector collaboration, and convert to active projects.
                </p>
              </div>
              <Link
                href="/solutions/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" /> Draft New Solution
              </Link>
            </div>

            {solutions.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3">
                <FileCheck2 className="h-10 w-10 text-stone-400 mx-auto" />
                <h3 className="text-sm font-bold text-stone-900">No Proposed Solutions Created Yet</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Select a validated civic challenge to formulate an academic solution proposal and publish it for cross-sector industry &amp; startup collaboration.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab("challenges")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                  >
                    Browse Validated Challenges <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    href="/solutions"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                  >
                    Explore Open Workspace
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {solutions.map((sol) => {
                  const pendingOffers = sol.collaborations?.filter(
                    (c) => c.status === "OFFERED" || c.status === "UNDER_DISCUSSION"
                  ) || [];
                  const acceptedOffers = sol.collaborations?.filter(
                    (c) => c.status === "ACCEPTED"
                  ) || [];

                  return (
                    <div
                      key={sol.id}
                      className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4 hover:border-emerald-300 transition shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(sol.status)}
                          {(sol.challenge?.domain || sol.challenge?.category) && (
                            <span className="rounded bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                              {sol.challenge.domain || sol.challenge.category}
                            </span>
                          )}
                          {sol.challenge?.district && (
                            <span className="text-[11px] text-stone-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-stone-400" />
                              {sol.challenge.district}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-400">
                          Created {formatDateSafe(sol.created_at)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-base font-bold text-stone-900 hover:text-emerald-800 transition">
                            <Link href={`/solutions/${sol.id}`}>{sol.title}</Link>
                          </h3>
                          {sol.estimated_budget && (
                            <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg shrink-0">
                              ₹{Number(sol.estimated_budget).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {sol.challenge && (
                          <p className="text-xs text-stone-500">
                            Addressing Challenge: <strong className="text-stone-700">{sol.challenge.title}</strong>
                          </p>
                        )}
                        <p className="text-xs text-stone-600 line-clamp-2 mt-1">
                          {sol.executive_summary || sol.proposed_approach || sol.technical_approach || "No summary provided."}
                        </p>
                      </div>

                      {/* Team & Timeline Snapshot */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 py-1 border-y border-stone-50">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-emerald-700" />
                          Academic Team: <strong className="text-stone-800">{sol.teamMembers?.length || 0} members</strong>
                        </span>
                        {sol.estimated_timeline && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-stone-400" />
                            Timeline: <strong className="text-stone-800">{sol.estimated_timeline}</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          Collaborations: <strong className="text-stone-800">{sol.collaborations?.length || 0} offers</strong> ({acceptedOffers.length} accepted)
                        </span>
                      </div>

                      {/* Received Collaboration Offers Section */}
                      {sol.collaborations && sol.collaborations.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                            <span>Ecosystem Collaboration Offers ({sol.collaborations.length})</span>
                            {pendingOffers.length > 0 && (
                              <span className="text-amber-700 text-[11px] font-semibold">
                                {pendingOffers.length} pending review
                              </span>
                            )}
                          </h4>
                          <div className="grid grid-cols-1 gap-2.5">
                            {sol.collaborations.map((collab) => (
                              <div
                                key={collab.id}
                                className={`rounded-xl p-3 border text-xs space-y-2 transition ${
                                  collab.status === "OFFERED"
                                    ? "bg-amber-50/50 border-amber-200"
                                    : collab.status === "ACCEPTED"
                                    ? "bg-emerald-50/40 border-emerald-200"
                                    : collab.status === "UNDER_DISCUSSION"
                                    ? "bg-blue-50/40 border-blue-200"
                                    : "bg-stone-50 border-stone-200"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <strong className="text-stone-900">
                                      {collab.offeringOrganization?.name || "Partner Organization"}
                                    </strong>
                                    {collab.offeringOrganization?.organization_type && (
                                      <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                                        {collab.offeringOrganization.organization_type.replace(/_/g, " ")}
                                      </span>
                                    )}
                                    <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                      {collab.collaboration_type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <div>{getStatusBadge(collab.status)}</div>
                                </div>

                                {(collab.offered_resources || collab.notes) && (
                                  <p className="text-stone-600 text-[11px]">
                                    {collab.offered_resources || collab.notes}
                                  </p>
                                )}

                                {/* University Response Actions */}
                                {(collab.status === "OFFERED" || collab.status === "UNDER_DISCUSSION") && (
                                  <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                                    <button
                                      onClick={() => handleRespondToOffer(sol.id, collab.id, "ACCEPTED")}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition text-[11px]"
                                    >
                                      <CheckCircle2 className="h-3 w-3" /> Accept Offer
                                    </button>
                                    <button
                                      onClick={() => handleRespondToOffer(sol.id, collab.id, "UNDER_DISCUSSION")}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold hover:bg-blue-100 transition text-[11px]"
                                    >
                                      Discuss
                                    </button>
                                    <button
                                      onClick={() => handleRespondToOffer(sol.id, collab.id, "DECLINED")}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-700 transition text-[11px]"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between pt-3 border-t border-stone-100 gap-3">
                        <div className="text-[11px] text-stone-500">
                          {sol.status === "CONVERTED_TO_PROJECT" && (
                            <span className="text-teal-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Project Active in Execution Lifecycle
                            </span>
                          )}
                          {(sol.status === "PUBLISHED" || sol.status === "COLLABORATION_OPEN") && (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5" /> Published in Open Solution Workspace
                            </span>
                          )}
                          {sol.status === "DRAFT" && (
                            <span className="text-stone-500">Private Draft - Add academic team members &amp; publish when ready.</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/solutions/${sol.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition"
                          >
                            Manage Solution Workspace <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Validated Civic Challenges (AI Matching) */}
        {activeTab === "challenges" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Validated Civic Problems Ready for Innovation
                </h2>
                <p className="text-xs text-stone-500">
                  Civic problems verified by district authorities and ready for university & research collaboration.
                </p>
              </div>
              <Link
                href="/challenges"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View Full Catalog <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {openChallenges.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500 text-xs">
                No verified challenges currently awaiting proposals.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openChallenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 hover:border-emerald-300 transition shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                          {ch.domain || "Civic Need"}
                        </span>
                        <span className="text-[11px] text-stone-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-stone-400" />
                          {ch.district || "Jharkhand"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-stone-900 leading-snug">
                        {ch.title}
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/challenges/${ch.id}`}
                        className="text-xs font-medium text-stone-600 hover:text-stone-900"
                      >
                        Inspect Details
                      </Link>

                      <button
                        onClick={() => {
                          setSelectedResearchChallengeId(ch.id);
                          setActiveTab("research");
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" /> Research
                      </button>

                      <Link
                        href={`/solutions/new?challengeId=${ch.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                      >
                        Propose Solution <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Capability Passport Snapshot */}
        {activeTab === "passport" && passport && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-stone-900">
                    Institutional Capability Grid
                  </h3>
                </div>
                <Link
                  href={`/organizations/${orgId}/passport`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Edit & Manage Passport <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-stone-50 p-4 border border-stone-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Departments</span>
                  <p className="text-xl font-bold text-stone-900">{passport.departments?.length ?? 0}</p>
                  <p className="text-[11px] text-stone-500">Academic departments catalogued</p>
                </div>

                <div className="rounded-xl bg-stone-50 p-4 border border-stone-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Specialized Labs</span>
                  <p className="text-xl font-bold text-stone-900">{passport.laboratories?.length ?? 0}</p>
                  <p className="text-[11px] text-stone-500">Research facilities & equipment</p>
                </div>

                <div className="rounded-xl bg-stone-50 p-4 border border-stone-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Capabilities</span>
                  <p className="text-xl font-bold text-stone-900">{passport.capabilities?.length ?? 0}</p>
                  <p className="text-[11px] text-stone-500">Domain competencies indexed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Research Intelligence */}
        {activeTab === "research" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                    University Research Intelligence &amp; Academic Evidence Grid
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Access scholarly publications, vector-indexed literature, and open empirical datasets to formulate research-backed solution proposals.
                  </p>
                </div>
              </div>

              {/* Challenge Selector */}
              {openChallenges.length > 0 && (
                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                  <label className="font-bold text-stone-700 shrink-0">
                    Select Civic Challenge:
                  </label>
                  <select
                    value={selectedResearchChallengeId}
                    onChange={(e) => setSelectedResearchChallengeId(e.target.value)}
                    className="w-full sm:max-w-xl rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-900 shadow-2xs focus:border-emerald-600 focus:outline-hidden"
                  >
                    {openChallenges.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.domain || "Civic Need"}] {c.title} ({c.district || "Jharkhand"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedResearchChallengeId ? (
              <ResearchIntelligenceCard
                challengeId={selectedResearchChallengeId}
                token={token}
              />
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-xs text-stone-500">
                No validated civic challenges currently available to inspect research intelligence.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Academic Roster & Department Management */}
        {activeTab === "roster" && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    Institutional Academic Roster & Multidisciplinary Departments
                  </h2>
                </div>
                <p className="text-xs text-stone-500">
                  Manage university faculty mentors, student researchers, and academic departments to participate in civic solutions and cross-departmental collaborations.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAddDeptModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-stone-600" /> Add Department
                </button>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Academic Member
                </button>
              </div>
            </div>

            {/* Departments Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-emerald-700" />
                  Registered Departments ({rosterDepartments.length})
                </h3>
              </div>

              {rosterDepartments.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 text-center text-xs text-stone-500">
                  No academic departments created yet. Click &quot;Add Department&quot; above to initialize departmental structures.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {rosterDepartments.map((dept) => (
                    <div
                      key={dept.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1.5 relative group hover:border-emerald-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                          {dept.code || "DEPT"}
                        </span>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          title="Delete department"
                          className="text-stone-300 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 truncate">{dept.name}</h4>
                      {dept.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2">{dept.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members Filters & Roster List */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Academic Members ({rosterMembers.length})
                  </h3>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by name / email..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-hidden w-48 sm:w-56"
                    />
                  </div>

                  <select
                    value={rosterRoleFilter}
                    onChange={(e) => setRosterRoleFilter(e.target.value)}
                    className="py-1.5 px-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700 focus:outline-hidden"
                  >
                    <option value="">All Roles</option>
                    <option value="FACULTY">Faculty Mentors</option>
                    <option value="STUDENT">Student Researchers</option>
                  </select>

                  <select
                    value={rosterDeptFilter}
                    onChange={(e) => setRosterDeptFilter(e.target.value)}
                    className="py-1.5 px-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700 focus:outline-hidden"
                  >
                    <option value="">All Departments</option>
                    {rosterDepartments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {rosterLoading ? (
                <div className="py-12 flex justify-center items-center text-xs text-stone-500 gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
                  Loading institutional roster...
                </div>
              ) : rosterMembers.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500 space-y-2">
                  <Users className="h-8 w-8 text-stone-300 mx-auto" />
                  <p>No academic members match the selected filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rosterMembers.map((m) => {
                    const isFaculty = m.role === "FACULTY" || m.organization_role === "FACULTY";
                    const specializations = m.specializations || m.user?.specializations || [];
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/60 hover:bg-white hover:border-emerald-200 transition space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-stone-900">{m.user?.name || m.name}</h4>
                            <p className="text-[11px] text-stone-500 truncate">{m.user?.email || m.email}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              isFaculty
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {m.role || m.organization_role}
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-600">
                          {m.department || m.user?.department ? (
                            <p>
                              Dept: <strong>{m.department || m.user?.department}</strong>{" "}
                              {(m.designation || m.user?.designation) && (
                                <span className="text-stone-500">({m.designation || m.user?.designation})</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-stone-400 italic">No department assigned</p>
                          )}
                        </div>

                        {specializations.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {specializations.map((spec: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-stone-200/60 text-stone-700 text-[10px] rounded font-medium"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">
                            Status: <strong className="text-emerald-700">{m.status || "ACTIVE"}</strong>
                          </span>
                          <button
                            onClick={() => handleRemoveRosterMember(m.id)}
                            className="text-stone-400 hover:text-red-600 transition flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="h-3 w-3" /> Deactivate
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Confirm Availability & TTL */}
        {showRenewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">
                  Confirm Availability & Active Capacity
                </h3>
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-stone-600">
                Fresh availability signals boost institutional match ranking when AI algorithms recommend partners for civic challenges.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Concurrent Collaboration Capacity (Slots)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={renewCapacity}
                    onChange={(e) => setRenewCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Freshness Validity (Days)
                  </label>
                  <select
                    value={renewTtlDays}
                    onChange={(e) => setRenewTtlDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  >
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days (Recommended)</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAvailability}
                  disabled={renewLoading}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {renewLoading ? "Confirming..." : "Confirm Active Availability"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Academic Member */}
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-700" />
                  Add Institutional Academic Member
                </h3>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddRosterMember} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="e.g. rajesh@university.edu.in"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Academic Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                  >
                    <option value="FACULTY">Faculty Mentor / Professor</option>
                    <option value="STUDENT">Student Researcher / Scholar</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={newMemberDept}
                      onChange={(e) => setNewMemberDept(e.target.value)}
                      placeholder="e.g. Civil Engineering"
                      className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={newMemberDesignation}
                      onChange={(e) => setNewMemberDesignation(e.target.value)}
                      placeholder="e.g. Professor / Scholar"
                      className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Specializations &amp; Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={newMemberSpecializations}
                    onChange={(e) => setNewMemberSpecializations(e.target.value)}
                    placeholder="e.g. Hydrology, Soil Mechanics, GIS"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={memberActionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                  >
                    {memberActionLoading ? "Adding..." : "Add to Roster"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Department */}
        {showAddDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Network className="h-5 w-5 text-emerald-700" />
                  Add Academic Department
                </h3>
                <button
                  onClick={() => setShowAddDeptModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddDepartment} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Environmental Science & Engineering"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Department Code</label>
                  <input
                    type="text"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder="e.g. ESE"
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                    placeholder="Focus areas, labs, and research capabilities..."
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowAddDeptModal(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deptActionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                  >
                    {deptActionLoading ? "Creating..." : "Create Department"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
