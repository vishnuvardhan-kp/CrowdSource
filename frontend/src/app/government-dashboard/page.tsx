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
  Zap,
  TrendingDown,
  X,
} from "lucide-react";
import { ProblemResolutionMap } from "./problem-resolution-map";
import {
  StatusDonutChart,
  DomainHorizontalBarChart,
  PriorityDistributionProfile,
  ProblemTrendLineChart,
  DistrictRankingBarChart,
  InstitutionalPipelineFunnel,
  TrendDataPoint,
} from "./government-intelligence-charts";
import IndiaJharkhandHeatmap from "./IndiaJharkhandHeatmap";

// ==========================================
// TYPES & DATA CONTRACTS
// ==========================================

interface ExecutiveKpis {
  totalChallenges: number;
  newChallenges: number;
  highPriorityChallenges: number;
  pendingGovernmentReview: number;
  pendingVerification: number;
  verifiedChallenges: number;
  problemsWithInstitutionalInterest: number;
  activePilotEngagements: number;
  activeProjects: number;
  completedProjects: number;
  impactVerified: number;
  resolvedClosedProblems: number;
  totalBeneficiaries?: number;
  participatingUniversities?: number;
  participatingIndustries?: number;
  totalOutcomes?: number;
  verifiedOutcomes?: number;
  totalFundingMobilized?: number;
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
  professional_title?: string;
  professional_problem_statement?: string;
  refinement_status?: string;
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
  cluster_id?: string;
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
  validated?: number;
  institutional_interest?: number;
  active_pilots?: number;
  resolved?: number;
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
  overTime: TrendDataPoint[];
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

interface ProblemClusterItem {
  id: string;
  title: string;
  description: string;
  category: string;
  district: string;
  village_locality?: string;
  report_count: number;
  severity: string;
  priority: string;
  status: string;
  ai_confidence?: number | string;
  created_at: string;
}

const DOMAINS = [
  { value: "WATER_AND_SANITATION", label: "Water & Sanitation" },
  { value: "ROADS_INFRASTRUCTURE", label: "Roads & Transportation" },
  { value: "POWER_AND_ENERGY", label: "Power & Energy" },
  { value: "AGRICULTURE", label: "Agriculture & Rural Tech" },
  { value: "HEALTHCARE", label: "Healthcare & Public Hygiene" },
  { value: "EDUCATION", label: "Education & Literacy" },
  { value: "MUNICIPAL_SERVICES", label: "Municipal Services" },
  { value: "WASTE_MANAGEMENT", label: "Waste Management" },
  { value: "ENVIRONMENT", label: "Environment & Ecology" },
  { value: "FOREST_AND_TRIBAL_WELFARE", label: "Forest & Tribal Welfare" },
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
  const [timeRange, setTimeRange] = useState<string>("30d");

  const [activeTab, setActiveTab] = useState<
    "overview" | "hotspots" | "districts" | "domains" | "universities" | "ecosystem" | "projects" | "impact" | "outcomes" | "action-queue" | "clusters" | "pipeline" | "journey-map" | "matching"
  >("overview");

  // Mobile filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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
  const [problemClustersData, setProblemClustersData] = useState<any | null>(null);
  const [clusterItems, setClusterItems] = useState<ProblemClusterItem[]>([]);
  const [projectsData, setProjectsData] = useState<any | null>(null);
  const [impactData, setImpactData] = useState<any | null>(null);
  const [innovationData, setInnovationData] = useState<any | null>(null);
  const [ecosystemData, setEcosystemData] = useState<any | null>(null);

  // Verification action feedback
  const [verifyingClusterId, setVerifyingClusterId] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Fetch data-driven district list on mount
  useEffect(() => {
    async function loadDistricts() {
      try {
        const res = await fetch("/api/locations/districts");
        if (res.ok) {
          const list = await res.json();
          setDistrictsList(list);
        }
      } catch {
        // Non-blocking fallback
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

      // Enforce district filter only for State Admin / Platform Admin
      if (!isDistrictOfficer && selectedDistrictId) {
        queryParams.set("district_id", selectedDistrictId);
      }
      if (selectedDomain) queryParams.set("domain", selectedDomain);
      if (selectedPriority) queryParams.set("priority", selectedPriority);
      if (selectedStatus) queryParams.set("status", selectedStatus);
      if (timeRange && timeRange !== "all") queryParams.set("timeRange", timeRange);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [
        resOverview,
        resChallenges,
        resQueue,
        resDistricts,
        resMatching,
        resClusters,
        resClusterList,
        resProjects,
        resImpact,
        resInnovations,
        resEcosystem,
        resNotifs,
      ] = await Promise.allSettled([
        fetch(`/api/admin/analytics/overview${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/challenges${qs}`, {
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
        fetch(`/api/admin/analytics/problem-clusters${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/problem-clusters?limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/projects${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/impact${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/innovations${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/ecosystem${qs}`, {
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
        if (data.problemClusters) {
          setProblemClustersData((prev: any) => ({ ...prev, ...data.problemClusters }));
        }
      }

      // 2. Challenges Analytics (Domains, Priorities, Status, Time Trend)
      if (resChallenges.status === "fulfilled" && resChallenges.value.ok) {
        const data = await resChallenges.value.json();
        setChallengesAnalytics(data);
      }

      // 3. Action Queue
      if (resQueue.status === "fulfilled" && resQueue.value.ok) {
        const data = await resQueue.value.json();
        setActionQueue(data.items || []);
      }

      // 4. District / Block Intelligence
      if (resDistricts.status === "fulfilled" && resDistricts.value.ok) {
        const data = await resDistricts.value.json();
        setDistrictsData(data);
      }

      // 5. Matching Insights
      if (resMatching.status === "fulfilled" && resMatching.value.ok) {
        const data = await resMatching.value.json();
        setMatchingInsights(data.insights || data.challenges || []);
      }

      // 6. Problem Clusters Aggregates
      if (resClusters.status === "fulfilled" && resClusters.value.ok) {
        const data = await resClusters.value.json();
        setProblemClustersData((prev: any) => ({ ...prev, ...data }));
      }

      // 7. Problem Clusters List
      if (resClusterList.status === "fulfilled" && resClusterList.value.ok) {
        const data = await resClusterList.value.json();
        setClusterItems(Array.isArray(data) ? data : data.items || []);
      }

      // 8. Projects Monitoring
      if (resProjects.status === "fulfilled" && resProjects.value.ok) {
        const data = await resProjects.value.json();
        setProjectsData(data);
      }

      // 9. Impact Analytics
      if (resImpact.status === "fulfilled" && resImpact.value.ok) {
        const data = await resImpact.value.json();
        setImpactData(data);
      }

      // 10. Innovation Outcomes
      if (resInnovations.status === "fulfilled" && resInnovations.value.ok) {
        const data = await resInnovations.value.json();
        setInnovationData(data);
      }

      // 11. Ecosystem Analytics
      if (resEcosystem.status === "fulfilled" && resEcosystem.value.ok) {
        const data = await resEcosystem.value.json();
        setEcosystemData(data);
      }

      // 11. Live Notifications
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
  }, [
    token,
    isAuthorized,
    isDistrictOfficer,
    selectedDistrictId,
    selectedDomain,
    selectedPriority,
    selectedStatus,
    timeRange,
  ]);

  useEffect(() => {
    if (token && isAuthorized) {
      fetchAnalytics();
    }
  }, [token, isAuthorized, fetchAnalytics]);

  // Handle direct cluster verification from dashboard
  const handleVerifyCluster = async (clusterId: string) => {
    if (!token || !clusterId) return;
    setVerifyingClusterId(clusterId);
    setVerificationNotice(null);
    try {
      const res = await fetch(`/api/problem-clusters/${clusterId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setVerificationNotice({
          type: "success",
          text: "Problem cluster officially reviewed & coordinated! Underlying citizen reports are now validated.",
        });
        await fetchAnalytics();
      } else {
        const err = await res.json().catch(() => ({}));
        setVerificationNotice({
          type: "error",
          text: err.message || "Failed to review problem cluster.",
        });
      }
    } catch {
      setVerificationNotice({
        type: "error",
        text: "Network error occurred while reviewing problem cluster.",
      });
    } finally {
      setVerifyingClusterId(null);
    }
  };

  // Selected district name for display
  const currentDistrictDisplay = useMemo(() => {
    if (isDistrictOfficer) {
      return officerDistrict || "Assigned District";
    }
    if (!selectedDistrictId) return "All Districts (Jharkhand State)";
    const found = districtsList.find((d) => d.id === selectedDistrictId);
    return found ? found.name : "Selected District";
  }, [isDistrictOfficer, officerDistrict, selectedDistrictId, districtsList]);

  // Active filter count
  const activeFiltersCount = [
    !isDistrictOfficer && selectedDistrictId,
    selectedDomain,
    selectedPriority,
    selectedStatus,
    timeRange !== "all",
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    if (!isDistrictOfficer) setSelectedDistrictId("");
    setSelectedDomain("");
    setSelectedPriority("");
    setSelectedStatus("");
    setTimeRange("all");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-xs text-stone-500 font-medium">Authenticating government credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-xs">
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
    <div className="min-h-screen bg-stone-50 py-6 px-3 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0">

        {/* 1. TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-black text-stone-900 tracking-tight">
                    Government Intelligence Dashboard
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ResolvIN
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Citizen Problem Intelligence &middot; Institutional Response &middot; Measurable Outcomes
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Jurisdiction Badge */}
            <span
              className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[11px] border flex items-center gap-1.5 ${
                isDistrictOfficer
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-emerald-50 border-emerald-300 text-emerald-900"
              }`}
            >
              <Lock className="h-3 w-3" />
              <span>{isDistrictOfficer ? "District Scope Enforced" : "Statewide Oversight"}</span>
            </span>

            {/* Freshness Timestamp */}
            {lastRefreshedAt && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-[11px] text-stone-600">
                <Clock className="h-3.5 w-3.5 text-stone-400" />
                <span>
                  Refreshed:{" "}
                  {new Date(lastRefreshedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => fetchAnalytics()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-xs disabled:opacity-60"
              title="Refresh all metrics from live database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
            </button>

            {/* Metric Telemetry Modal Button */}
            <button
              onClick={() => setShowTelemetry(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition shadow-xs"
              title="View metric definitions and SQL aggregation logic"
            >
              <Database className="h-3.5 w-3.5 text-stone-500" />
              <span>Metric Audit</span>
            </button>

            {/* Direct Link to Review Queue */}
            <Link
              href="/reviewer-queue"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Review Queue</span>
              {actionQueue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-950 text-white text-[10px] font-bold">
                  {actionQueue.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* VERIFICATION ACTION ALERT FEEDBACK */}
        {verificationNotice && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-xs ${
              verificationNotice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-red-50 border-red-200 text-red-950"
            }`}
          >
            <div className="flex items-center gap-2">
              {verificationNotice.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
              )}
              <span>{verificationNotice.text}</span>
            </div>
            <button
              onClick={() => setVerificationNotice(null)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 2. GLOBAL FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          {/* Desktop Filter Toolbar (>= 1024px) */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 shrink-0">
              <Filter className="h-4 w-4 text-emerald-700" />
              <span>Scope Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* District Selector */}
              {isDistrictOfficer ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-950 font-semibold shadow-xs">
                  <Lock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">{officerDistrict || "Assigned District"} (Locked)</span>
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

              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>

              {/* Domain / Focus Sector Filter */}
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
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Lifecycle Stage Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-medium"
              >
                <option value="">All Lifecycle Stages</option>
                <option value="SUBMITTED">Pending Review</option>
                <option value="VALIDATED">Gov Validated</option>
                <option value="PROJECT_INITIATED">Project Initiated</option>
                <option value="COMPLETED">Resolved / Closed</option>
              </select>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Mobile / Tablet Filter Trigger (< 1024px) */}
          <div className="lg:hidden flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
              <Filter className="h-4 w-4 text-emerald-700" />
              <span>Scope Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                  {activeFiltersCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition"
                >
                  Reset
                </button>
              )}
              <button
                id="gov-mobile-filter-trigger"
                onClick={() => setMobileFilterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition shadow-2xs"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}</span>
              </button>
            </div>
          </div>

          {/* ACTIVE FILTER CHIPS */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Active:
              </span>

              {!isDistrictOfficer && selectedDistrictId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <span>District: {districtsList.find((d) => d.id === selectedDistrictId)?.name || selectedDistrictId}</span>
                  <button onClick={() => setSelectedDistrictId("")} className="hover:text-emerald-950">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {timeRange !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 text-xs font-semibold">
                  <span>Range: {timeRange.toUpperCase()}</span>
                  <button onClick={() => setTimeRange("all")} className="hover:text-stone-950">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {selectedDomain && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                  <span>Domain: {selectedDomain.replace(/_/g, " ")}</span>
                  <button onClick={() => setSelectedDomain("")} className="hover:text-blue-950">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {selectedPriority && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  <span>Priority: {selectedPriority}</span>
                  <button onClick={() => setSelectedPriority("")} className="hover:text-amber-950">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {selectedStatus && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold">
                  <span>Status: {selectedStatus.replace(/_/g, " ")}</span>
                  <button onClick={() => setSelectedStatus("")} className="hover:text-purple-950">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mobile Filter Drawer Modal */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-stone-900">Governance Scope Filters</h3>
                </div>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* District */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Administrative Jurisdiction:</label>
                  {isDistrictOfficer ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 font-semibold">
                      <Lock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                      <span>{officerDistrict || "Assigned District"} (Locked to Jurisdiction)</span>
                    </div>
                  ) : (
                    <select
                      value={selectedDistrictId}
                      onChange={(e) => setSelectedDistrictId(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                    >
                      <option value="">All Districts ({districtsList.length > 0 ? districtsList.length : "Jharkhand State"})</option>
                      {districtsList.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Time Range */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Timeline Window:</label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                </div>

                {/* Domain */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Sector Domain:</label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    <option value="">All Focus Domains</option>
                    {DOMAINS.map((dom) => (
                      <option key={dom.value} value={dom.value}>{dom.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Urgency Priority:</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    <option value="">All Urgencies</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Lifecycle Stage:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    <option value="">All Lifecycle Stages</option>
                    <option value="SUBMITTED">Pending Review</option>
                    <option value="VALIDATED">Gov Validated</option>
                    <option value="PROJECT_INITIATED">Project Initiated</option>
                    <option value="COMPLETED">Resolved / Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3.5 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. NAVIGATION TABS */}
        <div className="w-full max-w-full min-w-0 border-b border-stone-200 pb-2">
          {/* Mobile dropdown selector (< 768px) */}
          <div className="sm:hidden w-full">
            <label htmlFor="gov-tab-select" className="sr-only">Dashboard Section</label>
            <div className="relative">
              <select
                id="gov-tab-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="w-full py-2.5 pl-3 pr-8 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 shadow-xs"
              >
                <option value="overview">1. Overview</option>
                <option value="hotspots">2. Problem Hotspots</option>
                <option value="districts">3. District Analytics</option>
                <option value="domains">4. Domain Trends</option>
                <option value="universities">5. Universities ({ecosystemData?.participatingHeis ?? 0} HEIs)</option>
                <option value="ecosystem">6. Industry &amp; Ecosystem</option>
                <option value="projects">7. Projects &amp; Progress ({projectsData?.total ?? 0})</option>
                <option value="impact">8. Social Impact ({impactData?.verifiedAssessments ?? 0})</option>
                <option value="outcomes">9. Innovation Outcomes ({innovationData?.totalOutcomes ?? 0})</option>
              </select>
            </div>
          </div>

          {/* Horizontally contained tab strip for tablet and desktop (>= 768px) */}
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto w-full max-w-full min-w-0 pb-1 text-xs font-semibold">
            {[
              { id: "overview", label: "Overview", icon: Target },
              { id: "hotspots", label: "Problem Hotspots", icon: MapPin },
              { id: "districts", label: "District Analytics", icon: Building2 },
              { id: "domains", label: "Domain Trends", icon: TrendingUp },
              { id: "universities", label: "Universities", icon: GraduationCap, count: ecosystemData?.participatingHeis },
              { id: "ecosystem", label: "Industry & Ecosystem", icon: Briefcase },
              { id: "projects", label: "Projects & Progress", icon: Activity, count: projectsData?.total },
              { id: "impact", label: "Social Impact", icon: Award, count: impactData?.verifiedAssessments },
              { id: "outcomes", label: "Innovation Outcomes", icon: Sparkles, count: innovationData?.totalOutcomes },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap shrink-0 ${
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
                        isActive
                          ? "bg-white text-emerald-900"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: EXECUTIVE INTELLIGENCE (PROGRESSIVE DISCLOSURE) */}
        {/* ==================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* 1. EXECUTIVE KPI STRIP (12-COL / RESPONSIVE GRID) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-emerald-700" />
                  Executive Governance KPIs (100% Real PostgreSQL Aggregation)
                </h2>
                <span className="text-[11px] text-stone-500 font-medium">
                  Scope: {currentDistrictDisplay}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* 1. Total Challenges */}
                <div
                  onClick={() => setSelectedStatus("")}
                  className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs hover:border-stone-300 transition cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-semibold truncate">Challenges</span>
                    <Target className="h-4 w-4 text-emerald-700 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 my-1">
                    {kpis?.totalChallenges ?? 0}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    Citizen problems
                  </div>
                </div>

                {/* 2. Universities */}
                <div
                  onClick={() => setActiveTab("ecosystem")}
                  className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs hover:border-blue-300 transition cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-semibold truncate">Universities</span>
                    <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-blue-950 my-1">
                    {kpis?.participatingUniversities ?? ecosystemData?.participatingHeis ?? 0}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    Participating HEIs
                  </div>
                </div>

                {/* 3. Industry Partners */}
                <div
                  onClick={() => setActiveTab("ecosystem")}
                  className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs hover:border-amber-300 transition cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-semibold truncate">Industry Partners</span>
                    <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-amber-950 my-1">
                    {kpis?.participatingIndustries ?? ecosystemData?.participatingIndustries ?? 0}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    Industry &amp; CSR
                  </div>
                </div>

                {/* 4. Active Projects */}
                <div
                  onClick={() => setActiveTab("projects")}
                  className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs hover:border-indigo-300 transition cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-semibold truncate">Active Projects</span>
                    <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 my-1">
                    {kpis?.activeProjects ?? projectsData?.active ?? 0}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    Under execution
                  </div>
                </div>

                {/* 5. Completed Projects */}
                <div
                  onClick={() => setActiveTab("projects")}
                  className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-semibold truncate">Completed</span>
                    <Award className="h-4 w-4 text-emerald-700 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950 my-1">
                    {kpis?.completedProjects ?? projectsData?.completed ?? 0}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    Delivered solutions
                  </div>
                </div>

                {/* 6. Verified Beneficiaries */}
                <div
                  onClick={() => setActiveTab("impact")}
                  className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs hover:border-teal-300 transition cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-semibold truncate">Beneficiaries</span>
                    <Users className="h-4 w-4 text-teal-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-teal-950 my-1">
                    {(kpis?.totalBeneficiaries ?? impactData?.totalBeneficiaries ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    Verified citizens
                  </div>
                </div>

                {/* 7. Innovation Outcomes */}
                <div
                  onClick={() => setActiveTab("projects")}
                  className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs hover:border-purple-300 transition cursor-pointer flex flex-col justify-between min-w-0"
                >
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-xs font-semibold truncate">Outcomes</span>
                    <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-purple-950 my-1">
                    {kpis?.verifiedOutcomes ?? innovationData?.verifiedOutcomes ?? 0}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    Patents &amp; Tech
                  </div>
                </div>
              </div>
            </div>

            {/* 2. PRIORITY ACTION REQUIRED (IMMEDIATE EXECUTIVE ATTENTION) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Priority Action Required &middot; Administrative Review Queue
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab("action-queue")}
                  className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>View Full Queue ({actionQueue.length})</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {actionQueue.length === 0 ? (
                <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  <CheckCircle className="h-7 w-7 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-stone-800">
                    All Problems in Jurisdiction Are Processed
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    No citizen submissions currently require government validation in {currentDistrictDisplay}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {actionQueue.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-stone-200 hover:border-emerald-300 transition flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/30 min-w-0"
                    >
                      <div className="space-y-1 min-w-0 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.priority === "CRITICAL"
                                ? "bg-red-100 text-red-900 border border-red-200"
                                : item.priority === "HIGH"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-stone-100 text-stone-700 border border-stone-200"
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {item.domain.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                            <span className="truncate">{item.district_name} &middot; {item.location_detail}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.professional_title && item.professional_title !== item.title && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <Sparkles className="h-2.5 w-2.5 text-indigo-600" /> Refined Problem
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {item.professional_title || item.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-stone-600 line-clamp-1">
                          {item.professional_problem_statement || item.description}
                        </p>

                        <div className="flex items-center gap-4 text-[10px] text-stone-500 pt-0.5">
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

                      <div className="shrink-0 flex items-center gap-2 self-start md:self-auto">
                        <Link
                          href={`/challenges/${item.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs whitespace-nowrap"
                        >
                          <Shield className="h-3 w-3" />
                          <span>Review Problem</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. CORE PROBLEM INTELLIGENCE (2-COLUMN GRID) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
              {/* Chart 1: Status Distribution Donut */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Problem Status Distribution
                    </h3>
                    <p className="text-xs text-stone-500">
                      Proportions across system lifecycle stages
                    </p>
                  </div>
                  {selectedStatus && (
                    <button
                      onClick={() => setSelectedStatus("")}
                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      Clear Status Filter
                    </button>
                  )}
                </div>

                <StatusDonutChart
                  data={challengesAnalytics?.byStatus || []}
                  total={kpis?.totalChallenges || 0}
                  selectedStatus={selectedStatus}
                  onSelectStatus={(st) => setSelectedStatus(selectedStatus === st ? "" : st)}
                />
              </div>

              {/* Chart 2: Domain / Taxonomy Breakdown */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Focus Domain &amp; Sectoral Breakdown
                    </h3>
                    <p className="text-xs text-stone-500">
                      Top problem categories in {currentDistrictDisplay}
                    </p>
                  </div>
                  {selectedDomain && (
                    <button
                      onClick={() => setSelectedDomain("")}
                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      Clear Domain Filter
                    </button>
                  )}
                </div>

                <DomainHorizontalBarChart
                  data={challengesAnalytics?.byDomain || []}
                  total={kpis?.totalChallenges || 0}
                  selectedDomain={selectedDomain}
                  onSelectDomain={(dom) => setSelectedDomain(selectedDomain === dom ? "" : dom)}
                />
              </div>
            </div>

            {/* 4. URGENCY & SEVERITY PROFILE */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Urgency &amp; Severity Profile
                  </h3>
                  <p className="text-xs text-stone-500">
                    Priority distribution based on citizen confirmations, safety severity, and AI analysis
                  </p>
                </div>
                {selectedPriority && (
                  <button
                    onClick={() => setSelectedPriority("")}
                    className="text-[11px] text-emerald-700 font-bold hover:underline"
                  >
                    Clear Priority Filter
                  </button>
                )}
              </div>

              <PriorityDistributionProfile
                data={challengesAnalytics?.byPriority || []}
                total={kpis?.totalChallenges || 0}
                selectedPriority={selectedPriority}
                onSelectPriority={(p) => setSelectedPriority(selectedPriority === p ? "" : p)}
              />
            </div>

            {/* 5. PROBLEM REPORTING TREND */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-700" />
                  <span>Problem Reporting Trend &middot; Citizen Intake Velocity</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Daily and monthly intake timeline across {currentDistrictDisplay} (derived from database timestamps)
                </p>
              </div>

              <ProblemTrendLineChart
                data={challengesAnalytics?.overTime || []}
                timeRange={timeRange}
                onTimeRangeChange={(r) => setTimeRange(r)}
              />
            </div>

            {/* 6. QUICK INTELLIGENCE SIGNALS (CROSS-MODULE EXECUTIVE OVERVIEW) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-emerald-700" />
                  Governance Intelligence Signals &middot; Progressive Disclosure
                </h3>
                <span className="text-[11px] text-stone-400">Click any card to deep-dive</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
                {/* Signal 1: Geographic Concentration */}
                <div
                  onClick={() => setActiveTab("districts")}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between space-y-3 min-w-0 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">
                          {isDistrictOfficer ? "Block Scope" : "Geographic Matrix"}
                        </h4>
                        <span className="text-[10px] text-stone-400">
                          {districtsData?.data?.length ?? 0} Administrative Units
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400 group-hover:text-emerald-700 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <p className="text-[11px] text-stone-600 line-clamp-2">
                    {isDistrictOfficer
                      ? `Administrative block load and review distribution for ${officerDistrict || "Assigned District"}.`
                      : "24-District comparative intake volume, validation throughput, and collaborative pilot deployment."}
                  </p>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                    <span>Explore Matrix</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>

                {/* Signal 2: Problem Clustering & Semantic Deduplication */}
                <div
                  onClick={() => setActiveTab("clusters")}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-purple-300 transition cursor-pointer flex flex-col justify-between space-y-3 min-w-0 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Cluster Signals</h4>
                        <span className="text-[10px] text-stone-400">
                          {problemClustersData?.total || clusterItems.length} Consolidated Hubs
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <p className="text-[11px] text-stone-600 line-clamp-2">
                    {clusterItems.length > 0
                      ? `${clusterItems[0].report_count} reports grouped in ${clusterItems[0].district || "jurisdiction"}: ${clusterItems[0].title}`
                      : `${problemClustersData?.clusteredProblems || 0} citizen reports auto-grouped by AI to prevent duplicate efforts.`}
                  </p>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-purple-700 font-semibold">
                    <span>Review All ({problemClustersData?.awaitingVerification || 0} Pending Review)</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>

                {/* Signal 3: Institutional Response Value Chain */}
                <div
                  onClick={() => setActiveTab("pipeline")}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-indigo-300 transition cursor-pointer flex flex-col justify-between space-y-3 min-w-0 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <Layers className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Response Pipeline</h4>
                        <span className="text-[10px] text-stone-400">8-Stage Funnel</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400 group-hover:text-indigo-700 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="text-[11px] text-stone-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Reported &rarr; Validated</span>
                      <strong className="text-stone-900">{pipeline?.reported ?? 0} &rarr; {pipeline?.governmentValidated ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pilots &rarr; Resolved</span>
                      <strong className="text-stone-900">{pipeline?.pilot ?? 0} &rarr; {pipeline?.resolved ?? 0}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-indigo-700 font-semibold">
                    <span>Inspect 8-Stage Chain</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>

                {/* Signal 4: Civic Projects & Verified Outcomes */}
                <div
                  onClick={() => setActiveTab("projects")}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between space-y-3 min-w-0 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
                        <Briefcase className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">Projects &amp; Impact</h4>
                        <span className="text-[10px] text-stone-400">Execution Telemetry</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400 group-hover:text-teal-700 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="text-[11px] text-stone-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Active Pilots:</span>
                      <strong className="text-stone-900">{projectsData?.active ?? kpis?.activeProjects ?? 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Beneficiaries:</span>
                      <strong className="text-stone-900">{impactData?.totalBeneficiaries ?? 0}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-teal-700 font-semibold">
                    <span>Open Projects Center</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: PRIORITY ACTION WORK QUEUE (FULL DEEP DIVE) */}
        {/* ==================================================== */}
        {activeTab === "action-queue" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="text-base font-bold text-stone-900">
                    Civic Monitoring &amp; Operational Attention Queue
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Active societal problems in {currentDistrictDisplay} progressing through university solutions and ecosystem collaboration. Available for observation, municipal tracking, and administrative support.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 self-start md:self-auto">
                {actionQueue.length} Active Monitored Items
              </span>
            </div>

            {actionQueue.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3 shadow-xs">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-stone-900">Civic Monitoring Queue Clear!</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  All active problems in {currentDistrictDisplay} are progressing smoothly across university research partners.
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
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-stone-400" />
                          {item.district_name} &middot; {item.location_detail}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {item.professional_title && item.professional_title !== item.title && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            <Sparkles className="h-3 w-3 text-indigo-600" /> Refined Problem
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-stone-900">{item.professional_title || item.title}</h3>
                      </div>
                      <p className="text-xs text-stone-600 line-clamp-2">{item.professional_problem_statement || item.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-2">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-stone-400" />
                          <strong>{item.confirmations_count}</strong> Confirmations
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileCheck2 className="h-3.5 w-3.5 text-stone-400" />
                          <strong>{item.evidence_count}</strong> Evidence Artifacts
                        </span>
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

        {/* ==================================================== */}
        {/* TAB 2: PROBLEM HOTSPOTS & RESOLUTION JOURNEYS */}
        {/* ==================================================== */}
        {(activeTab === "hotspots" || activeTab === "journey-map") && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    Geographic Problem Hotspots &amp; Resolution Journeys
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Authentic GIS boundary choropleth across all 24 Jharkhand districts with real GPS citizen problem density and end-to-end resolution tracking.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
                  24 Districts Scoped
                </span>
                {selectedDistrictId && (
                  <button
                    onClick={() => setSelectedDistrictId("")}
                    className="px-3 py-1 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition"
                  >
                    Reset to Statewide Focus
                  </button>
                )}
              </div>
            </div>

            {/* Authentic GIS Heatmap */}
            <IndiaJharkhandHeatmap
              selectedDistrictId={selectedDistrictId}
              onSelectDistrict={(id) => setSelectedDistrictId(id)}
              selectedDomain={selectedDomain}
              selectedPriority={selectedPriority}
              selectedStatus={selectedStatus}
              timeRange={timeRange}
            />

            {/* Problem-to-Resolution Journey Tracker */}
            <div className="pt-2">
              <ProblemResolutionMap
                token={token}
                isDistrictOfficer={isDistrictOfficer}
                officerDistrictId={officerDistrictId}
              />
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: CLUSTER SIGNAL & DEDUPLICATION */}
        {/* ==================================================== */}
        {activeTab === "clusters" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h2 className="text-base font-bold text-stone-900">
                    Problem Clustering &amp; Community Signal Intelligence
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Semantic deduplication grouping related citizen reports into actionable community clusters. Administrative review coordinates all underlying reports.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 self-start md:self-auto">
                {clusterItems.length} Clusters in Jurisdiction
              </span>
            </div>

            {/* Dynamic Natural Language Explanation of Signal */}
            {clusterItems.length > 0 && (
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <Zap className="h-4 w-4 text-purple-700 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-bold">Dynamic Community Signal: </span>
                    <span>
                      {clusterItems[0].report_count} citizen reports in {clusterItems[0].district || "the area"} describe a similar{" "}
                      {clusterItems[0].category ? clusterItems[0].category.toLowerCase().replace(/_/g, " ") : "civic"}{" "}
                      issue{clusterItems[0].village_locality ? ` near ${clusterItems[0].village_locality}` : ""}.
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300 shrink-0 self-start sm:self-auto">
                  Synthesized Signal
                </span>
              </div>
            )}

            {/* 4 Dynamic Cluster Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Clusters</span>
                <div className="text-2xl font-black text-stone-900 mt-1">
                  {problemClustersData?.total || clusterItems.length}
                </div>
                <span className="text-[10px] text-stone-400">Consolidated hubs</span>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Clustered Reports</span>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {problemClustersData?.clusteredProblems || problemClustersData?.totalClusteredReports || 0}
                </div>
                <span className="text-[10px] text-emerald-800">Auto-grouped submissions</span>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Potential Matches</span>
                <div className="text-2xl font-black text-amber-950 mt-1">
                  {problemClustersData?.potentialMatches || 0}
                </div>
                <span className="text-[10px] text-amber-800">Review required</span>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Independent</span>
                <div className="text-2xl font-black text-stone-800 mt-1">
                  {problemClustersData?.independentProblems || 0}
                </div>
                <span className="text-[10px] text-stone-400">Stand-alone challenges</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clusterItems.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs hover:border-purple-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          {c.report_count} Reports Clustered
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {c.category?.replace(/_/g, " ") || "General"}
                        </span>
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-stone-400" />
                          {c.district}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 mt-2">{c.title}</h3>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                        c.status === "VALIDATED"
                          ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                          : "bg-amber-50 text-amber-900 border-amber-300"
                      }`}
                    >
                      {c.status === "VALIDATED" ? "Validated" : "Pending Review"}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-3">{c.description}</p>

                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-950 text-xs">
                    <span className="font-bold">Citizen Signal: </span>
                    {c.report_count} citizens in {c.district} have reported this issue. Administrative review coordinates all {c.report_count} reports simultaneously.
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <span className="text-[11px] text-stone-500 font-mono">
                      AI Confidence: {c.ai_confidence ? Math.round(Number(c.ai_confidence) * 100) : 85}%
                    </span>

                    <div className="flex items-center gap-2">
                      {c.status !== "VALIDATED" && (
                        <button
                          onClick={() => handleVerifyCluster(c.id)}
                          disabled={verifyingClusterId === c.id}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition disabled:opacity-60"
                        >
                          {verifyingClusterId === c.id ? "Reviewing..." : "Validate & Coordinate"}
                        </button>
                      )}
                      <Link
                        href="/reviewer-queue"
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition"
                      >
                        Inspect Queue
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: INSTITUTIONAL RESPONSE PIPELINE FULL DETAILS */}
        {/* ==================================================== */}
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

            {/* Interactive Pipeline Funnel Visualizer */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <InstitutionalPipelineFunnel
                pipeline={pipeline}
                onSelectStage={(k) => {
                  if (k === "governmentValidated") setSelectedStatus("VALIDATED");
                  if (k === "pilot") setSelectedStatus("PROJECT_INITIATED");
                  if (k === "resolved") setSelectedStatus("COMPLETED");
                }}
              />
            </div>

            <div className="space-y-4">
              {pipelineDefs.map((def, idx) => {
                const countKey =
                  (idx === 0
                    ? pipeline?.reported
                    : idx === 1
                    ? pipeline?.aiStructured
                    : idx === 2
                    ? pipeline?.governmentValidated
                    : idx === 3
                    ? pipeline?.matched
                    : idx === 4
                    ? pipeline?.institutionInterested
                    : idx === 5
                    ? pipeline?.eoiSubmitted
                    : idx === 6
                    ? pipeline?.pilot
                    : pipeline?.resolved) ?? 0;

                const reportedTotal = pipeline?.reported ?? 0;
                const intakePct = reportedTotal > 0
                  ? ((countKey / reportedTotal) * 100).toFixed(1) + "%"
                  : "0.0%";

                const prevCount = idx > 0 ? (
                  idx === 1 ? pipeline?.reported :
                  idx === 2 ? pipeline?.aiStructured :
                  idx === 3 ? pipeline?.governmentValidated :
                  idx === 4 ? pipeline?.matched :
                  idx === 5 ? pipeline?.institutionInterested :
                  idx === 6 ? pipeline?.eoiSubmitted :
                  pipeline?.pilot
                ) ?? 0 : null;

                const stepRateText = prevCount !== null
                  ? (prevCount > 0
                      ? `${((countKey / prevCount) * 100).toFixed(1)}% conversion from previous stage`
                      : "N/A (prior stage has 0 records)")
                  : "Intake Baseline (100%)";

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
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {idx === 0 ? "100% Intake" : `${intakePct} of intake`}
                          </span>
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
                      <div className="text-[11px] text-stone-500 font-mono mt-1">
                        {stepRateText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: DOMAIN TRENDS & SECTORAL TAXONOMY */}
        {/* ==================================================== */}
        {activeTab === "domains" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    Sectoral Domain Trends &amp; Problem Intake Velocity
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Taxonomic distribution, longitudinal intake trends, and urgency profile across {currentDistrictDisplay}.
                </p>
              </div>

              {selectedDomain && (
                <button
                  onClick={() => setSelectedDomain("")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition"
                >
                  Clear Domain Filter ({selectedDomain.replace(/_/g, " ")})
                </button>
              )}
            </div>

            {/* 2-Column Grid: Domain Bar Chart + Reporting Trend Line Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
              {/* Domain / Taxonomy Breakdown */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Focus Domain &amp; Sectoral Breakdown
                    </h3>
                    <p className="text-xs text-stone-500">
                      Problem distribution by municipal / civic domain
                    </p>
                  </div>
                </div>

                <DomainHorizontalBarChart
                  data={challengesAnalytics?.byDomain || []}
                  total={kpis?.totalChallenges || 0}
                  selectedDomain={selectedDomain}
                  onSelectDomain={(dom) => setSelectedDomain(selectedDomain === dom ? "" : dom)}
                />
              </div>

              {/* Problem Reporting Trend */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-700" />
                    <span>Intake Velocity Timeline</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Daily and monthly intake timeline across {currentDistrictDisplay}
                  </p>
                </div>

                <ProblemTrendLineChart
                  data={challengesAnalytics?.overTime || []}
                  timeRange={timeRange}
                  onTimeRangeChange={(r) => setTimeRange(r)}
                />
              </div>
            </div>

            {/* 2-Column Grid: Urgency & Severity Profile + Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
              {/* Urgency & Severity Profile */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Urgency &amp; Severity Profile
                    </h3>
                    <p className="text-xs text-stone-500">
                      Priority distribution based on citizen confirmations, safety severity, and AI analysis
                    </p>
                  </div>
                  {selectedPriority && (
                    <button
                      onClick={() => setSelectedPriority("")}
                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      Clear Priority Filter
                    </button>
                  )}
                </div>

                <PriorityDistributionProfile
                  data={challengesAnalytics?.byPriority || []}
                  total={kpis?.totalChallenges || 0}
                  selectedPriority={selectedPriority}
                  onSelectPriority={(p) => setSelectedPriority(selectedPriority === p ? "" : p)}
                />
              </div>

              {/* Status Distribution Donut */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Lifecycle Stage Distribution
                    </h3>
                    <p className="text-xs text-stone-500">
                      Proportions across platform lifecycle stages
                    </p>
                  </div>
                  {selectedStatus && (
                    <button
                      onClick={() => setSelectedStatus("")}
                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                    >
                      Clear Status Filter
                    </button>
                  )}
                </div>

                <StatusDonutChart
                  data={challengesAnalytics?.byStatus || []}
                  total={kpis?.totalChallenges || 0}
                  selectedStatus={selectedStatus}
                  onSelectStatus={(st) => setSelectedStatus(selectedStatus === st ? "" : st)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 6: DISTRICT / LOCAL INTELLIGENCE MATRIX */}
        {/* ==================================================== */}
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

            {/* District Ranking Bar Chart */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {isDistrictOfficer
                      ? `Administrative Block Volume Comparison &middot; ${officerDistrict || "Assigned District"}`
                      : "24-District Problem Intake & Validation Ranking"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Click any administrative unit to isolate or filter governance scope
                  </p>
                </div>
              </div>
              <DistrictRankingBarChart
                data={(districtsData?.data as any) || []}
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={(id) => setSelectedDistrictId(selectedDistrictId === id ? "" : id)}
                isDistrictOfficer={isDistrictOfficer}
              />
            </div>

            {/* Tabular Matrix */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full divide-y divide-stone-200 text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3.5 text-left sticky left-0 bg-stone-50 z-10 shadow-[1px_0_0_0_#e7e5e4]">Administrative Unit</th>
                      <th className="px-4 py-3.5 text-center">Total Problems</th>
                      <th className="px-4 py-3.5 text-center">High / Critical</th>
                      <th className="px-4 py-3.5 text-center">Pending Review</th>
                      <th className="px-4 py-3.5 text-center">Gov Validated</th>
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
                            <td className="px-4 py-3.5 font-bold text-stone-900 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e7e5e4] flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              <span className="break-words">{name}</span>
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
                              <span className="font-semibold text-emerald-800">
                                {row.validated ?? 0}
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

        {/* ==================================================== */}
        {/* TAB 7: PROJECTS LIFECYCLE MONITORING */}
        {/* ==================================================== */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    Collaborative Projects &amp; Lifecycle Telemetry
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Lifecycle stage progression, milestone completion velocity, and active project audits in {currentDistrictDisplay}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                  {projectsData?.active ?? kpis?.activeProjects ?? 0} Active Projects
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  {projectsData?.completed ?? kpis?.completedProjects ?? 0} Completed
                </span>
              </div>
            </div>

            {/* Lifecycle Stages Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Project Lifecycle Stage Distribution
                  </h3>
                  <p className="text-xs text-stone-500">
                    Real-time distribution across official lifecycle development stages
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Total: {projectsData?.total ?? 0}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Prototype Dev", key: "PROTOTYPE_DEVELOPMENT", count: projectsData?.byStage?.PROTOTYPE_DEVELOPMENT ?? 0 },
                  { label: "Testing", key: "TESTING", count: projectsData?.byStage?.TESTING ?? 0 },
                  { label: "Pilot Deployment", key: "PILOT", count: projectsData?.byStage?.PILOT ?? 0 },
                  { label: "Full Deployment", key: "DEPLOYMENT", count: projectsData?.byStage?.DEPLOYMENT ?? 0 },
                  { label: "Completed", key: "COMPLETED", count: projectsData?.byStage?.COMPLETED ?? 0 },
                  { label: "Blocked / At Risk", key: "BLOCKED", count: (projectsData?.byStage?.BLOCKED ?? 0) + (projectsData?.atRisk ?? 0) },
                ].map((st) => (
                  <div key={st.key} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{st.label}</span>
                    <div className="text-xl font-black text-stone-900 my-1">{st.count}</div>
                    <div className="text-[10px] text-stone-400">
                      {projectsData?.total ? `${Math.round((st.count / projectsData.total) * 100)}% of total` : "0%"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestone Execution Telemetry */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Milestone Execution Progress
                  </h3>
                  <p className="text-xs text-stone-500">
                    Audit of deliverables, pending milestones, and overdue review items
                  </p>
                </div>
                {projectsData?.milestones?.overdue > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {projectsData.milestones.overdue} Overdue
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 text-center">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Total Milestones</span>
                  <div className="text-2xl font-black text-stone-900 mt-1">{projectsData?.milestones?.total ?? 0}</div>
                  <span className="text-[10px] text-stone-400">Across all active projects</span>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Completed</span>
                  <div className="text-2xl font-black text-emerald-950 mt-1">{projectsData?.milestones?.completed ?? 0}</div>
                  <span className="text-[10px] text-emerald-800">Verified &amp; accepted</span>
                </div>
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">In Progress</span>
                  <div className="text-2xl font-black text-amber-950 mt-1">{projectsData?.milestones?.pending ?? 0}</div>
                  <span className="text-[10px] text-amber-800">Under implementation</span>
                </div>
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-center">
                  <span className="text-[10px] font-bold text-red-800 uppercase">Overdue</span>
                  <div className="text-2xl font-black text-red-950 mt-1">{projectsData?.milestones?.overdue ?? 0}</div>
                  <span className="text-[10px] text-red-800">Require intervention</span>
                </div>
              </div>

              {projectsData?.completionRate !== undefined && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">Overall Milestone Completion Velocity</span>
                    <span className="font-bold text-stone-900">{projectsData.completionRate}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${projectsData.completionRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recent Active Projects Table */}
            {projectsData?.recentProjects && projectsData.recentProjects.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">
                    Recent Collaborative Projects
                  </h3>
                  <span className="text-xs text-stone-500">
                    {projectsData.recentProjects.length} projects monitored
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Project Title</th>
                        <th className="px-4 py-3">Associated Challenge</th>
                        <th className="px-4 py-3 text-center">Stage</th>
                        <th className="px-4 py-3 text-center">District</th>
                        <th className="px-4 py-3 text-center">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {projectsData.recentProjects.map((p: any) => (
                        <tr key={p.id} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3.5 font-bold text-stone-900">
                            {p.title}
                          </td>
                          <td className="px-4 py-3.5 text-stone-600 max-w-xs truncate">
                            {p.challengeTitle || "General Solution"}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {(p.stage || "PILOT").replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-stone-600">
                            {p.district || "Statewide"}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${p.progress || 0}%` }}
                                />
                              </div>
                              <span className="font-semibold text-stone-800 text-[11px]">{p.progress || 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 8: UNIVERSITY & ECOSYSTEM MATRIX */}
        {/* ==================================================== */}
        {/* TAB 5: UNIVERSITIES & HIGHER EDUCATION INSTITUTIONS */}
        {/* ==================================================== */}
        {activeTab === "universities" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    Higher Education Institutions (HEIs) &amp; Academic Intelligence
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Registered universities, colleges, academic mentors, student innovators, and institutional deployment matrix in {currentDistrictDisplay}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                  {ecosystemData?.participatingHeis ?? 0} Higher Education Institutions
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                  {ecosystemData?.academicMembers?.students ?? 0} Student Innovators
                </span>
              </div>
            </div>

            {/* Academic Members Metric Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-stone-900">{ecosystemData?.academicMembers?.students ?? 0}</div>
                  <div className="text-xs font-semibold text-stone-500">Student Innovators &amp; Researchers</div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-stone-900">{ecosystemData?.academicMembers?.facultyMentors ?? 0}</div>
                  <div className="text-xs font-semibold text-stone-500">Faculty Mentors &amp; PIs</div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-800 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-stone-900">{ecosystemData?.academicMembers?.coordinators ?? 0}</div>
                  <div className="text-xs font-semibold text-stone-500">HEI Campus Coordinators</div>
                </div>
              </div>
            </div>

            {/* Participating HEIs Matrix Table */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Participating Universities &amp; Higher Education Institutions
                  </h3>
                  <p className="text-xs text-stone-500">
                    Institutional capacity, location, domain strengths, and project deployment matrix
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {ecosystemData?.heisList?.length ?? 0} Verified Institutions
                </span>
              </div>

              {(!ecosystemData?.heisList || ecosystemData.heisList.length === 0) ? (
                <div className="p-6 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-xs font-bold text-stone-700">No institutions registered in current filter scope</p>
                  <p className="text-[11px] text-stone-500">
                    Universities onboard via the Higher Education Institutional Portal.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Institution Name</th>
                        <th className="px-4 py-3">AISHE Code</th>
                        <th className="px-4 py-3">District</th>
                        <th className="px-4 py-3 text-center">Active Projects</th>
                        <th className="px-4 py-3 text-center">Completed</th>
                        <th className="px-4 py-3 text-center">Solutions</th>
                        <th className="px-4 py-3">Domain Specializations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {ecosystemData.heisList.map((hei: any) => (
                        <tr key={hei.id} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3.5 font-bold text-stone-900">
                            {hei.name}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-stone-600 text-[11px]">
                            {hei.aisheCode || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-stone-600">
                            {hei.district || "Statewide"}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-indigo-900">
                            {hei.activeProjects ?? 0}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-900">
                            {hei.completedProjects ?? 0}
                          </td>
                          <td className="px-4 py-3.5 text-center font-semibold text-stone-700">
                            {hei.activeSolutions ?? 0}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(hei.domains || []).slice(0, 3).map((d: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                  {d.replace(/_/g, " ")}
                                </span>
                              ))}
                              {(!hei.domains || hei.domains.length === 0) && (
                                <span className="text-[10px] text-stone-400">General Innovation</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {activeTab === "ecosystem" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    Higher Education &amp; Ecosystem Engagement Matrix
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Academic participation, institutional capacity, industry partnerships, and consortium mobilizations in {currentDistrictDisplay}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                  {ecosystemData?.participatingHeis ?? 0} Higher Education Institutions
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  {ecosystemData?.participatingIndustries ?? 0} Industry Partners
                </span>
              </div>
            </div>

            {/* Ecosystem Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Participating HEIs</span>
                  <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-stone-900 my-1">
                  {ecosystemData?.participatingHeis ?? 0}
                </div>
                <div className="text-[10px] text-stone-500">
                  Universities &amp; Colleges active
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Industry &amp; MSMEs</span>
                  <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-stone-900 my-1">
                  {ecosystemData?.participatingIndustries ?? 0}
                </div>
                <div className="text-[10px] text-stone-500">
                  Private &amp; CSR entities
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Consortiums</span>
                  <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-stone-900 my-1">
                  {ecosystemData?.consortiumsActive ?? 0}
                </div>
                <div className="text-[10px] text-stone-500">
                  Joint project teams formed
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Ecosystem Funding</span>
                  <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-emerald-950 my-1">
                  ₹{(ecosystemData?.funding?.totalMobilized ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-stone-500">
                  Mobilized resources &amp; grants
                </div>
              </div>
            </div>

            {/* Academic Members & Ecosystem Partners Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Academic Members */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Academic Researchers &amp; Mentors
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="text-xl font-black text-blue-950">{ecosystemData?.academicMembers?.students ?? 0}</div>
                    <div className="text-[10px] font-semibold text-blue-800 mt-1">Student Innovators</div>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <div className="text-xl font-black text-indigo-950">{ecosystemData?.academicMembers?.facultyMentors ?? 0}</div>
                    <div className="text-[10px] font-semibold text-indigo-800 mt-1">Faculty Mentors</div>
                  </div>
                  <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                    <div className="text-xl font-black text-teal-950">{ecosystemData?.academicMembers?.coordinators ?? 0}</div>
                    <div className="text-[10px] font-semibold text-teal-800 mt-1">HEI Coordinators</div>
                  </div>
                </div>
              </div>

              {/* Ecosystem Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-600" />
                  Ecosystem Composition
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{ecosystemData?.ecosystemBreakdown?.universities ?? 0}</div>
                    <div className="text-[10px] text-stone-500">Colleges</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{ecosystemData?.ecosystemBreakdown?.industry ?? 0}</div>
                    <div className="text-[10px] text-stone-500">Enterprises</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{ecosystemData?.ecosystemBreakdown?.startups ?? 0}</div>
                    <div className="text-[10px] text-stone-500">Startups</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{ecosystemData?.ecosystemBreakdown?.msmes ?? 0}</div>
                    <div className="text-[10px] text-stone-500">MSMEs</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{ecosystemData?.ecosystemBreakdown?.csr ?? 0}</div>
                    <div className="text-[10px] text-stone-500">CSR Units</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{ecosystemData?.ecosystemBreakdown?.researchInstitutions ?? 0}</div>
                    <div className="text-[10px] text-stone-500">Research Labs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Participating HEIs Matrix Table */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Participating Universities &amp; Higher Education Institutions
                  </h3>
                  <p className="text-xs text-stone-500">
                    Institutional capacity, location, domain strengths, and project deployment matrix
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {ecosystemData?.heisList?.length ?? 0} Verified Institutions
                </span>
              </div>

              {(!ecosystemData?.heisList || ecosystemData.heisList.length === 0) ? (
                <div className="p-6 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-xs font-bold text-stone-700">No institutions registered in current filter scope</p>
                  <p className="text-[11px] text-stone-500">
                    Universities onboard via the Higher Education Institutional Portal.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Institution Name</th>
                        <th className="px-4 py-3">AISHE Code</th>
                        <th className="px-4 py-3">District</th>
                        <th className="px-4 py-3 text-center">Active Projects</th>
                        <th className="px-4 py-3 text-center">Completed</th>
                        <th className="px-4 py-3 text-center">Solutions</th>
                        <th className="px-4 py-3">Domain Specializations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {ecosystemData.heisList.map((hei: any) => (
                        <tr key={hei.id} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3.5 font-bold text-stone-900">
                            {hei.name}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-stone-600 text-[11px]">
                            {hei.aisheCode || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-stone-600">
                            {hei.district || "Statewide"}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-indigo-900">
                            {hei.activeProjects ?? 0}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-900">
                            {hei.completedProjects ?? 0}
                          </td>
                          <td className="px-4 py-3.5 text-center font-semibold text-stone-700">
                            {hei.activeSolutions ?? 0}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(hei.domains || []).slice(0, 3).map((d: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                  {d.replace(/_/g, " ")}
                                </span>
                              ))}
                              {(!hei.domains || hei.domains.length === 0) && (
                                <span className="text-[10px] text-stone-400">General Innovation</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 9: SOCIAL IMPACT & FIELD AUDIT */}
        {/* ==================================================== */}
        {activeTab === "impact" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-teal-700" />
                  <h2 className="text-base font-bold text-stone-900">
                    Social Impact, Beneficiary Reach &amp; Audit Records
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Independent assessments, verified citizens reached, district coverage, and evidence telemetry in {currentDistrictDisplay}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200">
                  {(impactData?.totalBeneficiaries ?? 0).toLocaleString()} Verified Beneficiaries
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  {impactData?.verifiedAssessments ?? 0} Audited Field Reports
                </span>
              </div>
            </div>

            {/* Impact Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Beneficiaries Reached</span>
                  <Users className="h-4 w-4 text-teal-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-stone-900 my-1">
                  {(impactData?.totalBeneficiaries ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-stone-500">
                  Direct citizen recipients
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Field Assessments</span>
                  <FileCheck2 className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-stone-900 my-1">
                  {impactData?.totalAssessments ?? 0}
                </div>
                <div className="text-[10px] text-stone-500">
                  {impactData?.verifiedAssessments ?? 0} officially verified
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Impacted Districts</span>
                  <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-stone-900 my-1">
                  {impactData?.impactedDistricts ?? 0} <span className="text-xs text-stone-400 font-normal">/ 24</span>
                </div>
                <div className="text-[10px] text-stone-500">
                  Districts with active solutions
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-semibold truncate">Funding Mobilized</span>
                  <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
                <div className="text-2xl font-black text-emerald-950 my-1">
                  ₹{(impactData?.totalFundingMobilized ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-stone-500">
                  Grants &amp; solution support
                </div>
              </div>
            </div>

            {/* Metrics by Category & Evidence Telemetry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Metrics Telemetry by Category */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Impact Metrics by Category
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                    <div className="text-xl font-black text-teal-950">{impactData?.metricsByCategory?.SOCIAL ?? 0}</div>
                    <div className="text-[10px] font-semibold text-teal-800 mt-1">Social Well-being</div>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <div className="text-xl font-black text-emerald-950">{impactData?.metricsByCategory?.ECONOMIC ?? 0}</div>
                    <div className="text-[10px] font-semibold text-emerald-800 mt-1">Economic / Livelihood</div>
                  </div>
                  <div className="p-3 bg-green-50/60 rounded-xl border border-green-100">
                    <div className="text-xl font-black text-green-950">{impactData?.metricsByCategory?.ENVIRONMENTAL ?? 0}</div>
                    <div className="text-[10px] font-semibold text-green-800 mt-1">Environmental / Ecology</div>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <div className="text-xl font-black text-blue-950">{impactData?.metricsByCategory?.GOVERNANCE ?? 0}</div>
                    <div className="text-[10px] font-semibold text-blue-800 mt-1">Governance &amp; Efficiency</div>
                  </div>
                </div>
              </div>

              {/* Evidence & Citizen Feedback */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-indigo-600" />
                  Audited Verification Evidence
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{impactData?.evidenceBreakdown?.photos ?? 0}</div>
                    <div className="text-[10px] text-stone-500">Geotagged Photos</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{impactData?.evidenceBreakdown?.testimonials ?? 0}</div>
                    <div className="text-[10px] text-stone-500">Testimonials</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
                    <div className="font-black text-stone-900">{impactData?.evidenceBreakdown?.officialRecords ?? 0}</div>
                    <div className="text-[10px] text-stone-500">Gov Records</div>
                  </div>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                  <span className="text-stone-600 font-medium">Community Citizen Reviews:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">{impactData?.communityFeedback?.count ?? 0} Submissions</span>
                    <span className="px-2 py-0.5 rounded font-black text-amber-900 bg-amber-100 border border-amber-200">
                      ★ {impactData?.communityFeedback?.avgRating ?? 0}/5
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Verified Field Assessments Table */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Recent Field Impact Assessments
                  </h3>
                  <p className="text-xs text-stone-500">
                    Verified milestone impact reports submitted by field evaluation teams
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  {impactData?.recentAssessments?.length ?? 0} Field Reviews
                </span>
              </div>

              {(!impactData?.recentAssessments || impactData.recentAssessments.length === 0) ? (
                <div className="p-6 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-xs font-bold text-stone-700">No impact assessments recorded in scope</p>
                  <p className="text-[11px] text-stone-500">
                    Evaluators file certified impact assessments once solution pilots achieve measurable deployment milestones.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Project Title</th>
                        <th className="px-4 py-3">Assessor / Team</th>
                        <th className="px-4 py-3 text-center">Beneficiaries Reached</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Assessment Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {impactData.recentAssessments.map((ass: any) => (
                        <tr key={ass.id} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3.5 font-bold text-stone-900">
                            {ass.projectTitle}
                          </td>
                          <td className="px-4 py-3.5 text-stone-600">
                            {ass.assessor || "Independent Evaluator"}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-teal-900">
                            {(ass.beneficiaries || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ass.status === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}>
                              {ass.status || "VERIFIED"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-stone-500">
                            {formatDateSafe(ass.assessedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 8: AI CAPABILITY MATCHING INSIGHTS */}
        {/* ==================================================== */}
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
                  <strong>Evidence Privacy Guarantee:</strong> Proprietary citizen evidence documents remain strictly confidential to authorized government reviewers. The matching engine evaluates verified capability passport claims with zero public evidence leakage.
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

        
        {/* ==================================================== */}
        {/* TAB 9: INNOVATION OUTCOMES & IP TELEMETRY */}
        {/* ==================================================== */}
        {activeTab === "outcomes" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h2 className="text-base font-bold text-stone-900">
                    Innovation Outcomes, Patents &amp; Technology Transfer
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Verifiable intellectual property, patent filings, academic spin-offs, and commercialization milestones in {currentDistrictDisplay}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold">
                  {kpis?.verifiedOutcomes ?? innovationData?.verifiedOutcomes ?? 0} Verified Outcomes
                </span>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                <span className="text-xs text-stone-500 block">Total Outcomes</span>
                <div className="text-2xl font-black text-stone-900 mt-1">
                  {innovationData?.totalOutcomes ?? kpis?.totalOutcomes ?? 0}
                </div>
                <span className="text-[10px] text-stone-400">Registered across projects</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                <span className="text-xs text-emerald-700 block">Government Verified</span>
                <div className="text-2xl font-black text-emerald-800 mt-1">
                  {innovationData?.verifiedOutcomes ?? kpis?.verifiedOutcomes ?? 0}
                </div>
                <span className="text-[10px] text-emerald-600">Official audit certified</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                <span className="text-xs text-purple-700 block">Patents &amp; Filings</span>
                <div className="text-2xl font-black text-purple-900 mt-1">
                  {(innovationData?.outcomesByType || []).reduce((acc: number, o: any) => {
                    return (o.outcome_type === "PATENT" || o.outcome_type === "PATENT_APPLICATION") ? acc + (parseInt(o.total) || 0) : acc;
                  }, 0)}
                </div>
                <span className="text-[10px] text-purple-600">IP protectable claims</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
                <span className="text-xs text-blue-700 block">Startups &amp; Tech Transfer</span>
                <div className="text-2xl font-black text-blue-900 mt-1">
                  {(innovationData?.outcomesByType || []).reduce((acc: number, o: any) => {
                    return (o.outcome_type === "STARTUP_CREATED" || o.outcome_type === "TECHNOLOGY_TRANSFER") ? acc + (parseInt(o.total) || 0) : acc;
                  }, 0)}
                </div>
                <span className="text-[10px] text-blue-600">Commercial deployment</span>
              </div>
            </div>

            {/* Category Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Patents &amp; IP Protection</h4>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Formal patent applications filed with the Indian Patent Office (IPO) and utility models developed through university research.
                </p>
                <div className="pt-2 text-xs font-semibold text-purple-700">
                  Total Recorded: {(innovationData?.outcomesByType || []).find((o: any) => o.outcome_type === "PATENT_APPLICATION")?.total ?? 0} Applications
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Startups &amp; Spin-Offs</h4>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Student-faculty entrepreneurial ventures and micro-enterprises registered to commercialize deployed project prototypes.
                </p>
                <div className="pt-2 text-xs font-semibold text-emerald-700">
                  Total Incorporated: {(innovationData?.outcomesByType || []).find((o: any) => o.outcome_type === "STARTUP_CREATED")?.total ?? 0} Startups
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Technology Transfer</h4>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Licensing and operational handovers to state public departments, local panchayats, and industrial manufacturing partners.
                </p>
                <div className="pt-2 text-xs font-semibold text-blue-700">
                  Transfers Executed: {(innovationData?.outcomesByType || []).find((o: any) => o.outcome_type === "TECHNOLOGY_TRANSFER")?.total ?? 0} Agreements
                </div>
              </div>
            </div>

            {/* Recent Verified Innovation Outcomes Audit Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Official Innovation Outcomes Register
                  </h3>
                  <p className="text-xs text-stone-500">
                    Audited outcomes from consortium projects with zero confidential IP leakage
                  </p>
                </div>
              </div>

              {(!innovationData?.recentVerifiedOutcomes || innovationData.recentVerifiedOutcomes.length === 0) ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Sparkles className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                  <p className="font-semibold text-stone-700">No innovation outcomes registered yet</p>
                  <p className="text-stone-400 mt-0.5">Outcomes will appear as university projects achieve patent filings, startup spin-offs, and tech transfers.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[640px] w-full divide-y divide-stone-200 text-xs">
                    <thead className="bg-stone-50 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-left">Title / Identification</th>
                        <th className="px-4 py-3 text-center">Reference No.</th>
                        <th className="px-4 py-3 text-center">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {innovationData.recentVerifiedOutcomes.map((item: any) => (
                        <tr key={item.id} className="hover:bg-stone-50/70 transition">
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-800 border border-purple-200">
                              {item.outcome_type?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-stone-900">
                            {item.title}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[11px] text-stone-600">
                            {item.reference_number || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {item.status || "VERIFIED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 5. METRIC TELEMETRY & AUDIT DRAWER */}
        {/* ==================================================== */}
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
                  Zero-Fabrication Guarantee Active
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
                    <div key={m.key} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5 text-xs min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-stone-900 break-words">{m.metric_name}</span>
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto break-all">
                          {m.calculation}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 break-words">
                        <strong>Source Tables:</strong> {m.tables.join(", ")}
                      </div>
                      <div className="text-[11px] text-stone-600 font-mono break-all">
                        <strong>Condition:</strong> {m.filtering_condition}
                      </div>
                      <div className="text-[10px] text-stone-400 break-words">
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
