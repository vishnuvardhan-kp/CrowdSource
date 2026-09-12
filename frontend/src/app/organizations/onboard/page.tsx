"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import {
  Building2,
  Globe2,
  MapPin,
  Mail,
  Phone,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Shield,
  Loader2,
  Award,
} from "lucide-react";

export default function OrganizationOnboardPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    organization_type: "ACADEMIC",
    registration_number: "",
    email: "",
    website: "",
    phone: "",
    address: "",
    district: "Ranchi",
    state: "Jharkhand",
    geographic_reach: "STATEWIDE",
    verification_document_url: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please sign in or register an account before onboarding your institution.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`${apiUrl}/organizations/onboarding-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = Array.isArray(data.message) ? data.message.join(", ") : data.message || "Failed to submit request";
        throw new Error(errorMsg);
      }

      setSubmittedId(data.id || "REQ-RECEIVED");
    } catch (err: any) {
      setError(err.message || "An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Header Breadcrumbs */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/challenges"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Challenges
        </Link>
      </div>

      {submittedId ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">
            Onboarding Application Received!
          </h2>
          <p className="text-sm text-stone-600 max-w-lg mx-auto mb-6">
            Thank you for registering <span className="font-semibold text-emerald-800">{formData.name}</span> with SamadhanSetu. Platform administrators will verify institutional accreditation and authorize your administrative credentials.
          </p>

          <div className="inline-block rounded-xl bg-stone-50 border border-stone-200 px-5 py-3 text-xs text-stone-600 mb-8">
            Application Reference: <span className="font-mono text-emerald-800 font-bold">{submittedId}</span>
          </div>

          <div className="flex justify-center gap-4">
            <Link
              href="/challenges"
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition-colors"
            >
              Explore Challenges
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Title Banner */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60 uppercase tracking-wide">
                  Ecosystem Onboarding
                </span>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
                  Register Your Institution / Enterprise
                </h1>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
              Connect your university, research lab, industrial enterprise, or startup with Jharkhand&apos;s societal innovation grid. Once approved, your organization receives a verified Capability Passport, automated AI challenge matching, and institutional credential elevation.
            </p>
          </div>

          {/* Warning if unauthenticated */}
          {!token && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-amber-900 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                <span>You must be signed in to submit an institutional onboarding application.</span>
              </div>
              <Link
                href="/login"
                className="rounded-xl bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 whitespace-nowrap shadow-sm transition"
              >
                Sign In Now
              </Link>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Institution Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Institution / Organization Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. National Institute of Advanced Materials, Ranchi"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* Organization Type */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Organization Type *
                </label>
                <select
                  name="organization_type"
                  value={formData.organization_type}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                >
                  <option value="ACADEMIC">ACADEMIC (University / College)</option>
                  <option value="R_AND_D_INSTITUTE">R&D INSTITUTE (Research Lab)</option>
                  <option value="INDUSTRY">INDUSTRY (Corporate Enterprise)</option>
                  <option value="STARTUP">STARTUP (Innovation Venture)</option>
                  <option value="COMMUNITY_ORG">COMMUNITY ORG (NGO / Society)</option>
                </select>
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Official Registration ID / AISHE Code *
                </label>
                <input
                  type="text"
                  name="registration_number"
                  required
                  value={formData.registration_number}
                  onChange={handleChange}
                  placeholder="e.g. AISHE-U-0123 / CIN U72200JH2021..."
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Official Contact Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@institution.ac.in"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Website URL
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.institution.ac.in"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Official Telephone / Contact Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 651 2233445"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* Geographic Reach */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Geographic Operational Reach *
                </label>
                <select
                  name="geographic_reach"
                  value={formData.geographic_reach}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                >
                  <option value="DISTRICT">DISTRICT (Local Community Focus)</option>
                  <option value="STATEWIDE">STATEWIDE (State-level Operational Scale)</option>
                  <option value="NATIONAL">NATIONAL (Pan-India Research / Delivery)</option>
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  District *
                </label>
                <input
                  type="text"
                  name="district"
                  required
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="e.g. Ranchi, Dhanbad, Bokaro"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Jharkhand"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Physical Campus / Corporate Address
                </label>
                <textarea
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Main Campus Road, Knowledge City, Ranchi - 834001"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
              </div>

              {/* Verification Document URL */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Accreditation / Incorporation Document URL *
                </label>
                <input
                  type="url"
                  name="verification_document_url"
                  required
                  value={formData.verification_document_url}
                  onChange={handleChange}
                  placeholder="https://... (UGC/AICTE approval, MCA Certificate of Incorporation, or Official Registry Document)"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/10 transition"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Provide a direct URL to official scanned documents for platform administrator verification.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !token}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting Application...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" /> Submit Institutional Onboarding Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
