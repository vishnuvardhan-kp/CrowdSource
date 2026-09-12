"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth-context";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Upload,
  Trash2,
  Send,
  Save,
  MessageSquare,
  ShieldCheck,
  Award,
  Loader2,
  XCircle,
  HelpCircle,
  Users,
  Check,
  Sparkles,
} from "lucide-react";
import { formatDateSafe } from "../../../../lib/utils";

const CONTRIBUTION_TYPES = [
  { id: "RESEARCH", label: "Research & Analysis" },
  { id: "EXPERTISE", label: "Subject Matter Expertise" },
  { id: "FACULTY", label: "Faculty / Academic Oversight" },
  { id: "STUDENT_TEAM", label: "Student Innovation Team" },
  { id: "TECHNOLOGY", label: "Technology & Software" },
  { id: "PROTOTYPING", label: "Prototyping & Fabrication" },
  { id: "INFRASTRUCTURE", label: "Lab / Infrastructure Access" },
  { id: "TESTING", label: "Testing & Validation" },
  { id: "MENTORSHIP", label: "Mentorship & Capacity Building" },
  { id: "FIELD_IMPLEMENTATION", label: "Field Implementation" },
  { id: "MANUFACTURING", label: "Manufacturing & Production" },
  { id: "DEPLOYMENT", label: "Pilot Deployment" },
  { id: "CSR_SUPPORT", label: "CSR Program Support" },
  { id: "FUNDING_SUPPORT", label: "Financial / Co-Funding" },
  { id: "OTHER", label: "Other Support" },
];

const TIMELINE_OPTIONS = [
  { value: "LESS_THAN_3_MONTHS", label: "Less than 3 months (Rapid Pilot)" },
  { value: "THREE_TO_SIX_MONTHS", label: "3 to 6 months (Standard Solution)" },
  { value: "SIX_TO_TWELVE_MONTHS", label: "6 to 12 months (Comprehensive Project)" },
  { value: "MORE_THAN_12_MONTHS", label: "More than 12 months (Long-term Consortium)" },
];

/**
 * Generates sensible, context-aware demo default values for an Expression of Interest.
 * Allows instant demo readiness while remaining 100% user-editable before submission.
 */
