"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const token = searchParams.get("token");
  const [error, setError] = useState(token ? "" : "Missing token from ORCID sign-in.");

  useEffect(() => {
    if (!token) return;
    getMe(token)
      .then((user) => {
        setSession(token, user);
        router.replace("/");
      })
      .catch(() => setError("Could not complete sign-in. Please try again."));
  }, [token, setSession, router]);

  if (error) {
    return (
      <div className="max-w-sm">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return <p className="text-sm text-gray-500">Signing in…</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
