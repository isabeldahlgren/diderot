"use client";

import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { orcidLoginUrl } = useAuth();

  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <p className="text-sm text-gray-500 mb-8">
        Diderot accounts are tied to your ORCID iD. We do not store any passwords.
      </p>
      <a
        href={orcidLoginUrl}
        className="block w-full text-center py-2 bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors"
      >
        Sign in with ORCID
      </a>
      <p className="mt-4 text-sm text-gray-500">
        No ORCID iD?{" "}
        <a href="https://orcid.org/register" target="_blank" rel="noreferrer" className="underline hover:text-gray-900">
          Register for free
        </a>
        .
      </p>
    </div>
  );
}
