// services/correctionHistoryService.ts
/**
 * Firestore service for storing correction history per student.
 *
 * Collection: correctionHistory
 * Document structure:
 *   - studentId, imageId, teacherId
 *   - originalText, correctedText
 *   - corrections[]  (accepted / rejected / edited tokens with annotations)
 *   - summary  (total errors, accepted, rejected, edited, patterns breakdown)
 *   - dyslexiaLabel
 *   - createdAt
 */

import { db } from "@/config/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────

/** A single correction token saved to history */
export interface CorrectionRecord {
  word: string;
  type: "error" | "correct" | string;
  suggestion: string;
  pattern: string;
  confidence: number;
  explanation?: string;
  /** Final decision taken by teacher */
  status: "accepted" | "rejected" | "pending";
  /** If the teacher edited the suggestion */
  editedSuggestion?: string;
  /** Teacher annotation / comment */
  annotation?: string;
}

/** Summary stats saved alongside the full record */
export interface CorrectionSummary {
  totalTokens: number;
  totalErrors: number;
  accepted: number;
  rejected: number;
  edited: number;
  /** count per pattern */
  patternBreakdown: Record<string, number>;
}

/** Full document stored in Firestore */
export interface CorrectionHistoryDoc {
  id?: string;
  studentId: string;
  imageId: string;
  teacherId?: string;
  originalText: string;
  correctedText: string;
  corrections: CorrectionRecord[];
  summary: CorrectionSummary;
  dyslexiaLabel?: string;
  modelUsed?: string;
  processingTimeMs?: number;
  createdAt: Date;
}

// ─── Service ──────────────────────────────────────────────────

const COLLECTION = "correctionHistory";

function cleanForFirestore(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (value === undefined ? null : value)),
  );
}

/**
 * Save a completed correction session to Firestore.
 */
export async function saveCorrectionHistory(
  data: Omit<CorrectionHistoryDoc, "id" | "createdAt">,
): Promise<string> {
  if (!db) throw new Error("Firestore not initialised");

  const docRef = await addDoc(
    collection(db, COLLECTION),
    cleanForFirestore({
      ...data,
      createdAt: serverTimestamp(),
    }),
  );
  console.log("📝 Correction history saved:", docRef.id);
  return docRef.id;
}

/**
 * Fetch all correction history for a given student, ordered newest-first.
 */
export async function getCorrectionHistory(
  studentId: string,
): Promise<CorrectionHistoryDoc[]> {
  if (!db) throw new Error("Firestore not initialised");

  const q = query(
    collection(db, COLLECTION),
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as CorrectionHistoryDoc;
  });
}

/**
 * Fetch correction history for a specific image.
 */
export async function getCorrectionHistoryByImage(
  imageId: string,
): Promise<CorrectionHistoryDoc[]> {
  if (!db) throw new Error("Firestore not initialised");

  const q = query(
    collection(db, COLLECTION),
    where("imageId", "==", imageId),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as CorrectionHistoryDoc;
  });
}

/**
 * Compute trend data from a student's history.
 * Returns per-session: date, total errors, accepted ratio, top pattern.
 */
export interface TrendPoint {
  date: Date;
  totalErrors: number;
  acceptedRatio: number;
  topPattern: string;
}

export function computeTrends(
  history: CorrectionHistoryDoc[],
): TrendPoint[] {
  return history
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((h) => {
      const topPattern =
        Object.entries(h.summary.patternBreakdown).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] || "none";

      return {
        date: h.createdAt,
        totalErrors: h.summary.totalErrors,
        acceptedRatio:
          h.summary.totalErrors > 0
            ? h.summary.accepted / h.summary.totalErrors
            : 1,
        topPattern,
      };
    });
}
