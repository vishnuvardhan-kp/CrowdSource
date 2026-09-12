"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  FileText,
  MapPin,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Trash2,
  AlertCircle,
  Loader2,
  Compass,
  Video,
  Globe,
  FileCheck,
} from "lucide-react";
import { useTranslation } from "../../../lib/i18n";

interface DistrictItem {
  id: string;
  name: string;
}

interface BlockItem {
  id: string;
  name: string;
}

interface UploadedEvidence {
  id: string;
  title: string;
  url: string;
  mime_type: string;
  evidence_type: string;
}

function SubmissionWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingDraftId = searchParams.get("draftId");

  const { user, token } = useAuth();
  const { t } = useTranslation();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [step, setStep] = useState<number>(1);
  const [draftId, setDraftId] = useState<string | null>(existingDraftId);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(!!existingDraftId);
  const [savingStep, setSavingStep] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [citizenSeverity, setCitizenSeverity] = useState<"NOT_SURE" | "MODERATE" | "SERIOUS">("NOT_SURE");

  // Location State
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [villageLocality, setVillageLocality] = useState("");
  const [affectedPopulation, setAffectedPopulation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Evidence State
  const [evidenceList, setEvidenceList] = useState<UploadedEvidence[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // 1. Load Districts on mount
  useEffect(() => {
    const loadDistricts = async () => {
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
    loadDistricts();
  }, [apiUrl]);

  // 2. Load Blocks when District changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setBlocks([]);
      setSelectedBlockId("");
      return;
    }
    const loadBlocks = async () => {
      try {
        const res = await fetch(`${apiUrl}/locations/districts/${selectedDistrictId}/blocks`);
        if (res.ok) {
          const data = await res.json();
          setBlocks(data);
        }
      } catch (err) {
        console.error("Failed to load blocks:", err);
      }
    };
    loadBlocks();
  }, [apiUrl, selectedDistrictId]);

  // 3. If resuming an existing draft, fetch its data
  useEffect(() => {
    if (!existingDraftId || !token) return;

    const fetchDraft = async () => {
      try {
        const res = await fetch(`${apiUrl}/challenges/${existingDraftId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTitle(data.title || "");
          setDescription(data.description || "");
          setCitizenSeverity(data.citizen_severity || "NOT_SURE");
          setSelectedDistrictId(data.district_id || "");
          setSelectedBlockId(data.block_id || "");
          setVillageLocality(data.village_locality || "");
          setAffectedPopulation(data.affected_population || "");
          setLatitude(data.latitude || null);
          setLongitude(data.longitude || null);
          setEvidenceList(data.evidence || []);
          setDraftId(data.id);
        }
      } catch (err) {
        console.error("Failed to load draft:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchDraft();
  }, [apiUrl, existingDraftId, token]);

  // Helper to capture current GPS coordinates
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("Geolocation is not supported by your browser.");
      return;
    }
    setGpsStatus("Locating via GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(parseFloat(position.coords.latitude.toFixed(6)));
        setLongitude(parseFloat(position.coords.longitude.toFixed(6)));
        setGpsStatus(`GPS coordinates captured (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
      },
      (error) => {
        setGpsStatus("Unable to retrieve location. Please select District & Block manually.");
      },
      { timeout: 10000 },
    );
  };

  // Step 1 -> Step 2: Save or create draft
  const handleProceedFromProblem = async () => {
    setErrorMessage(null);
    if (!title.trim() || title.trim().length < 5) {
      setErrorMessage("Please enter a problem title (at least 5 characters).");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage("Please enter a description of the problem (at least 10 characters).");
      return;
    }

    if (!token) {
      setErrorMessage("Please sign in or register to submit a problem.");
      return;
    }

    setSavingStep(true);
    try {
      if (!draftId) {
        // Create new draft
        const res = await fetch(`${apiUrl}/challenges`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            citizen_severity: citizenSeverity,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to create draft challenge.");
        }
        const created = await res.json();
        setDraftId(created.id);
      } else {
        // Update existing draft
        const res = await fetch(`${apiUrl}/challenges/${draftId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            citizen_severity: citizenSeverity,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to update draft challenge.");
        }
      }
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setSavingStep(false);
    }
  };

  // Step 2 -> Step 3: Save Location to Draft
  const handleProceedFromLocation = async () => {
    setErrorMessage(null);
    if (!selectedDistrictId) {
      setErrorMessage("Please select a District from the list.");
      return;
    }
    if (!selectedBlockId) {
      setErrorMessage("Please select a Block from the list.");
      return;
    }

    setSavingStep(true);
    try {
      const res = await fetch(`${apiUrl}/challenges/${draftId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          district_id: selectedDistrictId,
          block_id: selectedBlockId,
          village_locality: villageLocality.trim() || undefined,
          affected_population: affectedPopulation.trim() || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save location details.");
      }

      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save location.");
    } finally {
      setSavingStep(false);
    }
  };

  // Upload file in Step 3
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !draftId) return;

    const file = e.target.files[0];
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("File exceeds maximum allowed size of 15 MB.");
      return;
    }

    setUploadingFile(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    try {
      const res = await fetch(`${apiUrl}/challenges/${draftId}/evidence`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to upload file.");
      }

      const newEvidence = await res.json();
      setEvidenceList((prev) => [...prev, newEvidence]);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload error.");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Delete evidence in Step 3
  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!draftId) return;
    try {
      const res = await fetch(`${apiUrl}/challenges/${draftId}/evidence/${evidenceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEvidenceList((prev) => prev.filter((ev) => ev.id !== evidenceId));
      }
    } catch (err) {
      console.error("Failed to delete evidence:", err);
    }
  };

  // Step 4: Final Submission
  const handleFinalSubmit = async () => {
    if (!draftId) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${apiUrl}/challenges/${draftId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to submit challenge.");
      }

      setSubmittedSuccessfully(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Selected district / block labels for Step 4 review
  const currentDistrictName = districts.find((d) => d.id === selectedDistrictId)?.name || "Not selected";
  const currentBlockName = blocks.find((b) => b.id === selectedBlockId)?.name || "Not selected";

  if (!user && !loadingInitial) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Authentication Required</h2>
        <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
          You must be logged in as an authenticated citizen, researcher, or community representative to submit a grassroots problem.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition"
          >
            Sign In or Register
          </Link>
        </div>
      </div>
    );
  }

  if (submittedSuccessfully) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Challenge Successfully Submitted!</h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            Your problem statement has been structured by AI and forwarded to the government administrative review queue.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-stone-600">
            <span>Challenge Reference ID:</span>
            <span className="font-mono text-stone-900 font-semibold">{draftId}</span>
          </div>
          <div className="flex justify-between items-center text-stone-600">
            <span>Current Status:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Pending Government Verification
            </span>
          </div>
          <div className="flex justify-between items-center text-stone-600">
            <span>Location:</span>
            <span className="text-stone-900 font-medium">{currentDistrictName}, {currentBlockName}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={`/challenges/${draftId}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition"
          >
            View Challenge Details
          </Link>
          <Link
            href="/my-challenges"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            My Challenges
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">
      {/* Wizard Header & Progress */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
          Civic Intake Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Report a Community Need
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Share real-world civic, environmental, or agricultural problems in 4 simple steps to mobilize institutional solutions.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 border-b border-stone-200 pb-4">
        {[
          { num: 1, label: "Problem", icon: FileText },
          { num: 2, label: "Location", icon: MapPin },
          { num: 3, label: "Evidence", icon: Camera },
          { num: 4, label: "Review", icon: CheckCircle2 },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              className={`flex items-center justify-center text-center p-1.5 sm:p-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold shadow-xs"
                  : isDone
                  ? "text-emerald-700 font-medium"
                  : "text-stone-400 font-normal"
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden font-mono font-bold">{s.num}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 1: The Problem */}
      {/* ==================================================================== */}
      {step === 1 && (
        <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-stone-900">{t("wizard.step1_title", "Step 1: Describe the Problem")}</h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Focus on what is happening, who is affected, and how it impacts daily life.
            </p>
          </div>

          {/* Multilingual Submission Assurance Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <Globe className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-emerald-950">Multilingual Intake:</span>{" "}
              {t(
                "wizard.input_language_hint",
                "You can describe your problem in any native script or language (Hindi, Santali in Ol Chiki, Nagpuri, Mundari, Kurukh, English, etc.). The platform automatically standardizes and routes it to government reviewers."
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">
                {t("wizard.problem_title_label", "What problem is your community facing?")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t("wizard.problem_title_placeholder", 'e.g., "Drinking water supply interrupted during peak summer months"')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">
                {t("wizard.problem_desc_label", "Detailed description")} <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder={t(
                  "wizard.problem_desc_placeholder",
                  "Explain the background, when it started, how many households are affected, and what hardship it causes..."
                )}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 p-3.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 leading-relaxed transition"
              />
              <p className="text-[11px] text-stone-500">
                Tip: You do not need to propose technical engineering solutions. Simply describe what is broken or missing.
              </p>
            </div>

            {/* Citizen Severity (Optional) */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-stone-700">
                How severe is this problem? <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: "NOT_SURE", label: "Not sure", desc: "Hard to assess" },
                  { value: "MODERATE", label: "Moderate", desc: "Noticeable hardship" },
                  { value: "SERIOUS", label: "Serious", desc: "Urgent health/safety" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setCitizenSeverity(s.value as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      citizenSeverity === s.value
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600/20 shadow-xs"
                        : "border-stone-200 bg-stone-50/50 text-stone-600 hover:border-stone-300 hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-100">
            <button
              onClick={handleProceedFromProblem}
              disabled={savingStep}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50"
            >
              {savingStep ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Next: Administrative Location <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 2: Location */}
      {/* ==================================================================== */}
      {step === 2 && (
        <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-stone-900">Step 2: Administrative Location</h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Standardized location ensures your challenge reaches regional officers and nearby research institutions.
            </p>
          </div>

          {/* Quick GPS Location Button */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-emerald-700" />
                Device Location (GPS)
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {gpsStatus || "Optional: Capture current device coordinates for pinpoint mapping"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 shrink-0 transition"
            >
              📍 Capture Location
            </button>
          </div>

          <div className="space-y-4">
            {/* District Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">
                District <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
              >
                <option value="">-- Select District (Jharkhand) --</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Block Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Administrative Block <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBlockId}
                disabled={!selectedDistrictId}
                onChange={(e) => setSelectedBlockId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition disabled:opacity-50"
              >
                <option value="">
                  {selectedDistrictId ? "-- Select Block --" : "Select District first"}
                </option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Village / Locality Free Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Village, Tola, Ward, or Locality <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Sukhurhutu Tola, near Primary School"
                value={villageLocality}
                onChange={(e) => setVillageLocality(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
              />
            </div>

            {/* Affected Population */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Estimated Affected Population <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., ~120 families / 600 residents"
                value={affectedPopulation}
                onChange={(e) => setAffectedPopulation(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleProceedFromLocation}
              disabled={savingStep}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50"
            >
              {savingStep ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Next: Evidence (Optional) <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 3: Optional Evidence */}
      {/* ==================================================================== */}
      {step === 3 && (
        <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-stone-900">Step 3: Add Evidence (Optional)</h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Evidence is optional. You may skip this step or upload photos, documents, or reports to corroborate the issue.
            </p>
          </div>

          {/* Upload Zone */}
          <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/50 p-6 text-center space-y-3 hover:bg-stone-50 transition">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-800">
                Upload photos, test reports, or documents
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                PNG, JPEG, WEBP, PDF, or MP4 (Max 15 MB)
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition">
                {uploadingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" /> Choose File
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,text/plain"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Uploaded Evidence List */}
          {evidenceList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-stone-700">
                Attached Evidence ({evidenceList.length})
              </h4>
              <div className="space-y-2">
                {evidenceList.map((ev) => {
                  const isVideo = ev.evidence_type === "VIDEO" || ev.mime_type?.startsWith("video/") || ev.title?.match(/\.(mp4|webm|mov)$/i);
                  const isPhoto = ev.evidence_type === "PHOTO" || ev.mime_type?.startsWith("image/") || ev.title?.match(/\.(jpg|jpeg|png|webp)$/i);
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isVideo ? (
                          <Video className="h-4 w-4 text-purple-600 shrink-0" />
                        ) : (
                          <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate font-medium text-stone-800">{ev.title}</span>
                        {isVideo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                            VIDEO
                          </span>
                        )}
                        {isPhoto && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                            PHOTO
                          </span>
                        )}
                        {!isVideo && !isPhoto && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700">
                            DOCUMENT
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvidence(ev.id)}
                        className="p-1 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition"
            >
              Next: Review & Submit <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 4: Review & Submit */}
      {/* ==================================================================== */}
      {step === 4 && (
        <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-stone-900">Step 4: Review Problem Summary</h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Please check your information before submitting for official verification.
            </p>
          </div>

          {/* Immutability Notice Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-950">Notice on Immutability:</span> Once submitted, this challenge becomes locked and cannot be modified while undergoing administrative verification.
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs space-y-3">
            <div>
              <span className="text-stone-500 block text-[11px] font-medium uppercase tracking-wider">Problem Title</span>
              <p className="font-bold text-stone-900 text-sm mt-0.5">{title}</p>
            </div>

            <div>
              <span className="text-stone-500 block text-[11px] font-medium uppercase tracking-wider">Description</span>
              <p className="text-stone-800 mt-0.5 whitespace-pre-wrap leading-relaxed">{description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
              <div>
                <span className="text-stone-500 block text-[11px] font-medium uppercase tracking-wider">District & Block</span>
                <p className="font-semibold text-stone-800 mt-0.5">
                  {currentDistrictName}, {currentBlockName}
                </p>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px] font-medium uppercase tracking-wider">Locality / Village</span>
                <p className="font-semibold text-stone-800 mt-0.5">
                  {villageLocality || "Not specified"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
              <div>
                <span className="text-stone-500 block text-[11px] font-medium uppercase tracking-wider">Citizen Severity</span>
                <p className="font-semibold text-stone-800 mt-0.5 capitalize">
                  {citizenSeverity.replace("_", " ").toLowerCase()}
                </p>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px] font-medium uppercase tracking-wider">Evidence Attached</span>
                <p className="font-semibold text-stone-800 mt-0.5">
                  {evidenceList.length} file(s) attached
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Confirm & Submit Challenge
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubmitChallengePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading submission wizard...</div>}>
      <SubmissionWizardContent />
    </Suspense>
  );
}
