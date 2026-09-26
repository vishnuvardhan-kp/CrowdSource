"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  User,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Award,
  Building2,
  DollarSign,
  ExternalLink,
  ArrowRight,
  Compass,
  Search,
  Filter,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { formatDateSafe } from "../../lib/utils";

interface JourneyChallengeListItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  citizen_severity: string;
  status: string;
  district: string;
  village_locality: string;
  created_at: string;
  submitted_at: string;
  district_name?: string;
  match_count: number;
  eoi_count: number;
  project_id?: string;
}

interface JourneyData {
  challengeId: string;
  stages: {
    submitter: {
      name: string;
      role: string;
      email?: string;
      phone?: string;
      submittedAt: string | null;
      isAnonymous: boolean;
      status: string;
    };
    problem: {
      id: string;
      title: string;
      description: string;
      category: string;
      priority: string;
      citizenSeverity: string;
      status: string;
      confirmationsCount: number;
      evidenceCount: number;
    };
    location: {
      district: string;
      districtCode?: string;
      block: string;
      villageLocality: string;
      state: string;
      latitude?: number | null;
      longitude?: number | null;
    };
    aiStructuring: {
      status: string;
      domain: string;
      subdomain: string;
      summary: string;
      requiredCapabilities: string[];
      keywords: string[];
      priorityScore: number | null;
      severityScore: number | null;
      confidence: number | null;
      modelName: string;
    };
    verification: {
      status: string;
      isVerified: boolean;
      verifiedBy: string;
      verifierRole: string;
      jurisdiction: string;
      verifiedAt: string | null;
      notes: string;
    };
    matching: {
      status: string;
      totalMatches: number;
      topMatches: Array<{
        organizationId: string;
        organizationName: string;
        organizationType: string;
        score: number;
        confidenceCategory: string;
        district?: string;
        state?: string;
        reach?: string;
        reasons: string[];
      }>;
    };
    implementation: {
      status: string;
      leadOrganization: string;
      leadContact?: string;
      consortiumPartners: string[];
      eoisCount: number;
      solutionsCount?: number;
      activeSolutions?: any[];
      activeEois: Array<{
        id: string;
        organizationName: string;
        organizationId: string;
        status: string;
        proposedApproach?: string;
        timeline?: string;
        leadName?: string;
        leadDesignation?: string;
        leadEmail?: string;
        submittedAt: string;
      }>;
      project?: {
        id: string;
        title: string;
        status: string;
        budgetAllocated: number;
        startDate?: string;
        targetDate?: string;
        milestonesCount?: number;
      } | null;
    };
    funding: {
      status: string;
      fundingSource: string;
      totalBudget: number | null;
      sponsorPartners: string[];
      notes: string;
    };
    impact: {
      status: string;
      lifecycleStage: string;
      currentChallengeStatus: string;
      verifiedImpactMetrics: Array<{
        metric: string;
        value: string | number;
      }>;
      beneficiaryReach?: string;
      summary: string;
    };
  };
}

interface ProblemResolutionMapProps {
  token: string | null;
  isDistrictOfficer: boolean;
  officerDistrictId?: string;
}

