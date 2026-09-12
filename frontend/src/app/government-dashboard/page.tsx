"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { formatUserRole, formatDateSafe } from "../../lib/utils";
import {
  BarChart3,
  TrendingUp,
  Shield,
  Building2,
  Users,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  DollarSign,
  Briefcase,
  GraduationCap,
  Activity,
  ArrowRight,
  Filter,
  RefreshCw,
  PieChart,
  Target,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle,
  HelpCircle,
  XCircle,
  Bell,
  Eye,
  FileText,
  Database,
  Lock,
  Compass,
} from "lucide-react";

// ==========================================
// TYPES & DATA CONTRACTS
// ==========================================

interface ExecutiveKpis {
  totalChallenges: number;
  newChallenges: number;
  highPriorityChallenges: number;
  pendingGovernmentReview: number;
  verifiedChallenges: number;
  problemsWithInstitutionalInterest: number;
  activePilotEngagements: number;
  resolvedClosedProblems: number;
}

interface PipelineFunnel {
  reported: number;
  aiStructured: number;
  governmentValidated: number;
  matched: number;
  institutionInterested: number;
  eoiSubmitted: number;
  pilot: number;
  resolved: number;
}

interface MetricDefinition {
  metric_name: string;
  key: string;
  tables: string[];
  filtering_condition: string;
  jurisdiction_condition: string;
  calculation: string;
}

interface PipelineDefinition {
  stage: string;
  tables: string[];
  filtering_condition: string;
  calculation: string;
  description: string;
}

interface ActionQueueItem {
  id: string;
  title: string;
  description: string;
  domain: string;
  district_name: string;
  district_id: string;
  location_detail: string;
  priority: string;
  status: string;
  submitted_at: string;
  created_at: string;
  confirmations_count: number;
  evidence_count: number;
  matched_institutions_count: number;
  eois_count: number;
}

interface DistrictOption {
  id: string;
  name: string;
  state?: string;
}

interface DistrictStatItem {
  district_id: string;
  district_name: string;
  total_problems: number;
  high_priority: number;
  pending_review: number;
  institutional_interest: number;
  active_pilots: number;
  resolved: number;
}

interface BlockStatItem {
  block_id: string;
  block_name: string;
  total_problems: number;
  high_priority: number;
  pending_review: number;
  validated: number;
}

interface RecommendationDetail {
  organization_id: string;
  organization_name: string;
  organization_type: string;
  alignment_score: number;
  verified_capabilities_count: number;
  pending_capabilities_count: number;
  unverified_capabilities_count: number;
  reasons: string[];
  review_status: string;
}

interface MatchingChallengeGroup {
  challenge_id: string;
  challenge_title: string;
  domain: string;
  district_name: string;
  recommendations: RecommendationDetail[];
}

interface ChallengesAnalytics {
  byDomain: { name: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
  overTime: { month: string; count: number }[];
  jurisdiction: any;
}

interface NotificationAlert {
  id: string;
  title: string;
  message: string;
  type?: string;
  created_at: string;
  is_read?: boolean;
}

const DOMAINS = [
  { value: "WATER_AND_SANITATION", label: "Water & Sanitation" },
  { value: "AGRICULTURE", label: "Agriculture & Rural Tech" },
  { value: "HEALTHCARE", label: "Healthcare & Public Hygiene" },
  { value: "EDUCATION", label: "Education & Digital Literacy" },
  { value: "RURAL_INFRASTRUCTURE", label: "Rural Infrastructure & Energy" },
  { value: "WASTE_MANAGEMENT", label: "Waste Management & Circularity" },
  { value: "FOREST_AND_TRIBAL_WELFARE", label: "Forest & Tribal Livelihoods" },
  { value: "DISASTER_RESILIENCE", label: "Disaster Preparedness" },
];

export default function GovernmentDashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const isAuthorized =
    user?.role === "PLATFORM_ADMIN" ||
    user?.role === "GOVERNMENT_OFFICER" ||
    user?.role === "GOVERNMENT_ADMIN";

  const isDistrictOfficer = user?.role === "GOVERNMENT_OFFICER";
  const officerDistrict = user?.districtRef?.name || user?.district || "";
  const officerDistrictId = user?.district_id || user?.districtRef?.id || "";

