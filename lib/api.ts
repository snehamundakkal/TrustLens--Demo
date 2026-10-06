import type { AuditResult, VerifiedClaim } from "@/types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://localhost:8000");

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

export const api = {
  audit: (text: string, top_k = 5) =>
    post<AuditResult>("/api/audit", { text, top_k }),

  verifyClaim: (claim: string, top_k = 5) =>
    post<VerifiedClaim>("/api/verify-claim", { claim, top_k }),

  health: () =>
    get<{ status: string; corpus_size: number; retriever: string }>("/api/health"),
};

export const STATUS_COLORS: Record<string, string> = {
  SUPPORTED: "#22c55e",
  REFUTED: "#ef4444",
  "CONFLICTING EVIDENCE": "#f59e0b",
  "NOT ENOUGH EVIDENCE": "#64748b",
};

export const STATUS_EMOJIS: Record<string, string> = {
  SUPPORTED: "✅",
  REFUTED: "❌",
  "CONFLICTING EVIDENCE": "⚠️",
  "NOT ENOUGH EVIDENCE": "❓",
};
