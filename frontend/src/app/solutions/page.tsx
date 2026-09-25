"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import {
  Lightbulb,
  Search,
  Filter,
  Building2,
  MapPin,
  ArrowRight,
  Sparkles,
  Users,
  Briefcase,
  Clock,
  DollarSign,
  GraduationCap,
  Layers,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Handshake,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import { formatDateSafe } from "../../lib/utils";

interface ProposedSolutionItem {
  id: string;
  title: string;
  executive_summary?: string;
  proposed_approach?: string;
  technical_approach?: string;
  required_capabilities?: string[];
  expected_outcomes?: string;
  expected_social_impact?: string;
  estimated_budget?: number;
  estimated_timeline?: string;
  status: string;
  visibility: string;
  created_at: string;
  published_at?: string;
  proposingOrganization?: {
    id: string;
    name: string;
    organization_type?: string;
    district?: string;
    state?: string;
    institutionProfile?: {
      institution_category?: string;
    };
  };
  challenge?: {
    id: string;
    title: string;
    category?: string;
    district?: string;
    priority?: string;
  };
  teamMembers?: any[];
  collaborations?: any[];
  project?: {
    id: string;
    status: string;
  };
}

export default function OpenSolutionWorkspacePage() {
  const { user } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [solutions, setSolutions] = useState<ProposedSolutionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [domainFilter, setDomainFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [collabTypeFilter, setCollabTypeFilter] = useState<string>("ALL");

  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (domainFilter !== "ALL") params.set("domain", domainFilter);
      if (districtFilter !== "ALL") params.set("district", districtFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (collabTypeFilter !== "ALL") params.set("collaboration_type", collabTypeFilter);

      const res = await fetch(`${apiUrl}/solutions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSolutions(data.items || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error("Failed to load solutions:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, searchTerm, domainFilter, statusFilter, districtFilter, collabTypeFilter]);

  useEffect(() => {
    fetchSolutions();
  }, [fetchSolutions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
      case "COLLABORATION_OPEN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <Handshake className="h-3 w-3" /> Collaboration Open
          </span>
        );
      case "CONVERTED_TO_PROJECT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
            <ShieldCheck className="h-3 w-3" /> Converted to Active Project
          </span>
        );
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3" /> Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
            {status.replace(/_/g, " ")}
          </span>
        );
    }
  };

  const domains = [
    "ALL",
    "Water & Sanitation",
    "Agriculture & Rural Development",
    "Healthcare",
    "Education & Skilling",
    "Infrastructure & Energy",
    "Environment & Forests",
  ];

  const districts = [
    "ALL",
    "Ranchi",
    "East Singhbhum",
    "Dhanbad",
    "Bokaro",
    "Hazaribagh",
    "Ramgarh",
    "Giridih",
    "Deoghar",
    "Bengaluru Urban",
    "Mysuru",
    "Tumakuru",
    "Dharwad",
    "Dakshina Kannada",
  ];

  const collabTypes = [
    { value: "ALL", label: "All Collaboration Types" },
    { value: "FUNDING", label: "Funding / CSR" },
    { value: "MENTORSHIP", label: "Mentorship & Guidance" },
    { value: "PROTOTYPING", label: "Prototyping & Fabrication" },
    { value: "TESTING", label: "Testing & Certification" },
    { value: "TECHNOLOGY", label: "Technical Tools / Software" },
    { value: "PILOT_SUPPORT", label: "Pilot Deployment" },
    { value: "RESEARCH_COLLABORATION", label: "Peer University Research" },
  ];

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Workspace Banner */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Ecosystem Co-Innovation Platform
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Open Solution Workspace
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                Discover university-proposed solutions addressing validated civic challenges.
                Universities, industries, startups, MSMEs, and CSR foundations can collaborate,
                fund, co-develop, and transition innovative ideas into verified field projects.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Link
                href="/challenges"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-800 transition"
              >
                Browse Problems <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {user?.role === "UNIVERSITY_ADMIN" || user?.role === "FACULTY" ? (
                <Link
                  href="/solutions/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition"
                >
                  <PlusCircle className="h-4 w-4" /> Propose Solution
                </Link>
              ) : null}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-stone-100 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block">Published Solutions</span>
              <span className="text-lg font-bold text-stone-900 mt-0.5 block">
                {solutions.length}
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block">Seeking Collaboration</span>
              <span className="text-lg font-bold text-emerald-700 mt-0.5 block">
                {solutions.filter((s) => s.status === "COLLABORATION_OPEN" || s.status === "PUBLISHED").length}
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block">Converted to Projects</span>
              <span className="text-lg font-bold text-blue-700 mt-0.5 block">
                {solutions.filter((s) => s.status === "CONVERTED_TO_PROJECT").length}
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block">Partner Contributions</span>
              <span className="text-lg font-bold text-purple-700 mt-0.5 block">
                {solutions.reduce((acc, s) => acc + (s.collaborations?.length || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search solutions by keyword, technology, university, or problem domain..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-xs text-stone-700 focus:bg-white focus:outline-none"
              >
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d === "ALL" ? "All Domains" : d}
                  </option>
                ))}
              </select>

              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-xs text-stone-700 focus:bg-white focus:outline-none"
              >
                {districts.map((dst) => (
                  <option key={dst} value={dst}>
                    {dst === "ALL" ? "All Districts" : dst}
                  </option>
                ))}
              </select>

              <select
                value={collabTypeFilter}
                onChange={(e) => setCollabTypeFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-xs text-stone-700 focus:bg-white focus:outline-none"
              >
                {collabTypes.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-xs text-stone-700 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="COLLABORATION_OPEN">Open for Collaboration</option>
                <option value="CONVERTED_TO_PROJECT">Active Projects</option>
              </select>
            </div>
          </div>
        </div>

        {/* Solutions Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700 mx-auto" />
            <p className="text-xs text-stone-500 font-medium">Loading Open Solution Workspace...</p>
          </div>
        ) : solutions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
            <Lightbulb className="h-10 w-10 text-stone-400 mx-auto" />
            <h3 className="text-sm font-bold text-stone-900">No Proposed Solutions Found</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              There are no published solutions matching your selected search criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {solutions.map((sol) => {
              const activeOffers = sol.collaborations || [];
              const teamCount = sol.teamMembers?.length || 0;

              return (
                <div
                  key={sol.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2">
                      {getStatusBadge(sol.status)}
                      {sol.challenge?.district && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                          <MapPin className="h-3 w-3 text-stone-400" />
                          {sol.challenge.district}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h2 className="text-base font-bold text-stone-900 leading-snug line-clamp-2 hover:text-emerald-800 transition">
                        <Link href={`/solutions/${sol.id}`}>{sol.title}</Link>
                      </h2>

                      {/* Addressed Challenge */}
                      {sol.challenge && (
                        <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                          Problem: <strong className="text-stone-700">{sol.challenge.title}</strong>
                        </p>
                      )}
                    </div>

                    {/* Proposing University */}
                    <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200/50">
                      <GraduationCap className="h-4 w-4 text-emerald-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">
                          {sol.proposingOrganization?.name || "University"}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {sol.proposingOrganization?.district || "Jharkhand"}
                        </p>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                      {sol.executive_summary || sol.proposed_approach || "Detailed solution proposal submitted for cross-sector collaboration."}
                    </p>

                    {/* Required Capabilities Tags */}
                    {sol.required_capabilities && sol.required_capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sol.required_capabilities.slice(0, 3).map((cap, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-stone-100 text-stone-700 px-2 py-0.5 text-[10px] font-medium"
                          >
                            {cap}
                          </span>
                        ))}
                        {sol.required_capabilities.length > 3 && (
                          <span className="text-[10px] text-stone-400">
                            +{sol.required_capabilities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-stone-100 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-stone-400" />
                        {teamCount} Team Member{teamCount === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Handshake className="h-3.5 w-3.5 text-emerald-600" />
                        {activeOffers.length} Collaboration{activeOffers.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {sol.estimated_budget ? (
                        <span className="text-xs font-bold text-stone-900">
                          ₹{Number(sol.estimated_budget).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-medium">Budget in proposal</span>
                      )}

                      <Link
                        href={`/solutions/${sol.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
                      >
                        Explore Solution <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
