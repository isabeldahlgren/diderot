"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { addCertificate, type Certificate, type IssuerType, type CertificateType } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ── Shared: CustomSelect ────────────────────────────────────────────────────

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
        <div className="absolute z-10 top-full left-0 mt-0.5 border border-gray-300 bg-white shadow-sm min-w-full max-h-64 overflow-y-auto">
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

// ── Certificate type metadata ───────────────────────────────────────────────

const CERT_TYPE_DEFS: Record<CertificateType, { label: string; description: string; badgeColor: string }> = {
  ai_usage: {
    label: "AI Tool Disclosure",
    description: "Discloses which AI tools were used and in what capacity",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  proof_verification: {
    label: "Proof Verification",
    description: "A human attests to having read and verified the mathematical proofs",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  formal_verification: {
    label: "Formal Verification",
    description: "The proofs have been formalised in a proof assistant; the statement has been checked by a human",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  citation_check: {
    label: "Citation Check",
    description: "A human has verified that prior work is correctly identified and cited",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

function certTypeLabel(type: string): string {
  return CERT_TYPE_DEFS[type as CertificateType]?.label ?? type;
}

function certTypeBadgeColor(type: string): string {
  return CERT_TYPE_DEFS[type as CertificateType]?.badgeColor ?? "bg-gray-50 text-gray-700 border-gray-200";
}

// ── Human-readable payload renderers ────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

function AiUsagePayloadView({ payload }: { payload: Record<string, unknown> }) {
  const models = payload.models_used as Array<{ model_id: string; roles?: string[] }> | undefined;
  const aiSections = payload.ai_generated_sections as string[] | undefined;
  const humanSections = payload.human_written_sections as string[] | undefined;
  const notes = payload.notes as string | undefined;

  return (
    <div className="space-y-3">
      {models && models.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Models used</p>
          <ul className="space-y-1">
            {models.map((m, i) => (
              <li key={i} className="text-sm text-gray-800">
                <span className="font-mono text-gray-700">{m.model_id}</span>
                {m.roles && m.roles.length > 0 && (
                  <span className="text-gray-500">
                    {" — "}{m.roles.map((r) => r.replace(/_/g, " ")).join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {aiSections && aiSections.length > 0 && (
        <FieldRow label="AI-generated sections" value={aiSections.join(", ")} />
      )}
      {humanSections && humanSections.length > 0 && (
        <FieldRow label="Human-written sections" value={humanSections.join(", ")} />
      )}
      {notes && <FieldRow label="Notes" value={notes} />}
    </div>
  );
}

function ProofVerificationPayloadView({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {!!payload.scope && <FieldRow label="Scope" value={payload.scope as string} />}
      {!!payload.method && <FieldRow label="Method" value={(payload.method as string).replace(/_/g, " ")} />}
      {!!payload.notes && <FieldRow label="Notes" value={payload.notes as string} />}
    </div>
  );
}

function FormalVerificationPayloadView({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {!!payload.proof_assistant && <FieldRow label="Proof assistant" value={payload.proof_assistant as string} />}
      {!!payload.repository_url && (
        <FieldRow
          label="Repository"
          value={
            <a href={payload.repository_url as string} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">
              {payload.repository_url as string}
            </a>
          }
        />
      )}
      {!!payload.notes && <FieldRow label="Notes" value={payload.notes as string} />}
    </div>
  );
}

function CitationCheckPayloadView({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {!!payload.notes && <FieldRow label="Notes" value={payload.notes as string} />}
    </div>
  );
}

function PayloadView({ cert }: { cert: Certificate }) {
  const t = cert.certificate_type;
  if (t === "ai_usage" || t === "ai-usage-cards") {
    return <AiUsagePayloadView payload={cert.payload} />;
  }
  if (t === "proof_verification") return <ProofVerificationPayloadView payload={cert.payload} />;
  if (t === "formal_verification") return <FormalVerificationPayloadView payload={cert.payload} />;
  if (t === "citation_check") return <CitationCheckPayloadView payload={cert.payload} />;
  return (
    <pre className="text-xs text-gray-700 overflow-auto bg-gray-50 p-3 leading-relaxed">
      {JSON.stringify(cert.payload, null, 2)}
    </pre>
  );
}

// ── Certificate card ─────────────────────────────────────────────────────────

function CertificateCard({ cert }: { cert: Certificate }) {
  const [open, setOpen] = useState(false);

  const issuerSuffix = cert.issuer_type === "self" ? " (author)" : " (reviewer)";
  const issuerText = cert.issuer_display_name
    ? `${cert.issuer_display_name}${issuerSuffix}`
    : cert.issuer_type === "self"
    ? "author"
    : "external reviewer";

  const issuerNode =
    cert.issuer_user_id && cert.issuer_display_name ? (
      <Link
        href={`/authors/${cert.issuer_user_id}`}
        className="text-xs text-gray-500 hover:underline hover:text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {issuerText}
      </Link>
    ) : (
      <span className="text-xs text-gray-500">{issuerText}</span>
    );

  const date = new Date(cert.issued_at).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const badgeColor = certTypeBadgeColor(cert.certificate_type);

  return (
    <div className="border border-gray-200 mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2 py-0.5 border ${badgeColor}`}>
            {certTypeLabel(cert.certificate_type)}
            {cert.version > 1 && (
              <span className="ml-1 font-mono text-[10px] opacity-70">v{cert.version}</span>
            )}
          </span>
          {issuerNode}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">{date}</span>
          <span className="text-xs text-gray-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
          <PayloadView cert={cert} />
          {cert.issuer_url && (
            <p className="mt-3 text-xs text-gray-400">
              Standard:{" "}
              <a
                href={cert.issuer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600"
              >
                {cert.issuer_url}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Form: AI Usage Disclosure ────────────────────────────────────────────────

const AI_ROLES = [
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

const emptyModel = (): ModelRow => ({ model_id: "", roles: [] });

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
          placeholder="Model ID (e.g. anthropic/claude-sonnet-4-6)"
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
        <p className="text-xs text-gray-500 mb-1">Roles (select all that apply)</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {AI_ROLES.map((role) => {
            const checked = model.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
              >
                <span className={`w-3 h-3 flex-shrink-0 border flex items-center justify-center text-[7px] leading-none ${checked ? "border-gray-900 bg-gray-900 text-white" : "border-gray-400 text-transparent"}`}>✓</span>
                {role.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface AiUsageState {
  models: ModelRow[];
  aiSections: string;
  humanSections: string;
  notes: string;
}

function AiUsageForm({
  state,
  onChange,
}: {
  state: AiUsageState;
  onChange: (s: AiUsageState) => void;
}) {
  function updateModel(i: number, field: keyof ModelRow, value: string | string[]) {
    const next = state.models.map((m, idx) => (idx === i ? { ...m, [field]: value } : m));
    onChange({ ...state, models: next });
  }
  function removeModel(i: number) {
    onChange({ ...state, models: state.models.filter((_, idx) => idx !== i) });
  }
  function addModel() {
    onChange({ ...state, models: [...state.models, emptyModel()] });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium mb-2">Models used</label>
        {state.models.map((m, i) => (
          <ModelRowForm
            key={i}
            model={m}
            index={i}
            onChange={updateModel}
            onRemove={removeModel}
            canRemove={state.models.length > 1}
          />
        ))}
        <button
          type="button"
          onClick={addModel}
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
            value={state.aiSections}
            onChange={(e) => onChange({ ...state, aiSections: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-0.5">comma-separated</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Human-written sections</label>
          <input
            className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
            placeholder="proof of main theorem"
            value={state.humanSections}
            onChange={(e) => onChange({ ...state, humanSections: e.target.value })}
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
          value={state.notes}
          onChange={(e) => onChange({ ...state, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Form: Proof Verification ────────────────────────────────────────────────

interface ProofVerificationState {
  scope: string;
  method: string;
  notes: string;
}

function ProofVerificationForm({
  state,
  onChange,
}: {
  state: ProofVerificationState;
  onChange: (s: ProofVerificationState) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1">Scope</label>
        <input
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="e.g. all proofs, main theorem, Lemma 2.3"
          value={state.scope}
          onChange={(e) => onChange({ ...state, scope: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Method</label>
        <CustomSelect
          value={state.method}
          onChange={(v) => onChange({ ...state, method: v })}
          options={[
            { value: "line_by_line", label: "Line by line" },
            { value: "high_level", label: "High level" },
            { value: "partial", label: "Partial" },
            { value: "other", label: "Other" },
          ]}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Notes</label>
        <textarea
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
          rows={2}
          placeholder="Any caveats or additional context"
          value={state.notes}
          onChange={(e) => onChange({ ...state, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Form: Formal Verification ────────────────────────────────────────────────

interface FormalVerificationState {
  proof_assistant: string;
  repository_url: string;
  notes: string;
}

function FormalVerificationForm({
  state,
  onChange,
}: {
  state: FormalVerificationState;
  onChange: (s: FormalVerificationState) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1">Proof assistant</label>
        <CustomSelect
          value={state.proof_assistant}
          onChange={(v) => onChange({ ...state, proof_assistant: v })}
          options={[
            { value: "Lean 4", label: "Lean 4" },
            { value: "Lean 3", label: "Lean 3" },
            { value: "Coq", label: "Coq" },
            { value: "Isabelle", label: "Isabelle/HOL" },
            { value: "Agda", label: "Agda" },
            { value: "Other", label: "Other" },
          ]}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Repository URL</label>
        <input
          type="url"
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="https://github.com/..."
          value={state.repository_url}
          onChange={(e) => onChange({ ...state, repository_url: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Notes</label>
        <textarea
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
          rows={2}
          placeholder="e.g. which theorems are formalised, any gaps"
          value={state.notes}
          onChange={(e) => onChange({ ...state, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Form: Citation Check ─────────────────────────────────────────────────────

interface CitationCheckState {
  notes: string;
}

function CitationCheckForm({
  state,
  onChange,
}: {
  state: CitationCheckState;
  onChange: (s: CitationCheckState) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1">Notes</label>
        <textarea
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
          rows={4}
          placeholder="Describe what was checked and any corrections or additions made to the bibliography"
          value={state.notes}
          onChange={(e) => onChange({ ...state, notes: e.target.value })}
          required
        />
      </div>
    </div>
  );
}

// ── Certificate modal ────────────────────────────────────────────────────────

function splitLines(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
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
  const [certType, setCertType] = useState<CertificateType>("ai_usage");
  const [issuerType, setIssuerType] = useState<IssuerType>(
    hasHumanAuthor ? "self" : "human_reviewer"
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Per-type form state
  const [aiUsage, setAiUsage] = useState<AiUsageState>({
    models: [emptyModel()],
    aiSections: "",
    humanSections: "",
    notes: "",
  });
  const [proofVerification, setProofVerification] = useState<ProofVerificationState>({
    scope: "",
    method: "line_by_line",
    notes: "",
  });
  const [formalVerification, setFormalVerification] = useState<FormalVerificationState>({
    proof_assistant: "Lean 4",
    repository_url: "",
    notes: "",
  });
  const [citationCheck, setCitationCheck] = useState<CitationCheckState>({
    notes: "",
  });
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  function buildPayload(): Record<string, unknown> {
    switch (certType) {
      case "ai_usage":
        return {
          models_used: aiUsage.models.map((m) => ({
            model_id: m.model_id,
            ...(m.roles.length && { roles: m.roles }),
          })),
          ...(aiUsage.aiSections && { ai_generated_sections: splitLines(aiUsage.aiSections) }),
          ...(aiUsage.humanSections && { human_written_sections: splitLines(aiUsage.humanSections) }),
          ...(aiUsage.notes && { notes: aiUsage.notes }),
        };
      case "proof_verification":
        return {
          scope: proofVerification.scope,
          method: proofVerification.method,
          ...(proofVerification.notes && { notes: proofVerification.notes }),
        };
      case "formal_verification":
        return {
          proof_assistant: formalVerification.proof_assistant,
          repository_url: formalVerification.repository_url,
          ...(formalVerification.notes && { notes: formalVerification.notes }),
        };
      case "citation_check":
        return {
          notes: citationCheck.notes,
        };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const cert = await addCertificate(paperId, issuerType, certType, buildPayload(), token);
      onAdded(cert);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add certificate");
      setSubmitting(false);
    }
  }

  const certTypeOptions = Object.entries(CERT_TYPE_DEFS).map(([value, def]) => ({
    value,
    label: def.label,
  }));

  const issuerOptions = [
    ...(hasHumanAuthor ? [{ value: "self", label: "I am an author of this paper" }] : []),
    { value: "human_reviewer", label: "I am an external reviewer / reader" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="absolute inset-0" onClick={close} />

      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold">Add certificate</h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Certificate type</label>
              <CustomSelect
                value={certType}
                onChange={(v) => setCertType(v as CertificateType)}
                options={certTypeOptions}
              />
              <p className="text-xs text-gray-400 mt-1">
                {CERT_TYPE_DEFS[certType].description}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Your role</label>
              <CustomSelect
                value={issuerType}
                onChange={(v) => setIssuerType(v as IssuerType)}
                options={issuerOptions}
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {certType === "ai_usage" && (
            <AiUsageForm state={aiUsage} onChange={setAiUsage} />
          )}
          {certType === "proof_verification" && (
            <ProofVerificationForm state={proofVerification} onChange={setProofVerification} />
          )}
          {certType === "formal_verification" && (
            <FormalVerificationForm state={formalVerification} onChange={setFormalVerification} />
          )}
          {certType === "citation_check" && (
            <CitationCheckForm state={citationCheck} onChange={setCitationCheck} />
          )}
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

// ── Main export ──────────────────────────────────────────────────────────────

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
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Certificates
        </h2>
        {user && token && (
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >
            + add certificate
          </button>
        )}
      </div>

      {certificates.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">No certificates attached to this paper.</p>
      )}

      {certificates.map((c) => (
        <CertificateCard key={c.id} cert={c} />
      ))}

      {!user && (
        <p className="text-sm text-gray-400 mt-3">
          <Link href="/login" className="underline hover:text-gray-900">Sign in</Link>{" "}
          to add a certificate.
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
