"use client";
import { useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import ClaimCard from "@/components/ClaimCard";
import { api } from "@/lib/api";
import { saveResult } from "@/lib/storage";
import type { AuditResult } from "@/types";

const DEMO_TEXT =
  "Metformin is commonly used for type 2 diabetes. It can cause gastrointestinal side effects such as nausea and diarrhea. Metformin completely cures diabetes. Statins are effective for reducing LDL cholesterol. Aspirin always prevents heart attacks without any risks. Hypertension is a major risk factor for stroke.";

const STEPS = [
  "Extracting claims…",
  "Running Medical NER…",
  "Extracting relationships…",
  "Retrieving evidence…",
  "Scoring & verifying…",
  "Generating report…",
];

export default function AuditPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const simulateProgress = () => {
    let i = 0;
    setProgress(5);
    setStep(STEPS[0]);
    intervalRef.current = setInterval(() => {
      i++;
      if (i < STEPS.length) {
        setProgress(Math.round(5 + (i / STEPS.length) * 85));
        setStep(STEPS[i]);
      }
    }, 800);
  };

  const stopProgress = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(100);
    setStep("Done!");
  };

  const runAudit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    simulateProgress();
    try {
      const data = await api.audit(text.trim());
      stopProgress();
      saveResult(data);
      setResult(data);
    } catch (err: unknown) {
      stopProgress();
      setError(err instanceof Error ? err.message : "Audit failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setText("");
    setResult(null);
    setError(null);
    setProgress(0);
    setStep("");
  };

  const counts = result?.summary;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1>🔍 Audit AI Medical Response</h1>
          <p>Paste an AI-generated medical text — the system will extract and verify each factual claim.</p>
        </div>

        <div className="disclaimer">
          <span>⚠️</span>
          <span>Research prototype only. Not for clinical use or medical decisions.</span>
        </div>

        {/* Input area */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>AI-generated medical response:</span>
            <div className="btn-row">
              <button className="btn btn-secondary" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                onClick={() => { setText(DEMO_TEXT); setResult(null); setError(null); }}>
                📋 Load Demo
              </button>
              <button className="btn btn-ghost" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                onClick={clear}>
                🗑️ Clear
              </button>
            </div>
          </div>

          <textarea
            rows={7}
            placeholder="Paste the AI-generated medical response here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
              {text.length}/8000 characters
            </span>
            <button
              className="btn btn-primary"
              onClick={runAudit}
              disabled={loading || !text.trim()}
              style={{ minWidth: "180px" }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, marginRight: 6 }} />{step}</>
              ) : "🔍 Audit Response"}
            </button>
          </div>
        </div>

        {/* Progress */}
        {loading && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--muted)" }}>{step}</span>
              <span style={{ color: "var(--accent)", fontFamily: "JetBrains Mono, monospace" }}>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "0.75rem 1rem", color: "#f87171", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
            ❌ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                Results — {result.summary.total_claims} claims verified in {result.elapsed_seconds}s
              </h2>
            </div>

            {/* Summary metrics */}
            <div className="metric-grid">
              {[
                ["Total", counts?.total_claims ?? 0, "#60a5fa"],
                ["✅ Supported", counts?.supported ?? 0, "#22c55e"],
                ["❌ Refuted", counts?.refuted ?? 0, "#ef4444"],
                ["⚠️ Conflicting", counts?.conflicting_evidence ?? 0, "#f59e0b"],
                ["❓ Not Enough", counts?.not_enough_evidence ?? 0, "#64748b"],
              ].map(([label, val, color]) => (
                <div key={String(label)} className="metric-card">
                  <span className="metric-value" style={{ color: color as string }}>{val}</span>
                  <span className="metric-label">{label}</span>
                </div>
              ))}
            </div>

            {/* Reliability score */}
            <div className="reliability-bar" style={{ marginBottom: "1.5rem" }}>
              <div
                className="reliability-score"
                style={{ color: (counts?.reliability_score ?? 0) >= 0.7 ? "#22c55e" : (counts?.reliability_score ?? 0) >= 0.5 ? "#f59e0b" : "#ef4444" }}
              >
                {((counts?.reliability_score ?? 0) * 100).toFixed(1)}%
              </div>
              <div className="reliability-label">Overall Reliability Score</div>
              <div className="reliability-track">
                <div
                  className="reliability-fill"
                  style={{
                    width: `${(counts?.reliability_score ?? 0) * 100}%`,
                    background: (counts?.reliability_score ?? 0) >= 0.7 ? "#22c55e" : (counts?.reliability_score ?? 0) >= 0.5 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>

            {/* Claim cards */}
            {result.claims.map((claim) => (
              <ClaimCard key={claim.claim_id} claim={claim} />
            ))}
          </>
        )}

        {!result && !loading && !error && (
          <div className="info-box">
            Enter a medical AI response above and click <strong>Audit Response</strong> to start. Use <strong>📋 Load Demo</strong> for a quick example.
          </div>
        )}
      </main>
    </div>
  );
}
