import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI TrustLens – Medical AI Auditor",
  description:
    "AI Output Auditing Platform for Medical AI Responses using NER, RAG and Knowledge Graphs. B.Tech CS Major Project.",
  keywords: ["medical AI", "fact verification", "NER", "RAG", "knowledge graph", "hallucination detection"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
