"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { AuditResult } from "@/types";
import { STATUS_COLORS, STATUS_EMOJIS } from "@/lib/api";

function generateMarkdown(result: AuditResult): string {
  const { summary, claims, original_response, elapsed_seconds } = result;
  const lines: string[] = [
    "# AI TrustLens – Audit Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Processing time:** ${elapsed_seconds}s`,
    "",
    "> ⚠️ **Medical Disclaimer**: AI TrustLens is an academic research prototype.",
    "> It does **not** provide medical diagnosis or treatment recommendations.",
    "",
    "## Audit Summary",
    "",
    `**Original Response:** _${original_response.slice(0, 200)}…_`,
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Total Claims | ${summary.total_claims} |`,
    `| ✅ Supported | ${summary.supported} |`,
    `| ❌ Refuted | ${summary.refuted} |`,
    `| ⚠️ Conflicting Evidence | ${summary.conflicting_evidence} |`,
    `| ❓ Not Enough Evidence | ${summary.not_enough_evidence} |`,
    `| Overall Reliability Score | **${(summary.reliability_score * 100).toFixed(1)}%** |`,
    "",
    "## Claim-wise Results",
    "",
  ];

  for (const claim of claims) {
    const emoji = STATUS_EMOJIS[claim.status] ?? "❓";
    lines.push(`### ${claim.claim_id}: ${emoji} ${claim.status}`);
    lines.push("");
    lines.push(`**Claim:** _${claim.claim}_`);
    lines.push("");
    lines.push(`**Status:** ${emoji} **${claim.status}**  |  **Confidence:** ${(claim.confidence * 100).toFixed(1)}%`);
    lines.push("");
    if (claim.entities.length > 0) {
      lines.push("**Entities:** " + claim.entities.map((e) => `\`${e.text}\` (${e.type})`).join(", "));
      lines.push("");
    }
    if (claim.relations.length > 0) {
      lines.push("**Relations:**");
      for (const r of claim.relations.slice(0, 3)) {
        lines.push(`- ${r.subject} –[${r.relation}]→ ${r.object}`);
      }
      lines.push("");
    }
    if (claim.supporting_evidence.length > 0) {
      lines.push("**Supporting Evidence:**");
      for (const ev of claim.supporting_evidence.slice(0, 2)) {
        lines.push(`- **${ev.title}** (${ev.source}, ${ev.year})`);
        lines.push(`  _${ev.text.slice(0, 150)}…_`);
      }
      lines.push("");
    }
    if (claim.contradicting_evidence.length > 0) {
      lines.push("**Contradicting Evidence:**");
      for (const ev of claim.contradicting_evidence.slice(0, 2)) {
        lines.push(`- **${ev.title}** (${ev.source}, ${ev.year})`);
        lines.push(`  _${ev.text.slice(0, 150)}…_`);
      }
      lines.push("");
    }
    lines.push(`**Explanation:** _${claim.explanation}_`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("*AI TrustLens – Academic Research Prototype | Not for clinical use*");
  return lines.join("\n");
}

export default function ReportPage() {
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
            <h1>📋 Full Report</h1>
            <p>Complete traceable audit report with all evidence references.</p>
          </div>
          <div className="info-box">
            No audit report yet. Go to <strong>🔍 Audit Response</strong> and run an audit first.
          </div>
        </main>
      </div>
    );
  }

  const md = generateMarkdown(result);
  const { summary, claims } = result;

  const downloadMd = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustlens_audit_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustlens_audit_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1>📋 Full Audit Report</h1>
          <p>Complete evidence-backed report for {summary.total_claims} verified claims.</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <button className="download-btn" onClick={downloadMd}>⬇️ Download Markdown</button>
          <button className="download-btn" onClick={downloadJson}>⬇️ Download JSON</button>
        </div>

        {/* Header summary */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              ["Total", summary.total_claims, "#60a5fa"],
              ["✅ Supported", summary.supported, "#22c55e"],
              ["❌ Refuted", summary.refuted, "#ef4444"],
              ["⚠️ Conflicting", summary.conflicting_evidence, "#f59e0b"],
              ["❓ Not Enough", summary.not_enough_evidence, "#64748b"],
              ["Reliability", `${(summary.reliability_score * 100).toFixed(1)}%`, summary.reliability_score >= 0.7 ? "#22c55e" : summary.reliability_score >= 0.5 ? "#f59e0b" : "#ef4444"],
            ].map(([label, val, color]) => (
              <div key={String(label)} style={{
                background: `${color as string}12`, border: `1px solid ${color as string}33`,
                borderRadius: "8px", padding: "0.5rem 1rem", textAlign: "center", minWidth: "90px",
              }}>
                <div style={{ color: color as string, fontWeight: 700, fontSize: "1.2rem" }}>{val}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-claim report */}
        {claims.map((claim) => {
          const color = STATUS_COLORS[claim.status] ?? "#64748b";
          const emoji = STATUS_EMOJIS[claim.status] ?? "❓";
          return (
            <div key={claim.claim_id} className="card" style={{ marginBottom: "1.25rem", borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "1rem" }}>
                <div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--muted)", fontSize: "0.75rem", marginRight: "0.75rem" }}>{claim.claim_id}</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{emoji} {claim.status}</span>
                </div>
                <span style={{ color, fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}>
                  {(claim.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>

              <p style={{ color: "var(--muted)", fontStyle: "italic", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
                "{claim.claim}"
              </p>

              {/* Entities */}
              {claim.entities.length > 0 && (
                <div style={{ marginBottom: "0.6rem" }}>
                  {claim.entities.map((e, i) => (
                    <span key={i} className={`entity-tag ${e.type}`}>{e.text}</span>
                  ))}
                </div>
              )}

              {/* Relations */}
              {claim.relations.length > 0 && (
                <div style={{ marginBottom: "0.6rem" }}>
                  {claim.relations.slice(0, 3).map((r, i) => (
                    <span key={i} className="relation-tag">
                      {r.subject} → [{r.relation}] → {r.object}
                    </span>
                  ))}
                </div>
              )}

              {/* Key evidence */}
              {(claim.supporting_evidence.length > 0 || claim.contradicting_evidence.length > 0) && (
                <div style={{ marginBottom: "0.75rem" }}>
                  {claim.supporting_evidence.slice(0, 1).map((ev, i) => (
                    <div key={i} className="evidence-item supporting" style={{ padding: "0.6rem 0.8rem" }}>
                      <span style={{ color: "#4ade80", fontWeight: 600, fontSize: "0.78rem" }}>✅ </span>
                      <span style={{ color: "var(--text)", fontWeight: 500, fontSize: "0.8rem" }}>{ev.title}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}> · {ev.source}, {ev.year}</span>
                    </div>
                  ))}
                  {claim.contradicting_evidence.slice(0, 1).map((ev, i) => (
                    <div key={i} className="evidence-item contradicting" style={{ padding: "0.6rem 0.8rem" }}>
                      <span style={{ color: "#f87171", fontWeight: 600, fontSize: "0.78rem" }}>❌ </span>
                      <span style={{ color: "var(--text)", fontWeight: 500, fontSize: "0.8rem" }}>{ev.title}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}> · {ev.source}, {ev.year}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation */}
              <div style={{
                background: "var(--bg2)", borderRadius: "6px", padding: "0.75rem",
                color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.6,
              }}>
                💡 {claim.explanation}
              </div>
            </div>
          );
        })}

        <div style={{ color: "var(--muted)", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>
          AI TrustLens – Academic Research Prototype | Not for clinical use
        </div>
      </main>
    </div>
  );
}
