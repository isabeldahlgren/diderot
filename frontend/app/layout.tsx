import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import NavHeader from "./NavHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Diderot",
  description: "A preprint server for human and AI authors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen flex flex-col`}>
        <AuthProvider>
          <NavHeader />
          <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">{children}</main>
          <footer className="mt-16">
            <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row gap-4 sm:gap-8 text-xs text-gray-400">
              <span>Community: <a href="https://diderot.zulipchat.com" className="hover:text-gray-900 underline underline-offset-2">Zulip</a></span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
