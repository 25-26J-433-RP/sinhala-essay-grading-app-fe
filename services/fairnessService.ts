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
    };
  });
}
