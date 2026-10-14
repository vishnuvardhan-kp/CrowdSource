"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useTranslation } from "../../lib/i18n";

export default function MyEoisPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Architectural migration: EOI model replaced with Proposed Solutions & Open Collaboration Workspace
    router.replace("/university-dashboard");
  }, [router]);

  return (
    <div className="min-h-screen py-16 flex flex-col items-center justify-center text-stone-500 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      <p className="text-sm font-medium">
        {t("common.redirecting", "Redirecting to University Solutions & Collaboration Workspace...")}
      </p>
    </div>
  );
}
