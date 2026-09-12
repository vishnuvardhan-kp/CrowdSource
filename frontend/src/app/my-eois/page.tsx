"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import {
  FolderKanban,
  Building2,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Edit3,
} from "lucide-react";
import { formatDateSafe } from "../../lib/utils";

export default function MyEoisPage() {
  const { user, token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [eois, setEois] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchEois = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/eois/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEois(data);
      }
    } catch (err) {
      console.error("Failed to load EOIs:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    fetchEois();
  }, [fetchEois]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="rounded-full bg-stone-100 text-stone-700 px-2.5 py-0.5 text-[11px] font-bold border border-stone-200">Draft</span>;
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[11px] font-bold border border-blue-200">Under review</span>;
      case "DISCUSSION_REQUIRED":
        return <span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold border border-amber-300">Changes requested</span>;
      case "ACCEPTED":
        return <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-300">Accepted</span>;
      case "REJECTED":
        return <span className="rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-[11px] font-bold border border-red-200">Not accepted</span>;
      case "WITHDRAWN":
        return <span className="rounded-full bg-stone-100 text-stone-500 px-2.5 py-0.5 text-[11px] font-bold border border-stone-200">Withdrawn</span>;
      case "PROJECT_FORMED":
        return <span className="rounded-full bg-teal-50 text-teal-800 px-2.5 py-0.5 text-[11px] font-bold border border-teal-300">Collaboration formed</span>;
      default:
        return <span className="rounded-full bg-stone-100 text-stone-700 px-2.5 py-0.5 text-[11px] font-bold">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16 flex flex-col items-center justify-center text-stone-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-sm">Loading Expressions of Interest...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-emerald-700" />
              <h1 className="text-xl font-bold text-stone-900">
                Expressions of Interest (EOIs)
              </h1>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Track your organization&apos;s collaborative proposals for validated societal challenges.
            </p>
          </div>

          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
          >
            Explore Open Challenges <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* EOI List */}
        {eois.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3">
            <Building2 className="h-10 w-10 text-stone-400 mx-auto" />
            <h3 className="text-sm font-bold text-stone-800">No Expressions of Interest Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Your organization has not yet expressed interest in any challenge. Explore open challenges to collaborate with other HEIs and industry partners.
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition mt-2"
            >
              Browse Validated Challenges
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {eois.map((eoi) => (
              <div
                key={eoi.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 hover:border-emerald-300 hover:shadow-xs transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(eoi.status)}
                    <span className="text-xs text-stone-500">
                      Organization: <strong className="text-stone-800">{eoi.organization?.name}</strong>
                    </span>
                  </div>

                  <span className="text-[11px] text-stone-400">
                    Created {formatDateSafe(eoi.created_at)}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-900">
                    {eoi.challenge?.title || "Societal Challenge"}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2">
                    {eoi.proposed_approach || eoi.motivation || "No proposal summary provided."}
                  </p>
                </div>

                {eoi.contributions && eoi.contributions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {eoi.contributions.map((c: any, idx: number) => (
                      <span
                        key={idx}
                        className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600"
                      >
                        {c.contribution_type.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-[11px] text-stone-500">
                    {eoi.status === "DISCUSSION_REQUIRED" && (
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Action required: reviewer requested discussion
                      </span>
                    )}
                    {eoi.status === "PROJECT_FORMED" && (
                      <span className="text-teal-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Bundled into collaborative project
                      </span>
                    )}
                  </span>

                  <Link
                    href={`/challenges/${eoi.challenge_id}/eoi`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    Manage EOI <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
