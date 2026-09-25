"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import {
  FolderHeart,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  FileCheck2,
  AlertTriangle,
  HeartHandshake,
  ArrowRight,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { formatDateSafe } from "../../lib/utils";

interface UserChallenge {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "VALIDATED" | "REJECTED";
  districtName: string;
  blockName: string | null;
  village_locality: string | null;
  citizen_severity: string | null;
  affected_population: string | null;
  created_at: string;
  submitted_at: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  evidenceCount: number;
  confirmationsCount: number;
}

export default function MyChallengesPage() {
  const { user, token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMyChallenges = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/challenges/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges(data);
      }
    } catch (err) {
      console.error("Failed to load user challenges:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    fetchMyChallenges();
  }, [fetchMyChallenges]);

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this draft and all uploaded evidence?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`${apiUrl}/challenges/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setChallenges((prev) => prev.filter((c) => c.id !== id));
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to delete draft.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Validated
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <Clock className="h-3 w-3 text-amber-600" /> Under Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
            <AlertTriangle className="h-3 w-3 text-red-600" /> Rejected
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
            <FileCheck2 className="h-3 w-3 text-blue-600" /> Submitted
          </span>
        );
    }
  };

  if (!user && !loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Sign In Required</h2>
        <p className="text-xs text-stone-600 max-w-sm mx-auto">
          Please log in to track your submitted community problems and manage your ongoing drafts.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const filtered = challenges.filter((c) => {
    if (filterTab === "ALL") return true;
    return c.status === filterTab;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 flex items-center gap-2.5">
            <FolderHeart className="h-7 w-7 text-emerald-700" />
            My Reported Challenges
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Track administrative verification progress of problems you reported, or continue working on drafts.
          </p>
        </div>

        <Link
          href="/challenges/new"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm self-start sm:self-auto transition"
        >
          <PlusCircle className="h-4 w-4" /> Report New Problem
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-xs">
        {[
          { key: "ALL", label: "All" },
          { key: "DRAFT", label: "Drafts" },
          { key: "SUBMITTED", label: "Submitted" },
          { key: "UNDER_REVIEW", label: "Under Review" },
          { key: "VALIDATED", label: "Validated" },
          { key: "REJECTED", label: "Rejected" },
        ].map((tab) => {
          const count = challenges.filter((c) => (tab.key === "ALL" ? true : c.status === tab.key)).length;
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs"
                  : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-xs text-stone-500">Loading your challenges...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
          <p className="text-xs text-stone-500">No challenges found in this filter.</p>
          <Link
            href="/challenges/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Report your first problem <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(item.status)}
                  <span className="text-[11px] text-stone-500">
                    Created {formatDateSafe(item.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {item.status !== "DRAFT" && (
                    <span className="flex items-center gap-1 text-xs text-stone-600 font-medium">
                      <HeartHandshake className="h-3.5 w-3.5 text-emerald-700" />
                      {item.confirmationsCount} confirmation(s)
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-bold text-stone-900 break-words">{item.title}</h3>
                <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed break-words">
                  {item.description}
                </p>
              </div>

              <div className="text-[11px] text-stone-500 break-words">
                <span>Location: </span>
                <span className="text-stone-800 font-medium">
                  {item.districtName}
                  {item.blockName && ` · ${item.blockName} Block`}
                  {item.village_locality && ` · ${item.village_locality}`}
                </span>
              </div>

              {item.status === "REJECTED" && item.rejection_reason && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 break-words">
                  <span className="font-bold text-red-950">Rejection Reason:</span>{" "}
                  {item.rejection_reason}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-stone-100">
                {item.status === "DRAFT" ? (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Link
                      href={`/challenges/new?draftId=${item.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition flex-1 sm:flex-none text-center"
                    >
                      <Edit3 className="h-3.5 w-3.5 shrink-0" /> Continue Editing
                    </Link>
                    <button
                      onClick={() => handleDeleteDraft(item.id)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50 flex-1 sm:flex-none text-center"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete Draft
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/challenges/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-1"
                    >
                      <span>View Public Page</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>

                    {item.status !== "REJECTED" && (
                      <Link
                        href={`/challenges/${item.id}/forum`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition shadow-2xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Communication Forum</span>
                      </Link>
                    )}
                  </div>
                )}

                <span className="text-[11px] font-mono text-stone-400 self-end sm:self-auto shrink-0">
                  Ref: {item.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
