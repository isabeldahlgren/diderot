"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { addCertificate, type Certificate, type IssuerType, type CertificateType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LatexText from "@/app/LatexText";

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
  const notes = payload.notes as string | undefined;

  // New schema fields
  const proofIdeation = payload.proof_ideation as Array<{ result: string; details?: string } | string> | undefined;
  const autonomousProofs = payload.autonomous_proofs as Array<{ result: string; details?: string } | string> | undefined;
  const literatureReview = payload.literature_review as string | undefined;
  const writing = payload.writing as string | undefined;
  const presentation = payload.presentation as string | undefined;
  const coding = payload.coding as string | undefined;
  const experiments = payload.experiments as string | undefined;

  // Legacy schema fields
  const aiSections = payload.ai_generated_sections as string[] | undefined;
  const humanSections = payload.human_written_sections as string[] | undefined;
  const allRoles = models
    ? [...new Set(models.flatMap((m) => m.roles ?? []))].map((r) => r.replace(/_/g, " ")).join(", ")
    : "";

  const modelIds = models?.map((m) => m.model_id).join(", ");

  return (
    <div className="space-y-3">
      {modelIds && <FieldRow label="Models used" value={<span className="font-mono">{modelIds}</span>} />}
      {proofIdeation && proofIdeation.length > 0 && (
        <FieldRow
          label="Proof ideation"
          value={
            <ul className="space-y-0.5">
              {proofIdeation.map((e, i) =>
                typeof e === "string" ? (
                  <li key={i}>{e}</li>
                ) : (
                  <li key={i}>
                    <span className="font-medium">{e.result}</span>
                    {e.details && <span className="text-gray-500"> — {e.details}</span>}
                  </li>
                )
              )}
            </ul>
          }
        />
      )}
      {autonomousProofs && autonomousProofs.length > 0 && (
        <FieldRow
          label="Autonomous proofs"
          value={
            <ul className="space-y-0.5">
              {autonomousProofs.map((e, i) =>
                typeof e === "string" ? (
                  <li key={i}>{e}</li>
                ) : (
                  <li key={i}>
                    <span className="font-medium">{e.result}</span>
                    {e.details && <span className="text-gray-500"> — {e.details}</span>}
                  </li>
                )
              )}
            </ul>
          }
        />
      )}
      {literatureReview && <FieldRow label="Literature review" value={<LatexText text={literatureReview} />} />}
      {writing && <FieldRow label="Writing" value={<LatexText text={writing} />} />}
      {presentation && <FieldRow label="Presentation" value={<LatexText text={presentation} />} />}
      {coding && <FieldRow label="Coding" value={<LatexText text={coding} />} />}
      {experiments && <FieldRow label="Experiments" value={<LatexText text={experiments} />} />}
      {/* Legacy fields */}
      {allRoles && <FieldRow label="Uses" value={allRoles} />}
      {aiSections && aiSections.length > 0 && (
        <FieldRow label="AI-generated sections" value={aiSections.join(", ")} />
      )}
      {humanSections && humanSections.length > 0 && (
        <FieldRow label="Human-written sections" value={humanSections.join(", ")} />
      )}
      {notes && <FieldRow label="Notes" value={<LatexText text={notes} />} />}
    </div>
  );
}

function ProofVerificationPayloadView({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {!!payload.comment && <FieldRow label="Comment" value={<LatexText text={payload.comment as string} />} />}
    </div>
  );
}

function FormalVerificationPayloadView({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {!!payload.formalization_repo_url && (
        <FieldRow
          label="Formalization repo"
          value={
            <a href={payload.formalization_repo_url as string} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">
              {payload.formalization_repo_url as string}
            </a>
          }
        />
      )}
      {!!payload.comparator_repo_url && (
        <FieldRow
          label="Comparator repo"
          value={
            <a href={payload.comparator_repo_url as string} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">
              {payload.comparator_repo_url as string}
            </a>
          }
        />
      )}
      {!!payload.statement_check_attested && (
        <FieldRow label="Statement check" value="Issuer attests that Challenge.lean correctly formalizes the paper's statements with reasonable imports" />
      )}
      {!!payload.argument_check_attested && (
        <FieldRow label="Argument check" value="Issuer attests that the formalization roughly follows the argument in the paper" />
      )}
      {!!payload.notes && <FieldRow label="Imports justification" value={<LatexText text={payload.notes as string} />} />}
    </div>
  );
}

