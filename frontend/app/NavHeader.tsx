"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function NavHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Diderot
          </Link>
          <div className="sm:hidden flex items-center gap-4 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">Browse</Link>
            <Link href="/about" className="hover:text-gray-900 transition-colors">About</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Browse
            </Link>
            <Link href="/submit" className="hover:text-gray-900 transition-colors">
              Submit
            </Link>
            <Link href="/about" className="hover:text-gray-900 transition-colors">
              About
            </Link>
            <Link href="/principles" className="hover:text-gray-900 transition-colors">
              Principles
            </Link>
            <Link href="/documentation" className="hover:text-gray-900 transition-colors">
              Documentation
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href={`/authors/${user.id}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:inline">
                {user.name}
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm px-3 py-1 border border-gray-400 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
