import {
  collection,
  getDocs,
  query,
  orderBy,
  Firestore
} from "firebase/firestore";
import { db } from "../config/firebase";

// -----------------------------
// Fairness Report Type
// -----------------------------
export interface FairnessReport {
  grade: number;
  spd: number;
  dir: number;
  threshold: number;
  sample_size: number;
  evaluated_at?: any;
  // New statistical metrics (added 2026-02-18)
  mean_dyslexic?: number;
  mean_non_dyslexic?: number;
  cohens_d?: number;
  p_value?: number;
  effect_size?: string;
  statistically_significant?: boolean;
}

// -----------------------------
// Helper: Ensure Firestore exists
// -----------------------------
function getDb(): Firestore {
  if (!db) {
    throw new Error("Firestore not initialized");
  }
  return db;
}

// -----------------------------
// Fetch all fairness reports
// -----------------------------
export async function getFairnessReports(): Promise<FairnessReport[]> {
  const firestore = getDb();

  const q = query(
    collection(firestore, "fairnessReports"),
    orderBy("grade", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      grade: data.grade,
      spd: data.spd,
      dir: data.dir,
      threshold: data.threshold,
      sample_size: data.sample_size,
      evaluated_at: data.evaluated_at,
      // New statistical metrics (added 2026-02-18)
      p_value: data.p_value,
      cohens_d: data.cohens_d,
      mean_dyslexic: data.mean_dyslexic,
      mean_non_dyslexic: data.mean_non_dyslexic,
      effect_size: data.effect_size,
      statistically_significant: data.statistically_significant,
    } as FairnessReport;
  });
}

export async function runFairnessAnalysis(): Promise<void> {
  // Use the gateway from env if available (production), fallback to localhost for dev
  const GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY;
  const API_KEY = process.env.EXPO_PUBLIC_INTERNAL_API_KEY || "akura-research-secret-2026";

  // Construction of the final URL
  // If gateway is used, we need the service prefix. 
  // If localhost is used, we hit the port directly.
  const FINAL_URL = GATEWAY_URL
    ? `${GATEWAY_URL}/bias-aware-scoring-engine/run-analysis`
    : "http://localhost:8080/run-analysis";

  try {
    console.log(`[FAIRNESS] Triggering analysis via: ${FINAL_URL}`);

    const res = await fetch(FINAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[FAIRNESS] Backend Error: ${err}`);
      throw new Error(`Analysis failed: ${err}`);
    }

    console.log("[FAIRNESS] Analysis triggered successfully");
  } catch (error) {
    console.error("Fairness analysis error:", error);
    throw error;
  }
}