  // Filter States
  const [districtsList, setDistrictsList] = useState<DistrictOption[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "action-queue" | "pipeline" | "districts" | "matching" | "intelligence"
  >("overview");

  // Telemetry drawer
  const [showTelemetry, setShowTelemetry] = useState(false);

  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // Executive Overview State
  const [kpis, setKpis] = useState<ExecutiveKpis | null>(null);
  const [pipeline, setPipeline] = useState<PipelineFunnel | null>(null);
  const [metricDefs, setMetricDefs] = useState<MetricDefinition[]>([]);
  const [pipelineDefs, setPipelineDefs] = useState<PipelineDefinition[]>([]);
  const [jurisdictionMeta, setJurisdictionMeta] = useState<any>(null);

  // Feature specific states
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [districtsData, setDistrictsData] = useState<{
    view_type: string;
    district_name?: string;
    data: (DistrictStatItem | BlockStatItem)[];
    notice?: string;
    map_integration_status?: string;
  } | null>(null);
  const [matchingInsights, setMatchingInsights] = useState<MatchingChallengeGroup[]>([]);
  const [challengesAnalytics, setChallengesAnalytics] = useState<ChallengesAnalytics | null>(null);
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);

  // 1. Fetch data-driven district list on mount (prevents hardcoded 24 districts)
  useEffect(() => {
    async function loadDistricts() {
      try {
        const res = await fetch("/api/locations/districts");
        if (res.ok) {
          const list = await res.json();
          setDistrictsList(list);
        }
      } catch {
        // Graceful fallback: non-blocking
      }
    }
    loadDistricts();
  }, []);

  // Sync District Officer jurisdiction lock
  useEffect(() => {
    if (isDistrictOfficer && officerDistrictId) {
      setSelectedDistrictId(officerDistrictId);
    }
  }, [isDistrictOfficer, officerDistrictId]);

