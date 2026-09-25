"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  Landmark,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  PlusCircle,
  FileText,
  MapPin,
  ExternalLink,
  ChevronRight,
  Loader2,
  ShieldAlert,
} from "lucide-react";

export default function InstitutionDashboardPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${apiUrl}/institution-memberships/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setMemberships(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load memberships:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [apiUrl, token]);

  if (authLoading || loading) {
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
            Please sign in to access your institutional representation workspace.
          </p>
          <Link
            href="/login?redirect=/institution-dashboard"
            className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  const verifiedMemberships = memberships.filter((m) => m.authority_status === "VERIFIED");
  const pendingMemberships = memberships.filter(
    (m) => m.authority_status === "PENDING" || m.authority_status === "UNDER_REVIEW" || m.authority_status === "AFFILIATION_PENDING",
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Institutional Representative Workspace
              </h1>
              <p className="text-sm text-slate-500">
                Panchayati Raj Institutions (PRI) & Urban Local Bodies (ULB) Management
              </p>
            </div>
          </div>

          <Link
            href="/institutions/onboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Apply for New Local Body
          </Link>
        </div>

        {/* Global Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* No Memberships CTA */}
        {memberships.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Landmark className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Institutional Affiliations Yet</h3>
            <p className="text-sm text-slate-600">
              Are you an elected representative, Mukhiya, Panchayat Secretary, Ward Councillor, or Local Body Officer?
              Get verified to submit official challenges on behalf of your Panchayat or Municipality.
            </p>
            <div className="pt-2">
              <Link
                href="/institutions/onboard"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                Start Institutional Verification
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Verified Affiliations Section */}
        {verifiedMemberships.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Verified Local Body Representations ({verifiedMemberships.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {verifiedMemberships.map((mem) => (
                <div
                  key={mem.id}
                  className="bg-white rounded-2xl border-2 border-emerald-500/40 p-6 shadow-sm space-y-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 pointer-events-none" />

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>SamadhanSetu Verified Institutional Representative</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{mem.institution?.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {mem.institution?.district_name || "Jharkhand"} {mem.institution?.block_name ? `• ${mem.institution.block_name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">Canonical LGD Code</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">{mem.institution?.lgd_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Your Designation</span>
                      <span className="font-bold text-slate-800 text-sm">{mem.designation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Authority Source</span>
                      <span className="font-medium text-slate-700">{mem.authority_source}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Verified On</span>
                      <span className="font-medium text-slate-700">
                        {mem.verified_at ? new Date(mem.verified_at).toLocaleDateString() : "Active"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <Link
                      href={`/challenges/new?institutionId=${mem.institution_id}&membershipId=${mem.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Submit Official Institutional Challenge
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Applications Section */}
        {pendingMemberships.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Applications Under Review ({pendingMemberships.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMemberships.map((mem) => (
                <div
                  key={mem.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {mem.authority_status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      LGD: {mem.institution?.lgd_code}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{mem.institution?.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Applied as: <strong>{mem.designation}</strong> ({mem.relationship})
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-600 space-y-1">
                    <p>
                      <strong>Documents Attached:</strong> {mem.evidence?.length || 0} file(s)
                    </p>
                    {mem.verification_notes && (
                      <p className="text-amber-800 font-medium">
                        Admin Note: {mem.verification_notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
