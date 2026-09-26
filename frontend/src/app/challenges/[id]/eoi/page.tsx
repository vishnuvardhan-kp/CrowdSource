"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ChallengeEoiRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/solutions/new?challengeId=${id}`);
    } else {
      router.replace("/solutions");
    }
  }, [id, router]);

  return (
    <div className="min-h-screen py-16 flex flex-col items-center justify-center text-stone-500 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      <p className="text-sm font-medium">
        Redirecting to Proposed Solution Workspace...
      </p>
    </div>
  );
}
