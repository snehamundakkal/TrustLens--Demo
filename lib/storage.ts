"use client";
import { useEffect, useRef } from "react";
import type { AuditResult } from "@/types";

const KEY = "trustlens_result";

export function saveResult(result: AuditResult) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(result));
  } catch {}
}

export function loadResult(): AuditResult | null {
  try {
    const s = sessionStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