function CitationCheckPayloadView({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {!!payload.bib_url && (
        <FieldRow
          label=".bib file"
          value={
            <a href={payload.bib_url as string} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">
              {payload.bib_url as string}
            </a>
          }
        />
      )}
      {!!payload.notes && <FieldRow label="Notes" value={<LatexText text={payload.notes as string} />} />}
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

interface ProofEntry {
  result: string;
  details: string;
}

const emptyProofEntry = (): ProofEntry => ({ result: "", details: "" });

interface AiUsageState {
  modelIds: string;
  proofIdeation: ProofEntry[];
  autonomousProofs: string;
  literatureReview: string;
  writing: string;
  presentation: string;
  coding: string;
  experiments: string;
  notes: string;
}

const AUXILIARY_FIELDS: {
  key: keyof Omit<AiUsageState, "modelIds" | "proofIdeation" | "autonomousProofs" | "notes">;
  label: string;
  hint: string;
}[] = [
  {
    key: "literatureReview",
    label: "Literature review",
    hint: "e.g. finding sources, supplementing existing citations, comparing literature",
  },
  {
    key: "writing",
    label: "Writing",
    hint: "e.g. generating new text, improving or paraphrasing existing content, putting related work in perspective",
  },
  {
    key: "presentation",
    label: "Presentation",
    hint: "e.g. generating figures or diagrams, improving aesthetics, finding relations between artifacts",
  },
  {
    key: "coding",
    label: "Coding",
    hint: "e.g. generating new code, refactoring or optimising existing code, comparing aspects of code",
  },
  {
    key: "experiments",
    label: "Experiments",
    hint: "e.g. designing experiments, editing existing setups, finding or aggregating results",
  },
];

function ProofEntryList({
  entries,
  onAdd,
  onRemove,
  onChange,
  addLabel,
  detailsPlaceholder,
}: {
  entries: ProofEntry[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChange: (i: number, field: keyof ProofEntry, value: string) => void;
  addLabel: string;
  detailsPlaceholder: string;
}) {
  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2 items-center">
            <input
              className="border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-gray-500 w-36 flex-shrink-0"
              placeholder="Lemma 2.1"
              value={entry.result}
              onChange={(e) => onChange(i, "result", e.target.value)}
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-gray-300 hover:text-gray-600 text-base px-1 leading-none"
            >
              ×
            </button>
          </div>
          <textarea
            className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-gray-500 resize-none"
            rows={3}
            placeholder={detailsPlaceholder}
            value={entry.details}
            onChange={(e) => onChange(i, "details", e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-xs text-gray-500 hover:text-gray-900 underline"
      >
        {addLabel}
      </button>
    </div>
  );
}

function AiUsageForm({
  state,
  onChange,
}: {
  state: AiUsageState;
  onChange: (s: AiUsageState) => void;
}) {
  function updateProofEntry(i: number, key: keyof ProofEntry, value: string) {
    const next = state.proofIdeation.map((e, j) => (j === i ? { ...e, [key]: value } : e));
    onChange({ ...state, proofIdeation: next });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium mb-1">Model IDs <span className="text-red-500">*</span></label>
        <input
          className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="anthropic/claude-sonnet-4.6, openai/gpt-4o"
          value={state.modelIds}
          onChange={(e) => onChange({ ...state, modelIds: e.target.value })}
          required
        />
        <p className="text-xs text-gray-400 mt-0.5">
          Comma-separated. Look up IDs at{" "}
          <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
            openrouter.ai/models
          </a>.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Results: AI-autonomous proofs</label>
        <input
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="Theorem 1.2, Corollary 3.4"
          value={state.autonomousProofs}
          onChange={(e) => onChange({ ...state, autonomousProofs: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-0.5">Comma-separated. Results where AI gave the complete proof with minimal human guidance.</p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Results: AI-assisted proof ideation</label>
        <p className="text-xs text-gray-400 mb-2">Results where AI contributed proof ideas; human verified. Add one entry per result and describe the collaboration. Include information useful to others.</p>
        <ProofEntryList
          entries={state.proofIdeation}
          onAdd={() => onChange({ ...state, proofIdeation: [...state.proofIdeation, emptyProofEntry()] })}
          onRemove={(i) => onChange({ ...state, proofIdeation: state.proofIdeation.filter((_, j) => j !== i) })}
          onChange={(i, key, val) => updateProofEntry(i, key, val)}
          addLabel="+ add result"
          detailsPlaceholder="e.g. AI suggested key idea, human finished proof"
        />
      </div>

      <div>
        <p className="text-xs font-medium mb-2">Other uses <span className="text-gray-400 font-normal">(leave blank if not applicable)</span></p>
        <div className="space-y-3">
          {AUXILIARY_FIELDS.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1">{label}</label>
              <input
                className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
                placeholder="Describe how AI was used"
                value={state[key]}
                onChange={(e) => onChange({ ...state, [key]: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
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
  comment: string;
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
        <label className="block text-xs font-medium mb-1">Comment</label>
        <textarea
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
          rows={4}
          placeholder="State your verdict and describe what you checked, including scope and any caveats"
          value={state.comment}
          onChange={(e) => onChange({ ...state, comment: e.target.value })}
          required
        />
      </div>
    </div>
  );
}

// ── Form: Formal Verification ────────────────────────────────────────────────

interface FormalVerificationState {
  formalization_repo_url: string;
  comparator_repo_url: string;
  statement_check_attested: boolean;
  argument_check_attested: boolean;
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
        <label className="block text-xs font-medium mb-1">Formalization repo <span className="text-red-500">*</span></label>
        <input
          type="url"
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="https://github.com/..."
          value={state.formalization_repo_url}
          onChange={(e) => onChange({ ...state, formalization_repo_url: e.target.value })}
          required
        />
        <p className="text-xs text-gray-400 mt-0.5">Public repository containing the formalized proof. If autoformalized, must include a <code>formalization.yaml</code>.</p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Comparator repo <span className="text-red-500">*</span></label>
        <input
          type="url"
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="https://github.com/..."
          value={state.comparator_repo_url}
          onChange={(e) => onChange({ ...state, comparator_repo_url: e.target.value })}
          required
        />
        <p className="text-xs text-gray-400 mt-0.5">
          Public repository with the{" "}
          <a href="https://github.com/leanprover/comparator" target="_blank" rel="noopener noreferrer" className="underline">
            comparator
          </a>{" "}
          verification.
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={() => onChange({ ...state, statement_check_attested: !state.statement_check_attested })}
          className="flex items-start gap-1.5 text-xs cursor-pointer select-none text-left"
        >
          <span className={`mt-0.5 w-3 h-3 flex-shrink-0 border flex items-center justify-center text-[7px] leading-none ${state.statement_check_attested ? "border-gray-900 bg-gray-900 text-white" : "border-gray-400 text-transparent"}`}>✓</span>
          <span className="text-gray-700">I attest that the <code>Challenge.lean</code> file in the comparator repo correctly formalizes the corresponding statement(s) from the paper and has reasonable imports <span className="text-red-500">*</span></span>
        </button>
      </div>
      <div>
        <button
          type="button"
          onClick={() => onChange({ ...state, argument_check_attested: !state.argument_check_attested })}
          className="flex items-start gap-1.5 text-xs cursor-pointer select-none text-left"
        >
          <span className={`mt-0.5 w-3 h-3 flex-shrink-0 border flex items-center justify-center text-[7px] leading-none ${state.argument_check_attested ? "border-gray-900 bg-gray-900 text-white" : "border-gray-400 text-transparent"}`}>✓</span>
          <span className="text-gray-700">I attest that the formalization roughly follows the argument in the paper, rather than proving the statement a different way that silently closes a gap the paper leaves open <span className="text-red-500">*</span></span>
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Imports beyond Mathlib <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
          rows={2}
          placeholder="Justify any imports other than Mathlib"
          value={state.notes}
          onChange={(e) => onChange({ ...state, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Form: Citation Check ─────────────────────────────────────────────────────

interface CitationCheckState {
  bib_url: string;
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
        <label className="block text-xs font-medium mb-1">.bib file URL <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          type="url"
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
          placeholder="https://..."
          value={state.bib_url}
          onChange={(e) => onChange({ ...state, bib_url: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-0.5">Link to the verified or corrected bibliography</p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Notes <span className="text-red-500">*</span></label>
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
  const [issuerType, setIssuerType] = useState<IssuerType>("self");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Per-type form state
  const [aiUsage, setAiUsage] = useState<AiUsageState>({
    modelIds: "",
    proofIdeation: [],
    autonomousProofs: "",
    literatureReview: "",
    writing: "",
    presentation: "",
    coding: "",
    experiments: "",
    notes: "",
  });
  const [proofVerification, setProofVerification] = useState<ProofVerificationState>({
    comment: "",
  });
  const [formalVerification, setFormalVerification] = useState<FormalVerificationState>({
    formalization_repo_url: "",
    comparator_repo_url: "",
    statement_check_attested: false,
    argument_check_attested: false,
    notes: "",
  });
  const [citationCheck, setCitationCheck] = useState<CitationCheckState>({
    bib_url: "",
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
      case "ai_usage": {
        const ids = aiUsage.modelIds.split(",").map((s) => s.trim()).filter(Boolean);
        const proofIdeation = aiUsage.proofIdeation
          .filter((e) => e.result.trim())
          .map((e) => ({ result: e.result.trim(), ...(e.details.trim() && { details: e.details.trim() }) }));
        const autonomousProofs = aiUsage.autonomousProofs
          .split(",").map((s) => s.trim()).filter(Boolean);
        return {
          models_used: ids.map((id) => ({ model_id: id })),
          ...(proofIdeation.length && { proof_ideation: proofIdeation }),
          ...(autonomousProofs.length && { autonomous_proofs: autonomousProofs }),
          ...(aiUsage.literatureReview && { literature_review: aiUsage.literatureReview }),
          ...(aiUsage.writing && { writing: aiUsage.writing }),
          ...(aiUsage.presentation && { presentation: aiUsage.presentation }),
          ...(aiUsage.coding && { coding: aiUsage.coding }),
          ...(aiUsage.experiments && { experiments: aiUsage.experiments }),
          ...(aiUsage.notes && { notes: aiUsage.notes }),
        };
      }
      case "proof_verification":
        return {
          comment: proofVerification.comment,
        };
      case "formal_verification":
        return {
          formalization_repo_url: formalVerification.formalization_repo_url,
          comparator_repo_url: formalVerification.comparator_repo_url,
          statement_check_attested: formalVerification.statement_check_attested,
          argument_check_attested: formalVerification.argument_check_attested,
          ...(formalVerification.notes && { notes: formalVerification.notes }),
        };
      case "citation_check":
        return {
          ...(citationCheck.bib_url && { bib_url: citationCheck.bib_url }),
          notes: citationCheck.notes,
        };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (certType === "formal_verification" && !formalVerification.statement_check_attested) {
      setError("You must attest to checking the Challenge.lean statement.");
      return;
    }
    if (certType === "formal_verification" && !formalVerification.argument_check_attested) {
      setError("You must attest that the formalization follows the paper's argument.");
      return;
    }
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

  const issuerOptions =
    certType === "ai_usage"
      ? [{ value: "self", label: "I am an author of this paper" }]
      : [
          { value: "self", label: "I am an author of this paper" },
          { value: "human_reviewer", label: "I am an external reviewer" },
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
                onChange={(v) => {
                  const t = v as CertificateType;
                  setCertType(t);
                  if (t === "ai_usage") setIssuerType("self");
                }}
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

          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <div className="flex gap-3">
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
            <Link href="/documentation" target="_blank" className="text-xs text-gray-400 hover:text-gray-700 underline">
              What do certificates mean?
            </Link>
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
