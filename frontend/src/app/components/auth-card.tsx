"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserProfile } from "../../lib/auth-context";
import { formatUserRole, formatOrganizationType } from "../../lib/utils";
import {
  Shield,
  Users,
  GraduationCap,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ExternalLink,
  Sparkles,
  LogOut,
  Award,
  Globe2,
  Clock,
  Loader2,
  ChevronRight,
  Compass,
  FileCheck2,
} from "lucide-react";

export type EntryType = "citizen" | "university" | "industry" | "government";

interface EntryOption {
  id: EntryType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  loginHint: string;
  loginButtonText: string;
  bullets: string[];
}

const ENTRY_OPTIONS: EntryOption[] = [
  {
    id: "citizen",
    title: "Citizen",
    subtitle: "Community innovators & residents",
    icon: Users,
    accentColor: "border-emerald-300 hover:border-emerald-500 bg-emerald-50/40",
    badgeBorder: "border-emerald-200",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    loginHint: "Sign in with your citizen account to report or track community issues.",
    loginButtonText: "Sign In as Citizen",
    bullets: [
      "Report real societal problems across Jharkhand",
      "Track status and reviewer verification progress",
      "Confirm problems experienced in your community",
    ],
  },
  {
    id: "university",
    title: "University / Research Institution",
    subtitle: "HEIs, research labs, faculty & students",
    icon: GraduationCap,
    accentColor: "border-blue-300 hover:border-blue-500 bg-blue-50/40",
    badgeBorder: "border-blue-200",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    loginHint: "Sign in with your institutional administrator or researcher credentials.",
    loginButtonText: "Sign In to University Portal",
    bullets: [
      "Discover verified societal challenges matching your domain",
      "Showcase research labs and specialized capabilities",
      "Manage institutional Capability Passport & availability",
    ],
  },
  {
    id: "industry",
    title: "Industry / Startup / MSME",
    subtitle: "Enterprises, technology providers & startups",
    icon: Building2,
    accentColor: "border-amber-300 hover:border-amber-500 bg-amber-50/40",
    badgeBorder: "border-amber-200",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    loginHint: "Sign in with your corporate, startup, or enterprise credentials.",
    loginButtonText: "Sign In to Industry Portal",
    bullets: [
      "Showcase technology, manufacturing & prototyping assets",
      "Offer mentorship, hardware access, or technical support",
      "Manage organizational availability & collaboration capacity",
    ],
  },
  {
    id: "government",
    title: "Government / Reviewer",
    subtitle: "District officers, reviewers & administrators",
    icon: ShieldCheck,
    accentColor: "border-stone-400 hover:border-stone-600 bg-stone-100/60",
    badgeBorder: "border-stone-300",
    badgeBg: "bg-stone-100",
    badgeText: "text-stone-800",
    loginHint: "Sign in with your verified government officer or administrator credentials.",
    loginButtonText: "Sign In to Government Portal",
    bullets: [
      "Review and validate pending citizen problem reports",
      "Govern verified ecosystem data & accreditation requests",
      "Monitor regional societal impact and policy interventions",
    ],
  },
];

