"use client";

import { Suspense } from "react";
import { AccessForm } from "@/components/AccessForm";

function AccessFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<AccessFallback />}>
      <AccessForm />
    </Suspense>
  );
}
