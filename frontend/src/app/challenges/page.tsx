"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import {
  Search,
  MapPin,
  HeartHandshake,
  FileCheck2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  ArrowRight,
  Filter,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  professional_title?: string | null;
  professional_problem_statement?: string | null;
  refinement_status?: string | null;
  refined_at?: string | null;
  district: string;
  districtName: string;
  blockName: string | null;
  village_locality: string | null;
  citizen_severity: "NOT_SURE" | "MODERATE" | "SERIOUS" | null;
  affected_population: string | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "VALIDATED";
  created_at: string;
  submitted_at: string;
  evidenceCount: number;
  confirmationsCount: number;
  hasConfirmed: boolean;
  submitter: { name: string };
}

interface DistrictOption {
  id: string;
  name: string;
}

export default function ChallengesPage() {
  const { user, token } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  // Load districts for filter
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const res = await fetch(`${apiUrl}/locations/districts`);
        if (res.ok) {
          const data = await res.json();
          setDistricts(data);
        }
      } catch (err) {
        console.error("Failed to load districts:", err);
      }
    };
    fetchDistricts();
  }, [apiUrl]);

  // Fetch challenges
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (selectedDistrict) params.append("district_id", selectedDistrict);
      if (selectedStatus) params.append("status", selectedStatus);

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/challenges?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch challenges:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, searchTerm, selectedDistrict, selectedStatus, token]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchChallenges();
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [fetchChallenges]);

  // Handle community confirmation toggle
  const handleToggleConfirm = async (challenge: ChallengeItem) => {
    if (!token) {
      alert("Please log in to confirm that you also experience this problem.");
      return;
    }

    setConfirmingId(challenge.id);
    try {
      const method = challenge.hasConfirmed ? "DELETE" : "POST";
      const res = await fetch(`${apiUrl}/challenges/${challenge.id}/confirm`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setChallenges((prev) =>
          prev.map((c) =>
            c.id === challenge.id
              ? {
                  ...c,
                  hasConfirmed: !c.hasConfirmed,
                  confirmationsCount: data.confirmationsCount,
                }
              : c,
          ),
        );
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to update confirmation.");
      }
    } catch (err: any) {
      console.error("Confirmation error:", err);
    } finally {
      setConfirmingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-700" /> Validated
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <Clock className="h-3 w-3 text-amber-700" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
            <FileCheck2 className="h-3 w-3 text-blue-700" /> Submitted
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null;
    switch (severity) {
      case "SERIOUS":
        return (
          <span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700">
            High Severity
          </span>
        );
      case "MODERATE":
        return (
          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Moderate
          </span>
        );
      default:
        return (
          <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
            Unspecified
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Societal Challenges
            </h1>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Grassroots Directory
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600 max-w-2xl">
            Real problems reported directly by citizens and communities across Jharkhand. Community confirmations help elevate shared regional concerns for institutional research.
          </p>
        </div>

        <Link
          href="/challenges/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all self-start md:self-auto"
        >
          <span>Report a Problem</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search problems, descriptions, or localities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-9 pr-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600/20"
          />
        </div>

        {/* District Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600/20"
          >
            <option value="">All Districts (Jharkhand)</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600/20"
          >
            <option value="">All Statuses</option>
            <option value="VALIDATED">Validated Only</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
        </div>
      </div>

      {/* Challenge Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-white border border-stone-200 animate-pulse p-5 space-y-3 shadow-xs"
            >
              <div className="h-4 bg-stone-200 rounded w-3/4"></div>
              <div className="h-3 bg-stone-100 rounded w-1/2"></div>
              <div className="h-16 bg-stone-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-stone-300 bg-white space-y-4 shadow-xs">
          <AlertCircle className="mx-auto h-10 w-10 text-stone-400" />
          <h3 className="text-base font-semibold text-stone-900">No challenges found</h3>
          <p className="text-xs text-stone-600 max-w-sm mx-auto">
            No societal challenges match your current search and filter criteria. Try adjusting your filters or report a new problem.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDistrict("");
                setSelectedStatus("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition"
            >
              Clear Filters
            </button>
            <Link
              href="/challenges/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-xs transition"
            >
              Report Problem
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
            >
              {/* Header: Status & Severity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(challenge.status)}
                  {getSeverityBadge(challenge.citizen_severity)}
                </div>

                {/* Title */}
                <div>
                  {challenge.professional_title && challenge.professional_title !== challenge.title && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mb-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-indigo-600" /> Refined Problem
                    </span>
                  )}
                  <Link href={`/challenges/${challenge.id}`}>
                    <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug break-words">
                      {challenge.professional_title || challenge.title}
                    </h3>
                  </Link>
                </div>

                {/* Description snippet */}
                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed break-words">
                  {challenge.professional_problem_statement || challenge.description}
                </p>

                {/* Location Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 pt-1 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span className="font-semibold text-stone-800 break-words">
                    {challenge.districtName}
                  </span>
                  {challenge.blockName && (
                    <>
                      <span>·</span>
                      <span className="break-words">{challenge.blockName} Block</span>
                    </>
                  )}
                  {challenge.village_locality && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[160px]">
                        {challenge.village_locality}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Footer: Evidence, Confirmations & Details */}
              <div className="border-t border-stone-100 pt-4 mt-5 flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  {/* Community Confirmation Button */}
                  <button
                    onClick={() => handleToggleConfirm(challenge)}
                    disabled={confirmingId === challenge.id}
                    title="I experience this problem too"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      challenge.hasConfirmed
                        ? "bg-emerald-700 text-white border border-emerald-700 shadow-xs"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200"
                    }`}
                  >
                    <HeartHandshake className="h-3.5 w-3.5" />
                    <span>{challenge.confirmationsCount}</span>
                  </button>

                  {/* Evidence indicator */}
                  {challenge.evidenceCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-[11px] text-stone-600 border border-stone-200 font-medium">
                      <ImageIcon className="h-3 w-3 text-stone-500" />
                      {challenge.evidenceCount}
                    </span>
                  )}
                </div>

                {/* View Details Link */}
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 group/link shrink-0"
                >
                  <span>Details</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