export function AuthCard({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const { user, loading, login, register, logout } = useAuth();

  // Role entry path selection
  const [selectedEntry, setSelectedEntry] = useState<EntryType>("citizen");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Feedback states
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [multiOrgChoices, setMultiOrgChoices] = useState<any[] | null>(null);

  const activeOption = ENTRY_OPTIONS.find((opt) => opt.id === selectedEntry) || ENTRY_OPTIONS[0];

  const showDemoAccounts = true; // Always available for evaluation and jury assessment

  // =========================================================================
  // INTELLIGENT POST-LOGIN ROUTING
  // =========================================================================
  const routeUserAfterLogin = (loggedInUser?: UserProfile) => {
    if (redirectTo) {
      router.push(redirectTo);
      return;
    }

    if (!loggedInUser) {
      router.push("/challenges");
      return;
    }

    const activeMemberships = (loggedInUser.memberships || []).filter(
      (m) => m.membership_status === "ACTIVE"
    );

    // 1. Government Officers & Administrators -> Executive Government Dashboard
    if (
      loggedInUser.role === "PLATFORM_ADMIN" ||
      loggedInUser.role === "GOVERNMENT_OFFICER" ||
      loggedInUser.role === "GOVERNMENT_ADMIN"
    ) {
      router.push("/government-dashboard");
      return;
    }

    // 2. University Admins & Faculty -> University Experience Dashboard
    if (
      loggedInUser.role === "UNIVERSITY_ADMIN" ||
      loggedInUser.role === "FACULTY"
    ) {
      router.push("/university-dashboard");
      return;
    }

    // 3. Industry Admins & Members -> Organization Capability Passport
    if (
      loggedInUser.role === "INDUSTRY_ADMIN" ||
      loggedInUser.role === "INDUSTRY_MEMBER"
    ) {
      const verifiedOrgId =
        loggedInUser.primaryOrganization?.id ||
        activeMemberships[0]?.organization_id;
      if (verifiedOrgId) {
        router.push(`/organizations/${verifiedOrgId}/passport`);
        return;
      }
      router.push("/challenges");
      return;
    }

    // 4. Citizen / Community Innovator -> My Challenges & Civic Redressal
    if (loggedInUser.role === "CITIZEN") {
      router.push("/my-challenges");
      return;
    }

    // 5. Default fallback
    router.push("/challenges");
  };

  // =========================================================================
  // SUBMISSION HANDLERS
  // =========================================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        setFormError(res.error || "Authentication failed. Please verify your credentials.");
      } else {
        setFormSuccess("Signed in successfully! Redirecting...");
        setTimeout(() => {
          routeUserAfterLogin(res.user);
        }, 500);
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.error || "Registration failed. Please try again.");
      } else {
        setFormSuccess(
          "Account created successfully! You may now sign in with your credentials."
        );
        setActiveTab("login");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred during registration.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick fill demo credentials helper
  const handleQuickFill = (
    demoEmail: string,
    demoPass: string,
    entryType: EntryType,
    roleLabel: string = "Demo Account"
  ) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setSelectedEntry(entryType);
    setFormError(null);
    setFormSuccess(
      `✓ Loaded demo credentials for ${roleLabel}. Click "${activeOption.loginButtonText || 'Sign In'}" below to enter the dashboard.`
    );
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-stone-200 text-center shadow-sm">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-2"></div>
        <p className="text-xs text-stone-500">Verifying session...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MULTI-ORGANIZATION SELECTION
  // =========================================================================
  if (multiOrgChoices && multiOrgChoices.length > 0) {
    return (
      <div className="civic-card p-6 sm:p-8 text-left space-y-6">
        <div className="space-y-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" /> Multiple Organizations Detected
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Select Organization Workspace</h2>
          <p className="text-xs text-stone-600 max-w-md mx-auto">
            Your account is associated with multiple verified organizations. Choose which institutional workspace or Capability Passport you wish to access:
          </p>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {multiOrgChoices.map((membership) => (
            <button
              key={membership.id || membership.organization_id}
              onClick={() => router.push(`/organizations/${membership.organization_id}/passport`)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:border-emerald-500 hover:bg-white transition-all text-left group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                    {membership.organization_name || "Verified Organization"}
                  </span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                    {membership.organization_role || "MEMBER"}
                  </span>
                </div>
                <p className="text-xs text-stone-600">
                  {formatOrganizationType(membership.organization_type)} • Active Membership
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold group-hover:translate-x-1 transition-transform">
                <span>Access Passport</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={() => router.push("/challenges")}
            className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            Skip to Challenges
          </button>
          <button
            onClick={() => setMultiOrgChoices(null)}
            className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: AUTHENTICATED USER STATE
  // =========================================================================
  if (user) {
    const primaryOrg = user.primaryOrganization || null;
    const activeMemberships = (user.memberships || []).filter(
      (m) => m.membership_status === "ACTIVE"
    );
    const hasMultipleOrgs = activeMemberships.length > 1;
    const activeMembership = activeMemberships[0];
    const orgId = primaryOrg?.id || activeMembership?.organization_id;
    const isReviewer =
      user.role === "PLATFORM_ADMIN" ||
      user.role === "GOVERNMENT_OFFICER" ||
      user.role === "GOVERNMENT_ADMIN";

    return (
      <div className="civic-card p-6 sm:p-8 text-left space-y-6">
        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900">{user.name}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Shield className="w-3.5 h-3.5" />
                {formatUserRole(user.role)}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-mono">{user.email}</p>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-red-700 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Institutional Context Card */}
        {hasMultipleOrgs ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>Associated Organizations ({activeMemberships.length})</span>
              </div>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 border border-blue-200">
                MULTIPLE AFFILIATIONS
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your account has active memberships across multiple organizations. Select a workspace to access its Capability Passport:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {activeMemberships.map((m) => (
                <Link
                  key={m.id || m.organization_id}
                  href={`/organizations/${m.organization_id}/passport`}
                  className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white hover:border-emerald-500 hover:shadow-xs transition text-left group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors truncate">
                      {m.organization_name || "Organization"}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate">
                      {formatOrganizationType(m.organization_type)} • {m.organization_role}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ) : orgId ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Linked Institution: {primaryOrg?.name || activeMembership?.organization_name || "Institution"}</span>
              </div>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                CLAIMED & ACTIVE
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your account is authorized as an institutional administrator with verified Capability Passport access.
            </p>
            <div className="pt-1 flex flex-wrap gap-2">
              <Link
                href={`/organizations/${orgId}/passport`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <Award className="w-3.5 h-3.5" /> Open Capability Passport
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-800">
                Institutional Affiliation Status: Unaffiliated Citizen Identity
              </span>
              <span className="rounded bg-stone-200 px-2 py-0.5 text-[10px] text-stone-700 font-mono">
                CITIZEN
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              You can freely report community problems, track challenges, and validate shared issues. If you represent a university or enterprise, you can claim your institution from the ecosystem registry or submit an onboarding request.
            </p>
            <div className="pt-1 flex flex-wrap gap-2">
              <Link
                href="/organizations/onboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" /> Onboard Your Institution
              </Link>
              <Link
                href="/challenges"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
              >
                <Compass className="w-3.5 h-3.5" /> Explore Challenges
              </Link>
            </div>
          </div>
        )}

        {/* Quick Navigation CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/challenges/new"
            className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-xs font-semibold text-emerald-900 transition-all group"
          >
            <span>Report a Societal Problem</span>
            <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </Link>

          {isReviewer ? (
            <Link
              href="/reviewer-queue"
              className="flex items-center justify-between p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-xs font-semibold text-amber-900 transition-all group"
            >
              <span>Government Review Queue</span>
              <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link
              href="/my-challenges"
              className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 transition-all group shadow-2xs"
            >
              <span>View My Submitted Challenges</span>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ROLE-ORIENTED ENTRY & AUTHENTICATION FORMS
  // =========================================================================
  return (
    <div className="civic-card p-6 sm:p-8 text-left space-y-6">
      {/* Brand Header & Purpose Explanation */}
      <div className="text-center space-y-2 pb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold tracking-wide uppercase mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          SamadhanSetu Portal
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          How will you use SamadhanSetu?
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
          Connect real societal problems with the people and institutions capable of solving them.
        </p>

        {/* Security & Access Clarity Disclaimer */}
        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 mt-2 max-w-2xl mx-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Selecting a category personalizes your entry flow. System roles, administrative privileges, and institutional access are verified securely by the server upon authentication.
          </span>
        </div>
      </div>

      {/* Role-Oriented Entry Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ENTRY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedEntry === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelectedEntry(option.id);
                setFormError(null);
                setFormSuccess(null);
                if (option.id === "government" && activeTab === "register") {
                  setActiveTab("login");
                }
              }}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between relative group ${
                isSelected
                  ? `border-emerald-600 bg-emerald-50/30 shadow-sm ring-1 ring-emerald-600/30`
                  : `border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs`
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${option.badgeBorder} ${option.badgeBg} ${option.badgeText}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 ring-4 ring-emerald-600/20"></span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-stone-900 tracking-tight">{option.title}</h3>
                <p className="text-[11px] text-stone-600 mt-1 leading-snug">{option.subtitle}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100">
                <ul className="space-y-1.5 text-[10px] text-stone-600">
                  {option.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-700 mt-0.5">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Entry Confirmation & Form Switcher */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-5 space-y-5">
        {/* Active Purpose Banner & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${activeOption.badgeBorder} ${activeOption.badgeBg} ${activeOption.badgeText} shrink-0`}
            >
              {activeOption.title} Portal
            </span>
            <span className="text-xs text-stone-400 hidden sm:inline">•</span>
            <span className="text-xs text-stone-600 break-words">{activeOption.loginHint}</span>
          </div>

          <div className="inline-flex rounded-lg bg-stone-200/60 p-1 border border-stone-300 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`px-3.5 py-1 text-xs font-semibold rounded-md transition ${
                activeTab === "login"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={selectedEntry === "government"}
              onClick={() => {
                setActiveTab("register");
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`px-3.5 py-1 text-xs font-semibold rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === "register"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Inline Alerts */}
        {formError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === "login" && (
          <>
            {/* DEMO / EVALUATION ACCOUNTS FOR JURY */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-stone-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold tracking-tight text-amber-950">
                    Evaluation & Demo Accounts (Jury Access)
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Click to Fill
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Click any role to populate verified demo credentials and explore that role&apos;s real dashboard:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill("citizen@example.com", "Password123!", "citizen", "Citizen Innovator (Aarav Verma)")}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                    email === "citizen@example.com"
                      ? "bg-emerald-100 border-emerald-400 font-semibold text-emerald-900 ring-1 ring-emerald-400 shadow-xs"
                      : "bg-white hover:bg-emerald-50/50 border-stone-200 text-stone-800"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">Citizen</div>
                    <div className="text-[10px] text-stone-500 truncate">4 Verified Reports</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("dean@nitjsr.ac.in", "NitJsr123!", "university", "University Dean (NIT Jamshedpur)")}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                    email === "dean@nitjsr.ac.in"
                      ? "bg-blue-100 border-blue-400 font-semibold text-blue-900 ring-1 ring-blue-400 shadow-xs"
                      : "bg-white hover:bg-blue-50/50 border-stone-200 text-stone-800"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">University (NIT Jsr)</div>
                    <div className="text-[10px] text-stone-500 truncate">Dean of R&amp;C</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("admin@bau.ac.in", "Password123!", "university", "University Dean (BAU)")}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                    email === "admin@bau.ac.in"
                      ? "bg-blue-100 border-blue-400 font-semibold text-blue-900 ring-1 ring-blue-400 shadow-xs"
                      : "bg-white hover:bg-blue-50/50 border-stone-200 text-stone-800"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">University (BAU)</div>
                    <div className="text-[10px] text-stone-500 truncate">Agri Research Dean</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("admin@tatasteel.com", "Password123!", "industry", "Industry Lead (Tata Steel)")}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                    email === "admin@tatasteel.com"
                      ? "bg-amber-100 border-amber-400 font-semibold text-amber-900 ring-1 ring-amber-400 shadow-xs"
                      : "bg-white hover:bg-amber-50/50 border-stone-200 text-stone-800"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">Industry (Tata)</div>
                    <div className="text-[10px] text-stone-500 truncate">Sustainability Lead</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("officer@jharkhand.gov.in", "Officer123!", "government", "District Technical Officer (Ranchi)")}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                    email === "officer@jharkhand.gov.in"
                      ? "bg-stone-200 border-stone-400 font-semibold text-stone-900 ring-1 ring-stone-400 shadow-xs"
                      : "bg-white hover:bg-stone-100 border-stone-200 text-stone-800"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">Gov Reviewer</div>
                    <div className="text-[10px] text-stone-500 truncate">Ranchi Officer</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("admin@samadhansetu.gov.in", "Admin123!", "government", "Platform Administrator")}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                    email === "admin@samadhansetu.gov.in"
                      ? "bg-purple-100 border-purple-400 font-semibold text-purple-900 ring-1 ring-purple-400 shadow-xs"
                      : "bg-white hover:bg-purple-50/50 border-stone-200 text-stone-800"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">Platform Admin</div>
                    <div className="text-[10px] text-stone-500 truncate">Statewide Access</div>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.gov.in / name@institution.ac.in"
                  className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-stone-700">
                  Password <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  <span>{activeOption.loginButtonText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            {/* Switch to Register link */}
            <div className="text-center pt-2">
              <p className="text-xs text-stone-500">
                New to SamadhanSetu?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  Create an account
                </button>
              </p>
            </div>
          </form>
        </>
      )}

        {/* REGISTER FORM */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Guidance for Institutional users */}
            {(selectedEntry === "university" || selectedEntry === "industry") && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-1.5 text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold text-blue-900">
                  🏛️ Organizational Registration Guidance:
                </p>
                <p className="text-[11px] text-stone-600">
                  1. If your organization already exists in our ecosystem registry, you can claim administrative access after creating your account.
                </p>
                <p className="text-[11px] text-stone-600">
                  2. If your organization is not listed, you can submit an official onboarding request.
                </p>
                <div className="pt-1 flex items-center gap-3 text-[11px]">
                  <Link href="/challenges" className="text-emerald-700 hover:underline font-semibold">
                    Browse Ecosystem
                  </Link>
                  <span className="text-stone-300">•</span>
                  <Link href="/organizations/onboard" className="text-blue-700 hover:underline font-semibold">
                    Submit Onboarding Request
                  </Link>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prof. Ramesh Kumar"
                    className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Contact Phone (Optional)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@institution.ac.in"
                  className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Password (min 8 characters) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-stone-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  Sign in to your account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Quick Fill Dev Credentials Bar (for testing/evaluation) */}
        {showDemoAccounts && (
          <div className="pt-3 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-600">
              <span className="font-semibold">⚡ Quick Demo Accounts:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill("citizen@example.com", "Password123!", "citizen", "Citizen Innovator (Aarav Verma)")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-emerald-800 border border-stone-200 shadow-2xs transition font-medium"
                >
                  Citizen
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("dean@nitjsr.ac.in", "NitJsr123!", "university", "University Dean (NIT Jamshedpur)")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-blue-800 border border-stone-200 shadow-2xs transition font-medium"
                >
                  University (NIT Jamshedpur)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin@bau.ac.in", "Password123!", "university", "University Dean (BAU)")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-blue-800 border border-stone-200 shadow-2xs transition font-medium"
                >
                  University (BAU)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin@tatasteel.com", "Password123!", "industry", "Industry Lead (Tata Steel)")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-amber-800 border border-stone-200 shadow-2xs transition font-medium"
                >
                  Industry (Tata)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("officer@jharkhand.gov.in", "Officer123!", "government", "District Technical Officer (Ranchi)")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 shadow-2xs transition font-medium"
                >
                  Gov Reviewer
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin@samadhansetu.gov.in", "Admin123!", "government", "Platform Administrator")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-purple-800 border border-stone-200 shadow-2xs transition font-medium"
                >
                  Platform Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
