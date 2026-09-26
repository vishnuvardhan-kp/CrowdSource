"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Landmark,
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
  UserCheck,
  Info,
} from "lucide-react";

interface PriUlbVerificationQueueProps {
  apiUrl: string;
  token: string | null;
}

export function PriUlbVerificationQueue({ apiUrl, token }: PriUlbVerificationQueueProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Review Modal State
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "REQUEST_INFO" | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let url = `${apiUrl}/admin/institutions/verification/queue?limit=50`;
      if (statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }
      if (typeFilter !== "ALL") {
        url += `&type=${typeFilter}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load institutional verification queue.");
      }

      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token, statusFilter, typeFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleDecision = async () => {
    if (!activeItem || !actionType || !token) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        action: actionType,
        notes: notes.trim() || undefined,
      };

      if (actionType === "REJECT") {
        if (!rejectionReason.trim()) {
          setError("Rejection reason is mandatory.");
          setSubmitting(false);
          return;
        }
        payload.rejection_reason = rejectionReason.trim();
      }

      const res = await fetch(`${apiUrl}/admin/institutions/verification/${activeItem.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit review decision.");
      }

      setActionSuccessMsg(
        `Representative authority for ${activeItem.user?.name} (${activeItem.institution?.name}) was ${
          actionType === "APPROVE" ? "APPROVED" : actionType === "REJECT" ? "REJECTED" : "MARKED FOR ADDITIONAL INFO"
        }.`,
      );

      setActiveItem(null);
      setActionType(null);
      setNotes("");
      setRejectionReason("");
      fetchQueue();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Reviewer Guidance */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-blue-950">
              Panchayati Raj & Urban Local Bodies Representative Authority Queue
            </h3>
            <p className="text-xs text-blue-800/80 leading-relaxed">
              Verify that applicants requesting to represent Gram Panchayats, Panchayat Samitis, Zilla Parishads, or Urban Local Bodies possess official appointment or elected credentials. The institution’s existence is cross-verified against official Local Government Directory (LGD) records.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          {["ALL", "PENDING", "UNDER_REVIEW", "AFFILIATION_PENDING", "VERIFIED", "REJECTED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">All Institution Types</option>
            <option value="PRI">Panchayati Raj (PRI)</option>
            <option value="ULB">Urban Local Body (ULB)</option>
            <option value="GOVERNMENT_DEPARTMENT">Government Dept</option>
          </select>

          <button
            type="button"
            onClick={fetchQueue}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue Items */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading institutional applications...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          No applications found matching the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => {
            const isVerified = item.authority_status === "VERIFIED";
            const isRejected = item.authority_status === "REJECTED";
            const isUnderReview = item.authority_status === "UNDER_REVIEW";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-base">
                        {item.institution?.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 text-blue-800">
                        LGD: {item.institution?.lgd_code}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.institution?.subtype}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      District: <strong>{item.institution?.district_name || "Jharkhand"}</strong>
                      {item.institution?.block_name ? ` • Block: ${item.institution.block_name}` : ""} • Jurisdiction Level: {item.institution?.hierarchy_level}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : isRejected
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.authority_status}
                    </span>
                  </div>
                </div>

                {/* Applicant Profile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Applicant Name</span>
                    <span className="font-bold text-slate-900">{item.user?.name}</span>
                    <span className="text-slate-500 block text-[11px]">{item.user?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Claimed Role / Designation</span>
                    <span className="font-bold text-slate-800">{item.designation}</span>
                    <span className="text-slate-500 block text-[11px]">{item.relationship}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Submitted On</span>
                    <span className="font-medium text-slate-700">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    {item.official_phone && (
                      <span className="text-slate-500 block text-[11px]">Phone: {item.official_phone}</span>
                    )}
                  </div>
                </div>

                {/* Attached Documents */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Documentary Evidence ({item.evidence?.length || 0})
                  </span>
                  {item.evidence && item.evidence.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.evidence.map((doc: any) => (
                        <a
                          key={doc.id}
                          href={doc.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-blue-700 hover:bg-blue-50 transition shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-medium">{doc.document_name}</span>
                          <span className="text-[10px] text-slate-400 uppercase">({doc.evidence_type})</span>
                          <ExternalLink className="w-3 h-3 ml-0.5 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium italic">
                      No documentary evidence uploaded yet.
                    </p>
                  )}
                </div>

                {/* Review Actions */}
                {!isVerified && (
                  <div className="pt-2 flex flex-wrap gap-2 justify-end border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item);
                        setActionType("REQUEST_INFO");
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Request Info
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item);
                        setActionType("REJECT");
                      }}
                      className="px-4 py-2 rounded-xl bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Reject Authority
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveItem(item);
                        setActionType("APPROVE");
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                    >
                      Approve Authority
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Action Modal */}
      {activeItem && actionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === "APPROVE" && "Approve Representative Authority"}
                  {actionType === "REJECT" && "Reject Representative Authority"}
                  {actionType === "REQUEST_INFO" && "Request Additional Documentation"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applicant: <strong>{activeItem.user?.name}</strong> • {activeItem.institution?.name} (LGD: {activeItem.institution?.lgd_code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveItem(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {actionType === "REJECT" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Uploaded appointment letter does not bear official gazetted signature or seal."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Official Review Notes & Audit Remarks
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Audit notes recorded permanently in compliance registry..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setActiveItem(null);
                  setActionType(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecision}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition ${
                  actionType === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionType === "REJECT"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
