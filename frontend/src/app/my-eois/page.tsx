"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MyEoisPage() {
  const router = useRouter();

  useEffect(() => {
    // Architectural migration: EOI model replaced with Proposed Solutions & Open Collaboration Workspace
    router.replace("/university-dashboard");
  }, [router]);

  return (
    <div className="min-h-screen py-16 flex flex-col items-center justify-center text-stone-500 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      <p className="text-sm font-medium">
        Redirecting to University Solutions &amp; Collaboration Workspace...
      </p>
    </div>
  );
}
