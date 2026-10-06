export type VerificationStatus =
  | "SUPPORTED"
  | "REFUTED"
  | "CONFLICTING EVIDENCE"
  | "NOT ENOUGH EVIDENCE";

export interface Entity {
  text: string;
  type: string;
  normalized: string;
  confidence: number;
}

export interface Relation {
  subject: string;
  relation: string;
  object: string;
  confidence: number;
}

export interface EvidenceScores {
  support_score: number;
  contradict_score: number;
  relevance_score: number;
  source_weight: number;
}

export interface Evidence {
  id: string;
  title: string;
  source: string;
  year: number;
  source_type: string;
  text: string;
  retrieval_score: number;
  scores: EvidenceScores;
  is_synthetic_demo?: boolean;
}

export interface AggregateScores {
  overall_support: number;
  overall_contradict: number;
  max_support: number;
  max_contradict: number;
  avg_relevance: number;
  n_evidence: number;
  n_high_relevance: number;
}

export interface VerifiedClaim {
  claim_id: string;
  claim: string;
  source_sentence: string;
  status: VerificationStatus;
  confidence: number;
  entities: Entity[];
  relations: Relation[];
  supporting_evidence: Evidence[];
  contradicting_evidence: Evidence[];
  text_evidence: Evidence[];
  aggregate_scores: AggregateScores;
  explanation: string;
}

export interface AuditSummary {
  total_claims: number;
  supported: number;
  refuted: number;
  conflicting_evidence: number;
  not_enough_evidence: number;
  reliability_score: number;
}

export interface AuditResult {
  claims: VerifiedClaim[];
  summary: AuditSummary;
  original_response: string;
  elapsed_seconds: number;
}
