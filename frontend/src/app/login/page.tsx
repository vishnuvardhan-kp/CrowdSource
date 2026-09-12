"use client";

import React from "react";
import Link from "next/link";
import { AuthCard } from "../components/auth-card";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-[85vh] flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative">
      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <Link
            href="/challenges"
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
          >
            Explore Challenges Without Signing In →
          </Link>
        </div>

        {/* Refined Role-Oriented Auth Card */}
        <AuthCard />
      </div>
    </main>
  );
}
