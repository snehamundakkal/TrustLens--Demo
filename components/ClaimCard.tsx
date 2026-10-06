"use client";
import { useState } from "react";
import type { VerifiedClaim } from "@/types";
import { STATUS_COLORS, STATUS_EMOJIS } from "@/lib/api";

interface Props { claim: VerifiedClaim; }

const TABS = ["Entities & Relations", "Evidence", "Graph Context", "Explanation"] as const;

export default function ClaimCard({ claim }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Entities & Relations");
  const color = STATUS_COLORS[claim.status] ?? "#64748b";
  const emoji = STATUS_EMOJIS[claim.status] ?? "❓";

  return (
    <div className="claim-card">
      <div className="claim-header" onClick={() => setOpen(!open)} role="button" aria-expanded={open}>
        <span className="claim-id">{claim.claim_id}</span>
        <span className="claim-text">{claim.claim.length > 100 ? claim.claim.slice(0, 100) + "…" : claim.claim}</span>
        <span
          className="status-badge"
          style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
        >
          {emoji} {claim.status}
        </span>
        <span className="confidence-pill">{(claim.confidence * 100).toFixed(0)}%</span>
        <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="claim-body">
          {/* Full claim */}
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic", marginBottom: "0.75rem" }}>
            "{claim.claim}"
          </p>

          {/* Tab bar */}
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t === "Entities & Relations" && "🏷️ "}
                {t === "Evidence" && "📚 "}
                {t === "Graph Context" && "🕸️ "}
                {t === "Explanation" && "💡 "}
                {t}
              </button>
            ))}
          </div>

          {/* ENTITIES & RELATIONS */}
          {tab === "Entities & Relations" && (
            <div className="two-col" style={{ gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
                  Medical Entities
                </div>
                {claim.entities.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No entities extracted.</p>
                ) : (
                  claim.entities.map((e, i) => (
                    <span key={i} className={`entity-tag ${e.type}`} title={`${e.type} → ${e.normalized}`}>
                      {e.text}
                      <sup style={{ fontSize: "0.6rem", marginLeft: "2px", opacity: 0.7 }}>{e.type}</sup>
                    </span>
                  ))
                )}
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
                  Relationships
                </div>
                {claim.relations.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No relationships extracted.</p>
                ) : (
                  claim.relations.map((r, i) => (
                    <div key={i} className="relation-tag">
                      <span style={{ color: "var(--text)" }}>{r.subject}</span>
                      <span style={{ color: "var(--muted)" }}>→[</span>
                      <span style={{ color: "#4ade80" }}>{r.relation}</span>
                      <span style={{ color: "var(--muted)" }}>]→</span>
                      <span style={{ color: "var(--text)" }}>{r.object}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* EVIDENCE */}
          {tab === "Evidence" && (
            <div>
              {claim.supporting_evidence.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--green)", marginBottom: "0.4rem" }}>
                    ✅ Supporting Evidence
                  </div>
                  {claim.supporting_evidence.slice(0, 3).map((ev, i) => (
                    <div key={i} className="evidence-item supporting">
                      <div className="evidence-title">{ev.title}</div>
                      <div className="evidence-meta">
                        {ev.source} · {ev.year} · {ev.source_type}
                        <span className="score-chip" style={{ marginLeft: "0.5rem" }}>
                          rel: {(ev.scores?.relevance_score ?? ev.retrieval_score ?? 0).toFixed(2)}
                        </span>
                        {ev.is_synthetic_demo && (
                          <span className="score-chip" style={{ marginLeft: "0.25rem", color: "var(--amber)" }}>
                            demo
                          </span>
                        )}
                      </div>
                      <div className="evidence-text">{ev.text.slice(0, 220)}…</div>
                    </div>
                  ))}
                </>
              )}

              {claim.contradicting_evidence.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--red)", marginBottom: "0.4rem", marginTop: "0.75rem" }}>
                    ❌ Contradicting Evidence
                  </div>
                  {claim.contradicting_evidence.slice(0, 3).map((ev, i) => (
                    <div key={i} className="evidence-item contradicting">
                      <div className="evidence-title">{ev.title}</div>
                      <div className="evidence-meta">
                        {ev.source} · {ev.year} · {ev.source_type}
                        <span className="score-chip" style={{ marginLeft: "0.5rem" }}>
                          rel: {(ev.scores?.relevance_score ?? ev.retrieval_score ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="evidence-text">{ev.text.slice(0, 220)}…</div>
                    </div>
                  ))}
                </>
              )}

              {claim.supporting_evidence.length === 0 && claim.contradicting_evidence.length === 0 && (
                <div className="info-box">No strong supporting or contradicting evidence found for this claim.</div>
              )}

              {/* Score breakdown */}
              {claim.aggregate_scores && (
                <div className="three-col" style={{ marginTop: "1rem" }}>
                  {[
                    ["Support", (claim.aggregate_scores.overall_support * 100).toFixed(1) + "%", "var(--green)"],
                    ["Contradict", (claim.aggregate_scores.overall_contradict * 100).toFixed(1) + "%", "var(--red)"],
                    ["Evidence Docs", String(claim.aggregate_scores.n_evidence), "var(--accent)"],
                  ].map(([label, val, color]) => (
                    <div key={label} className="metric-card" style={{ padding: "0.75rem", textAlign: "center" }}>
                      <span className="metric-value" style={{ fontSize: "1.4rem", color: color as string }}>{val}</span>
                      <span className="metric-label">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GRAPH CONTEXT */}
          {tab === "Graph Context" && (
            <div>
              <div className="info-box" style={{ marginBottom: "0.75rem" }}>
                Graph context extracted from relationships found in the claim and evidence.
              </div>
              {claim.relations.length > 0 ? (
                <div className="graph-box">
                  {claim.relations.map((r, i) => (
                    <div key={i} className="graph-rel">
                      <span className="graph-node">{r.subject}</span>
                      <span className="graph-edge">──[</span>
                      <span style={{ color: "#c084fc", fontWeight: 600 }}>{r.relation}</span>
                      <span className="graph-edge">]──▶</span>
                      <span className="graph-node">{r.object}</span>
                      <span className="score-chip" style={{ marginLeft: "auto" }}>
                        {r.confidence.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  No graph relationships found. Connect Neo4j Aura in the full Streamlit app for persistent graph storage.
                </p>
              )}
            </div>
          )}

          {/* EXPLANATION */}
          {tab === "Explanation" && (
            <div>
              <div
                style={{
                  background: "var(--bg2)", borderRadius: "8px", padding: "1rem",
                  borderLeft: `3px solid ${color}`, color: "var(--text)",
                  fontSize: "0.875rem", lineHeight: 1.7,
                }}
              >
                {claim.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
