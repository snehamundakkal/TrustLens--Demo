import Sidebar from "@/components/Sidebar";
import Link from "next/link";

const PIPELINE_STEPS = [
  { step: "01", title: "Claim Extraction", desc: "Decompose AI text into atomic, verifiable claims using sentence parsing and factual verb detection.", icon: "✂️" },
  { step: "02", title: "Medical NER", desc: "Identify drugs, diseases, symptoms, and biomarkers using biomedical named entity recognition.", icon: "🧬" },
  { step: "03", title: "Relation Extraction", desc: "Extract typed relationships: TREATS, CAUSES, PREVENTS, RISK_FACTOR_FOR between entities.", icon: "🔗" },
  { step: "04", title: "Hybrid Retrieval", desc: "Retrieve trusted evidence via TF-IDF semantic search over a curated medical evidence corpus.", icon: "🔍" },
  { step: "05", title: "Evidence Scoring", desc: "Multi-factor transparent scoring: semantic similarity, source reliability, keyword overlap, recency.", icon: "📊" },
  { step: "06", title: "4-Class Verification", desc: "Classify each claim as SUPPORTED, REFUTED, CONFLICTING, or NOT ENOUGH EVIDENCE.", icon: "🏷️" },
];

const CLASSES = [
  { status: "SUPPORTED", emoji: "✅", desc: "Evidence supports the claim", color: "#22c55e" },
  { status: "REFUTED", emoji: "❌", desc: "Evidence contradicts the claim", color: "#ef4444" },
  { status: "CONFLICTING EVIDENCE", emoji: "⚠️", desc: "Sources give mixed signals", color: "#f59e0b" },
  { status: "NOT ENOUGH EVIDENCE", emoji: "❓", desc: "Insufficient evidence to decide", color: "#64748b" },
];

export default function Home() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <h1>🔬 AI TrustLens</h1>
          <p>An AI Output Auditing Platform for Medical AI Responses · B.Tech CS Major Project</p>
        </div>

        <div className="disclaimer">
          <span>⚠️</span>
          <span>
            <strong>Medical Disclaimer:</strong> AI TrustLens is an academic research prototype for
            auditing AI-generated medical information. It does <strong>not</strong> provide medical
            diagnosis, treatment recommendations, or clinical advice.
          </span>
        </div>

        <div className="two-col" style={{ marginBottom: "2rem" }}>
          <div>
            <div className="card">
              <h2 className="section-title">What is AI TrustLens?</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1rem" }}>
                AI TrustLens audits AI-generated medical responses and verifies individual factual
                claims using Medical NER, Knowledge Graphs, and Retrieval-Augmented Generation (RAG).
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
                Every verification decision is evidence-backed and traceable — not hidden inside a
                black-box language model.
              </p>
              <Link href="/audit" className="btn btn-primary">
                🔍 Start Auditing
              </Link>
            </div>

            <div className="card" style={{ marginTop: "1rem" }}>
              <h2 className="section-title">Research Contribution</h2>
              <blockquote style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "1rem", color: "var(--muted)", fontStyle: "italic", fontSize: "0.875rem", lineHeight: 1.7 }}>
                "AI TrustLens demonstrates that combining Medical NER, Knowledge Graphs, and
                RAG-based evidence retrieval in a hybrid architecture provides more transparent
                and traceable claim-level auditing than RAG-only approaches."
              </blockquote>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h2 className="section-title">Verification Classes</h2>
              {CLASSES.map(({ status, emoji, desc, color }) => (
                <div
                  key={status}
                  style={{
                    background: `${color}12`, border: `1px solid ${color}44`,
                    borderRadius: "8px", padding: "0.7rem 0.9rem", marginBottom: "0.5rem",
                  }}
                >
                  <strong style={{ color }}>{emoji} {status}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.2rem" }}>{desc}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2 className="section-title">Technology Stack</h2>
              {[
                ["FastAPI", "Python REST API backend"],
                ["TF-IDF / FAISS", "Evidence retrieval (semantic search)"],
                ["HuggingFace NER", "d4data/biomedical-ner-all"],
                ["Neo4j", "Knowledge graph (optional)"],
                ["Next.js 14", "React frontend"],
                ["Vercel", "Serverless deployment"],
              ].map(([tech, desc]) => (
                <div key={tech} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid var(--border2)", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>{tech}</span>
                  <span style={{ color: "var(--muted)" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2 className="section-title">Pipeline Architecture</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
          {PIPELINE_STEPS.map(({ step, title, desc, icon }) => (
            <div
              key={step}
              className="card"
              style={{ position: "relative", overflow: "hidden" }}
            >
              <div style={{ fontSize: "2.5rem", opacity: 0.08, position: "absolute", top: "0.5rem", right: "0.75rem", fontFamily: "monospace", fontWeight: 800 }}>{step}</div>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{icon}</div>
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.35rem", fontSize: "0.9rem" }}>{title}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
