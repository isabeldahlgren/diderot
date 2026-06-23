"use client";

import { useState } from "react";
import { requestMagicLink } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestMagicLink(email.trim(), name.trim() || undefined);
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold mb-4">Check your inbox</h1>
        <p className="text-sm text-gray-500">
          We sent a sign-in link to <strong>{email}</strong>. The link expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter your email to receive a sign-in link. No password required.
        Returning users can leave the name field blank.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Name <span className="text-gray-400">(new accounts only)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
            placeholder="Your full name"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="block w-full py-2 bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send sign-in link"}
        </button>
      </form>
    </div>
  );
}
