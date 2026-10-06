"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",          icon: "🏠", label: "Home" },
  { href: "/audit",     icon: "🔍", label: "Audit Response" },
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/report",    icon: "📋", label: "Full Report" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🔬</div>
        <div className="sidebar-logo-text">
          <h2>AI TrustLens</h2>
          <p>Medical AI Auditor</p>
        </div>
      </div>

      <div className="sidebar-divider" />
      <span className="sidebar-label">Navigation</span>

      {NAV.map(({ href, icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link${path === href ? " active" : ""}`}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </Link>
      ))}

      <div className="sidebar-divider" />

      <div className="sidebar-status">
        <div style={{ marginBottom: "0.4rem", fontWeight: 600, color: "var(--text)", fontSize: "0.75rem" }}>
          System Status
        </div>
        <div style={{ color: "var(--muted)", lineHeight: 1.9 }}>
          <span className="status-dot green" />TF-IDF Retriever<br />
          <span className="status-dot amber" />NER: Rule-based<br />
          <span className="status-dot amber" />Graph: External<br />
        </div>
      </div>

      <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "rgba(234,179,8,0.08)", borderRadius: "8px", border: "1px solid rgba(234,179,8,0.2)", fontSize: "0.7rem", color: "#fbbf24" }}>
        ⚠️ Research prototype only. Not for clinical use.
      </div>
    </nav>
  );
}
