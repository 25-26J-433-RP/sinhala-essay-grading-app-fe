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

// -----------------------------
// Trigger Analysis
// -----------------------------
export async function runFairnessAnalysis(): Promise<void> {
  // Assuming backend runs on port 8080 (Cloud Run or local Python)
  // If running via Expo Go on device, use your machine IP instead of localhost
  const API_URL = "http://localhost:8080";
  const API_KEY = "akura-research-secret-2026";

  try {
    const res = await fetch(`${API_URL}/run-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY, // Note: Python backend uses X-API-KEY header
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Analysis failed: ${err}`);
    }
  } catch (error) {
    console.error("Fairness analysis error:", error);
    throw error;
  }
}