function generateEoiDefaults(
  challenge: any,
  orgInfo: any,
  capabilities: any[] = [],
  user: any,
) {
  const challengeTitle = challenge?.title || "Farmer crops related disease detection";
  const challengeCategory = (challenge?.category || "").toUpperCase();
  const challengeDesc = (challenge?.description || "").toLowerCase();
  const district = challenge?.districtName || challenge?.district || "Ranchi";

  // Check if challenge is agricultural or farmer-oriented
  const isAgriContext =
    challengeCategory.includes("AGRI") ||
    challengeTitle.toLowerCase().includes("crop") ||
    challengeTitle.toLowerCase().includes("farm") ||
    challengeTitle.toLowerCase().includes("disease") ||
    challengeTitle.toLowerCase().includes("plant") ||
    challengeTitle.toLowerCase().includes("soil") ||
    challengeDesc.includes("crop") ||
    challengeDesc.includes("disease") ||
    challengeDesc.includes("farm");

  // Determine institution name: prioritize active org if set, otherwise default to Birsa Agricultural University for agricultural challenges
  const orgName =
    orgInfo?.name && orgInfo.name !== "Your Organization"
      ? orgInfo.name
      : isAgriContext
      ? "Birsa Agricultural University"
      : "Birla Institute of Technology, Mesra";

  // Check if water / sanitation context
  const isWaterContext =
    challengeCategory.includes("WATER") ||
    challengeCategory.includes("SANITATION") ||
    challengeTitle.toLowerCase().includes("water") ||
    challengeTitle.toLowerCase().includes("borewell");

  if (isAgriContext) {
    return {
      motivation:
        "Birsa Agricultural University is interested in addressing this challenge because of its academic and research focus on agriculture, crop health, and farmer-oriented innovation. Our institution can contribute domain expertise, agricultural research support, field validation, and collaboration with local farming communities to develop a practical and scalable crop disease detection solution.",
      proposedContribution:
        "Develop and validate a practical prototype for early crop disease identification, establish a field-tested workflow for farmer use, and generate evidence for potential scaling across similar agricultural communities. The proposed collaboration aims to improve early identification of crop diseases, reduce avoidable crop losses, strengthen access to agricultural expertise, and provide farmers with a practical technology-assisted decision-support mechanism.",
      proposedApproach:
        "We propose to collaborate on an AI-assisted crop disease detection solution using farmer-submitted crop images, agricultural domain knowledge, and field validation. The initial phase would focus on collecting representative crop disease images, developing and validating the detection workflow, and conducting controlled field trials with farmers and agricultural experts in Ranchi.",
      resourceSummary:
        "Faculty and agricultural experts, student researchers, crop pathology expertise, field-testing support, access to agricultural research facilities, and farmer/community outreach networks. Funding requirements to be determined jointly during the project scoping and pilot planning stage.",
      timeline: "THREE_TO_SIX_MONTHS",
      timelineNotes:
        "Phase 1 (0–2 months): Problem study, dataset preparation and expert validation.\nPhase 2 (2–4 months): Prototype development and testing.\nPhase 3 (4–6 months): Field validation with selected farmers and refinement.\nPhase 4 (6+ months): Pilot evaluation and scalability assessment.",
      selectedContributions: [
        "RESEARCH",
        "EXPERTISE",
        "FACULTY",
        "STUDENT_TEAM",
        "PROTOTYPING",
        "TESTING",
        "FIELD_IMPLEMENTATION",
        "DEPLOYMENT",
      ],
      leadName: user?.name || "Dr. S. K. Singh",
      leadDesignation: "Dean of Agriculture / Principal Investigator",
      leadEmail: user?.email || "dean.agriculture@bau.ac.in",
      leadPhone: user?.phone || "+91 94311 02845",
    };
  }

  if (isWaterContext) {
    return {
      motivation:
        `${orgName} is committed to addressing critical drinking water and sanitation challenges in ${district}. Our institution specializes in water purification, remote environmental monitoring, and community-level technical interventions with dedicated faculty researchers and analytical testing laboratories.`,
      proposedContribution:
        "Field testing, water quality assaying, deployment of mobile water filtration units, and community-level validation to restore clean potable water. The collaboration aims to mitigate waterborne health hazards, establish sustainable local filtration oversight, and deliver verified public health outcomes.",
      proposedApproach:
        `Comprehensive water contamination testing followed by rapid pilot deployment and weekly community filtration monitoring in ${district}. The project will evaluate chemical and microbiological parameters before and after filtration to ensure compliance with WHO and BIS standards.`,
      resourceSummary:
        "Environmental engineering faculty, postgraduate research scholars, laboratory spectrophotometer and microbial assay testing equipment, and mobile field testing unit. Funding requirements to be determined jointly during the project scoping and pilot planning stage.",
      timeline: "THREE_TO_SIX_MONTHS",
      timelineNotes:
        "Phase 1 (0–1 month): Laboratory testing and water source diagnostics.\nPhase 2 (1–3 months): Deployment of community filtration unit.\nPhase 3 (3–6 months): Ongoing water quality verification and local operational handover.",
      selectedContributions: [
        "RESEARCH",
        "EXPERTISE",
        "FACULTY",
        "STUDENT_TEAM",
        "TECHNOLOGY",
        "TESTING",
        "FIELD_IMPLEMENTATION",
      ],
      leadName: user?.name || "Dr. R. K. Sen",
      leadDesignation: "Dean of Research & Development",
      leadEmail: user?.email || "dean.rnd@bitmesra.ac.in",
      leadPhone: user?.phone || "+91 98765 43210",
    };
  }

  return {
    motivation:
      `${orgName} is interested in addressing this challenge because of our institutional focus on applied research, community-oriented innovation, and regional development in ${district}. We can contribute specialized technical domain expertise, field validation support, and multidisciplinary faculty and student participation to develop a practical and scalable solution.`,
    proposedContribution:
      `Develop and validate a practical prototype and operational methodology tailored to this challenge, establish a field-tested implementation workflow, and generate evidence for potential scaling across ${district} and Jharkhand. The collaboration aims to provide direct technical assistance, reduce problem severity, and deliver measurable civic impact.`,
    proposedApproach:
      `We propose a structured collaborative approach comprising initial problem analysis and stakeholder consultation, design and prototyping of the technical solution, controlled field validation in ${district}, and joint evaluation with government and community partners.`,
    resourceSummary:
      "Multidisciplinary faculty researchers, technical specialists, student innovation team, laboratory and computing facilities, and field testing networks. Funding requirements to be determined jointly during the project scoping and pilot planning stage.",
    timeline: "THREE_TO_SIX_MONTHS",
    timelineNotes:
      "Phase 1 (0–2 months): Problem study and solution architecture.\nPhase 2 (2–4 months): Prototype development and initial testing.\nPhase 3 (4–6 months): Field deployment and pilot evaluation.",
    selectedContributions: [
      "RESEARCH",
      "EXPERTISE",
      "FACULTY",
      "STUDENT_TEAM",
      "TESTING",
      "FIELD_IMPLEMENTATION",
    ],
    leadName: user?.name || "Lead Institutional Researcher",
    leadDesignation: "Department Head / Principal Investigator",
    leadEmail: user?.email || "lead.research@institution.edu",
    leadPhone: user?.phone || "+91 98765 43210",
  };
}

