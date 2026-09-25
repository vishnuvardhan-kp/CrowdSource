"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Users,
  Video,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Info,
  Globe,
} from "lucide-react";
import { formatDateSafe } from "../../lib/utils";

interface ProblemClustersQueueProps {
  token: string | null;
  apiUrl: string;
  isReviewer: boolean;
  onActionSuccess: (msg: string) => void;
  onActionError: (msg: string) => void;
}

export function ProblemClustersQueue({
  token,
  apiUrl,
  isReviewer,
  onActionSuccess,
  onActionError,
}: ProblemClustersQueueProps) {
  const [clustersQueue, setClustersQueue] = useState<any[]>([]);
  const [clustersLoading, setClustersLoading] = useState<boolean>(false);
  const [selectedClusterStatus, setSelectedClusterStatus] = useState<string>("AWAITING_GOVERNMENT_VERIFICATION");
  const [activeCluster, setActiveCluster] = useState<any | null>(null);
  const [activeClusterDetail, setActiveClusterDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [clusterRejectionReason, setClusterRejectionReason] = useState<string>("");
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // Expanded report cards
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Fetch Clusters List
  const fetchClustersQueue = useCallback(async () => {
    if (!token || !isReviewer) return;
    setClustersLoading(true);
    try {
      const url =
        selectedClusterStatus && selectedClusterStatus !== "ALL"
          ? `${apiUrl}/problem-clusters?status=${selectedClusterStatus}`
          : `${apiUrl}/problem-clusters`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || data;
        setClustersQueue(items);
        if (items.length > 0) {
          setActiveCluster((prev: any) => {
            if (!prev) return items[0];
            const found = items.find((i: any) => i.id === prev.id);
            return found || items[0];
          });
        } else {
          setActiveCluster(null);
        }
      }
    } catch (err) {
      console.error("Failed to load clusters queue:", err);
    } finally {
      setClustersLoading(false);
    }
  }, [apiUrl, isReviewer, selectedClusterStatus, token]);

  // Fetch Cluster Details (including underlying citizen reports and evidence)
  const fetchClusterDetail = useCallback(
    async (clusterId: string) => {
      if (!token || !clusterId) return;
      setDetailLoading(true);
      try {
        const res = await fetch(`${apiUrl}/problem-clusters/${clusterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setActiveClusterDetail(data);
        }
      } catch (err) {
        console.error("Failed to load cluster detail:", err);
      } finally {
        setDetailLoading(false);
      }
    },
    [apiUrl, token]
  );

  useEffect(() => {
    fetchClustersQueue();
  }, [fetchClustersQueue]);

  useEffect(() => {
    if (activeCluster?.id) {
      fetchClusterDetail(activeCluster.id);
    } else {
      setActiveClusterDetail(null);
    }
  }, [activeCluster?.id, fetchClusterDetail]);

  // Single Government Verification Handler
  const handleVerifyCluster = async (clusterId: string) => {
    if (!clusterId || !token) return;
    setProcessingAction(true);
    try {
      const res = await fetch(`${apiUrl}/problem-clusters/${clusterId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to verify problem cluster.");
      }
      onActionSuccess(
        "Problem Cluster successfully VERIFIED! Underlying reports validated and cluster opened for EOI solutions."
      );
      await fetchClustersQueue();
      await fetchClusterDetail(clusterId);
    } catch (err: any) {
      onActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Reject Cluster Handler
  const handleRejectCluster = async () => {
    if (!activeCluster?.id || !token) return;
    if (!clusterRejectionReason.trim()) {
      onActionError("A rejection reason is mandatory.");
      return;
    }
    setProcessingAction(true);
    try {
      const res = await fetch(`${apiUrl}/problem-clusters/${activeCluster.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: clusterRejectionReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reject problem cluster.");
      }
      onActionSuccess("Problem Cluster rejected with documented reason.");
      setRejectModalOpen(false);
      setClusterRejectionReason("");
      await fetchClustersQueue();
    } catch (err: any) {
      onActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Potential Match Review Handler (Accept merge or Reject as independent)
  const handleReviewPotentialMatch = async (reportId: string, action: "ACCEPT" | "REJECT") => {
    if (!reportId || !token) return;
    setProcessingAction(true);
    try {
      const res = await fetch(`${apiUrl}/problem-clusters/potential-matches/${reportId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to process match decision.");
      }
      const data = await res.json();
      onActionSuccess(
        data.message ||
          (action === "ACCEPT"
            ? "Report merged into cluster."
            : "Report routed to independent problem cluster.")
      );
      await fetchClustersQueue();
      if (activeCluster?.id) {
        await fetchClusterDetail(activeCluster.id);
      }
    } catch (err: any) {
      onActionError(err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-50 text-red-700 border-red-200";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "VALIDATED":
      case "OPEN_FOR_SOLUTIONS":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "AWAITING_GOVERNMENT_VERIFICATION":
        return "bg-amber-50 text-amber-800 border-amber-300";
      case "COLLABORATION":
      case "PROJECT_INITIATED":
        return "bg-purple-50 text-purple-800 border-purple-300";
      case "REJECTED":
        return "bg-red-50 text-red-800 border-red-300";
      case "RESOLVED":
        return "bg-teal-50 text-teal-800 border-teal-300";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-status filter buttons */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-xs">
        {[
          { key: "AWAITING_GOVERNMENT_VERIFICATION", label: "Pending Verification" },
          { key: "VALIDATED", label: "Validated / Open for Solutions" },
          { key: "COLLABORATION", label: "In Collaboration" },
          { key: "PROJECT_INITIATED", label: "Project Active" },
          { key: "RESOLVED", label: "Resolved" },
          { key: "REJECTED", label: "Rejected History" },
          { key: "ALL", label: "All Problem Clusters" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSelectedClusterStatus(tab.key);
              setActiveCluster(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              selectedClusterStatus === tab.key
                ? "bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs"
                : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cluster List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Problem Clusters ({clustersQueue.length})
            </h3>
            <span className="text-[11px] text-stone-400">
              Ordered by Priority & Recency
            </span>
          </div>

          {clustersLoading ? (
            <div className="p-8 text-center text-xs text-stone-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-stone-400" />
              Loading problem clusters...
            </div>
          ) : clustersQueue.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">
              No problem clusters found in this status.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {clustersQueue.map((cluster) => {
                const isSelected = activeCluster?.id === cluster.id;
                return (
                  <button
                    key={cluster.id}
                    onClick={() => setActiveCluster(cluster)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-600/20"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-stone-500 pb-1">
                      <span className="font-medium text-stone-700 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-stone-400" />
                        {cluster.district} {cluster.village_locality ? `· ${cluster.village_locality}` : ""}
                      </span>
                      <span>{formatDateSafe(cluster.created_at)}</span>
                    </div>

                    <h4 className="text-xs font-bold text-stone-900 line-clamp-2 mt-0.5">
                      {cluster.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {/* Priority badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityColor(
                          cluster.priority
                        )}`}
                      >
                        {cluster.priority} ({Number(cluster.priority_score).toFixed(0)}/100)
                      </span>

                      {/* Report count badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {cluster.report_count} {cluster.report_count === 1 ? "Report" : "Reports"}
                      </span>

                      {/* Evidence count badge */}
                      {cluster.evidence_count > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {cluster.evidence_count} Evidence
                        </span>
                      )}

                      {/* Status */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusColor(
                          cluster.status
                        )}`}
                      >
                        {cluster.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Cluster Detail & Verification Pane */}
        <div className="lg:col-span-8">
          {!activeCluster ? (
            <div className="p-12 rounded-2xl border border-stone-200 bg-white text-center text-xs text-stone-400 h-full flex flex-col items-center justify-center">
              <Sparkles className="h-8 w-8 text-stone-300 mb-2" />
              Select a Problem Cluster from the left to review consolidated intelligence and citizen reports.
            </div>
          ) : detailLoading ? (
            <div className="p-12 rounded-2xl border border-stone-200 bg-white text-center text-xs text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-stone-400" />
              Loading cluster intelligence...
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-6 shadow-sm">
              {/* Header Title & Badges */}
              <div className="border-b border-stone-200 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                      {activeCluster.category || "General"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColor(
                        activeCluster.status
                      )}`}
                    >
                      {activeCluster.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">
                    ID: {activeCluster.id.substring(0, 8)}...
                  </span>
                </div>

                <h2 className="text-lg font-bold text-stone-900 leading-snug">
                  {activeCluster.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-2">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                    {activeCluster.district}
                    {activeCluster.block ? ` · Block: ${activeCluster.block}` : ""}
                    {activeCluster.village_locality ? ` · Locality: ${activeCluster.village_locality}` : ""}
                  </span>
                  {activeCluster.latitude && activeCluster.longitude && (
                    <span className="text-stone-400 font-mono text-[11px]">
                      GPS: {Number(activeCluster.latitude).toFixed(4)}, {Number(activeCluster.longitude).toFixed(4)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-stone-500">
                    <Clock className="h-3.5 w-3.5" />
                    Clustered: {formatDateSafe(activeCluster.created_at)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Synthesized Problem Description
                </h4>
                <p className="text-xs text-stone-800 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200 whitespace-pre-line">
                  {activeCluster.description}
                </p>
              </div>

              {/* Priority & Explainability Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-emerald-50/30 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                    Priority Evaluation & Explainability
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityColor(
                      activeCluster.priority
                    )}`}
                  >
                    {activeCluster.priority} Priority ({Number(activeCluster.priority_score).toFixed(0)}/100)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-2xs">
                    <div className="font-bold text-stone-900">{activeCluster.report_count}</div>
                    <div className="text-[10px] text-stone-500">Citizen Reports</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-2xs">
                    <div className="font-bold text-stone-900">{activeCluster.evidence_count}</div>
                    <div className="text-[10px] text-stone-500">Evidence Items</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-2xs">
                    <div className="font-bold text-stone-900">{activeCluster.severity || "MODERATE"}</div>
                    <div className="text-[10px] text-stone-500">Severity Factor</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-2xs">
                    <div className="font-bold text-stone-900">
                      {activeCluster.ai_confidence ? `${(activeCluster.ai_confidence * 100).toFixed(0)}%` : "85%"}
                    </div>
                    <div className="text-[10px] text-stone-500">AI Confidence</div>
                  </div>
                </div>

                {activeCluster.priority_reasons && activeCluster.priority_reasons.length > 0 && (
                  <div className="pt-2 border-t border-stone-200/60 text-xs">
                    <span className="text-[11px] font-semibold text-stone-600">Explainable Reasons:</span>
                    <ul className="list-disc list-inside mt-1 text-[11px] text-stone-600 space-y-0.5">
                      {activeCluster.priority_reasons.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Single Government Verification Action Panel */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      Administrative Cluster Review & Oversight
                    </h4>
                    <p className="text-[11px] text-emerald-800 leading-relaxed max-w-xl">
                      Validating this problem cluster automatically verifies all{" "}
                      <span className="font-bold">{activeCluster.report_count} citizen report(s)</span> and opens the
                      problem for institutional & industry solution discovery (EOIs).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCluster.status === "AWAITING_GOVERNMENT_VERIFICATION" && (
                      <>
                        <button
                          onClick={() => handleVerifyCluster(activeCluster.id)}
                          disabled={processingAction}
                          className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {processingAction ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Verify Problem Cluster
                        </button>

                        <button
                          onClick={() => setRejectModalOpen(true)}
                          disabled={processingAction}
                          className="px-3 py-2 rounded-xl border border-red-300 bg-white text-red-700 text-xs font-bold hover:bg-red-50 transition shadow-xs disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {activeCluster.status === "VALIDATED" && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-white px-3 py-2 rounded-xl border border-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Verified & Open for Solutions</span>
                      </div>
                    )}

                    {activeCluster.status === "REJECTED" && (
                      <div className="flex items-center gap-2 text-xs font-bold text-red-800 bg-white px-3 py-2 rounded-xl border border-red-300">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Cluster Rejected: {activeCluster.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Aggregated Evidence Gallery */}
              {activeClusterDetail?.aggregatedEvidence && activeClusterDetail.aggregatedEvidence.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-stone-400" />
                    Consolidated Evidence Vault ({activeClusterDetail.aggregatedEvidence.length})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {activeClusterDetail.aggregatedEvidence.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between space-y-2 hover:bg-stone-50 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {ev.evidence_type === "VIDEO" ? (
                              <Video className="h-4 w-4 text-indigo-600 shrink-0" />
                            ) : ev.evidence_type === "IMAGE" ? (
                              <ImageIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileCheck2 className="h-4 w-4 text-stone-600 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-stone-800 line-clamp-1">
                              {ev.title || "Evidence Attachment"}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-stone-400 uppercase">
                            {ev.evidence_type}
                          </span>
                        </div>

                        {ev.description && (
                          <p className="text-[11px] text-stone-600 line-clamp-2">
                            {ev.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">{formatDateSafe(ev.created_at)}</span>
                          {ev.url && (
                            <a
                              href={ev.url.startsWith("http") ? ev.url : `${apiUrl.replace("/api", "")}${ev.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                            >
                              <span>View</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Underlying Citizen Reports Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-stone-400" />
                    Underlying Citizen Reports ({activeClusterDetail?.reports?.length || activeCluster.report_count})
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    Consolidated into this problem cluster
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(activeClusterDetail?.reports || []).map((report: any) => {
                    const isExpanded = expandedReportId === report.id;
                    const isPotentialMatch = report.clustering_status === "POTENTIAL_MATCH";

                    return (
                      <div
                        key={report.id}
                        className={`rounded-xl border transition-all ${
                          isPotentialMatch
                            ? "border-amber-300 bg-amber-50/40"
                            : "border-stone-200 bg-stone-50/30"
                        }`}
                      >
                        <div
                          className="p-3.5 flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-stone-900">
                                {report.title}
                              </h5>
                              {report.original_language && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {report.original_language.toUpperCase()}
                                </span>
                              )}
                              {report.citizen_severity && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-stone-100 text-stone-700">
                                  {report.citizen_severity}
                                </span>
                              )}
                              {isPotentialMatch && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Match Review Required (50%-75%)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-stone-500">
                              <span>Locality: {report.village_locality || "Unspecified"}</span>
                              <span>·</span>
                              <span>Reported: {formatDateSafe(report.submitted_at || report.created_at)}</span>
                              <span>·</span>
                              <span>{report.evidenceCount || 0} Evidence Item(s)</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-stone-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-stone-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 border-t border-stone-200/60 space-y-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                <Globe className="h-3 w-3 text-emerald-700" />
                                Citizen&apos;s Original Text ({report.original_language ? report.original_language.toUpperCase() : "Native"})
                              </span>
                              <p className="text-xs text-stone-800 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                                {report.original_text || report.description}
                              </p>
                            </div>

                            {report.normalized_text && report.normalized_text !== (report.original_text || report.description) && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Normalized English Translation
                                </span>
                                <p className="text-xs text-stone-700 leading-relaxed bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                                  {report.normalized_text}
                                </p>
                              </div>
                            )}

                            {/* Potential Match Evaluation Actions */}
                            {isPotentialMatch && (
                              <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-300 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                                  <Info className="h-4 w-4" />
                                  Officer Review: Medium-Confidence Match Decision
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Confirm if this report belongs to the current problem cluster or if it represents an
                                  independent issue. Rejecting match immediately creates a new independent ProblemCluster.
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReviewPotentialMatch(report.id, "ACCEPT");
                                    }}
                                    disabled={processingAction}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
                                  >
                                    Confirm Merge into Cluster
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReviewPotentialMatch(report.id, "REJECT");
                                    }}
                                    disabled={processingAction}
                                    className="px-3 py-1.5 rounded-lg bg-stone-700 text-white text-xs font-bold hover:bg-stone-800 transition"
                                  >
                                    Reject (Create Independent Cluster)
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 break-words">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>Reject Problem Cluster</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed break-words">
              Please state the reason for rejecting this problem cluster. A clear, documented rationale is mandatory.
            </p>
            <textarea
              rows={4}
              value={clusterRejectionReason}
              onChange={(e) => setClusterRejectionReason(e.target.value)}
              placeholder="e.g. Issue was investigated on-site and confirmed already resolved by local municipal authorities..."
              className="w-full text-xs p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setClusterRejectionReason("");
                }}
                disabled={processingAction}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectCluster}
                disabled={processingAction || !clusterRejectionReason.trim()}
                className="px-4 py-2.5 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-800 transition disabled:opacity-50 text-center"
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
