"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { AuditResult } from "@/types";
import { STATUS_COLORS } from "@/lib/api";

export default function DashboardPage() {
  const [result, setResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("trustlens_result");
    if (stored) setResult(JSON.parse(stored));
  }, []);

  if (!result) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="main">
          <div className="page-header">
            <h1>📊 Dashboard</h1>
            <p>Visual analysis of your audit results.</p>
          </div>
          <div className="info-box">
            No audit results yet. Go to <strong>🔍 Audit Response</strong> and run an audit first.
          </div>
        </main>
      </div>
    );
  }

  const { summary, claims } = result;
  const reliability = summary.reliability_score;

  const statusGroups = [
    { label: "✅ Supported", key: "supported", color: "#22c55e" },
    { label: "❌ Refuted", key: "refuted", color: "#ef4444" },
    { label: "⚠️ Conflicting", key: "conflicting_evidence", color: "#f59e0b" },
    { label: "❓ Not Enough", key: "not_enough_evidence", color: "#64748b" },
  ] as const;

  // All unique entities across claims
  const allEntities = claims.flatMap((c) => c.entities);
  const entityTypeCounts: Record<string, number> = {};
  allEntities.forEach((e) => { entityTypeCounts[e.type] = (entityTypeCounts[e.type] ?? 0) + 1; });

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1>📊 Dashboard</h1>
          <p>Visual breakdown of the audit for {summary.total_claims} claims.</p>
        </div>

        {/* Top metrics */}
        <div className="metric-grid">
          <div className="metric-card">
            <span className="metric-value" style={{ color: "#60a5fa" }}>{summary.total_claims}</span>
            <span className="metric-label">Total Claims</span>
          </div>
          {statusGroups.map(({ label, key, color }) => (
            <div key={key} className="metric-card">
              <span className="metric-value" style={{ color }}>{summary[key]}</span>
              <span className="metric-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Reliability */}
        <div className="reliability-bar" style={{ marginBottom: "2rem" }}>
          <div className="reliability-score"
            style={{ color: reliability >= 0.7 ? "#22c55e" : reliability >= 0.5 ? "#f59e0b" : "#ef4444" }}>
            {(reliability * 100).toFixed(1)}%
          </div>
          <div className="reliability-label">Overall Reliability Score</div>
          <div className="reliability-track">
            <div className="reliability-fill"
              style={{
                width: `${reliability * 100}%`,
                background: reliability >= 0.7 ? "#22c55e" : reliability >= 0.5 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
            {reliability >= 0.7 ? "✅ High reliability — most claims are supported by evidence."
              : reliability >= 0.5 ? "⚠️ Moderate reliability — some claims lack evidence or are conflicting."
              : "❌ Low reliability — significant refuted or unsupported claims detected."}
          </p>
        </div>

        <div className="two-col" style={{ marginBottom: "2rem" }}>
          {/* Distribution table */}
          <div className="card">
            <h2 className="section-title">Claim Distribution</h2>
            {statusGroups.map(({ label, key, color }) => {
              const val = summary[key];
              const pct = summary.total_claims > 0 ? (val / summary.total_claims) * 100 : 0;
              return (
                <div key={key} style={{ marginBottom: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                    <span style={{ color }}>{label}</span>
                    <span style={{ color: "var(--muted)", fontFamily: "JetBrains Mono, monospace" }}>
                      {val} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "var(--surface2)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confidence per claim */}
          <div className="card">
            <h2 className="section-title">Confidence per Claim</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {claims.map((c) => {
                const color = STATUS_COLORS[c.status] ?? "#64748b";
                const pct = c.confidence * 100;
                return (
                  <div key={c.claim_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                      <span style={{ color: "var(--muted)", fontFamily: "JetBrains Mono, monospace" }}>{c.claim_id}</span>
                      <span style={{ color, fontFamily: "JetBrains Mono, monospace" }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: "5px", background: "var(--surface2)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Entity breakdown */}
        {Object.keys(entityTypeCounts).length > 0 && (
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="section-title">Entity Type Distribution</h2>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {Object.entries(entityTypeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type}
                    className={`entity-tag ${type}`}
                    style={{ fontSize: "0.85rem", padding: "0.35rem 0.9rem" }}
                  >
                    {type}: {count}
                  </div>
                ))}
            </div>
            <div style={{ marginTop: "1rem" }}>
              {allEntities
                .filter((e, i, arr) => arr.findIndex((x) => x.normalized === e.normalized) === i)
                .slice(0, 20)
                .map((e, i) => (
                  <span key={i} className={`entity-tag ${e.type}`}>{e.normalized}</span>
                ))}
            </div>
          </div>
        )}

        {/* Claim-status table */}
        <div className="card">
          <h2 className="section-title">Claims Overview Table</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Claim</th><th>Status</th><th>Confidence</th><th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => {
                  const color = STATUS_COLORS[c.status] ?? "#64748b";
                  return (
                    <tr key={c.claim_id}>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--muted)" }}>{c.claim_id}</td>
                      <td>{c.claim.length > 70 ? c.claim.slice(0, 70) + "…" : c.claim}</td>
                      <td>
                        <span className="status-badge"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}55`, fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", color }}>
                        {(c.confidence * 100).toFixed(0)}%
                      </td>
                      <td style={{ color: "var(--muted)" }}>{c.aggregate_scores?.n_evidence ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