  // Main analytics fetcher
  const fetchAnalytics = useCallback(async () => {
    if (!token || !isAuthorized) return;
    try {
      setRefreshing(true);
      const queryParams = new URLSearchParams();

      // Only State Admins / Platform Admins can supply district filters
      if (!isDistrictOfficer && selectedDistrictId) {
        queryParams.set("district_id", selectedDistrictId);
      }
      if (selectedDomain) queryParams.set("domain", selectedDomain);
      if (selectedPriority) queryParams.set("priority", selectedPriority);
      if (selectedStatus) queryParams.set("status", selectedStatus);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [resOverview, resQueue, resDistricts, resMatching, resChallenges, resNotifs] =
        await Promise.allSettled([
          fetch(`/api/admin/analytics/overview${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/admin/analytics/action-queue${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/admin/analytics/districts${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/admin/analytics/matching-insights${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/admin/analytics/challenges${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/notifications?limit=6", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      // 1. Overview & KPIs
      if (resOverview.status === "fulfilled" && resOverview.value.ok) {
        const data = await resOverview.value.json();
        setKpis(data.executive_kpis || null);
        setPipeline(data.pipeline || null);
        setLastRefreshedAt(data.metadata?.refreshed_at || new Date().toISOString());
        setJurisdictionMeta(data.metadata?.jurisdiction || null);
        setMetricDefs(data.metadata?.definitions || []);
        setPipelineDefs(data.metadata?.pipeline_definitions || []);
      }

      // 2. Action Queue
      if (resQueue.status === "fulfilled" && resQueue.value.ok) {
        const data = await resQueue.value.json();
        setActionQueue(data.items || []);
      }

      // 3. District / Block Intelligence
      if (resDistricts.status === "fulfilled" && resDistricts.value.ok) {
        const data = await resDistricts.value.json();
        setDistrictsData(data);
      }

      // 4. Matching Insights
      if (resMatching.status === "fulfilled" && resMatching.value.ok) {
        const data = await resMatching.value.json();
        setMatchingInsights(data.insights || data.challenges || []);
      }

      // 5. Challenges Analytics (Trends, Domains, Priorities)
      if (resChallenges.status === "fulfilled" && resChallenges.value.ok) {
        const data = await resChallenges.value.json();
        setChallengesAnalytics(data);
      }

      // 6. Live Alerts
      if (resNotifs.status === "fulfilled" && resNotifs.value.ok) {
        const data = await resNotifs.value.json();
        setNotifications(Array.isArray(data) ? data : data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to load government dashboard intelligence", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isAuthorized, isDistrictOfficer, selectedDistrictId, selectedDomain, selectedPriority, selectedStatus]);

  useEffect(() => {
    if (token && isAuthorized) {
      fetchAnalytics();
    }
  }, [token, isAuthorized, fetchAnalytics]);

  // Selected district name for display
  const currentDistrictDisplay = useMemo(() => {
    if (isDistrictOfficer) {
      return officerDistrict || "Assigned District";
    }
    if (!selectedDistrictId) return "All Districts (Jharkhand State)";
    const found = districtsList.find((d) => d.id === selectedDistrictId);
    return found ? found.name : "Selected District";
  }, [isDistrictOfficer, officerDistrict, selectedDistrictId, districtsList]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-xs text-stone-500 font-medium">Authenticating credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
          <Shield className="h-12 w-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-stone-900">Restricted Government Access</h2>
          <p className="text-xs text-stone-600 mt-2">
            The Government Intelligence & Analytics Dashboard is reserved exclusively for authorized District Officers, Government Administrators, and State Reviewers.
          </p>
          <div className="mt-6">
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition"
            >
              Back to Challenges
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-stone-900 tracking-tight">
                    Government Intelligence Dashboard
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    SamadhanSetu
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Decisive Public Governance &middot; Problem &rarr; Intelligence &rarr; Validation &rarr; Capability Matching &rarr; Solution
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Freshness Badge */}
            {lastRefreshedAt && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-stone-600">
                <Clock className="h-3.5 w-3.5 text-stone-400" />
                <span>Refreshed: {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => fetchAnalytics()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-xs disabled:opacity-60"
              title="Refresh all metrics from live database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
            </button>

            {/* Telemetry / Audit Button */}
            <button
              onClick={() => setShowTelemetry(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition shadow-xs"
              title="View metric definitions and SQL aggregation logic"
            >
              <Database className="h-3.5 w-3.5 text-stone-500" />
              <span>Metric Audit</span>
            </button>

            {/* Direct Link to Review Queue */}
            <Link
              href="/reviewer-queue"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Review Queue</span>
              {actionQueue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-900 text-white text-[10px] font-bold">
                  {actionQueue.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* 2. ROLE-AWARE JURISDICTION BANNER */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
            isDistrictOfficer
              ? "bg-amber-50/90 border-amber-200/90 text-amber-950"
              : user?.role === "GOVERNMENT_ADMIN"
              ? "bg-emerald-50/90 border-emerald-200/90 text-emerald-950"
              : "bg-blue-50/90 border-blue-200/90 text-blue-950"
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
              isDistrictOfficer ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
            }`}>
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wide text-[11px]">
                  Government Portal
                </span>
                <span className="text-stone-400">&middot;</span>
                <span className="font-bold text-stone-900">
                  {currentDistrictDisplay}
                </span>
                <span className="text-stone-400">&middot;</span>
                <span className="text-stone-700">
                  Role: {formatUserRole(user?.role || "")}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5">
                {isDistrictOfficer
                  ? `Authorized jurisdiction: ${officerDistrict || "Assigned District"} only. Data is strictly isolated; cross-district queries are rejected server-side.`
                  : "State-level oversight: Authorized to monitor, compare, and filter across all 24 Jharkhand districts."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span
              className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] border ${
                isDistrictOfficer
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-emerald-100 border-emerald-300 text-emerald-900"
              }`}
            >
              {isDistrictOfficer ? "District Scope Enforced" : "Statewide Oversight"}
            </span>
          </div>
        </div>

        {/* 3. MULTI-DIMENSIONAL DATA-DRIVEN FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
            <Filter className="h-4 w-4 text-stone-400" />
            <span>Scope Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* District Selector */}
            {isDistrictOfficer ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900 font-semibold shadow-xs">
                <Lock className="h-3.5 w-3.5 text-amber-700" />
                <span>{officerDistrict || "Assigned District"} (Locked)</span>
              </div>
            ) : (
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
              >
                <option value="">All Districts ({districtsList.length > 0 ? districtsList.length : "Jharkhand State"})</option>
                {districtsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Focus Domain Filter */}
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
            >
              <option value="">All Focus Domains</option>
              {DOMAINS.map((dom) => (
                <option key={dom.value} value={dom.value}>
                  {dom.label}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
            >
              <option value="">All Urgencies</option>
              <option value="CRITICAL">Critical Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
            >
              <option value="">All Lifecycle Stages</option>
              <option value="SUBMITTED">Pending Government Review</option>
              <option value="VALIDATED">Government Validated</option>
              <option value="MATCHING">AI Matching In Progress</option>
              <option value="MATCHED">Institutional Match Identified</option>
              <option value="IN_PROGRESS">Executing Solution Pilot</option>
              <option value="COMPLETED">Resolved / Closed</option>
            </select>

            {(selectedDistrictId || selectedDomain || selectedPriority || selectedStatus) && (
              <button
                onClick={() => {
                  if (!isDistrictOfficer) setSelectedDistrictId("");
                  setSelectedDomain("");
                  setSelectedPriority("");
                  setSelectedStatus("");
                }}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline px-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* 4. TAB NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: "overview", label: "Executive KPIs & Funnel", icon: Target },
            {
              id: "action-queue",
              label: "Priority Action Queue",
              icon: AlertTriangle,
              count: actionQueue.length,
            },
            { id: "pipeline", label: "Problem → Solution Pipeline", icon: Layers },
            {
              id: "districts",
              label: isDistrictOfficer ? "Block-Level Intelligence" : "District Intelligence Matrix",
              icon: MapPin,
            },
            { id: "matching", label: "AI Capability Matching", icon: Sparkles },
            { id: "intelligence", label: "Trends & Sectoral Breakdown", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${
                      isActive ? "bg-white text-emerald-900" : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Core Value Statement Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold tracking-wide border border-emerald-400/30">
                    <Sparkles className="h-3 w-3" />
                    SamadhanSetu Closed-Loop Governance
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Problem &rarr; Intelligence &rarr; Government Validation &rarr; Capability Matching &rarr; Solution
                  </h2>
                  <p className="text-xs text-emerald-100/80 max-w-2xl leading-relaxed">
                    Citizen reports are semantically structured, validated by authorized district reviewers, aligned with institutional technical capabilities, and converted into funded civic solution pilots.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab("action-queue")}
                    className="px-4 py-3 rounded-xl bg-white text-emerald-950 text-xs font-bold hover:bg-emerald-50 transition shadow-xs flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Action Required ({kpis?.pendingGovernmentReview ?? 0})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 8 EXECUTIVE KPI CARDS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-emerald-600" />
                  Executive Governance KPIs (100% Database-Aggregated)
                </h3>
                <span className="text-[11px] text-stone-400">
                  Scope: {currentDistrictDisplay}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Total Problems */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-xs font-semibold">Total Problems</span>
                    <Activity className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-stone-900">
                    {kpis?.totalChallenges ?? 0}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    All citizen submissions in jurisdiction
                  </div>
                </div>

                {/* 2. New Problems (7 Days) */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-xs font-semibold">New Problems (7d)</span>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900">
                    {kpis?.newChallenges ?? 0}
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1">
                    Recent citizen intake requiring triage
                  </div>
                </div>

                {/* 3. High Priority Problems */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-xs font-semibold">High / Critical</span>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-900">
                    {kpis?.highPriorityChallenges ?? 0}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Severe societal challenges flagged
                  </div>
                </div>

                {/* 4. Pending Review (Actionable) */}
                <div
                  onClick={() => setActiveTab("action-queue")}
                  className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-xs hover:bg-amber-50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-amber-900 mb-2">
                    <span className="text-xs font-bold">Pending Review</span>
                    <Clock className="h-4 w-4 text-amber-700" />
                  </div>
                  <div className="text-2xl font-black text-amber-950">
                    {kpis?.pendingGovernmentReview ?? 0}
                  </div>
                  <div className="text-[11px] text-amber-800 font-semibold mt-1 flex items-center gap-1">
                    <span>Awaiting official validation</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>

                {/* 5. Verified Problems */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-xs font-semibold">Gov Validated</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900">
                    {kpis?.verifiedChallenges ?? 0}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Formally checked by reviewers
                  </div>
                </div>

                {/* 6. Institutional Interest */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-xs font-semibold">Institutional Interest</span>
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900">
                    {kpis?.problemsWithInstitutionalInterest ?? 0}
                  </div>
                  <div className="text-[11px] text-purple-800 font-medium mt-1">
                    HEIs/Industry formally engaged
                  </div>
                </div>

                {/* 7. Active Pilots */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-xs font-semibold">Active Pilots</span>
                    <Layers className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900">
                    {kpis?.activePilotEngagements ?? 0}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Collaborative solution projects
                  </div>
                </div>

                {/* 8. Resolved / Closed */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition">
                  <div className="flex items-center justify-between text-stone-500 mb-2">
                    <span className="text-xs font-semibold">Resolved & Closed</span>
                    <Award className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {kpis?.resolvedClosedProblems ?? 0}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium mt-1">
                    Verified impact certified
                  </div>
                </div>
              </div>
            </div>

            {/* PROBLEM → SOLUTION PIPELINE STEPPER */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-700" />
                    <span>Problem &rarr; Solution Pipeline Funnel</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Measurable stages tracking conversion from citizen submission to certified civic outcome
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("pipeline")}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Detailed Stage Definitions</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* 8-Stage Visual Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
                {[
                  { stage: "Reported", count: pipeline?.reported ?? 0, bg: "bg-stone-50", border: "border-stone-200", color: "text-stone-900", desc: "Citizen intake" },
                  { stage: "AI Structured", count: pipeline?.aiStructured ?? 0, bg: "bg-teal-50/60", border: "border-teal-200", color: "text-teal-900", desc: "Domain & severity" },
                  { stage: "Gov Validated", count: pipeline?.governmentValidated ?? 0, bg: "bg-emerald-50", border: "border-emerald-200", color: "text-emerald-900", desc: "Reviewer sign-off" },
                  { stage: "Matched", count: pipeline?.matched ?? 0, bg: "bg-blue-50/60", border: "border-blue-200", color: "text-blue-900", desc: "AI recommended" },
                  { stage: "Interested", count: pipeline?.institutionInterested ?? 0, bg: "bg-purple-50/60", border: "border-purple-200", color: "text-purple-900", desc: "HEI response" },
                  { stage: "EOI Submitted", count: pipeline?.eoiSubmitted ?? 0, bg: "bg-indigo-50/60", border: "border-indigo-200", color: "text-indigo-900", desc: "Formal proposal" },
                  { stage: "Pilot", count: pipeline?.pilot ?? 0, bg: "bg-amber-50/60", border: "border-amber-200", color: "text-amber-900", desc: "Field deployment" },
                  { stage: "Resolved", count: pipeline?.resolved ?? 0, bg: "bg-emerald-100/70", border: "border-emerald-300", color: "text-emerald-950", desc: "Impact audited" },
                ].map((st, idx) => (
                  <div
                    key={st.stage}
                    className={`p-3 rounded-xl border ${st.bg} ${st.border} flex flex-col justify-between text-center relative group hover:shadow-xs transition`}
                  >
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      {idx + 1}. {st.stage}
                    </div>
                    <div className={`text-xl font-black ${st.color} my-1`}>
                      {st.count}
                    </div>
                    <div className="text-[10px] text-stone-500 line-clamp-1">
                      {st.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TWO-COLUMN LOWER SECTION: ACTION QUEUE PREVIEW & AI CAPABILITY INTELLIGENCE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Priority Action Queue Preview */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-stone-900">
                      Priority Action Queue &middot; Review Needed
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("action-queue")}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                  >
                    <span>View All ({actionQueue.length})</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {actionQueue.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-800">
                      All Problems in Your Jurisdiction Have Been Processed
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      No citizen submissions are currently pending validation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actionQueue.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/30"
                      >
                        <div className="space-y-1 max-w-lg">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                item.priority === "CRITICAL"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : item.priority === "HIGH"
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-stone-100 text-stone-700 border border-stone-200"
                              }`}
                            >
                              {item.priority}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {item.domain.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-stone-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-stone-400" />
                              {item.district_name} &middot; {item.location_detail}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-stone-900 line-clamp-1">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-stone-600 line-clamp-1">
                            {item.description}
                          </p>

                          <div className="flex items-center gap-4 text-[10px] text-stone-500 pt-1">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-stone-400" />
                              {item.confirmations_count} citizen confirmations
                            </span>
                            <span className="flex items-center gap-1">
                              <FileCheck2 className="h-3 w-3 text-stone-400" />
                              {item.evidence_count} evidence files
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Link
                            href={`/challenges/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
                          >
                            <span>Review</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Col: AI Capability Intelligence & Live Alerts */}
              <div className="space-y-6">
                {/* AI Intelligence Card */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      AI Capability Intelligence
                    </h3>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    AI-powered capability representation enables intelligent matching between societal problems and institutional expertise.
                  </p>

                  <div className="space-y-2 pt-1 text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <span className="text-stone-600">Intelligence Status</span>
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Active &amp; Indexed
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <span className="text-stone-600">Matching Method</span>
                      <span className="font-semibold text-stone-800">
                        Semantic + Capability-based
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                      <span className="text-stone-600">Recommendation Routing</span>
                      <span className="font-semibold text-purple-800">
                        Institutional Portal Push
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("matching")}
                    className="w-full text-center py-2 text-xs text-emerald-700 hover:text-emerald-800 font-semibold border-t border-stone-100 pt-3"
                  >
                    View Matched Institutions &rarr;
                  </button>
                </div>

                {/* Live Alerts Feed */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-emerald-700" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Live Alerts
                      </h3>
                    </div>
                    <span className="text-[10px] text-stone-400">Jurisdiction Feed</span>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-stone-400 py-3 text-center">
                      No recent alerts in jurisdiction.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {notifications.slice(0, 4).map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                          <p className="font-bold text-stone-900 line-clamp-1">{n.title}</p>
                          <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[9px] text-stone-400 mt-1">
                            {formatDateSafe(n.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIORITY ACTION QUEUE (FULL VIEW) */}
        {activeTab === "action-queue" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="text-base font-bold text-stone-900">
                    Priority Action Queue &middot; Pending Government Review
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Problems in {currentDistrictDisplay} awaiting verification or criteria validation. Prioritized by severity.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 self-start md:self-auto">
                {actionQueue.length} Items Requiring Action
              </span>
            </div>

            {actionQueue.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3 shadow-xs">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-stone-900">Queue is Clear!</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  All societal problems logged in {currentDistrictDisplay} have been reviewed. Outstanding civic governance response!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionQueue.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-emerald-300 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                            item.priority === "CRITICAL"
                                  ? "bg-red-100 text-red-900 border border-red-200"
                                  : item.priority === "HIGH"
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-stone-100 text-stone-700 border border-stone-200"
                          }`}
                        >
                          {item.priority} Priority
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.domain.replace(/_/g, " ")}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-600">
                          {item.status}
                        </span>
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-stone-400" />
                          {item.district_name} &middot; {item.location_detail}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-stone-900">
                        {item.title}
                      </h3>
                      <p className="text-xs text-stone-600 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-2">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-stone-400" />
                          <strong>{item.confirmations_count}</strong> Citizen Confirmations
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileCheck2 className="h-3.5 w-3.5 text-stone-400" />
                          <strong>{item.evidence_count}</strong> Evidence Artifacts
                        </span>
                        {item.matched_institutions_count > 0 && (
                          <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
                            <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                            <strong>{item.matched_institutions_count}</strong> Institutions Matched
                          </span>
                        )}
                        {item.eois_count > 0 && (
                          <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                            <strong>{item.eois_count}</strong> EOIs Received
                          </span>
                        )}
                        <span className="text-stone-400">
                          Submitted: {formatDateSafe(item.submitted_at || item.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end gap-2 shrink-0">
                      <Link
                        href={`/challenges/${item.id}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition shadow-xs"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Validate &amp; Review</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROBLEM → SOLUTION PIPELINE (FULL BREAKDOWN) */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-700" />
                <h2 className="text-base font-bold text-stone-900">
                  End-to-End Problem-to-Solution Value Chain
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Every stage enforces verifiable state criteria in PostgreSQL. No counts are inferred or fabricated.
              </p>
            </div>

            {/* Stepper with full descriptions */}
            <div className="space-y-4">
              {pipelineDefs.map((def, idx) => {
                const countKey = (
                  idx === 0 ? pipeline?.reported :
                  idx === 1 ? pipeline?.aiStructured :
                  idx === 2 ? pipeline?.governmentValidated :
                  idx === 3 ? pipeline?.matched :
                  idx === 4 ? pipeline?.institutionInterested :
                  idx === 5 ? pipeline?.eoiSubmitted :
                  idx === 6 ? pipeline?.pilot :
                  pipeline?.resolved
                ) ?? 0;

                return (
                  <div
                    key={def.stage}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-stone-300 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-sm shrink-0">
                        0{idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-stone-900">{def.stage}</h3>
                          {idx === 3 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              Algorithmic Recommendation
                            </span>
                          )}
                          {idx === 4 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                              Active Institutional Intent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 max-w-2xl">{def.description}</p>
                        <div className="text-[11px] text-stone-400 font-mono pt-1">
                          Filter: <span className="text-stone-600">{def.filtering_condition}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-2xl font-black text-stone-900">{countKey}</div>
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Active Records</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: DISTRICT / LOCAL INTELLIGENCE */}
        {activeTab === "districts" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    {isDistrictOfficer
                      ? `Block-Level Civic Intelligence &middot; ${officerDistrict || "Assigned District"}`
                      : "24-District Comparative Governance Matrix"}
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {isDistrictOfficer
                    ? "Sub-district problem distribution, priority clusters, and validation status across administrative blocks."
                    : "Cross-district comparison of civic report intake, validation velocity, and collaborative pilot deployment."}
                </p>
              </div>

              {!isDistrictOfficer && (
                <span className="px-3 py-1 bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold">
                  {districtsData?.data?.length ?? 0} Administrative Units
                </span>
              )}
            </div>

            {/* Notice regarding Survey of India GeoJSON Map */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-blue-700 shrink-0" />
                <span>
                  <strong>Geographic Map Integration:</strong> Interactive spatial boundary visualization is scheduled for future deployment pending Survey of India administrative boundary GeoJSON certification. Full tabular matrix is active below.
                </span>
              </div>
            </div>

            {/* Tabular Matrix */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3.5 text-left">Administrative Unit</th>
                      <th className="px-4 py-3.5 text-center">Problems Logged</th>
                      <th className="px-4 py-3.5 text-center">High / Critical</th>
                      <th className="px-4 py-3.5 text-center">Pending Review</th>
                      <th className="px-4 py-3.5 text-center">
                        {isDistrictOfficer ? "Gov Validated" : "Institutional Interest"}
                      </th>
                      {!isDistrictOfficer && (
                        <>
                          <th className="px-4 py-3.5 text-center">Active Pilots</th>
                          <th className="px-4 py-3.5 text-center">Resolved</th>
                        </>
                      )}
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {!districtsData?.data || districtsData.data.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                          No administrative data recorded for the selected scope.
                        </td>
                      </tr>
                    ) : (
                      districtsData.data.map((row: any) => {
                        const name = row.district_name || row.block_name || "Unknown";
                        const id = row.district_id || row.block_id || "";

                        return (
                          <tr key={id || name} className="hover:bg-stone-50/80 transition">
                            <td className="px-4 py-3.5 font-bold text-stone-900 flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                              {name}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-stone-900">
                              {row.total_problems ?? 0}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {row.high_priority > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200 font-bold">
                                  {row.high_priority}
                                </span>
                              ) : (
                                <span className="text-stone-400">0</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {row.pending_review > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                  {row.pending_review}
                                </span>
                              ) : (
                                <span className="text-stone-400">0</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="font-semibold text-stone-800">
                                {isDistrictOfficer
                                  ? row.validated ?? 0
                                  : row.institutional_interest ?? 0}
                              </span>
                            </td>
                            {!isDistrictOfficer && (
                              <>
                                <td className="px-4 py-3.5 text-center font-semibold text-indigo-800">
                                  {row.active_pilots ?? 0}
                                </td>
                                <td className="px-4 py-3.5 text-center font-semibold text-emerald-800">
                                  {row.resolved ?? 0}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3.5 text-right">
                              {!isDistrictOfficer && row.district_id ? (
                                <button
                                  onClick={() => {
                                    setSelectedDistrictId(row.district_id);
                                    setActiveTab("overview");
                                  }}
                                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                                >
                                  Filter Scope
                                </button>
                              ) : (
                                <span className="text-stone-400 text-[11px]">Enforced</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AI CAPABILITY MATCHING INSIGHTS */}
        {activeTab === "matching" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h2 className="text-base font-bold text-stone-900">
                  AI Capability Intelligence &middot; Recommendation Insights
                </h2>
              </div>
              <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
                AI-powered capability representation enables intelligent matching between societal problems and institutional expertise. Recommendations are delivered directly to matched institutions inside their Institutional Portal.
              </p>

              {/* Privacy & Trust Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Evidence Privacy Guarantee:</strong> Proprietary evidence documents remain strictly confidential to authorized government reviewers. The matching engine evaluates verified capability passport claims with zero public evidence leakage.
                </span>
              </div>
            </div>

            {matchingInsights.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3 shadow-xs">
                <Sparkles className="h-12 w-12 text-stone-300 mx-auto" />
                <h3 className="text-base font-bold text-stone-900">No Matched Problems In Current Scope</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Problems must first be Government Validated before institutional capability recommendations are generated and delivered.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {matchingInsights.map((grp) => (
                  <div key={grp.challenge_id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {grp.domain.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-stone-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-stone-400" />
                            {grp.district_name}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-stone-900 mt-1">
                          {grp.challenge_title}
                        </h3>
                      </div>

                      <Link
                        href={`/challenges/${grp.challenge_id}`}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 self-start sm:self-auto"
                      >
                        <span>View Challenge</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Recommendations List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {grp.recommendations.map((rec) => (
                        <div
                          key={rec.organization_id}
                          className="p-4 rounded-xl border border-stone-200 hover:border-purple-300 transition bg-stone-50/40 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-stone-900">{rec.organization_name}</h4>
                              <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                                {rec.organization_type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                              {rec.alignment_score}% Match
                            </span>
                          </div>

                          {/* Reasons */}
                          {rec.reasons && rec.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {rec.reasons.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md text-[10px] bg-white border border-stone-200 text-stone-700">
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Capability Verification Breakdown */}
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                            <span className="text-stone-500 font-medium">Capability Trust:</span>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px]">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {rec.verified_capabilities_count} Verified
                              </span>
                              {rec.pending_capabilities_count > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                                  <Clock className="h-2.5 w-2.5" />
                                  {rec.pending_capabilities_count} Pending
                                </span>
                              )}
                              {rec.unverified_capabilities_count > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200 text-[10px]">
                                  {rec.unverified_capabilities_count} Unverified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TRENDS & SECTORAL BREAKDOWN */}
        {activeTab === "intelligence" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-700" />
                <h2 className="text-base font-bold text-stone-900">
                  Civic Problem Telemetry &amp; Sectoral Trends
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Data aggregations across focus domains, urgency levels, and intake velocity over time in {currentDistrictDisplay}.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Focus Domain Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Distribution by Focus Domain
                </h3>

                <div className="space-y-3">
                  {!challengesAnalytics?.byDomain || challengesAnalytics.byDomain.length === 0 ? (
                    <p className="text-xs text-stone-400 py-4 text-center">No domain data recorded.</p>
                  ) : (
                    challengesAnalytics.byDomain.map((d) => {
                      const total = kpis?.totalChallenges || 1;
                      const pct = Math.round((d.count / total) * 100);
                      return (
                        <div key={d.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-800">{d.name.replace(/_/g, " ")}</span>
                            <span className="text-stone-500 font-bold">{d.count} ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Priority & Urgency Distribution */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Urgency &amp; Severity Profile
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {!challengesAnalytics?.byPriority || challengesAnalytics.byPriority.length === 0 ? (
                    <p className="text-xs text-stone-400 col-span-2 py-4 text-center">No priority records.</p>
                  ) : (
                    challengesAnalytics.byPriority.map((p) => (
                      <div
                        key={p.priority}
                        className={`p-4 rounded-xl border text-center ${
                          p.priority === "CRITICAL"
                            ? "bg-red-50/70 border-red-200 text-red-900"
                            : p.priority === "HIGH"
                            ? "bg-amber-50/70 border-amber-200 text-amber-900"
                            : p.priority === "MEDIUM"
                            ? "bg-blue-50/70 border-blue-200 text-blue-900"
                            : "bg-stone-50 border-stone-200 text-stone-800"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider">{p.priority}</div>
                        <div className="text-2xl font-black mt-1">{p.count}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">Reported problems</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Monthly Volume Trend */}
                <div className="pt-4 border-t border-stone-100 space-y-2">
                  <h4 className="text-xs font-semibold text-stone-700">Monthly Problem Intake</h4>
                  {!challengesAnalytics?.overTime || challengesAnalytics.overTime.length === 0 ? (
                    <p className="text-xs text-stone-400 py-2 text-center">No timeline records.</p>
                  ) : (
                    <div className="flex items-end gap-2 h-24 pt-4">
                      {challengesAnalytics.overTime.map((m) => {
                        const maxCount = Math.max(...challengesAnalytics.overTime.map((o) => o.count), 1);
                        const heightPct = Math.round((m.count / maxCount) * 100);
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                            <span className="text-[9px] text-stone-500 font-bold opacity-0 group-hover:opacity-100 transition">
                              {m.count}
                            </span>
                            <div
                              className="w-full bg-emerald-700 rounded-t transition-all hover:bg-emerald-800"
                              style={{ height: `${Math.max(heightPct, 8)}%` }}
                            />
                            <span className="text-[9px] text-stone-400 font-mono">
                              {m.month.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. METRIC TELEMETRY & AUDIT DRAWER */}
        {showTelemetry && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
            <div className="w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto p-6 space-y-6 flex flex-col">
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Database className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      Metric Telemetry &amp; Calculation Audit
                    </h3>
                    <p className="text-xs text-stone-500">
                      Verifiable PostgreSQL schema definitions backing each dashboard indicator
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTelemetry(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Data Governance Statement */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Zero-Fabrication Guarantee
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Every number displayed on the Government Intelligence Dashboard is derived from real database aggregations over persistent PostgreSQL tables. No heuristics, artificial increments, or estimated figures are used.
                </p>
              </div>

              {/* KPI Definitions Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Executive KPI Formulas
                </h4>

                <div className="space-y-3">
                  {metricDefs.map((m) => (
                    <div key={m.key} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{m.metric_name}</span>
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {m.calculation}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        <strong>Source Tables:</strong> {m.tables.join(", ")}
                      </div>
                      <div className="text-[11px] text-stone-600 font-mono">
                        <strong>Condition:</strong> {m.filtering_condition}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        <strong>Jurisdiction:</strong> {m.jurisdiction_condition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-4 border-t border-stone-200">
                <button
                  onClick={() => setShowTelemetry(false)}
                  className="w-full py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
                >
                  Close Audit Drawer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
