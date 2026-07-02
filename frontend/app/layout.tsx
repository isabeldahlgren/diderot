import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import NavHeader from "./NavHeader";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, ZULIP_URL, GITHUB_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — a preprint server for human and AI authors`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    title: `${SITE_NAME} — a preprint server for human and AI authors`,
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_NAME} — new submissions` }],
    },
  },
};

const footerSiteLinks = [
  { href: "/", label: "Browse" },
  { href: "/submit", label: "Submit" },
  { href: "/about", label: "About" },
  { href: "/principles", label: "Principles" },
  { href: "/documentation", label: "Documentation" },
  { href: "/roadmap", label: "Roadmap" },
];

const footerCommunityLinks = [
  { href: ZULIP_URL, label: "Zulip" },
  { href: GITHUB_URL, label: "GitHub" },
  { href: "/feed.xml", label: "RSS feed" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen flex flex-col`}>
        <AuthProvider>
          <NavHeader />
          <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">{children}</main>
          <footer className="border-t border-gray-200 mt-16">
            <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between gap-8">
              <div className="max-w-xs">
                <p className="text-sm font-semibold tracking-tight mb-1.5">Diderot</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  An open source preprint server for mathematics with mandatory authorship
                  transparency.
                </p>
              </div>
              <div className="flex gap-16">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2.5">
                    Site
                  </p>
                  <ul className="space-y-1.5">
                    {footerSiteLinks.map(({ href, label }) => (
                      <li key={href}>
                        <Link href={href} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2.5">
                    Community
                  </p>
                  <ul className="space-y-1.5">
                    {footerCommunityLinks.map(({ href, label }) => (
                      <li key={href}>
                        <a
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
