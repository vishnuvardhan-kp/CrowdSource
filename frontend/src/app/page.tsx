"use client";

import React from "react";
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
} from "lucide-react";
import { useAuth } from "../lib/auth-context";

export default function Home() {
  const { user } = useAuth();

  const problemDomains = [
    {
      title: "Water & Sanitation",
      description: "Pipeline contamination, drinking water filtration, rural aquifer restoration, and drainage mitigation.",
      icon: Droplets,
      dotColor: "bg-cyan-500",
      accent: "text-cyan-700 bg-cyan-50 border-cyan-200",
    },
    {
      title: "Agriculture & Soil Resilience",
      description: "Drought-resilient seeds, soil nutrient diagnostics, precision irrigation, and post-harvest storage.",
      icon: Sprout,
      dotColor: "bg-emerald-500",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Rural Healthcare & Telemetry",
      description: "Primary health center connectivity, maternal health diagnostics, and emergency logistics.",
      icon: Stethoscope,
      dotColor: "bg-rose-500",
      accent: "text-rose-700 bg-rose-50 border-rose-200",
    },
    {
      title: "Clean Energy & Biomass",
      description: "Decentralized solar microgrids, agricultural biomass briquetting, and clean cooking technology.",
      icon: Zap,
      dotColor: "bg-amber-500",
      accent: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: "Vocational Skills & Livelihood",
      description: "Tribal craft mechanization, youth technical skills, agro-processing, and local entrepreneurship.",
      icon: BookOpen,
      dotColor: "bg-blue-500",
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      title: "Public Infrastructure & Roads",
      description: "Monsoon culvert erosion, solar cold-storage transit, and bridge durability testing.",
      icon: Truck,
      dotColor: "bg-purple-500",
      accent: "text-purple-700 bg-purple-50 border-purple-200",
    },
  ];

  const workflowSteps = [
    {
      number: "01",
      title: "Grassroots Problem Intake",
      description: "Citizens, village panchayats, and community leaders document verified societal challenges with photos and location telemetry.",
      icon: Users,
    },
    {
      number: "02",
      title: "AI Problem Decomposition",
      description: "Advanced AI models structure problems, assess impact severity, and map required technical competencies to the Master Taxonomy.",
      icon: Sparkles,
    },
    {
      number: "03",
      title: "Capability Passport Matching",
      description: "Hybrid matching engine connects verified universities, specialized laboratories, and startups based on real capacity.",
      icon: Award,
    },
    {
      number: "04",
      title: "Transparent Governance & Action",
      description: "District officers and platform reviewers validate proposals, track verified milestones, and coordinate civic implementation.",
      icon: ShieldCheck,
    },
  ];

  const participantRoles = [
    {
      title: "Citizens & Communities",
      description: "Report real problems from your district. Validate shared community issues and track progress toward solutions.",
      cta: "Report a Problem",
      href: "/challenges/new",
      icon: Users,
      badge: "Grassroots Voice",
    },
    {
      title: "Universities & Researchers",
      description: "Bring faculty expertise, specialized laboratory equipment, and student innovators to solve prioritized regional challenges.",
      cta: "Access Capability Passport",
      href: "/login",
      icon: GraduationCap,
      badge: "R&D Capacity",
    },
    {
      title: "Industry, Startups & MSMEs",
      description: "Deploy technical capabilities, manufacture prototypes, offer mentorship, or direct CSR support where it matters most.",
      cta: "Onboard Institution",
      href: "/organizations/onboard",
      icon: Building2,
      badge: "Enterprise & Scale",
    },
    {
      title: "Government & District Officers",
      description: "Review citizen problem submissions under official jurisdiction, authenticate priorities, and oversee collaborative outcomes.",
      cta: "Reviewer Queue",
      href: "/reviewer-queue",
      icon: ShieldCheck,
      badge: "Public Accountability",
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
                <span>Government of Jharkhand · Societal Innovation Collaboration Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.12]">
                Real Problems. <br />
                Real People. <br />
                <span className="text-emerald-800 underline decoration-amber-400 decoration-wavy decoration-2 underline-offset-8">
                  Real Solutions.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed">
                SamadhanSetu bridges the gap between grassroots community challenges and the universities, research laboratories, industries, and startups equipped with the verified capabilities to solve them.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/challenges/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition-all shadow-emerald-950/10"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Report a Problem</span>
                </Link>

                <Link
                  href="/challenges"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 transition-all"
                >
                  <Compass className="h-4 w-4 text-stone-500" />
                  <span>Explore Challenges</span>
                </Link>
              </div>

              {/* Citizen Trust Notice */}
              <div className="flex items-center gap-2 pt-2 text-xs text-stone-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Open to all citizens, village panchayats, research faculties, and industrial partners.</span>
              </div>
            </div>

            {/* Right Visual Composition (Inspired by Positive Citizens Foundation & Studify) */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-tr from-amber-100 via-emerald-50 to-teal-50 border border-amber-200/80 p-6 flex flex-col justify-between shadow-lg shadow-amber-950/5">
                {/* Decorative Circular Focal Frame */}
                <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-amber-200/50 blur-xl pointer-events-none" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-emerald-200/50 blur-xl pointer-events-none" />

                {/* Top Badge Card */}
                <div className="p-4 rounded-2xl bg-white/95 border border-stone-200 shadow-sm backdrop-blur-sm space-y-1 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Grassroots Impact
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

                {/* Center Visual Emblem */}
                <div className="my-auto text-center space-y-3 z-10">
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-emerald-700 to-teal-900 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 text-3xl font-extrabold border-4 border-white">
                    SS
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Jharkhand Civic Innovation Grid</h3>
                    <p className="text-xs text-stone-600">Connecting 24 Districts with Verified Research Labs</p>
                  </div>
                </div>

                {/* Bottom Trust Badge */}
                <div className="p-3.5 rounded-2xl bg-white/95 border border-stone-200 shadow-sm backdrop-blur-sm flex items-center justify-between text-xs z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <span className="font-semibold text-stone-800">Statewide Verified Capacity</span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    100% Audited
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
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Districts Covered in Jharkhand</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-stone-900">100+</div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Verified Research Labs & Startups</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-700">40+</div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Active Capability Passports</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-teal-800">100%</div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Transparent Government Review</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Innovation Engine: 4-Step Ecosystem Workflow */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-b border-stone-200 bg-[#FAF9F6]">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-300">
              The Collaboration Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
              How SamadhanSetu Works
            </h2>
            <p className="text-sm text-stone-600">
              A transparent, accountable workflow transforming unstructured citizen reports into validated institutional research and community deployment.
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

      {/* 4. Priority Problem Domains (Inspired by Positive Citizens Foundation Initiatives) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Regional Priorities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
                Priority Societal Challenges
              </h2>
              <p className="text-sm text-stone-600 max-w-xl">
                Explore grassroots challenges categorized by core community needs across Jharkhand.
              </p>
            </div>

            <Link
              href="/challenges"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors self-start md:self-auto"
            >
              <span>View Full Challenge Directory</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
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
                      <span>Active Focus</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                      {domain.title}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {domain.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100">
                    <Link
                      href={`/challenges?domain=${encodeURIComponent(domain.title)}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900"
                    >
                      <span>Explore Challenges</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Role-Based Participation Framework */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#FAF9F6] border-b border-stone-200">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Multi-Stakeholder Participation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
              How Will You Participate?
            </h2>
            <p className="text-sm text-stone-600">
              SamadhanSetu provides dedicated workspaces tailored to your institutional role and societal responsibility.
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
                SS
              </div>
              <span>SamadhanSetu</span>
            </div>
            <p className="text-stone-400 text-xs max-w-sm leading-relaxed">
              An initiative supported by the Government of Jharkhand to connect grassroots citizen problems with higher education institutions, specialized laboratories, and enterprise innovators.
            </p>
            <p className="text-stone-500 text-[11px]">
              Built for Smart India Hackathon (SIH) and public societal impact deployment.
            </p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <p className="text-white font-bold uppercase tracking-wider text-[11px]">Platform</p>
            <ul className="space-y-1.5 text-stone-400">
              <li><Link href="/challenges" className="hover:text-white transition-colors">Challenges Directory</Link></li>
              <li><Link href="/challenges/new" className="hover:text-white transition-colors">Report a Problem</Link></li>
              <li><Link href="/organizations/onboard" className="hover:text-white transition-colors">Onboard Institution</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2">
            <p className="text-white font-bold uppercase tracking-wider text-[11px]">Stakeholders</p>
            <ul className="space-y-1.5 text-stone-400">
              <li><Link href="/login" className="hover:text-white transition-colors">Citizen Portal</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">University Portal</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Industry Portal</Link></li>
              <li><Link href="/reviewer-queue" className="hover:text-white transition-colors">Reviewer Queue</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <p className="text-white font-bold uppercase tracking-wider text-[11px]">Governance & Trust</p>
            <p className="text-stone-400 text-xs leading-relaxed">
              All problem submissions are subject to district reviewer validation. AI matching inferences are provided as decision support for human reviewers.
            </p>
            <div className="pt-2 text-stone-500 text-[11px]">
              © 2026 SamadhanSetu. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

