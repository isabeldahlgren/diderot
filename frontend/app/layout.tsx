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
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen`}>
        <AuthProvider>
          <NavHeader />
          <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
