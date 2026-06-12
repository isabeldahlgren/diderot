"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function NavHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-gray-200 py-4">
      <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          OpenAuthor
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-500">{user.name}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-gray-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900">
                Sign in
              </Link>
              <Link href="/register" className="text-sm px-4 py-1.5 border border-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
                Register
              </Link>
            </>
          )}
          <Link
            href="/submit"
            className="text-sm px-4 py-1.5 border border-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
          >
            Submit paper
          </Link>
        </div>
      </div>
    </header>
  );
}
