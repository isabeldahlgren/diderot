"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { addCertificate, type Certificate, type IssuerType } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-500 cursor-pointer flex items-center gap-2 whitespace-nowrap"
      >
        {selected?.label ?? value}
        <span className="text-gray-400 text-xs select-none">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-0.5 border border-gray-300 bg-white shadow-sm min-w-full">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                opt.value === value ? "text-gray-900 font-medium" : "text-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Certificate card ────────────────────────────────────────────────────────

function CertificateCard({ cert }: { cert: Certificate }) {
  const [open, setOpen] = useState(false);

  const issuerLabel = cert.issuer_display_name
    ? cert.issuer_type === "self"
      ? `${cert.issuer_display_name} (author)`
      : `${cert.issuer_display_name} (reviewer)`
    : cert.issuer_type === "self"
    ? "self-declared by author"
    : "human reviewer";

  return (
    <div className="border border-gray-200 mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">AI Usage Cards</span>
          <a
            href={cert.issuer_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-400 hover:underline"
          >
            {cert.issuer_url}
          </a>
          <span className="text-xs text-gray-400">{issuerLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {new Date(cert.issued_at).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-xs text-gray-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
          <pre className="text-xs text-gray-700 overflow-auto bg-gray-50 p-3 leading-relaxed">
            {JSON.stringify(cert.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Certificate modal ───────────────────────────────────────────────────────

const ROLES = [
  "proof_search",
  "formalization",
  "writing",
  "paraphrasing",
  "literature_search",
  "figure_generation",
  "code_generation",
  "data_analysis",
  "experiment_design",
  "other",
] as const;

interface ModelRow {
  model_id: string;
  roles: string[];
}

const emptyModel = (): ModelRow => ({
  model_id: "",
  roles: [],
});

function ModelRowForm({
  model,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  model: ModelRow;
  index: number;
  onChange: (i: number, field: keyof ModelRow, value: string | string[]) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}) {
  function toggleRole(role: string) {
    const next = model.roles.includes(role)
      ? model.roles.filter((r) => r !== role)
      : [...model.roles, role];
    onChange(index, "roles", next);
  }

  return (
    <div className="p-3 border border-gray-200 mb-3 bg-gray-50">
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gray-500 bg-white"
          placeholder="Model ID (e.g. nvidia/llama-nemotron-rerank-vl-1b-v2:free)"
          value={model.model_id}
          onChange={(e) => onChange(index, "model_id", e.target.value)}
          required
        />
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-xs text-gray-400 hover:text-red-500 px-1"
          >
            remove
          </button>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Roles</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {ROLES.map((role) => {
            const checked = model.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
              >
                <span className={`w-3 h-3 flex-shrink-0 border flex items-center justify-center transition-colors text-[7px] leading-none ${checked ? "border-gray-900 bg-gray-900 text-white" : "border-gray-400 text-transparent"}`}>✓</span>
                {role.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CertificateModal({
  paperId,
  hasHumanAuthor,
  token,
  onAdded,
  onClose,
}: {
  paperId: string;
  hasHumanAuthor: boolean;
  token: string;
  onAdded: (cert: Certificate) => void;
  onClose: () => void;
}) {
  const [issuerType, setIssuerType] = useState<IssuerType>(
    hasHumanAuthor ? "self" : "human_reviewer"
  );
  const [models, setModels] = useState<ModelRow[]>([emptyModel()]);
  const [aiSections, setAiSections] = useState("");
  const [humanSections, setHumanSections] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  function updateModel(i: number, field: keyof ModelRow, value: string | string[]) {
    setModels((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );
  }

  function removeModel(i: number) {
    setModels((prev) => prev.filter((_, idx) => idx !== i));
  }

  function splitLines(s: string): string[] {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload: Record<string, unknown> = {
      models_used: models.map((m) => ({
        model_id: m.model_id,
        ...(m.roles.length && { roles: m.roles }),
      })),
      ...(aiSections && { ai_generated_sections: splitLines(aiSections) }),
      ...(humanSections && { human_written_sections: splitLines(humanSections) }),
      ...(notes && { notes }),
    };

    setSubmitting(true);
    try {
      const cert = await addCertificate(paperId, issuerType, payload, token);
      onAdded(cert);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add certificate");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="absolute inset-0" onClick={close} />

      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold">Add AI disclosure certificate</h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          <div>
            <label className="block text-xs font-medium mb-1">Your role</label>
            <CustomSelect
              value={issuerType}
              onChange={(v) => setIssuerType(v as IssuerType)}
              options={[
                ...(hasHumanAuthor ? [{ value: "self", label: "I am an author of this paper" }] : []),
                { value: "human_reviewer", label: "I am an external reviewer" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2">Models used</label>
            {models.map((m, i) => (
              <ModelRowForm
                key={i}
                model={m}
                index={i}
                onChange={updateModel}
                onRemove={removeModel}
                canRemove={models.length > 1}
              />
            ))}
            <button
              type="button"
              onClick={() => setModels((prev) => [...prev, emptyModel()])}
              className="text-xs text-gray-500 hover:text-gray-900 underline"
            >
              + add model
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">AI-generated sections</label>
              <input
                className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
                placeholder="introduction, related work"
                value={aiSections}
                onChange={(e) => setAiSections(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-0.5">comma-separated</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Human-written sections</label>
              <input
                className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
                placeholder="proof of main theorem"
                value={humanSections}
                onChange={(e) => setHumanSections(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-0.5">comma-separated</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
              rows={2}
              placeholder="Anything not captured above"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Adding…" : "Add certificate"}
            </button>
            <button
              type="button"
              onClick={close}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export default function CertificateSection({
  paperId,
  initialCertificates,
  hasHumanAuthor,
}: {
  paperId: string;
  initialCertificates: Certificate[];
  hasHumanAuthor: boolean;
}) {
  const { user, token } = useAuth();
  const [certificates, setCertificates] = useState(initialCertificates);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
        Certificates
      </h2>

      {certificates.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">No certificates attached.</p>
      )}

      {certificates.map((c) => (
        <CertificateCard key={c.id} cert={c} />
      ))}

      {user && token ? (
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm text-gray-500 hover:text-gray-900 underline"
        >
          + add AI disclosure certificate
        </button>
      ) : (
        <p className="text-sm text-gray-400">
          <Link href="/login" className="underline hover:text-gray-900">Sign in</Link> to add a certificate.
        </p>
      )}

      {modalOpen && token && (
        <CertificateModal
          paperId={paperId}
          hasHumanAuthor={hasHumanAuthor}
          token={token}
          onAdded={(cert) => setCertificates((prev) => [...prev, cert])}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
