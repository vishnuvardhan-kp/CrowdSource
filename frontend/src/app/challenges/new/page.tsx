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
  Landmark,
  ShieldCheck,
  Mic,
  MicOff,
  Square,
  Users,
  Volume2,
  Sparkles,
  Play,
  User as UserIcon,
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

  // Submission Capacity & Community Group State
  const [verifiedMemberships, setVerifiedMemberships] = useState<any[]>([]);
  const [submissionMode, setSubmissionMode] = useState<"INDIVIDUAL" | "COMMUNITY" | "INSTITUTIONAL">("INDIVIDUAL");
  const [communityGroupName, setCommunityGroupName] = useState<string>("");
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>("");

  // Web Voice Assistant State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioEvidenceUrl, setAudioEvidenceUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceTranslation, setVoiceTranslation] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceRecordedBlob, setVoiceRecordedBlob] = useState<Blob | null>(null);

  // Load user's verified institutional memberships
  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/institution-memberships/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const verified = data.filter((m) => m.authority_status === "VERIFIED");
          setVerifiedMemberships(verified);
          const requestedInstId = searchParams.get("institutionId");
          const requestedMemId = searchParams.get("membershipId");
          if (requestedMemId && verified.some((m) => m.id === requestedMemId)) {
            setSubmissionMode("INSTITUTIONAL");
            setSelectedMembershipId(requestedMemId);
            const found = verified.find((m) => m.id === requestedMemId);
            if (found?.institution?.district_id) setSelectedDistrictId(found.institution.district_id);
            if (found?.institution?.block_id) setSelectedBlockId(found.institution.block_id);
          } else if (requestedInstId && verified.some((m) => m.institution_id === requestedInstId)) {
            const found = verified.find((m) => m.institution_id === requestedInstId);
            if (found) {
              setSubmissionMode("INSTITUTIONAL");
              setSelectedMembershipId(found.id);
              if (found.institution?.district_id) setSelectedDistrictId(found.institution.district_id);
              if (found.institution?.block_id) setSelectedBlockId(found.institution.block_id);
            }
          }
        }
      })
      .catch((err) => console.error("Failed to load user verified memberships:", err));
  }, [apiUrl, token, searchParams]);

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

  // Voice recording timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    setVoiceError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError("Microphone recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setVoiceRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
        await processVoiceAudio(audioBlob);
      };

      recorder.start(250);
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err: any) {
      console.error("Recording error:", err);
      setVoiceError("Could not access microphone: " + (err.message || "Permission denied"));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processVoiceAudio = async (audioBlob: Blob) => {
    if (!token) return;
    setIsTranscribing(true);
    setVoiceError(null);
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes("webm") ? "webm" : "mp4";
      formData.append("file", audioBlob, `voice-report.${ext}`);

      const transcribeRes = await fetch(`${apiUrl}/voice/transcribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errJson = await transcribeRes.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to transcribe voice recording.");
      }

      const transcribeData = await transcribeRes.json();
      setVoiceTranscript(transcribeData.originalTranscript);
      setVoiceTranslation(transcribeData.englishTranslation);
      if (transcribeData.audioUrl) {
        setAudioEvidenceUrl(transcribeData.audioUrl);
      }

      // Analyze voice turn to extract structured fields
      const promptText = transcribeData.englishTranslation || transcribeData.originalTranscript;
      const turnRes = await fetch(`${apiUrl}/voice/analyze-turn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentTranscript: promptText,
          conversationHistory: [],
        }),
      });

      if (turnRes.ok) {
        const analysis = await turnRes.json();
        if (analysis.title && (!title || title.length < 5)) {
          setTitle(analysis.title);
        }
        if (analysis.problem_statement && (!description || description.length < 10)) {
          setDescription(analysis.problem_statement);
        }
        if (analysis.villageLocality && !villageLocality) {
          setVillageLocality(analysis.villageLocality);
        }
        if (analysis.districtId && !selectedDistrictId) {
          setSelectedDistrictId(analysis.districtId);
        }
        if (analysis.blockId && !selectedBlockId) {
          setSelectedBlockId(analysis.blockId);
        }
      } else if (!description) {
        setDescription(transcribeData.englishTranslation || transcribeData.originalTranscript);
        if (!title) {
          const words = (transcribeData.englishTranslation || transcribeData.originalTranscript).split(" ").slice(0, 8).join(" ");
          setTitle(words);
        }
      }
    } catch (err: any) {
      console.error("Voice processing error:", err);
      setVoiceError(err.message || "Failed to process audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

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

    const selectedMem = verifiedMemberships.find((m) => m.id === selectedMembershipId);
    const bodyPayload: any = {
      title: title.trim(),
      description: description.trim(),
      citizen_severity: citizenSeverity,
    };

    if (submissionMode === "INSTITUTIONAL" && selectedMem) {
      bodyPayload.reporter_type = selectedMem.institution?.type || "PRI";
      bodyPayload.institution_id = selectedMem.institution_id;
      bodyPayload.institution_membership_id = selectedMem.id;
    } else if (submissionMode === "COMMUNITY") {
      bodyPayload.reporter_type = "COMMUNITY";
      bodyPayload.community_group_name = communityGroupName.trim() || "Community Group / Collective";
    } else {
      bodyPayload.reporter_type = "INDIVIDUAL";
    }

    if (audioEvidenceUrl) {
      bodyPayload.audio_evidence_url = audioEvidenceUrl;
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
          body: JSON.stringify(bodyPayload),
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
          body: JSON.stringify(bodyPayload),
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
              Pending Administrative Review
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

          {/* Submission Capacity Selector: Individual / Community Group / Institutional */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-emerald-600" />
                Submission Capacity
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center gap-1">
                {submissionMode === "INSTITUTIONAL" ? "Official Representative" : submissionMode === "COMMUNITY" ? "Collective Submission" : "Individual Citizen"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                  submissionMode === "INDIVIDUAL"
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-medium shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="submissionMode"
                  value="INDIVIDUAL"
                  checked={submissionMode === "INDIVIDUAL"}
                  onChange={() => setSubmissionMode("INDIVIDUAL")}
                  className="sr-only"
                />
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Individual Citizen
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Submit problem as an individual community member</div>
              </label>

              <label
                className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                  submissionMode === "COMMUNITY"
                    ? "border-blue-600 bg-blue-50/50 text-blue-950 font-medium shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="submissionMode"
                  value="COMMUNITY"
                  checked={submissionMode === "COMMUNITY"}
                  onChange={() => setSubmissionMode("COMMUNITY")}
                  className="sr-only"
                />
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Community Group / Collective
                </div>
                <div className="text-[11px] text-slate-500 mt-1">SHG, Farmer Collective, Youth Club, Resident Association</div>
              </label>

              <label
                className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                  submissionMode === "INSTITUTIONAL"
                    ? "border-purple-600 bg-purple-50/50 text-purple-950 font-medium shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="submissionMode"
                  value="INSTITUTIONAL"
                  checked={submissionMode === "INSTITUTIONAL"}
                  onChange={() => {
                    setSubmissionMode("INSTITUTIONAL");
                    if (!selectedMembershipId && verifiedMemberships[0]) {
                      setSelectedMembershipId(verifiedMemberships[0].id);
                      if (verifiedMemberships[0].institution?.district_id) {
                        setSelectedDistrictId(verifiedMemberships[0].institution.district_id);
                      }
                      if (verifiedMemberships[0].institution?.block_id) {
                        setSelectedBlockId(verifiedMemberships[0].institution.block_id);
                      }
                    }
                  }}
                  className="sr-only"
                />
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Panchayat / Local Body
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Official verified PRI, ULB, or Department representation</div>
              </label>
            </div>

            {/* Community Group Name Input */}
            {submissionMode === "COMMUNITY" && (
              <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Community Group / Collective Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maa Durga Self-Help Group, Kisan Vikas Sangh, Ward 12 Youth Club"
                  value={communityGroupName}
                  onChange={(e) => setCommunityGroupName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  Community group submissions receive collective verification weight and are open for solution matching directly.
                </p>
              </div>
            )}

            {/* Institutional Membership Selector */}
            {submissionMode === "INSTITUTIONAL" && (
              <div className="pt-2 border-t border-slate-200/70 space-y-2">
                {verifiedMemberships.length > 0 ? (
                  <>
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Verified Local Body
                    </label>
                    <select
                      value={selectedMembershipId}
                      onChange={(e) => {
                        setSelectedMembershipId(e.target.value);
                        const mem = verifiedMemberships.find((m) => m.id === e.target.value);
                        if (mem?.institution?.district_id) setSelectedDistrictId(mem.institution.district_id);
                        if (mem?.institution?.block_id) setSelectedBlockId(mem.institution.block_id);
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {verifiedMemberships.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.institution?.name} (LGD: {m.institution?.lgd_code}) - {m.designation}
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const activeMem = verifiedMemberships.find((m) => m.id === selectedMembershipId) || verifiedMemberships[0];
                      if (!activeMem) return null;
                      return (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Submitting on behalf of <strong>{activeMem.institution?.name}</strong> (LGD: {activeMem.institution?.lgd_code}) as <strong>{activeMem.designation}</strong>
                            </span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                            PRI/ULB Verified
                          </span>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <p className="font-semibold">No verified institutional affiliation found</p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      To submit on behalf of a Gram Panchayat or Urban Local Body, link and verify your appointment through the{" "}
                      <Link href="/institutions/onboard" className="underline font-bold hover:text-amber-950">
                        Local Body Onboarding Portal
                      </Link>
                      , or proceed as an Individual or Community Collective.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Web Voice Problem Assistant Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">Voice Problem Assistant (Multilingual)</h3>
                  <p className="text-[11px] text-stone-600">Speak in Hindi, Santali, Nagpuri, Tamil, or English to auto-populate this form</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Sparkles className="w-3 h-3 text-emerald-700" /> AI Speech-to-Text
              </span>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  <Mic className="w-4 h-4 text-emerald-200" />
                  {voiceTranscript ? "Record Again" : "Start Voice Recording"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop Recording ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")})
                </button>
              )}

              {isTranscribing && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Transcribing & structuring problem statement...
                </div>
              )}
            </div>

            {voiceError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{voiceError}</span>
              </div>
            )}

            {/* Voice Recording Result & Player */}
            {voiceTranscript && (
              <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                <div className="p-3 rounded-lg bg-white/90 border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      Recorded Speech Recognized
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Persistent Audio Evidence Linked
                    </span>
                  </div>
                  <p className="text-stone-700 italic">&ldquo;{voiceTranscript}&rdquo;</p>
                  {voiceTranslation && voiceTranslation !== voiceTranscript && (
                    <div className="text-[11px] text-stone-600 border-t border-stone-100 pt-1.5">
                      <span className="font-semibold text-stone-700">English Translation: </span>
                      {voiceTranslation}
                    </div>
                  )}

                  {/* Audio Player if URL available */}
                  {audioEvidenceUrl && (
                    <div className="pt-1">
                      <audio controls className="w-full h-8 rounded" src={`${apiUrl.replace("/api", "")}${audioEvidenceUrl}`}>
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50"
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

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-stone-100">
            <button
              onClick={() => setStep(1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleProceedFromLocation}
              disabled={savingStep}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50"
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
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {isVideo ? (
                          <Video className="h-4 w-4 text-purple-600 shrink-0" />
                        ) : (
                          <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate font-medium text-stone-800 break-words min-w-0">{ev.title}</span>
                        {isVideo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
                            VIDEO
                          </span>
                        )}
                        {isPhoto && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                            PHOTO
                          </span>
                        )}
                        {!isVideo && !isPhoto && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700 shrink-0">
                            DOCUMENT
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvidence(ev.id)}
                        className="p-1 rounded-lg text-stone-400 hover:text-red-600 transition-colors shrink-0"
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

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-stone-100">
            <button
              onClick={() => setStep(2)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition"
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
                  {evidenceList.length + (audioEvidenceUrl ? 1 : 0)} file(s) attached {audioEvidenceUrl ? "(includes voice recording)" : ""}
                </p>
              </div>
            </div>

            {/* Submission Capacity Summary */}
            <div className="pt-2 border-t border-stone-200">
              <span className="text-stone-500 block text-[11px] font-medium uppercase tracking-wider">
                Submission Capacity
              </span>
              {submissionMode === "INSTITUTIONAL" && selectedMembershipId ? (
                (() => {
                  const m = verifiedMemberships.find((x) => x.id === selectedMembershipId);
                  return (
                    <div className="mt-1 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">Official Institutional Challenge:</span> {m?.institution?.name} (LGD: {m?.institution?.lgd_code})
                        <div className="text-[10px] text-emerald-700">
                          Authorized Representative: {m?.designation} • {m?.relationship}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : submissionMode === "COMMUNITY" ? (
                <div className="mt-1 flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold">Community Group / Collective:</span> {communityGroupName || "Community Collective"}
                    <div className="text-[10px] text-blue-700">
                      Submitted on behalf of local collective / association
                    </div>
                  </div>
                </div>
              ) : (
                <p className="font-semibold text-stone-800 mt-0.5">Individual Citizen Submission</p>
              )}
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
