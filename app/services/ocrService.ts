import { db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getOCRResultByImageId(imageId: string) {
  const docRef = doc(db, "ocr_results", imageId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  return snap.data();
}
