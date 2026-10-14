"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  Users,
  Award,
  Sparkles,
  MapPin,
  HeartHandshake,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Sprout,
  Stethoscope,
  Zap,
  BookOpen,
  Truck,
  Clock,
  FileCheck2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useTranslation } from "../lib/i18n";

interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  district: string;
  districtName: string;
  blockName: string | null;
  village_locality: string | null;
  citizen_severity: "NOT_SURE" | "MODERATE" | "SERIOUS" | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "VALIDATED";
  created_at: string;
  confirmationsCount: number;
  evidenceCount: number;
  submitter?: { name: string };
}

export default function Home() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  useEffect(() => {
    let isMounted = true;
    const loadChallenges = async () => {
      try {
        setLoadingChallenges(true);
        const res = await fetch(`${apiUrl}/challenges?limit=6`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setChallenges(data.items || []);
          }
        }
      } catch (err) {
        console.warn("Failed to load featured challenges:", err);
      } finally {
        if (isMounted) setLoadingChallenges(false);
      }
    };
    loadChallenges();
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-700" /> {t("status.validated", "Validated")}
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <Clock className="h-3 w-3 text-amber-700" /> {t("status.under_review", "Under Review")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
            <FileCheck2 className="h-3 w-3 text-blue-700" /> {t("status.submitted", "Submitted")}
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
            {t("common.high_severity", "High Severity")}
          </span>
        );
      case "MODERATE":
        return (
          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            {t("common.moderate_severity", "Moderate")}
          </span>
        );
      default:
        return (
          <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
            {t("common.unspecified_severity", "Unspecified")}
          </span>
        );
    }
  };

  const problemDomains = [
    {
      title: t("domains.water", "Water & Sanitation"),
      description: t("domains.water_desc", "Pipeline contamination, drinking water filtration, rural aquifer restoration, and drainage mitigation."),
      icon: Droplets,
      dotColor: "bg-cyan-500",
      accent: "text-cyan-700 bg-cyan-50 border-cyan-200",
    },
    {
      title: t("domains.agriculture", "Agriculture & Soil Resilience"),
      description: t("domains.agriculture_desc", "Drought-resilient seeds, soil nutrient diagnostics, precision irrigation, and post-harvest storage."),
      icon: Sprout,
      dotColor: "bg-emerald-500",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: t("domains.healthcare", "Rural Healthcare & Telemetry"),
      description: t("domains.healthcare_desc", "Primary health center connectivity, maternal health diagnostics, and emergency logistics."),
      icon: Stethoscope,
      dotColor: "bg-rose-500",
      accent: "text-rose-700 bg-rose-50 border-rose-200",
    },
    {
      title: t("domains.energy", "Clean Energy & Biomass"),
      description: t("domains.energy_desc", "Decentralized solar microgrids, agricultural biomass briquetting, and clean cooking technology."),
      icon: Zap,
      dotColor: "bg-amber-500",
      accent: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: t("domains.skills", "Vocational Skills & Livelihood"),
      description: t("domains.skills_desc", "Tribal craft mechanization, youth technical skills, agro-processing, and local entrepreneurship."),
      icon: BookOpen,
      dotColor: "bg-blue-500",
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      title: t("domains.infrastructure", "Public Infrastructure & Roads"),
      description: t("domains.infrastructure_desc", "Monsoon culvert erosion, solar cold-storage transit, and bridge durability testing."),
      icon: Truck,
      dotColor: "bg-purple-500",
      accent: "text-purple-700 bg-purple-50 border-purple-200",
    },
  ];

  const workflowSteps = [
    {
      number: "01",
      title: t("home.step1_title", "Grassroots Problem Intake"),
      description: t("home.step1_desc", "Citizens, village panchayats, and community leaders document verified societal challenges with photos and location telemetry."),
      icon: Users,
    },
    {
      number: "02",
      title: t("home.step2_title", "AI Problem Decomposition"),
      description: t("home.step2_desc", "Advanced AI models structure problems, assess impact severity, and map required technical competencies to the Master Taxonomy."),
      icon: Sparkles,
    },
    {
      number: "03",
      title: t("home.step3_title", "Capability Passport Matching"),
      description: t("home.step3_desc", "Hybrid matching engine connects verified universities, specialized laboratories, and startups based on real capacity."),
      icon: Award,
    },
    {
      number: "04",
      title: t("home.step4_title", "Transparent Governance & Action"),
      description: t("home.step4_desc", "District officers and platform reviewers validate proposals, track verified milestones, and coordinate civic implementation."),
      icon: ShieldCheck,
    },
  ];

  const participantRoles = [
    {
      title: t("home.role_citizen_title", "Citizens & Communities"),
      description: t("home.role_citizen_desc", "Report real problems from your district. Validate shared community issues and track progress toward solutions."),
      cta: t("home.role_citizen_cta", "Report a Problem"),
      href: "/challenges/new",
      icon: Users,
      badge: t("home.role_citizen_badge", "Grassroots Voice"),
    },
    {
      title: t("home.role_university_title", "Universities & Researchers"),
      description: t("home.role_university_desc", "Bring faculty expertise, specialized laboratory equipment, and student innovators to solve prioritized regional challenges."),
      cta: t("home.role_university_cta", "Access Capability Passport"),
      href: "/login",
      icon: GraduationCap,
      badge: t("home.role_university_badge", "R&D Capacity"),
    },
    {
      title: t("home.role_industry_title", "Industry, Startups & MSMEs"),
      description: t("home.role_industry_desc", "Deploy technical capabilities, manufacture prototypes, offer mentorship, or direct CSR support where it matters most."),
      cta: t("home.role_industry_cta", "Onboard Institution"),
      href: "/organizations/onboard",
      icon: Building2,
      badge: t("home.role_industry_badge", "Enterprise & Scale"),
    },
    {
      title: t("home.role_government_title", "Government & District Officers"),
      description: t("home.role_government_desc", "Review citizen problem submissions under official jurisdiction, authenticate priorities, and oversee collaborative outcomes."),
      cta: t("home.role_government_cta", "Reviewer Queue"),
      href: "/reviewer-queue",
      icon: ShieldCheck,
      badge: t("home.role_government_badge", "Public Accountability"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col">
      {/* 1. Warm Ambient Civic Hero Section */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-[#FFF7EA] via-[#FAF9F6] to-[#FAF9F6] py-16 sm:py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/70 border border-amber-300/80 text-amber-900 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span>{t("home.badge", "Government of Jharkhand · Societal Innovation Collaboration Platform")}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.12]">
                {t("home.hero_title_1", "Real Problems.")} <br />
                {t("home.hero_title_2", "Real People.")} <br />
                <span className="text-emerald-800 underline decoration-amber-400 decoration-wavy decoration-2 underline-offset-8">
                  {t("home.hero_title_3", "Real Solutions.")}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed">
                {t("home.hero_desc", "ResolvIN bridges the gap between grassroots community challenges and the universities, research laboratories, industries, and startups equipped with the verified capabilities to solve them.")}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2">
                <Link
                  href="/challenges/new"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition-all shadow-emerald-950/10 text-center"
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <span>{t("home.report_problem_cta", "Report a Problem")}</span>
                </Link>

                <Link
                  href="/challenges"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 transition-all text-center"
                >
                  <Compass className="h-4 w-4 text-stone-500 shrink-0" />
                  <span>{t("home.explore_challenges_cta", "Explore Challenges")}</span>
                </Link>
              </div>

              {/* Citizen Trust Notice */}
              <div className="flex items-center gap-2 pt-2 text-xs text-stone-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{t("home.trust_notice", "Open to all citizens, village panchayats, research faculties, and industrial partners.")}</span>
              </div>
            </div>

            {/* Right Visual Composition */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-tr from-amber-100 via-emerald-50 to-teal-50 border border-amber-200/80 p-6 flex flex-col justify-between shadow-lg shadow-amber-950/5">
                {/* Decorative Circular Focal Frame */}
                <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-amber-200/50 blur-xl pointer-events-none" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-emerald-200/50 blur-xl pointer-events-none" />

                {/* Top Badge Card */}
                <div className="p-4 rounded-2xl bg-white/95 border border-stone-200 shadow-sm backdrop-blur-sm space-y-1 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      {t("home.grassroots_impact", "Grassroots Impact")}
                    </span>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-stone-900">
                    Birsa Agricultural University · Drought Resilience Lab
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Matched to Bokaro groundwater salinity and soil degradation challenge.
                  </p>
                </div>

                {/* Center Visual Emblem: RI Monogram for ResolvIN */}
                <div className="my-auto text-center space-y-3 z-10">
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-emerald-700 to-teal-900 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 text-3xl font-extrabold border-4 border-white">
                    RI
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">{t("home.grid_title", "Jharkhand Civic Innovation Grid")}</h3>
                    <p className="text-xs text-stone-600">{t("home.grid_desc", "Connecting 24 Districts with Verified Research Labs")}</p>
                  </div>
                </div>

                {/* Bottom Trust Badge */}
                <div className="p-3.5 rounded-2xl bg-white/95 border border-stone-200 shadow-sm backdrop-blur-sm flex items-center justify-between text-xs z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <span className="font-semibold text-stone-800">{t("home.statewide_capacity", "Statewide Verified Capacity")}</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {t("home.audited_badge", "100% Audited")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Social Impact Metrics Bar */}
      <section className="border-b border-stone-200 bg-white py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-800">24</div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t("home.metric_districts", "Districts Covered in Jharkhand")}</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-stone-900">100+</div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t("home.metric_labs", "Verified Research Labs & Startups")}</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-700">40+</div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t("home.metric_passports", "Active Capability Passports")}</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-teal-800">100%</div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t("home.metric_review", "Transparent Government Review")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Innovation Engine: 4-Step Ecosystem Workflow */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-b border-stone-200 bg-[#FAF9F6]">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-300">
              {t("home.pipeline_badge", "The Collaboration Pipeline")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
              {t("home.how_it_works", "How ResolvIN Works")}
            </h2>
            <p className="text-sm text-stone-600">
              {t("home.how_it_works_desc", "A transparent, accountable workflow transforming unstructured citizen reports into validated institutional research and community deployment.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="civic-card p-6 flex flex-col justify-between space-y-4 hover:border-stone-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-amber-600 font-mono">
                        {step.number}
                      </span>
                      <div className="h-9 w-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-stone-900">{step.title}</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Priority Societal Challenges & Thematic Research Domains */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl space-y-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-100 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  {t("home.domains_badge", "Regional Priorities")}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-stone-500 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                  {t("home.across_jharkhand", "Across Jharkhand (24 Districts)")}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
                {t("home.domains_title", "Priority Societal Challenges")}
              </h2>
              <p className="text-sm sm:text-base text-stone-600 max-w-2xl leading-relaxed">
                {t("home.domains_desc", "Explore real grassroots problems submitted by citizens across Jharkhand, verified by district nodal officers and open for institutional research.")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/challenges/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{t("challenges.report_problem_btn", "Report Problem")}</span>
              </Link>
              <Link
                href="/challenges"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-stone-300 hover:bg-stone-50 text-stone-800 shadow-2xs transition"
              >
                <span>{t("home.view_full_directory", "Full Directory")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Live Recent Challenges Showcase */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">{t("home.recent_challenges_title", "Recently Reported in Jharkhand")}</h3>
                  <p className="text-xs text-stone-500">{t("home.recent_challenges_sub", "Live feed of grassroots civic issues submitted by citizens")}</p>
                </div>
              </div>
              <Link
                href="/challenges"
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1 self-start sm:self-auto"
              >
                {t("home.view_all", "View all")} ({challenges.length}+) <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loadingChallenges ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-56 rounded-2xl bg-white border border-stone-200 animate-pulse p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-stone-200 rounded w-24"></div>
                      <div className="h-4 bg-stone-100 rounded w-16"></div>
                    </div>
                    <div className="h-5 bg-stone-200 rounded w-4/5"></div>
                    <div className="h-16 bg-stone-100 rounded w-full"></div>
                    <div className="h-4 bg-stone-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : challenges.length === 0 ? (
              <div className="p-10 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 text-center space-y-3">
                <AlertCircle className="h-9 w-9 text-stone-400 mx-auto" />
                <h4 className="text-base font-semibold text-stone-800">{t("challenges.no_challenges_found", "No active challenges found")}</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {t("challenges.no_challenges_desc", "Be the first to report a grassroots problem in your district so universities and local officers can act.")}
                </p>
                <div className="pt-2">
                  <Link
                    href="/challenges/new"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>{t("home.report_problem_cta", "Report a Problem")}</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {challenges.slice(0, 6).map((challenge) => (
                  <div
                    key={challenge.id}
                    className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {getStatusBadge(challenge.status)}
                        {getSeverityBadge(challenge.citizen_severity)}
                      </div>

                      <Link href={`/challenges/${challenge.id}`}>
                        <h4 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug break-words">
                          {challenge.title}
                        </h4>
                      </Link>

                      <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed break-words">
                        {challenge.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 pt-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        <span className="font-semibold text-stone-800">
                          {challenge.districtName || challenge.district}
                        </span>
                        {challenge.blockName && (
                          <>
                            <span>·</span>
                            <span>{challenge.blockName} {t("challenges.block", "Block")}</span>
                          </>
                        )}
                        {challenge.village_locality && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[140px]">{challenge.village_locality}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4 mt-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium bg-stone-50 text-stone-700 border border-stone-200"
                          title="Community Confirmations"
                        >
                          <HeartHandshake className="h-3.5 w-3.5 text-emerald-700" />
                          <span>{t("challenges.confirmed_count", "{count} confirmed", { count: challenge.confirmationsCount || 0 })}</span>
                        </span>
                        {challenge.evidenceCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200"
                            title="Evidence Attached"
                          >
                            <ImageIcon className="h-3.5 w-3.5 text-stone-500" />
                            <span>{challenge.evidenceCount}</span>
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/challenges/${challenge.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 group/link"
                      >
                        <span>{t("common.details", "Details")}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regional Thematic Research Domains Grid */}
          <div className="space-y-6 pt-6 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-700" />
              <h3 className="text-base sm:text-lg font-bold text-stone-900">{t("home.domains_explore_title", "Explore by Thematic Research Domain")}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {problemDomains.map((domain, idx) => {
                const Icon = domain.icon;
                return (
                  <div
                    key={idx}
                    className="civic-card p-6 space-y-4 hover:border-stone-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${domain.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                        <span className={`h-2 w-2 rounded-full ${domain.dotColor}`} />
                        <span>{t("home.active_focus", "Active Focus")}</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                        {domain.title}
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {domain.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100">
                      <Link
                        href={`/challenges?domain=${encodeURIComponent(domain.title)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900"
                      >
                        <span>{t("home.explore_domain", "Explore Challenges")}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Role-Based Participation Framework */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#FAF9F6] border-b border-stone-200">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {t("home.participation_badge", "Multi-Stakeholder Participation")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
              {t("home.participation_title", "How Will You Participate?")}
            </h2>
            <p className="text-sm text-stone-600">
              {t("home.participation_desc", "ResolvIN provides dedicated workspaces tailored to your institutional role and societal responsibility.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {participantRoles.map((role, idx) => {
              const Icon = role.icon;
              return (
                <div
                  key={idx}
                  className="civic-card p-6 flex flex-col justify-between space-y-6 hover:border-stone-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800">
                        <Icon className="h-5 w-5 text-emerald-800" />
                      </div>
                      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                        {role.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-stone-900">{role.title}</h3>
                      <p className="text-xs text-stone-600 leading-relaxed">{role.description}</p>
                    </div>
                  </div>

                  <Link
                    href={role.href}
                    className="inline-flex items-center justify-between w-full p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 transition-colors"
                  >
                    <span>{role.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Dignified Civic Footer */}
      <footer className="bg-stone-900 text-stone-300 py-12 px-4 sm:px-6 text-xs">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <div className="h-7 w-7 rounded-lg bg-emerald-700 flex items-center justify-center text-xs font-black">
                RI
              </div>
              <span>ResolvIN</span>
            </div>
            <p className="text-stone-400 text-xs max-w-sm leading-relaxed">
              {t("home.footer_desc", "An initiative supported by the Government of Jharkhand to connect grassroots citizen problems with higher education institutions, specialized laboratories, and enterprise innovators.")}
            </p>
            <p className="text-stone-500 text-[11px]">
              {t("home.footer_hackathon", "Built for Smart India Hackathon (SIH) and public societal impact deployment.")}
            </p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <p className="text-white font-bold uppercase tracking-wider text-[11px]">{t("home.footer_platform", "Platform")}</p>
            <ul className="space-y-1.5 text-stone-400">
              <li><Link href="/challenges" className="hover:text-white transition-colors">{t("challenges.title", "Challenges Directory")}</Link></li>
              <li><Link href="/challenges/new" className="hover:text-white transition-colors">{t("challenges.report_problem_btn", "Report a Problem")}</Link></li>
              <li><Link href="/organizations/onboard" className="hover:text-white transition-colors">{t("nav.onboard_institution", "Onboard Institution")}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2">
            <p className="text-white font-bold uppercase tracking-wider text-[11px]">{t("home.footer_stakeholders", "Stakeholders")}</p>
            <ul className="space-y-1.5 text-stone-400">
              <li><Link href="/login" className="hover:text-white transition-colors">{t("auth.citizen_title", "Citizen Portal")}</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">{t("auth.university_title", "University Portal")}</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">{t("auth.industry_title", "Industry Portal")}</Link></li>
              <li><Link href="/reviewer-queue" className="hover:text-white transition-colors">{t("nav.reviewer_queue", "Reviewer Queue")}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <p className="text-white font-bold uppercase tracking-wider text-[11px]">{t("home.footer_governance", "Governance & Trust")}</p>
            <p className="text-stone-400 text-xs leading-relaxed">
              {t("home.footer_governance_text", "All problem submissions are subject to district reviewer validation. AI matching inferences are provided as decision support for human reviewers.")}
            </p>
            <div className="pt-2 text-stone-500 text-[11px]">
              {t("home.footer_copyright", "© 2026 ResolvIN. All rights reserved.")}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