export default function EoiSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params?.id as string;

  const { user, token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [challenge, setChallenge] = useState<any>(null);
  const [existingEoi, setExistingEoi] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawReason, setWithdrawReason] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [motivation, setMotivation] = useState<string>("");
  const [proposedContribution, setProposedContribution] = useState<string>("");
  const [proposedApproach, setProposedApproach] = useState<string>("");
  const [resourceSummary, setResourceSummary] = useState<string>("");
  const [timeline, setTimeline] = useState<string>("THREE_TO_SIX_MONTHS");
  const [timelineNotes, setTimelineNotes] = useState<string>("");
  const [leadName, setLeadName] = useState<string>("");
  const [leadDesignation, setLeadDesignation] = useState<string>("");
  const [leadEmail, setLeadEmail] = useState<string>("");
  const [leadPhone, setLeadPhone] = useState<string>("");
  const [selectedContributions, setSelectedContributions] = useState<string[]>([]);
  const [declared, setDeclared] = useState<boolean>(false);

  // Evidence state
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const orgInfo = user?.primaryOrganization || {
    id: user?.memberships?.[0]?.organization_id,
    name: user?.memberships?.[0]?.organization_name || "Your Organization",
    organization_type: user?.memberships?.[0]?.organization_type || "INSTITUTION",
    district: "Ranchi",
    state: "Jharkhand",
  };

  const fetchChallengeAndEoi = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const cRes = await fetch(`${apiUrl}/challenges/${challengeId}`);
      if (!cRes.ok) throw new Error("Could not load challenge details.");
      const cData = await cRes.json();
      setChallenge(cData);

      // Optionally resolve organization capabilities for context
      let capabilities: any[] = [];
      const targetOrgId = user?.primaryOrganization?.id || user?.memberships?.[0]?.organization_id;
      if (targetOrgId && token) {
        try {
          const passRes = await fetch(`${apiUrl}/organizations/${targetOrgId}/passport`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (passRes.ok) {
            const passData = await passRes.json();
            capabilities = passData.capabilities || passData.technicalCapabilities || [];
          }
        } catch {
          // Non-blocking capability lookup
        }
      }

      const defaults = generateEoiDefaults(cData, orgInfo, capabilities, user);

      if (token) {
        // Fetch user's existing EOIs to see if one matches this challenge
        const eoiRes = await fetch(`${apiUrl}/eois/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (eoiRes.ok) {
          const myEois = await eoiRes.json();
          const match = myEois.find((e: any) => e.challenge_id === challengeId);

          if (match) {
            // Load full EOI details
            const detailRes = await fetch(`${apiUrl}/eois/${match.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (detailRes.ok) {
              const fullEoi = await detailRes.json();
              setExistingEoi(fullEoi);
              setMotivation(fullEoi.motivation || defaults.motivation);
              setProposedContribution(fullEoi.proposed_contribution || defaults.proposedContribution);
              setProposedApproach(fullEoi.proposed_approach || defaults.proposedApproach);
              setResourceSummary(fullEoi.resource_summary || defaults.resourceSummary);
              setTimeline(fullEoi.timeline || defaults.timeline);
              setTimelineNotes(fullEoi.timeline_notes || defaults.timelineNotes);
              setLeadName(fullEoi.collaboration_lead_name || defaults.leadName);
              setLeadDesignation(fullEoi.collaboration_lead_designation || defaults.leadDesignation);
              setLeadEmail(fullEoi.collaboration_lead_email || defaults.leadEmail);
              setLeadPhone(fullEoi.collaboration_lead_phone || defaults.leadPhone);
              setSelectedContributions(
                fullEoi.contributions && fullEoi.contributions.length > 0
                  ? fullEoi.contributions.map((c: any) => c.contribution_type)
                  : defaults.selectedContributions,
              );
              setEvidenceList(fullEoi.evidence || []);
              if (fullEoi.status === "DRAFT" || fullEoi.status === "DISCUSSION_REQUIRED") {
                setDeclared(true);
              }
              return;
            }
          }
        }
      }

      // Populate context-aware default values for faster demo interaction (100% user-editable)
      setMotivation(defaults.motivation);
      setProposedContribution(defaults.proposedContribution);
      setProposedApproach(defaults.proposedApproach);
      setResourceSummary(defaults.resourceSummary);
      setTimeline(defaults.timeline);
      setTimelineNotes(defaults.timelineNotes);
      setSelectedContributions(defaults.selectedContributions);
      setLeadName(defaults.leadName);
      setLeadDesignation(defaults.leadDesignation);
      setLeadEmail(defaults.leadEmail);
      setLeadPhone(defaults.leadPhone);
      setDeclared(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, challengeId, token, user, orgInfo]);

  const applyDefaults = useCallback(
    (forceOverride: boolean = false) => {
      const defaults = generateEoiDefaults(challenge, orgInfo, [], user);
      if (forceOverride || !motivation) setMotivation(defaults.motivation);
      if (forceOverride || !proposedContribution) setProposedContribution(defaults.proposedContribution);
      if (forceOverride || !proposedApproach) setProposedApproach(defaults.proposedApproach);
      if (forceOverride || !resourceSummary) setResourceSummary(defaults.resourceSummary);
      if (forceOverride || !timeline) setTimeline(defaults.timeline);
      if (forceOverride || !timelineNotes) setTimelineNotes(defaults.timelineNotes);
      if (forceOverride || selectedContributions.length === 0) setSelectedContributions(defaults.selectedContributions);
      if (forceOverride || !leadName) setLeadName(defaults.leadName);
      if (forceOverride || !leadDesignation) setLeadDesignation(defaults.leadDesignation);
      if (forceOverride || !leadEmail) setLeadEmail(defaults.leadEmail);
      if (forceOverride || !leadPhone) setLeadPhone(defaults.leadPhone);
      setDeclared(true);
    },
    [
      challenge,
      orgInfo,
      user,
      motivation,
      proposedContribution,
      proposedApproach,
      resourceSummary,
      timeline,
      timelineNotes,
      selectedContributions,
      leadName,
      leadDesignation,
      leadEmail,
      leadPhone,
    ],
  );

  useEffect(() => {
    fetchChallengeAndEoi();
  }, [fetchChallengeAndEoi]);

  const toggleContribution = (id: string) => {
    setSelectedContributions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT":
        return { label: "Draft", style: "bg-stone-100 text-stone-700 border-stone-300" };
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return { label: "Under review", style: "bg-blue-50 text-blue-700 border-blue-200" };
      case "DISCUSSION_REQUIRED":
        return { label: "Changes requested", style: "bg-amber-50 text-amber-800 border-amber-300" };
      case "ACCEPTED":
        return { label: "Accepted", style: "bg-emerald-50 text-emerald-800 border-emerald-300" };
      case "REJECTED":
        return { label: "Not accepted", style: "bg-red-50 text-red-700 border-red-200" };
      case "WITHDRAWN":
        return { label: "Withdrawn", style: "bg-stone-100 text-stone-500 border-stone-200" };
      case "PROJECT_FORMED":
        return { label: "Collaboration formed", style: "bg-teal-50 text-teal-800 border-teal-300" };
      default:
        return { label: status, style: "bg-stone-100 text-stone-700 border-stone-200" };
    }
  };

  const handleSaveDraft = async () => {
    if (!token) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      motivation,
      proposed_contribution: proposedContribution,
      proposed_approach: proposedApproach,
      resource_summary: resourceSummary,
      timeline,
      timeline_notes: timelineNotes,
      collaboration_lead_name: leadName,
      collaboration_lead_designation: leadDesignation,
      collaboration_lead_email: leadEmail,
      collaboration_lead_phone: leadPhone,
      contributions: selectedContributions.map((t) => ({
        contribution_type: t,
        description: "",
      })),
    };

    try {
      if (existingEoi) {
        const res = await fetch(`${apiUrl}/eois/${existingEoi.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to update draft.");
        }
        const updated = await res.json();
        setExistingEoi(updated);
        setSuccessMessage("Draft updated successfully.");
      } else {
        const res = await fetch(`${apiUrl}/challenges/${challengeId}/eois`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create EOI draft.");
        }
        const created = await res.json();
        setExistingEoi(created);
        setSuccessMessage("Expression of Interest saved as draft.");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEoi = async (isResubmit: boolean = false) => {
    if (!token) return;
    if (!declared) {
      setErrorMessage("Please confirm the authorization declaration before submitting.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let targetEoiId = existingEoi?.id;

      // If no draft exists yet, save one first
      if (!targetEoiId) {
        const createRes = await fetch(`${apiUrl}/challenges/${challengeId}/eois`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            motivation,
            proposed_contribution: proposedContribution,
            proposed_approach: proposedApproach,
            resource_summary: resourceSummary,
            timeline,
            timeline_notes: timelineNotes,
            collaboration_lead_name: leadName,
            collaboration_lead_designation: leadDesignation,
            collaboration_lead_email: leadEmail,
            collaboration_lead_phone: leadPhone,
            contributions: selectedContributions.map((t) => ({
              contribution_type: t,
              description: "",
            })),
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.message || "Failed to initialize EOI submission.");
        }
        const created = await createRes.json();
        targetEoiId = created.id;
        setExistingEoi(created);
      } else {
        // Update draft with current edits
        await fetch(`${apiUrl}/eois/${targetEoiId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            motivation,
            proposed_contribution: proposedContribution,
            proposed_approach: proposedApproach,
            resource_summary: resourceSummary,
            timeline,
            timeline_notes: timelineNotes,
            collaboration_lead_name: leadName,
            collaboration_lead_designation: leadDesignation,
            collaboration_lead_email: leadEmail,
            collaboration_lead_phone: leadPhone,
            contributions: selectedContributions.map((t) => ({
              contribution_type: t,
              description: "",
            })),
          }),
        });
      }

      // Submit or Resubmit
      const endpoint = isResubmit
        ? `${apiUrl}/eois/${targetEoiId}/resubmit`
        : `${apiUrl}/eois/${targetEoiId}/submit`;

      const submitRes = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.message || "Failed to submit Expression of Interest.");
      }

      const submitted = await submitRes.json();
      setExistingEoi(submitted);
      setSuccessMessage(
        isResubmit
          ? "Expression of Interest resubmitted successfully! It is now under review."
          : "Expression of Interest submitted successfully! Reviewers will evaluate your proposal.",
      );
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!token || !existingEoi) return;
    setWithdrawing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${apiUrl}/eois/${existingEoi.id}/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: withdrawReason }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to withdraw EOI.");
      }

      const updated = await res.json();
      setExistingEoi(updated);
      setShowWithdrawModal(false);
      setSuccessMessage("Expression of Interest has been withdrawn.");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !existingEoi || !selectedFile) return;

    setUploadingFile(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", docTitle || selectedFile.name);
      formData.append("evidence_type", "TECHNICAL_PROPOSAL");

      const res = await fetch(`${apiUrl}/eois/${existingEoi.id}/evidence`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload document.");
      }

      const newEv = await res.json();
      setEvidenceList((prev) => [...prev, newEv]);
      setSelectedFile(null);
      setDocTitle("");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!token || !existingEoi) return;
    try {
      const res = await fetch(`${apiUrl}/eois/${existingEoi.id}/evidence/${evidenceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setEvidenceList((prev) => prev.filter((ev) => ev.id !== evidenceId));
      }
    } catch (err: any) {
      console.error("Failed to delete evidence:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16 flex flex-col items-center justify-center text-stone-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <p className="text-sm">Loading challenge and organization eligibility...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign In Required</h2>
        <p className="text-sm text-stone-600">
          You must be signed in as an authorized institutional representative to express interest in solving challenges.
        </p>
        <Link
          href={`/login?redirectTo=/challenges/${challengeId}/eoi`}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition"
        >
          Sign In to Continue
        </Link>
      </div>
    );
  }

  const isClosed = challenge?.status === "PROJECT_INITIATED";
  const isEditable = !existingEoi || existingEoi.status === "DRAFT" || existingEoi.status === "DISCUSSION_REQUIRED";
  const canWithdraw =
    existingEoi &&
    ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "DISCUSSION_REQUIRED"].includes(existingEoi.status);

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/challenges/${challengeId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Challenge Details
          </Link>

          {existingEoi && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Status:</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  getStatusLabel(existingEoi.status).style
                }`}
              >
                {getStatusLabel(existingEoi.status).label}
              </span>
            </div>
          )}
        </div>

        {/* Challenge Summary Banner */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              Societal Challenge
            </span>
            <span className="text-xs text-stone-500">
              {challenge?.districtName || challenge?.district}, Jharkhand
            </span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 leading-snug">
            {challenge?.title}
          </h1>
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {challenge?.description}
          </p>
        </div>

        {/* Closed Intake Notice */}
        {isClosed && (
          <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 flex items-start gap-3 text-teal-900">
            <CheckCircle2 className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-teal-900">
                Collaboration has already been formed for this challenge.
              </h4>
              <p className="text-xs text-teal-800 mt-1">
                A multi-organization project consortium has been initiated by the government review team. Intake for new Expressions of Interest is officially closed.
              </p>
            </div>
          </div>
        )}

        {/* Discussion Required Notice */}
        {existingEoi?.status === "DISCUSSION_REQUIRED" && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-amber-900">
            <div className="flex items-center gap-2 font-bold text-sm">
              <MessageSquare className="h-4 w-4 text-amber-700" />
              <span>Additional Information Requested by Reviewer</span>
            </div>
            <p className="text-xs text-stone-800 bg-white/80 p-3 rounded-xl border border-amber-200 leading-relaxed font-mono">
              &quot;
              {existingEoi.reviews?.find((r: any) => r.action === "REQUEST_DISCUSSION")?.reason ||
                "Please provide additional details on your proposed implementation and technical resources."}
              &quot;
            </p>
            <p className="text-[11px] text-amber-800">
              You may update your proposal below and click <strong>&quot;Resubmit for Review&quot;</strong> once ready.
            </p>
          </div>
        )}

        {/* Notification Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Section 1: Auto-populated Organization Overview */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Proposing Organization</h3>
            </div>
            <span className="text-[11px] text-stone-500">Auto-resolved from active membership</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-stone-500 block">Organization Name</span>
              <span className="font-bold text-stone-900">{orgInfo.name}</span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">Organization Type</span>
              <span className="font-semibold text-stone-900">{orgInfo.organization_type}</span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">Jurisdiction / Location</span>
              <span className="font-semibold text-stone-900">{orgInfo.district}, {orgInfo.state}</span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">Trust & Verification</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 mt-0.5">
                <ShieldCheck className="h-3 w-3" /> Verified Partner
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Main EOI Proposal Form */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-6 shadow-xs">
          <div className="border-b border-stone-200 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Collaboration Proposal Concept</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  An Expression of Interest is a preliminary commitment to solve this challenge. It is evaluated by reviewers to form multi-stakeholder project consortiums.
                </p>
              </div>
              {isEditable && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    Fields are pre-filled based on this challenge and your institution profile. Review and edit before submitting.
                  </span>
                  <button
                    type="button"
                    onClick={() => applyDefaults(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-[11px] font-medium transition shadow-2xs"
                    title="Re-populate demo defaults"
                  >
                    <Sparkles className="h-3 w-3 text-amber-600" />
                    Reset Defaults
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Motivation */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-900 block">
              1. Motivation & Mission Alignment <span className="text-red-600">*</span>
            </label>
            <p className="text-[11px] text-stone-500">
              Why is your organization interested in addressing this specific challenge?
            </p>
            <textarea
              rows={3}
              disabled={!isEditable}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Describe your institutional motivation, community mandate, or research focus..."
              className="w-full rounded-xl border border-stone-300 p-3 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50 disabled:text-stone-600"
            />
          </div>

          {/* Contribution Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-900 block">
              2. Proposed Contributions (Select all that apply) <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {CONTRIBUTION_TYPES.map((type) => {
                const isSelected = selectedContributions.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    disabled={!isEditable}
                    onClick={() => toggleContribution(type.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-600 text-emerald-900 font-bold"
                        : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                        isSelected ? "bg-emerald-700 border-emerald-700 text-white" : "border-stone-300"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proposed Contribution Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-900 block">
              3. Proposed Contribution Description <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              disabled={!isEditable}
              value={proposedContribution}
              onChange={(e) => setProposedContribution(e.target.value)}
              placeholder="Elaborate on what your organization can contribute (e.g. 5 solar filtration units, student deployment team, specialized laboratory assaying)..."
              className="w-full rounded-xl border border-stone-300 p-3 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50 disabled:text-stone-600"
            />
          </div>

          {/* Proposed Approach */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-900 block">
              4. Proposed Approach & Conceptual Architecture <span className="text-red-600">*</span>
            </label>
            <p className="text-[11px] text-stone-500">
              How do you plan to approach this problem? (Keep this as a proposal concept, not a full project plan)
            </p>
            <textarea
              rows={3}
              disabled={!isEditable}
              value={proposedApproach}
              onChange={(e) => setProposedApproach(e.target.value)}
              placeholder="Outline the technical strategy, community engagement approach, or deployment concept..."
              className="w-full rounded-xl border border-stone-300 p-3 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50 disabled:text-stone-600"
            />
          </div>

          {/* Resources */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-900 block">
              5. Resource Summary & Commitment <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={2}
              disabled={!isEditable}
              value={resourceSummary}
              onChange={(e) => setResourceSummary(e.target.value)}
              placeholder="Specific human resources, lab equipment, computing, co-funding, or field logistics you are committing..."
              className="w-full rounded-xl border border-stone-300 p-3 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50 disabled:text-stone-600"
            />
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-900 block">
                6. Estimated Timeline <span className="text-red-600">*</span>
              </label>
              <select
                disabled={!isEditable}
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50 disabled:text-stone-600 bg-white"
              >
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-900 block">
                Timeline Notes / Milestones
              </label>
              <input
                type="text"
                disabled={!isEditable}
                value={timelineNotes}
                onChange={(e) => setTimelineNotes(e.target.value)}
                placeholder="e.g. Month 1 prototype, Month 3 field trial..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50 disabled:text-stone-600"
              />
            </div>
          </div>

          {/* Collaboration Lead Contact (Snapshotted) */}
          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Collaboration Lead Contact (Snapshotted for Record)
              </h4>
              <p className="text-[11px] text-stone-500">
                Contact information for the principal investigator or organization representative responsible for this EOI.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-stone-500 block">Name *</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-500 block">Designation *</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={leadDesignation}
                  onChange={(e) => setLeadDesignation(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-500 block">Official Email *</label>
                <input
                  type="email"
                  disabled={!isEditable}
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-500 block">Phone *</label>
                <input
                  type="tel"
                  disabled={!isEditable}
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 p-2 text-xs focus:border-emerald-600 focus:outline-none disabled:bg-stone-50"
                />
              </div>
            </div>
          </div>

          {/* Section 3: EOI Supporting Documents */}
          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                EOI Supporting Documents
              </h4>
              <p className="text-[11px] text-stone-500">
                Upload technical proposals, cost estimates, or concept specifications specific to this EOI. (Isolated from your Capability Passport).
              </p>
            </div>

            {/* Evidence List */}
            {evidenceList && evidenceList.length > 0 ? (
              <div className="space-y-2">
                {evidenceList.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/60 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-blue-700 shrink-0" />
                      <span className="font-semibold text-stone-900 truncate">{ev.title}</span>
                      <span className="text-[10px] text-stone-500">({ev.file_name})</span>
                    </div>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEvidence(ev.id)}
                        className="text-stone-400 hover:text-red-600 p-1 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center rounded-xl border border-dashed border-stone-200 text-stone-400 text-xs">
                No supporting documents uploaded yet.
              </div>
            )}

            {/* Document Upload Input (Only if draft is created) */}
            {isEditable && existingEoi && (
              <form onSubmit={handleUploadEvidence} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Document Title (e.g. Technical Concept v1)"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-xs text-stone-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={uploadingFile || !selectedFile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 text-white px-4 py-2 text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 shrink-0 shadow-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingFile ? "Uploading..." : "Upload Document"}
                </button>
              </form>
            )}
          </div>

          {/* Section 4: Declaration Checkbox */}
          {isEditable && (
            <div className="border-t border-stone-200 pt-4">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>
                  I confirm that I am an authorized representative of <strong>{orgInfo.name}</strong>, that our organization possesses the required capabilities, and that this Expression of Interest is submitted in good faith for collaborative consortium review.
                </span>
              </label>
            </div>
          )}

          {/* Actions Bar */}
          <div className="border-t border-stone-200 pt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              {canWithdraw && (
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition"
                >
                  <XCircle className="h-4 w-4" />
                  Withdraw EOI
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isEditable && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Draft
                </button>
              )}

              {isEditable && (
                <button
                  type="button"
                  disabled={submitting || !declared || isClosed}
                  onClick={() => handleSubmitEoi(existingEoi?.status === "DISCUSSION_REQUIRED")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting
                    ? "Submitting..."
                    : existingEoi?.status === "DISCUSSION_REQUIRED"
                    ? "Resubmit for Review"
                    : "Submit Expression of Interest"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Withdraw Expression of Interest?</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                This will withdraw your proposal from the reviewer queue. An immutable audit record will be logged. You will be able to submit a new proposal in the future if desired.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-800 block">
                  Withdrawal Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="e.g. Schedule constraints, resource reallocation..."
                  className="w-full rounded-xl border border-stone-300 p-2 text-xs focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={withdrawing}
                  onClick={handleWithdraw}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {withdrawing ? "Withdrawing..." : "Confirm Withdrawal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
