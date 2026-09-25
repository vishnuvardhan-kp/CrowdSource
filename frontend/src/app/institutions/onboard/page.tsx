"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  Building2,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  Search,
  UserCheck,
  Clock,
  ExternalLink,
  Loader2,
  BadgeAlert,
  Info,
} from "lucide-react";

interface DistrictItem {
  id: string;
  name: string;
  state: string;
}

interface BlockItem {
  id: string;
  name: string;
}

interface InstitutionItem {
  id: string;
  name: string;
  type: string;
  subtype: string;
  lgd_code: string;
  state: string;
  district_name: string;
  block_name?: string;
  hierarchy_level: string;
}

export default function InstitutionOnboardingPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Step 1: Type selection
  const [institutionType, setInstitutionType] = useState<"PRI" | "ULB" | "GOVERNMENT_DEPARTMENT">("PRI");
  const [institutionSubtype, setInstitutionSubtype] = useState<string>("GRAM_PANCHAYAT");

  // Step 2: LGD Selection & Verification
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [institutionsList, setInstitutionsList] = useState<InstitutionItem[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionItem | null>(null);
  const [lgdInputCode, setLgdInputCode] = useState<string>("");
  const [lgdVerifying, setLgdVerifying] = useState<boolean>(false);
  const [lgdResult, setLgdResult] = useState<any | null>(null);

  // Step 3: Representative Profile
  const [relationship, setRelationship] = useState<string>("AUTHORIZED_OFFICER");
  const [designation, setDesignation] = useState<string>("");
  const [officialEmail, setOfficialEmail] = useState<string>("");
  const [officialPhone, setOfficialPhone] = useState<string>("");
  const [departmentName, setDepartmentName] = useState<string>("");

  // Step 4: Evidence Upload
  const [evidenceType, setEvidenceType] = useState<string>("APPOINTMENT_LETTER");
  const [documentName, setDocumentName] = useState<string>("");
  const [documentUrl, setDocumentUrl] = useState<string>("");
  const [uploadSimulated, setUploadSimulated] = useState<boolean>(false);
  const [createdMembership, setCreatedMembership] = useState<any | null>(null);

  // Load districts
  useEffect(() => {
    fetch(`${apiUrl}/locations/districts`)
      .then((r) => r.json())
      .then((data) => setDistricts(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching districts:", err));
  }, [apiUrl]);

  // Load blocks when district changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setBlocks([]);
      setSelectedBlockId("");
      return;
    }
    fetch(`${apiUrl}/locations/districts/${selectedDistrictId}/blocks`)
      .then((r) => r.json())
      .then((data) => setBlocks(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching blocks:", err));
  }, [apiUrl, selectedDistrictId]);

  // Search institutions when filter changes
  useEffect(() => {
    let url = `${apiUrl}/institutions/search?type=${institutionType}&subtype=${institutionSubtype}`;
    if (selectedDistrictId) url += `&district_id=${selectedDistrictId}`;
    if (selectedBlockId) url += `&block_id=${selectedBlockId}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.items) {
          setInstitutionsList(data.items);
        }
      })
      .catch((err) => console.error("Error fetching institutions:", err));
  }, [apiUrl, institutionType, institutionSubtype, selectedDistrictId, selectedBlockId]);

  // LGD Code Direct Search
  const handleVerifyLgdCode = async () => {
    if (!lgdInputCode.trim()) return;
    setLgdVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiUrl}/institutions/lgd/${encodeURIComponent(lgdInputCode.trim())}`);
      const data = await res.json();
      if (res.ok && data.valid && data.institution) {
        setLgdResult(data);
        setSelectedInstitution(data.institution);
        setInstitutionType(data.institution.type);
        setInstitutionSubtype(data.institution.subtype);
      } else {
        setLgdResult({ valid: false });
        setErrorMsg(`LGD Code "${lgdInputCode}" was not found in the local authoritative directory.`);
      }
    } catch (err: any) {
      setErrorMsg(`Verification query failed: ${err.message}`);
    } finally {
      setLgdVerifying(false);
    }
  };

  // Submit application (Step 3 to 4)
  const handleSubmitApplication = async () => {
    if (!selectedInstitution) {
      setErrorMsg("Please select an institution first.");
      return;
    }
    if (!designation.trim()) {
      setErrorMsg("Official designation is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiUrl}/institution-memberships`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institution_id: selectedInstitution.id,
          relationship,
          designation: designation.trim(),
          official_email: officialEmail.trim() || undefined,
          official_phone: officialPhone.trim() || undefined,
          department_name: departmentName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit representative application.");
      }

      setCreatedMembership(data);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Upload documentary proof (Step 4 to 5)
  const handleUploadProof = async () => {
    if (!createdMembership) {
      setErrorMsg("Application record not found.");
      return;
    }

    const docName = documentName.trim() || `${evidenceType}_Verification_Document.pdf`;
    const docUrl = documentUrl.trim() || `https://storage.resolvin.gov.in/evidence/${Date.now()}_${docName}`;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiUrl}/institution-memberships/${createdMembership.id}/evidence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          evidence_type: evidenceType,
          document_name: docName,
          document_url: docUrl,
          mime_type: "application/pdf",
          file_size: 1048576,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to upload verification document.");
      }

      // Re-fetch membership
      const memRes = await fetch(`${apiUrl}/institution-memberships/${createdMembership.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (memRes.ok) {
        const updatedMem = await memRes.json();
        setCreatedMembership(updatedMem);
      }

      setStep(5);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <Landmark className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-600 mb-6">
            Please sign in with your ResolvIN account to apply for institutional representative verification.
          </p>
          <Link
            href="/login?redirect=/institutions/onboard"
            className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Institutional Representative Onboarding
              </h1>
              <p className="text-sm text-slate-500">
                Panchayati Raj Institutions (PRI) & Urban Local Bodies (ULB) Verification
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="mt-6 grid grid-cols-5 gap-2 border-b border-slate-200 pb-4 text-xs font-medium text-slate-500">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-blue-600 font-semibold" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>1</span>
              <span>Local Body Type</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-blue-600 font-semibold" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
              <span>LGD Locator</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 3 ? "text-blue-600 font-semibold" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>3</span>
              <span>Authority Details</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 4 ? "text-blue-600 font-semibold" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>4</span>
              <span>Documentary Proof</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 5 ? "text-blue-600 font-semibold" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 5 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>5</span>
              <span>Status & Audit</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold">Notice</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* STEP 1: CATEGORY SELECTION */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 1: Select Institution Category</h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose the institutional tier you represent. All local bodies are cross-verified against official Local Government Directory (LGD) registries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => {
                  setInstitutionType("PRI");
                  setInstitutionSubtype("GRAM_PANCHAYAT");
                }}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  institutionType === "PRI"
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Landmark className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Panchayati Raj (PRI)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gram Panchayats, Panchayat Samitis (Block), and Zilla Parishads (District).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInstitutionType("ULB");
                  setInstitutionSubtype("MUNICIPAL_CORPORATION");
                }}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  institutionType === "ULB"
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Urban Local Body (ULB)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Municipal Corporations, Municipal Councils (Nagar Parishad), and Nagar Panchayats.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInstitutionType("GOVERNMENT_DEPARTMENT");
                  setInstitutionSubtype("STATE_DEPARTMENT");
                }}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  institutionType === "GOVERNMENT_DEPARTMENT"
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Government Dept / Office</h3>
                <p className="text-xs text-slate-500 mt-1">
                  State Departments, District Collectorates, or Block Administrative Offices.
                </p>
              </button>
            </div>

            {/* Subtype Selection */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Specific Administrative Level
              </label>
              {institutionType === "PRI" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "GRAM_PANCHAYAT", label: "Gram Panchayat", desc: "Village Level (LGD 6-digit)" },
                    { id: "PANCHAYAT_SAMITI", label: "Panchayat Samiti", desc: "Block / Intermediate Level" },
                    { id: "ZILLA_PARISHAD", label: "Zilla Parishad", desc: "District / Apex Level" },
                  ].map((sub) => (
                    <label
                      key={sub.id}
                      className={`p-3 rounded-lg border cursor-pointer flex flex-col ${
                        institutionSubtype === sub.id
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 font-medium"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="subtype"
                        value={sub.id}
                        checked={institutionSubtype === sub.id}
                        onChange={(e) => setInstitutionSubtype(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">{sub.label}</span>
                      <span className="text-xs text-slate-500">{sub.desc}</span>
                    </label>
                  ))}
                </div>
              )}

              {institutionType === "ULB" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "MUNICIPAL_CORPORATION", label: "Municipal Corporation", desc: "Large Cities / Nagar Nigam" },
                    { id: "MUNICIPAL_COUNCIL", label: "Municipal Council", desc: "Towns / Nagar Parishad" },
                    { id: "NAGAR_PANCHAYAT", label: "Nagar Panchayat", desc: "Transitional Urban Localities" },
                  ].map((sub) => (
                    <label
                      key={sub.id}
                      className={`p-3 rounded-lg border cursor-pointer flex flex-col ${
                        institutionSubtype === sub.id
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 font-medium"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="subtype"
                        value={sub.id}
                        checked={institutionSubtype === sub.id}
                        onChange={(e) => setInstitutionSubtype(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">{sub.label}</span>
                      <span className="text-xs text-slate-500">{sub.desc}</span>
                    </label>
                  ))}
                </div>
              )}

              {institutionType === "GOVERNMENT_DEPARTMENT" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "STATE_DEPARTMENT", label: "State Department", desc: "Jharkhand State Secretariat" },
                    { id: "DISTRICT_OFFICE", label: "District Collectorate", desc: "DC / DM Office" },
                    { id: "BLOCK_OFFICE", label: "Block Office", desc: "BDO Administration" },
                  ].map((sub) => (
                    <label
                      key={sub.id}
                      className={`p-3 rounded-lg border cursor-pointer flex flex-col ${
                        institutionSubtype === sub.id
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 font-medium"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="subtype"
                        value={sub.id}
                        checked={institutionSubtype === sub.id}
                        onChange={(e) => setInstitutionSubtype(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold">{sub.label}</span>
                      <span className="text-xs text-slate-500">{sub.desc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                Continue to LGD Locator
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LGD LOCATOR & EXISTENCE VERIFICATION */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                <span>Layer 1: Institution Existence Verification</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Locate & Verify Official LGD Record</h2>
              <p className="text-sm text-slate-500 mt-1">
                Find your Panchayat or Local Body by administrative hierarchy, or verify directly with your canonical LGD code.
              </p>
            </div>

            {/* Crucial Decoupling Notice */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-sm">
              <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Verification Separation Policy:</span> Local Government Directory (LGD) verification establishes ONLY that this Panchayat or Urban Local Body exists in official government records. It does NOT automatically verify your personal authority to represent it. That will be established in the subsequent documentary review step.
              </div>
            </div>

            {/* Direct LGD Code Lookup Bar */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Direct Canonical LGD Code Search
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter LGD Code (e.g. 108742 for Kanke, 250101 for Ranchi Municipal Corp)"
                  value={lgdInputCode}
                  onChange={(e) => setLgdInputCode(e.target.value)}
                  className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyLgdCode}
                  disabled={lgdVerifying || !lgdInputCode.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {lgdVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Verify LGD
                </button>
              </div>
            </div>

            {/* Cascading Administrative Dropdowns */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Or Browse by Administrative Hierarchy
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    District (Jharkhand)
                  </label>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => setSelectedDistrictId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- All Districts --</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {institutionType === "PRI" && institutionSubtype !== "ZILLA_PARISHAD" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Block
                    </label>
                    <select
                      value={selectedBlockId}
                      onChange={(e) => setSelectedBlockId(e.target.value)}
                      disabled={!selectedDistrictId}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                    >
                      <option value="">-- Select Block --</option>
                      {blocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Filtered Institutions List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Available Registered Local Bodies ({institutionsList.length})
              </label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {institutionsList.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No institutions matching the selected filters were found. Try direct LGD code lookup or change administrative filters.
                  </div>
                ) : (
                  institutionsList.map((inst) => {
                    const isSelected = selectedInstitution?.id === inst.id;
                    return (
                      <div
                        key={inst.id}
                        onClick={() => setSelectedInstitution(inst)}
                        className={`p-4 cursor-pointer transition flex items-center justify-between ${
                          isSelected ? "bg-blue-50/70 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{inst.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                              LGD: {inst.lgd_code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {inst.district_name} {inst.block_name ? `• Block: ${inst.block_name}` : ""} • Level: {inst.hierarchy_level}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Institution Summary Box */}
            {selectedInstitution && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        LGD Validated Institution
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-semibold">
                        LGD: {selectedInstitution.lgd_code}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-base mt-0.5">{selectedInstitution.name}</p>
                    <p className="text-xs text-slate-600">
                      {selectedInstitution.district_name || selectedInstitution.state} • Type: {selectedInstitution.subtype}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedInstitution) {
                    setErrorMsg("Please select an institution to proceed.");
                    return;
                  }
                  setErrorMsg(null);
                  setStep(3);
                }}
                disabled={!selectedInstitution}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Proceed to Representative Authority
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REPRESENTATIVE IDENTITY & AUTHORITY */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                <span>Layer 2: Representative Authority Details</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Representative Authorization Profile</h2>
              <p className="text-sm text-slate-500 mt-1">
                Specify your official association with <strong className="text-slate-800">{selectedInstitution?.name}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relationship to Institution *
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ELECTED_REPRESENTATIVE">Elected Representative (Mukhiya, Councillor, Mayor, Ward Member)</option>
                  <option value="AUTHORIZED_OFFICER">Authorized Officer (Panchayat Secretary, BDO, Municipal Commissioner)</option>
                  <option value="EMPLOYEE">Government / Local Body Employee</option>
                  <option value="AUTHORIZED_STAFF">Authorized Operational Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Designation *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mukhiya / Panchayat Secretary / Ward Councillor"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. secretary.kanke@gov.in"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Phone / Mobile (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={officialPhone}
                  onChange={(e) => setOfficialPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Wing / Section (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Panchayati Raj Wing / Engineering Cell / Revenue Section"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Audit Trail Notice:</span> All representation filings are cryptographically signed with your authenticated user account (<strong className="text-slate-900">{user.email}</strong>). Submitting falsified representation records is subject to platform sanction and administrative review.
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={submitting || !designation.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Continue to Evidence Upload
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DOCUMENTARY EVIDENCE UPLOAD */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                <span>Proof & Documentary Verification</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Upload Official Authority Evidence</h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload official documentary proof establishing that you hold the designation <strong className="text-slate-800">{designation}</strong> for <strong className="text-slate-800">{selectedInstitution?.name}</strong>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Evidence Document Type *
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="APPOINTMENT_LETTER">Official Appointment Letter / Notification</option>
                  <option value="OFFICIAL_ID_CARD">Official Government / Local Body ID Card</option>
                  <option value="AUTHORIZATION_RESOLUTION">Panchayat / Municipal Resolution (Prastav)</option>
                  <option value="GOVERNMENT_ORDER">Government Gazetted Order (Shasanadesh)</option>
                  <option value="OTHER">Other Authoritative Verification Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title / Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Appointment Order No. PRD/2024/782 or ID Card No. JH-PRI-994"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/60 hover:bg-slate-50 transition">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Upload Appointment Order / ID Card PDF or Scan
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: PDF, PNG, JPG (Max size 10MB)
                </p>

                <div className="mt-4 flex justify-center">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer hover:bg-slate-50 shadow-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Select File from Computer</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setDocumentName(file.name);
                          setUploadSimulated(true);
                          setDocumentUrl(`https://storage.resolvin.gov.in/credentials/${encodeURIComponent(file.name)}`);
                        }
                      }}
                    />
                  </label>
                </div>

                {uploadSimulated && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>File attached: {documentName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleUploadProof}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Submit Evidence for Review
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: STATUS & AUDIT SUMMARY */}
        {step === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Application Under Administrative Review</h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2">
                Your representative authority application has been securely recorded and queued for Government Administrator review.
              </p>
            </div>

            {/* Verification Breakdown Card */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-semibold text-slate-700">Verification Status</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  {createdMembership?.authority_status || "UNDER_REVIEW"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Institution</span>
                  <span className="font-bold text-slate-900">{selectedInstitution?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Authoritative LGD Code</span>
                  <span className="font-mono font-bold text-blue-700">{selectedInstitution?.lgd_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Designation</span>
                  <span className="font-semibold text-slate-800">{designation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Relationship</span>
                  <span className="font-semibold text-slate-800">{relationship}</span>
                </div>
              </div>

              {/* Distinction highlight */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Two-Tier Verification Safeguard:</span>
                </div>
                <p>
                  1. <strong>Institution Existence</strong>: Validated via LGD Code <span className="font-mono font-semibold">{selectedInstitution?.lgd_code}</span>.
                </p>
                <p>
                  2. <strong>Representative Authority</strong>: Will be approved by the District/State Government Administrator upon inspecting your uploaded documentary credentials.
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Link
                href="/challenges/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Submit Citizen Challenge
              </Link>
              <Link
                href="/government-dashboard"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
