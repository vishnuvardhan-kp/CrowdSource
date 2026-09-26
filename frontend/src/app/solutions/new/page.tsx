"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  Lightbulb,
  Building2,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  Sparkles,
  Save,
  Send,
  Loader2,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

function SolutionNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedChallengeId = searchParams.get("challengeId") || "";

  const { user, token, loading: authLoading } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(preselectedChallengeId);
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);

  // Form Fields
  const [title, setTitle] = useState<string>("");
  const [executiveSummary, setExecutiveSummary] = useState<string>("");
  const [problemUnderstanding, setProblemUnderstanding] = useState<string>("");
  const [proposedApproach, setProposedApproach] = useState<string>("");
  const [technicalApproach, setTechnicalApproach] = useState<string>("");
  const [requiredCapabilities, setRequiredCapabilities] = useState<string>("");
  const [expectedOutcomes, setExpectedOutcomes] = useState<string>("");
  const [expectedSocialImpact, setExpectedSocialImpact] = useState<string>("");
  const [estimatedBudget, setEstimatedBudget] = useState<string>("");
  const [estimatedTimeline, setEstimatedTimeline] = useState<string>("3 to 6 months");
  const [requiredResources, setRequiredResources] = useState<string>("");
  const [prototypeRequirements, setPrototypeRequirements] = useState<string>("");
  const [deploymentRequirements, setDeploymentRequirements] = useState<string>("");
  const [innovationPotential, setInnovationPotential] = useState<string>("");
  const [ipStatus, setIpStatus] = useState<string>("No IP identified");
  const [ipPotential, setIpPotential] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userOrgId = user?.primaryOrganization?.id || user?.memberships?.[0]?.organization_id;

  // 1. Fetch Validated Challenges
  useEffect(() => {
    fetch(`${apiUrl}/challenges?status=VALIDATED`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || (Array.isArray(data) ? data : []);
        setChallenges(items);
        if (preselectedChallengeId) {
          const match = items.find((c: any) => c.id === preselectedChallengeId);
          if (match) setSelectedChallenge(match);
        } else if (items.length > 0 && !selectedChallengeId) {
          setSelectedChallengeId(items[0].id);
          setSelectedChallenge(items[0]);
        }
      })
      .catch((err) => console.error("Failed to load challenges:", err));
  }, [apiUrl, preselectedChallengeId, selectedChallengeId]);

  // When selectedChallenge changes, populate sensible context defaults if blank
  const handleSelectChallenge = (id: string) => {
    setSelectedChallengeId(id);
    const found = challenges.find((c) => c.id === id);
    setSelectedChallenge(found || null);
    if (found && !title) {
      setTitle(`Innovative Solution: ${found.title}`);
      setProblemUnderstanding(
        `Addressing the community challenge of "${found.title}" in ${found.district || "Jharkhand"}. Key root causes identified from local evidence are targeted for engineering redressal.`
      );
    }
  };

  const handleCreate = async (publishImmediately: boolean = false) => {
    if (!token || !userOrgId) {
      setError("Please sign in with your university account to propose a solution.");
      return;
    }
    if (!selectedChallengeId) {
      setError("Please select the civic challenge your solution addresses.");
      return;
    }
    if (!title || title.trim().length < 5) {
      setError("A descriptive solution title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1. Create Solution (Draft)
      const res = await fetch(`${apiUrl}/solutions?orgId=${userOrgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          challenge_id: selectedChallengeId,
          title: title.trim(),
          executive_summary: executiveSummary.trim() || undefined,
          problem_understanding: problemUnderstanding.trim() || undefined,
          proposed_approach: proposedApproach.trim() || undefined,
          technical_approach: technicalApproach.trim() || undefined,
          required_capabilities: requiredCapabilities
            ? requiredCapabilities.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
          expected_outcomes: expectedOutcomes.trim() || undefined,
          expected_social_impact: expectedSocialImpact.trim() || undefined,
          estimated_budget: estimatedBudget ? Number(estimatedBudget) : undefined,
          estimated_timeline: estimatedTimeline,
          required_resources: requiredResources.trim() || undefined,
          prototype_requirements: prototypeRequirements.trim() || undefined,
          deployment_requirements: deploymentRequirements.trim() || undefined,
          innovation_potential: innovationPotential.trim() || undefined,
          ip_potential: ipPotential.trim()
            ? `[${ipStatus}] ${ipPotential.trim()}`
            : (ipStatus !== "No IP identified" ? `[${ipStatus}]` : undefined),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create proposed solution");
      }

      const created = await res.json();

      // 2. If publishing immediately
      if (publishImmediately) {
        await fetch(`${apiUrl}/solutions/${created.id}/publish`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      router.push(`/solutions/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/university-dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to University Dashboard
          </Link>

          <div className="mt-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Propose University Solution
            </h1>
            <p className="text-xs text-stone-600 mt-1">
              Structure a rigorous technical solution to a validated civic challenge. Once published, your solution enters the Open Solution Workspace for industry, startup, and peer academic collaboration.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Challenge Selection */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-stone-900">1. Target Civic Challenge</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Select Validated Challenge to Address
            </label>
            <select
              value={selectedChallengeId}
              onChange={(e) => handleSelectChallenge(e.target.value)}
              className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none"
            >
              <option value="">-- Choose from validated government challenges --</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.district || "Jharkhand"} • {c.category || "General"})
                </option>
              ))}
            </select>
          </div>

          {selectedChallenge && (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">{selectedChallenge.title}</span>
                <span className="text-[11px] text-emerald-700">{selectedChallenge.district}, Jharkhand</span>
              </div>
              <p className="text-stone-600 leading-relaxed text-[11px]">
                {selectedChallenge.description}
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Solution Architecture & Technical Core */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Lightbulb className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-stone-900">2. Proposed Solution Overview</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Solution Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Low-Cost IoT Turbidity & Arsenic Sensor Array with Edge Filtering"
              className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Executive Summary
            </label>
            <textarea
              rows={3}
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="High-level summary of the solution, technical feasibility, and institutional readiness..."
              className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Problem Understanding & Field Root Cause Analysis
            </label>
            <textarea
              rows={3}
              value={problemUnderstanding}
              onChange={(e) => setProblemUnderstanding(e.target.value)}
              placeholder="How the university's academic team analyzes the local problem, community bottlenecks, and failure modes..."
              className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-900 focus:bg-white"
            />
          </div>

          {/* IP & Confidentiality Safeguard */}
          <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">IP &amp; Confidentiality Safeguard:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Provide only high-level architecture and engineering methodology for discovery and consortium matching. Do <strong>NOT</strong> disclose trade secrets, proprietary source code, confidential know-how, or unfiled patent mechanisms. Detailed technical specifications can be shared under bilateral agreements once partner collaboration is accepted.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Technical Approach &amp; Architecture Methodology (High-Level Discovery)
            </label>
            <textarea
              rows={4}
              value={technicalApproach}
              onChange={(e) => setTechnicalApproach(e.target.value)}
              placeholder="High-level engineering principles, hardware categories, protocols, or agronomic approach (no secret formulas or code)..."
              className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Required Technical Capabilities (Comma-separated)
            </label>
            <input
              type="text"
              value={requiredCapabilities}
              onChange={(e) => setRequiredCapabilities(e.target.value)}
              placeholder="e.g. Water Quality Testing, IoT Embedded Systems, Soil Analysis, Agronomy"
              className="w-full rounded-xl border border-stone-200 p-2.5 text-xs bg-stone-50 text-stone-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Step 3: Outcomes, Social Impact & IP */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-stone-900">3. Expected Outcomes &amp; IP Status</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Expected Verifiable Outcomes
              </label>
              <textarea
                rows={3}
                value={expectedOutcomes}
                onChange={(e) => setExpectedOutcomes(e.target.value)}
                placeholder="Target pilot results, sensor accuracy, capacity benchmarks..."
                className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Expected Social &amp; Civic Impact
              </label>
              <textarea
                rows={3}
                value={expectedSocialImpact}
                onChange={(e) => setExpectedSocialImpact(e.target.value)}
                placeholder="Beneficiaries reached, reduction in waterborne disease, crop yield improvement..."
                className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                IP &amp; Protection Status
              </label>
              <select
                value={ipStatus}
                onChange={(e) => setIpStatus(e.target.value)}
                className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
              >
                <option value="No IP identified">No IP identified</option>
                <option value="IP assessment pending">IP assessment pending</option>
                <option value="Potential IP identified">Potential IP identified</option>
                <option value="Patent application filed">Patent application filed</option>
                <option value="Patent granted">Patent granted</option>
                <option value="Trade secret / Other protection">Other protection</option>
                <option value="Confidential">Confidential</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Innovation &amp; Patent Potential Notes
              </label>
              <input
                type="text"
                value={innovationPotential}
                onChange={(e) => setInnovationPotential(e.target.value)}
                placeholder="e.g. Novel electrochemical filtration method"
                className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Startup / Commercialization Opportunity
              </label>
              <input
                type="text"
                value={ipPotential}
                onChange={(e) => setIpPotential(e.target.value)}
                placeholder="e.g. Student-led clean-tech startup incubation"
                className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
              />
            </div>
          </div>
          <p className="text-[10px] text-stone-500 italic">
            ResolvIN tracks IP status for academic attribution and consortium planning; it does not determine legal patentability or file patents.
          </p>
        </div>

        {/* Step 4: Budget, Timeline & Resources */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <DollarSign className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-stone-900">4. Budget & Resources</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estimated Solution Budget (₹ INR)
              </label>
              <input
                type="number"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estimated Timeline
              </label>
              <select
                value={estimatedTimeline}
                onChange={(e) => setEstimatedTimeline(e.target.value)}
                className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
              >
                <option value="LESS_THAN_3_MONTHS">Less than 3 months (Rapid Pilot)</option>
                <option value="THREE_TO_SIX_MONTHS">3 to 6 months (Standard Solution)</option>
                <option value="SIX_TO_TWELVE_MONTHS">6 to 12 months (Comprehensive Project)</option>
                <option value="MORE_THAN_12_MONTHS">More than 12 months (Consortium Initiative)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Required Lab Equipment & Industry Support Needed
            </label>
            <input
              type="text"
              value={requiredResources}
              onChange={(e) => setRequiredResources(e.target.value)}
              placeholder="e.g. CNC fabrication machines, field telemetry testing gear, solar panel kits"
              className="w-full rounded-xl border border-stone-200 p-2 text-xs bg-stone-50 text-stone-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200">
          <Link
            href="/university-dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold text-center hover:bg-stone-100 transition"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleCreate(false)}
              disabled={saving}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition"
            >
              <Save className="h-4 w-4" /> Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleCreate(true)}
              disabled={saving}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Publish to Open Workspace
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SolutionNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-500">Loading form...</div>}>
      <SolutionNewContent />
    </Suspense>
  );
}