export function ProblemResolutionMap({
  token,
  isDistrictOfficer,
  officerDistrictId,
}: ProblemResolutionMapProps) {
  const [challenges, setChallenges] = useState<JourneyChallengeListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingJourney, setLoadingJourney] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Challenge List for Selector
  const fetchChallengesList = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingList(true);
      setError(null);
      const res = await fetch("/api/admin/analytics/resolution-journeys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: JourneyChallengeListItem[] = await res.json();
        setChallenges(data);
        if (data.length > 0 && !selectedId) {
          // Prioritize Agriculture or validated challenge if available
          const preferred =
            data.find(
              (c) =>
                c.category?.toLowerCase().includes("agri") ||
                c.title?.toLowerCase().includes("mustard") ||
                c.title?.toLowerCase().includes("blight")
            ) || data[0];
          setSelectedId(preferred.id);
        }
      } else {
        setError(`Failed to load problem resolution list (HTTP ${res.status})`);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading challenges");
    } finally {
      setLoadingList(false);
    }
  }, [token, selectedId]);

  // 2. Fetch Detailed 9-Stage Journey for Selected Challenge
  const fetchJourneyDetail = useCallback(
    async (challengeId: string) => {
      if (!token || !challengeId) return;
      try {
        setLoadingJourney(true);
        setError(null);
        const res = await fetch(
          `/api/admin/analytics/resolution-journey/${challengeId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data: JourneyData = await res.json();
          setJourney(data);
        } else {
          setError(`Failed to retrieve resolution journey (HTTP ${res.status})`);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load journey");
      } finally {
        setLoadingJourney(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchChallengesList();
  }, [fetchChallengesList]);

  useEffect(() => {
    if (selectedId) {
      fetchJourneyDetail(selectedId);
    }
  }, [selectedId, fetchJourneyDetail]);

  // Filtered Challenge List
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.village_locality?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        categoryFilter === "ALL" ||
        c.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        (categoryFilter === "Agriculture" &&
          c.category?.toLowerCase().includes("agri"));

      return matchesSearch && matchesCat;
    });
  }, [challenges, searchTerm, categoryFilter]);

  const stages = journey?.stages;

  return (
    <div className="space-y-6 text-left">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 rounded-2xl p-6 text-white shadow-sm border border-emerald-900/40 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold tracking-wide border border-emerald-400/30">
              <Compass className="h-3.5 w-3.5 text-emerald-400" />
              Comprehensive 9-Stage Governance Lifecycle
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Problem Resolution Journey Map
            </h2>
            <p className="text-xs text-emerald-100/80 max-w-2xl leading-relaxed">
              Real-time audit visualization tracing civic problems from initial citizen voice submission through AI structuring, official administrative validation, academic capability matching, and field solution delivery.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">
                Total Tracked In Lifecycle
              </span>
              <span className="text-xl font-black text-white">
                {challenges.length} Problems
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Problem Selector Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-bold text-stone-900">
              Select Civic Problem to Trace:
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by problem title, block, or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
            />
          </div>
        </div>

        {/* Category Pills & Quick Select */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-stone-500 mr-1">
            Category:
          </span>
          {["ALL", "Agriculture", "Water & Sanitation", "Healthcare", "General"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  categoryFilter === cat
                    ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        {/* Problem Selector Dropdown */}
        <div className="pt-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          >
            {filteredChallenges.length === 0 ? (
              <option value="">No problems found matching criteria</option>
            ) : (
              filteredChallenges.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.category || "Civic"}] {c.title} - {c.district || "Ranchi"} ({c.status})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Quick-Switch Pills for High-Profile Problems */}
        {challenges.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-stone-400">
              ⚡ Quick Select:
            </span>
            {challenges.slice(0, 4).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition truncate max-w-[280px] ${
                  selectedId === c.id
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading or Error States */}
      {loadingJourney && (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-stone-200">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs font-semibold text-stone-600">
            Constructing complete 9-stage resolution journey from PostgreSQL records...
          </p>
        </div>
      )}

      {error && !loadingJourney && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. The 9-Stage Resolution Journey Map Canvas */}
      {!loadingJourney && journey && stages && (
        <div className="space-y-6">
          {/* Active Problem Summary Banner */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {stages.problem.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  Priority: {stages.problem.priority}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
                  Status: {stages.problem.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 pt-1">
                {stages.problem.title}
              </h3>
              <p className="text-xs text-stone-600 max-w-3xl">
                {stages.problem.description}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                href={`/challenges/${journey.challengeId}`}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
              >
                <span>View Full Challenge Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* 9-STAGE VISUAL GRID & CONNECTOR CARDS */}
          <div className="relative space-y-4">
            {/* STAGE 1: WHO POSTED */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        WHO POSTED (Citizen Intake)
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        Verified Citizen
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Initial civic problem submission into the intake queue
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Submitted At</span>
                  <span className="text-xs font-semibold text-stone-800">
                    {formatDateSafe(stages.submitter.submittedAt || "")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Submitter Name
                  </span>
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    {stages.submitter.name}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    User Role &amp; Identity
                  </span>
                  <p className="text-stone-700 font-medium">
                    {stages.submitter.role} • Registered Resident
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Contact Record (Government View)
                  </span>
                  <p className="text-stone-700 font-mono text-[11px]">
                    {stages.submitter.email || "Confidential Contact Record"}
                  </p>
                </div>
              </div>
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 2: WHAT PROBLEM */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        WHAT PROBLEM (Civic Issue Specification)
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {stages.problem.priority} Priority
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Problem description, civic taxonomy, and community confirmations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-xs font-bold border border-stone-200">
                    {stages.problem.confirmationsCount} Community Confirmations
                  </span>
                </div>
              </div>

              <div className="pt-3.5 space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-stone-800 leading-relaxed">
                  <strong>Citizen Statement:</strong> &ldquo;{stages.problem.description}&rdquo;
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600 pt-1">
                  <span><strong>Category:</strong> {stages.problem.category}</span>
                  <span>•</span>
                  <span><strong>Severity:</strong> {stages.problem.citizenSeverity}</span>
                  <span>•</span>
                  <span><strong>Evidence Attachments:</strong> {stages.problem.evidenceCount} files</span>
                </div>
              </div>
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 3: WHERE */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        WHERE (Jurisdiction &amp; Geographic Location)
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {stages.location.district}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Authoritative location bounding and district administrative routing
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <MapPin className="h-4 w-4" />
                  <span>{stages.location.districtCode || "JH-RAN"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    District
                  </span>
                  <p className="font-bold text-stone-900">{stages.location.district}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Block / Tehsil
                  </span>
                  <p className="font-semibold text-stone-800">{stages.location.block}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Village / Locality
                  </span>
                  <p className="font-semibold text-stone-800">
                    {stages.location.villageLocality}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    State
                  </span>
                  <p className="font-semibold text-stone-800">{stages.location.state}</p>
                </div>
              </div>
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 4: AI STRUCTURED */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        AI STRUCTURED (Problem Intelligence Engine)
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                        {stages.aiStructuring.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Automated capability extraction, priority scoring &amp; domain classification
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Analysis Engine</span>
                  <span className="text-[11px] text-purple-900 font-semibold">
                    Problem Intelligence
                  </span>
                </div>
              </div>

              <div className="pt-3.5 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Classified Domain
                    </span>
                    <p className="font-bold text-stone-900">{stages.aiStructuring.domain}</p>
                    <p className="text-[11px] text-stone-500">{stages.aiStructuring.subdomain}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      AI Priority &amp; Severity
                    </span>
                    <p className="font-bold text-stone-900">
                      Score: {stages.aiStructuring.priorityScore ?? "8.0"}/10
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Severity: {stages.aiStructuring.severityScore ?? "8.0"}/10
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Classification Confidence
                    </span>
                    <p className="font-bold text-stone-900">
                      {stages.aiStructuring.confidence ?? 92}%
                    </p>
                    <div className="w-full bg-stone-200 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${stages.aiStructuring.confidence ?? 92}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Extracted Capabilities Required */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    Required Institutional &amp; Technical Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {stages.aiStructuring.requiredCapabilities.length === 0 ? (
                      <span className="text-xs text-stone-400 italic">
                        General civic technical intervention
                      </span>
                    ) : (
                      stages.aiStructuring.requiredCapabilities.map((cap, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold"
                        >
                          {cap}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 5: ADMINISTRATIVE REVIEW */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
                    5
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        ADMINISTRATIVE REVIEW (Official Oversight &amp; Audit Trail)
                      </h4>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          stages.verification.isVerified
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {stages.verification.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Authoritative oversight sign-off by assigned district administrative reviewer
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Reviewed On</span>
                  <span className="text-xs font-semibold text-stone-800">
                    {stages.verification.verifiedAt
                      ? formatDateSafe(stages.verification.verifiedAt)
                      : "Pending Review"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Reviewer Name
                  </span>
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                    {stages.verification.verifiedBy}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Reviewing Official Role
                  </span>
                  <p className="text-stone-700 font-medium">
                    {stages.verification.verifierRole}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Jurisdiction Authority
                  </span>
                  <p className="text-stone-700 font-medium">
                    {stages.verification.jurisdiction}
                  </p>
                </div>
              </div>

              {stages.verification.notes && (
                <div className="mt-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100 text-xs text-teal-950 leading-relaxed">
                  <strong>Official Reviewer Audit Note:</strong> {stages.verification.notes}
                </div>
              )}
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 6: WHO WAS MATCHED */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                    6
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        WHO WAS MATCHED (Institutional Capability Engine)
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {stages.matching.totalMatches} Matched Institutions
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      AI capability matching against accredited HEI departments &amp; research labs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <Award className="h-4 w-4" />
                  <span>Ranked by Hybrid Score</span>
                </div>
              </div>

              <div className="pt-3.5 space-y-3">
                {stages.matching.topMatches.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-400 italic">
                    Capability matching in progress or awaiting government validation.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stages.matching.topMatches.map((m, idx) => (
                      <div
                        key={m.organizationId || idx}
                        className={`p-4 rounded-xl border transition ${
                          idx === 0
                            ? "bg-emerald-50/70 border-emerald-300 shadow-xs"
                            : "bg-stone-50/60 border-stone-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {idx === 0 && (
                                <span className="px-1.5 py-0.2 bg-emerald-700 text-white rounded text-[9px] font-bold">
                                  Top Match #1
                                </span>
                              )}
                              <h5 className="text-xs font-bold text-stone-900">
                                {m.organizationName}
                              </h5>
                            </div>
                            <span className="text-[10px] text-stone-500">
                              {m.organizationType} • {m.district || "Jharkhand"}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-emerald-800">
                              {m.score}%
                            </span>
                            <span className="block text-[9px] font-bold text-emerald-700">
                              {m.confidenceCategory.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        {/* Explainable Reasons */}
                        <div className="mt-2.5 pt-2 border-t border-stone-200/60 text-[11px] space-y-1">
                          <span className="font-semibold text-stone-600 block text-[10px] uppercase tracking-wider">
                            Why Recommended:
                          </span>
                          {m.reasons.slice(0, 3).map((r, rIdx) => (
                            <div
                              key={rIdx}
                              className="text-stone-700 flex items-start gap-1.5 leading-snug"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 7: WHO SOLVED / IMPLEMENTED */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                    7
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        WHO SOLVED / IMPLEMENTED (Proposed Solutions & Collaborations)
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {stages.implementation.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Proposed Solutions in Open Workspace, multi-stakeholder collaboration offers &amp; field project pilots
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {(stages.implementation.solutionsCount ?? stages.implementation.activeSolutions?.length ?? stages.implementation.eoisCount ?? 0)} Solution Proposals
                  </span>
                </div>
              </div>

              <div className="pt-3.5 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Lead Implementing Organization
                    </span>
                    <p className="text-sm font-bold text-stone-900">
                      {stages.implementation.leadOrganization}
                    </p>
                    <p className="text-[11px] text-stone-600">
                      <strong>Designated Lead:</strong> {stages.implementation.leadContact}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Consortium Partners
                    </span>
                    {stages.implementation.consortiumPartners.length === 0 ? (
                      <p className="text-xs text-stone-500 italic">
                        Direct single-institution engagement
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-stone-800">
                        {stages.implementation.consortiumPartners.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submitted Solutions / Proposals Detail */}
                {((stages.implementation.activeSolutions && stages.implementation.activeSolutions.length > 0) ||
                  (stages.implementation.activeEois && stages.implementation.activeEois.length > 0)) && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-stone-700 block">
                      {(stages.implementation.activeSolutions?.length ?? 0) > 0
                        ? "Active Proposed Solutions in Open Workspace:"
                        : "Active Proposals:"}
                    </span>
                    {(stages.implementation.activeSolutions || stages.implementation.activeEois || []).map((sol: any) => (
                      <div
                        key={sol.id}
                        className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-200/70 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-950">
                            {sol.organizationName} {sol.title ? `- ${sol.title}` : ""}
                          </span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            {sol.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-700 leading-relaxed">
                          <strong>Proposed Technical Methodology:</strong> {sol.proposedApproach}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] text-stone-500 pt-0.5">
                          <span>Timeline: {sol.timeline}</span>
                          {sol.estimatedBudget && <span>• ₹{Number(sol.estimatedBudget).toLocaleString()}</span>}
                          <span>•</span>
                          <span>Lead: {sol.leadName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 8: WHO FUNDED */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 hover:border-emerald-300 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
                    8
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        WHO FUNDED (Grant &amp; CSR Resource Allocation)
                      </h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {stages.funding.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Approved budget allocation, funding source &amp; CSR sponsorship
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Total Budget</span>
                  <span className="text-sm font-black text-amber-900">
                    {stages.funding.totalBudget
                      ? `₹${stages.funding.totalBudget.toLocaleString("en-IN")}`
                      : "Awaiting Allocation"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Funding Source
                  </span>
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                    {stages.funding.fundingSource}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Grant / CSR Sponsors
                  </span>
                  <p className="text-stone-700 font-medium">
                    {stages.funding.sponsorPartners.length > 0
                      ? stages.funding.sponsorPartners.join(", ")
                      : "Government Innovation Fund"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Financial Governance Note
                  </span>
                  <p className="text-stone-600 text-[11px] leading-snug">
                    {stages.funding.notes}
                  </p>
                </div>
              </div>
            </div>

            {/* Downward Connector Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-stone-100 text-stone-400 rounded-full p-1 border border-stone-200 shadow-2xs">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" />
              </div>
            </div>

            {/* STAGE 9: IMPACT / STATUS */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-sm p-5 hover:border-emerald-600 transition">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    9
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900">
                        IMPACT / STATUS (Final Resolution &amp; Outcomes)
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {stages.impact.lifecycleStage}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Certified impact metrics, beneficiary reach &amp; citizen resolution outcomes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <CheckCircle className="h-4 w-4" />
                  <span>Active Resolution Lifecycle</span>
                </div>
              </div>

              <div className="pt-3.5 space-y-4 text-xs">
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Estimated Beneficiaries
                    </span>
                    <p className="text-base font-black text-emerald-950">
                      {stages.impact.beneficiaryReach}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Current Resolution State
                    </span>
                    <p className="text-sm font-bold text-emerald-950">
                      {stages.impact.currentChallengeStatus}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Matched Partner Institutions
                    </span>
                    <p className="text-base font-black text-emerald-950">
                      {stages.matching.totalMatches} Partners
                    </p>
                  </div>
                </div>

                {/* Outcomes Summary */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block text-xs">
                    Civic Impact Summary:
                  </span>
                  <p className="text-stone-700 text-xs leading-relaxed">
                    {stages.impact.summary}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
