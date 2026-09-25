"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth-context";
import {
  ForumMessage,
  getForumMessages,
  saveForumMessage,
  clearForumMessages,
  seedDemoForumMessages,
} from "../../../../lib/forum-storage";
import {
  evaluateForumAccess,
  ForumAccessEvaluation,
} from "../../../../lib/forum-access";
import { formatDateSafe } from "../../../../lib/utils";
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  Building2,
  GraduationCap,
  Briefcase,
  Shield,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Clock,
  Lock,
  RefreshCw,
  Trash2,
  AlertCircle,
  Info,
  User,
  HeartHandshake,
  Check,
  FolderGit2,
} from "lucide-react";

function ChallengeForumContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = params?.id as string;
  const queryProjectId = searchParams?.get("projectId") || null;
  const { user, token, loading: authLoading } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [challenge, setChallenge] = useState<any | null>(null);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessEvaluation, setAccessEvaluation] =
    useState<ForumAccessEvaluation | null>(null);

  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch Challenge, Solutions, and Projects to evaluate access
  const fetchData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      // 1. Fetch Challenge Details
      const chRes = await fetch(`${apiUrl}/challenges/${challengeId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let chData = null;
      if (chRes.ok) {
        chData = await chRes.json();
        setChallenge(chData);
      }

      // 2. Fetch Proposed Solutions for this challenge
      let solItems: any[] = [];
      try {
        const solRes = await fetch(`${apiUrl}/solutions?challenge_id=${challengeId}`);
        if (solRes.ok) {
          const solData = await solRes.json();
          solItems = solData.items || (Array.isArray(solData) ? solData : []);
          setSolutions(solItems);
        }
      } catch (err) {
        console.warn("Failed to fetch solutions for forum access:", err);
      }

      // 3. Fetch User Projects & explicit target project if specified
      let projItems: any[] = [];
      const targetProjectId =
        queryProjectId ||
        solItems.find((s: any) => s.project_id)?.project_id ||
        (chData?.projects && chData.projects[0]?.id) ||
        null;

      if (token && targetProjectId) {
        try {
          const directProjRes = await fetch(`${apiUrl}/projects/${targetProjectId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (directProjRes.ok) {
            const directProj = await directProjRes.json();
            if (directProj && directProj.id) {
              projItems.push(directProj);
            }
          }
        } catch (err) {
          console.warn("Direct project fetch for forum access:", err);
        }
      }

      if (token) {
        try {
          const projRes = await fetch(`${apiUrl}/projects`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (projRes.ok) {
            const projData = await projRes.json();
            const arr = Array.isArray(projData) ? projData : [];
            for (const p of arr) {
              if (!projItems.some((existing) => existing.id === p.id)) {
                projItems.push(p);
              }
            }
          }
        } catch (err) {
          console.warn("Failed to fetch projects for forum access:", err);
        }
      }
      setProjects(projItems);

      // 4. Evaluate Access
      if (chData) {
        const evaluation = evaluateForumAccess(chData, solItems, projItems, user);
        setAccessEvaluation(evaluation);
      }

      // 5. Load Stored Messages from LocalStorage
      const stored = getForumMessages(challengeId);
      setMessages(stored);
    } catch (err) {
      console.error("Error loading forum data:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, challengeId, queryProjectId, token, user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom("auto");
  }, [messages.length]);

  // Handle Send Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending || !accessEvaluation || !accessEvaluation.canAccess) {
      return;
    }

    setSending(true);
    try {
      const senderRole = accessEvaluation.userForumRole || "CITIZEN";
      const senderName = user?.name || accessEvaluation.citizen?.name || "Participant";
      const orgName = accessEvaluation.effectiveOrgName || null;
      const orgType = accessEvaluation.effectiveOrgType || null;
      const orgId = accessEvaluation.effectiveOrgId || null;

      const created = saveForumMessage(challengeId, {
        senderId: user?.id || "local-user",
        senderName,
        senderRole,
        organizationId: orgId,
        organizationName: orgName,
        organizationType: orgType,
        message: trimmed,
      });

      setMessages((prev) => [...prev, created]);
      setInputText("");
      setTimeout(() => {
        scrollToBottom("smooth");
        textareaRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error("Failed to save forum message:", err);
    } finally {
      setSending(false);
    }
  };

  // Keyboard shortcut: Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Seed Demo Conversation
  const handleSeedDemo = () => {
    if (!challengeId) return;
    const seeded = seedDemoForumMessages(challengeId, {
      citizenName: challenge?.submitter?.name || "Anoop Minz",
      universityName:
        accessEvaluation?.acceptedUniversity?.name ||
        "National Institute of Technology, Jamshedpur",
      industryName:
        accessEvaluation?.acceptedCollaborators[0]?.name ||
        "Tata Steel CSR / Engineering Partner",
      problemTitle: challenge?.title || "Damaged Road Infrastructure",
    });
    setMessages(seeded);
    setSeedNotice("Sample stakeholder demonstration discussion loaded.");
    setTimeout(() => setSeedNotice(null), 4000);
    setTimeout(() => scrollToBottom("smooth"), 100);
  };

  // Clear Discussion
  const handleClearDiscussion = () => {
    clearForumMessages(challengeId);
    setMessages([]);
    setShowClearConfirm(false);
    setSeedNotice("Forum messages reset.");
    setTimeout(() => setSeedNotice(null), 3000);
  };

  // Helper for Role Badges
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "CITIZEN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <User className="h-3 w-3" /> Citizen Submitter
          </span>
        );
      case "UNIVERSITY":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 border border-indigo-200">
            <GraduationCap className="h-3 w-3" /> University Team
          </span>
        );
      case "INDUSTRY":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <Briefcase className="h-3 w-3" /> Industry Partner
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
            <Shield className="h-3 w-3" /> Administrative Authority
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 border border-stone-200">
            Participant
          </span>
        );
    }
  };

  // Quick prompt suggestions
  const quickPrompts = [
    "Could you share the expected timeline for the prototype development?",
    "Our team has completed preliminary analysis and is ready to schedule field validation.",
    "We can provide hardware components, lab instrumentation, and mentoring support.",
    "Can we arrange a site visit to inspect local site conditions in the district?",
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3 text-stone-600">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
          <span className="text-sm font-medium">Verifying forum authorization...</span>
        </div>
      </div>
    );
  }

  // Unauthorized Access Guard
  if (!accessEvaluation || !accessEvaluation.canAccess) {
    return (
      <div className="min-h-[80vh] bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="max-w-xl w-full rounded-2xl border border-red-200 bg-white p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-600 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Communication Forum Access Restricted
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
              Only participants connected to this problem or project can access this discussion.
            </p>
          </div>

          {!accessEvaluation?.isAvailable && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                Problem Lifecycle Status
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                The communication forum activates automatically once an academic institution (Higher Education Institution) accepts this challenge and submits a proposed solution or kickoff plan.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {accessEvaluation?.projectId ? (
              <Link
                href={`/projects/${accessEvaluation.projectId}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
              >
                <FolderGit2 className="w-4 h-4" /> Return to Project Workspace
              </Link>
            ) : null}
            <Link
              href={`/challenges/${challengeId}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Problem Overview
            </Link>
            {!user && (
              <Link
                href={`/login?redirectTo=/challenges/${challengeId}/forum`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Sign In to Verify Access
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-12">
      {/* Top Header & Navigation */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Link
                  href={`/challenges/${challengeId}`}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Problem
                </Link>
                <span>/</span>
                <span className="text-stone-700 font-medium">Communication Forum</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight break-words">
                  {challenge?.title || "Problem Stakeholder Communication Forum"}
                </h1>
                {challenge?.district && (
                  <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 border border-stone-200">
                    {challenge.district}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                  <Sparkles className="h-3 w-3" /> Multi-Stakeholder Forum
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {accessEvaluation.projectId && (
                <Link
                  href={`/projects/${accessEvaluation.projectId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
                >
                  <FolderGit2 className="h-3.5 w-3.5" /> Open Project Workspace
                </Link>
              )}

              <div className="inline-flex items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Demo (Local Storage)</span>
              </div>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-stone-100 transition"
                title="Reset Forum Conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Active Stakeholder Participation Strip */}
          <div className="mt-4 pt-3 border-t border-stone-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Users className="h-3.5 w-3.5 text-stone-400" /> Stakeholders:
                </span>

                {accessEvaluation.participantsList.map((part) => (
                  <div
                    key={part.id + part.role}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition ${
                      part.isCurrentUser
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold shadow-2xs"
                        : "bg-stone-50 border-stone-200 text-stone-700"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        part.role === "CITIZEN"
                          ? "bg-emerald-600"
                          : part.role === "UNIVERSITY"
                          ? "bg-indigo-600"
                          : "bg-amber-600"
                      }`}
                    />
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-stone-900">{part.name}</span>
                      <span className="text-[11px] text-stone-500">
                        ({part.role === "CITIZEN" ? "Citizen" : part.role === "UNIVERSITY" ? "University" : "Industry"})
                      </span>
                      {part.isCurrentUser && (
                        <span className="ml-1 rounded-md bg-emerald-200/80 px-1.5 py-0.2 text-[10px] font-bold text-emerald-900">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-stone-500">
                You are participating as:{" "}
                <span className="font-semibold text-stone-800">
                  {accessEvaluation.userForumRole === "CITIZEN"
                    ? "Citizen Submitter"
                    : accessEvaluation.userForumRole === "UNIVERSITY"
                    ? `University Partner (${accessEvaluation.effectiveOrgName || "Academic"})`
                    : accessEvaluation.userForumRole === "INDUSTRY"
                    ? `Industry Collaborator (${accessEvaluation.effectiveOrgName || "Partner"})`
                    : "Administrative Authority"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Seed Confirmation Alert */}
        {seedNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              {seedNotice}
            </span>
          </div>
        )}

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Are you sure you want to reset all messages in this local storage forum?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearDiscussion}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition"
              >
                Yes, Reset Forum
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message Thread Container */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col min-h-[500px]">
          {/* Thread Header Info */}
          <div className="p-4 border-b border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              <span className="font-semibold text-stone-800">Stakeholder Discussion Stream</span>
              <span>•</span>
              <span>{messages.length} message{messages.length === 1 ? "" : "s"}</span>
            </div>

            {messages.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDemo}
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold transition text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Load Demo Conversation
              </button>
            )}
          </div>

          {/* Message List */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[620px]">
            {messages.length === 0 ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-stone-900">
                    No Messages Yet in this Forum
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    This private forum connects the citizen submitter, participating university engineers, and industry partners to clarify requirements, coordinate testing, and discuss execution.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSeedDemo}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Load Realistic Stakeholder Demo Discussion
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMyMessage =
                  (user && msg.senderId === user.id) ||
                  (accessEvaluation.isCitizen && msg.senderRole === "CITIZEN" && msg.senderId.includes("citizen")) ||
                  (accessEvaluation.isUniversity && msg.senderRole === "UNIVERSITY" && msg.senderId.includes("university")) ||
                  (accessEvaluation.isIndustry && msg.senderRole === "INDUSTRY" && msg.senderId.includes("industry"));

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1.5 rounded-2xl p-4 border transition ${
                      isMyMessage
                        ? "bg-emerald-50/40 border-emerald-200 ml-4 sm:ml-12"
                        : msg.senderRole === "UNIVERSITY"
                        ? "bg-indigo-50/30 border-indigo-200/80 mr-4 sm:mr-12"
                        : msg.senderRole === "INDUSTRY"
                        ? "bg-amber-50/30 border-amber-200/80 mr-4 sm:mr-12"
                        : "bg-stone-50/50 border-stone-200 mr-4 sm:mr-12"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getRoleBadge(msg.senderRole)}
                        <span className="text-xs font-bold text-stone-900 break-words">
                          {msg.senderName}
                        </span>
                        {msg.organizationName && (
                          <span className="text-[11px] text-stone-500 font-medium">
                            • {msg.organizationName}
                          </span>
                        )}
                        {isMyMessage && (
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-stone-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateSafe(msg.timestamp)}</span>
                      </div>
                    </div>

                    <div className="pt-1 text-xs text-stone-800 leading-relaxed break-words whitespace-pre-wrap">
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2.5 bg-stone-50/80 border-t border-stone-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-stone-400 font-medium shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-600" /> Prompts:
              </span>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(prompt)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-emerald-800 hover:border-emerald-300 transition text-[11px] truncate max-w-[280px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Message Composer */}
          <div className="p-4 border-t border-stone-200 bg-white rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  placeholder={`Write as ${
                    accessEvaluation.userForumRole === "CITIZEN"
                      ? "Citizen Submitter"
                      : accessEvaluation.userForumRole === "UNIVERSITY"
                      ? "University Partner"
                      : accessEvaluation.userForumRole === "INDUSTRY"
                      ? "Industry Collaborator"
                      : "Participant"
                  }... (Press Enter to send, Shift+Enter for newline)`}
                  className="w-full resize-none rounded-xl border border-stone-300 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-stone-400">
                  <span>Press <kbd className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">Enter</kbd> to send, <kbd className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">Shift + Enter</kbd> for newline</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 text-xs font-semibold shadow-xs transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Message</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChallengeForumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6">
          <div className="flex items-center gap-3 text-stone-600">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
            <span className="text-sm font-medium">Verifying forum authorization...</span>
          </div>
        </div>
      }
    >
      <ChallengeForumContent />
    </Suspense>
  );
}
