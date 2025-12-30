import { db, storage } from '@/config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';




const DEBUG = __DEV__ === true;
const dlog = (...args: any[]) => { if (DEBUG) console.log(...args); };
const dwarn = (...args: any[]) => { if (DEBUG) console.warn(...args); };

// 🔥 Clean object so Firestore does NOT reject undefined or nested unsupported values
function cleanFirestore(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      value === undefined ? null : value
    )
  );
}

export interface UserImageUpload {
  id: string;
   // 🔥 ADD THIS
  image_id: string; // FROM OCR BACKEND

  userId: string;
  studentId: string;
  studentAge?: number;
  studentGrade?: string;
  studentGender?: string;

  imageUrl: string;
  fileName: string;
  storagePath: string;
  uploadedAt: Date;

  fileSize?: number;
  mimeType?: string;
  description?: string;

  // 🔥 OCR FIELDS (MISSING)
  cleaned_text?: string;
  raw_text?: string;
  source?: string;

  // Scoring fields
  score?: number;
  scoreDetails?: any;
  essay_text?: string;
  essay_topic?: string;
  details?: any;
  rubric?: any;
  fairness_report?: any;

  text_feedback?: any;

  audio_feedback?: {
    audio_url?: string;
    audio_base64?: string;
    duration?: number;
    generated_at?: string;
  };
}


export interface CreateImageUploadData {
  userId: string;
  studentId: string;
  studentAge?: number;
  studentGrade?: string;
  studentGender?: string;
  fileName: string;
  fileBlob: Blob;
  image_id: string;
}

export class UserImageService {
  private static readonly COLLECTION = 'userImages';
  private static readonly STORAGE_PATH = 'user-images';


  /**
 * 🔗 Link OCR result to a user image
 * (called after OCR microservice finishes)
 */
static async updateUserImage(
  imageId: string,
  data: {
    image_id?: string;
    image_url?: string;
    raw_text?: string;
    cleaned_text?: string;
    source?: string;
  }
): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized");
  }

  const docRef = doc(db, this.COLLECTION, imageId);

  await updateDoc(docRef, cleanFirestore({
    ...data,
    ocr_updated_at: serverTimestamp(),
  }));

  dlog("🔗 OCR linked to userImage:", { imageId, data });
}

  /**
   * Upload an image for a specific user
   */
 static async uploadUserImage(
  data: CreateImageUploadData
): Promise<string> {
  if (!db || !storage) {
    throw new Error('Firebase not initialized. Check your Firebase configuration.');
  }

  const timestamp = Date.now();
  const fileName = `${data.userId}_${timestamp}_${data.fileName}`;
  const storagePath = `${this.STORAGE_PATH}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  // Upload file to Storage
  await uploadBytes(storageRef, data.fileBlob);
  const imageUrl = await getDownloadURL(storageRef);

  const uploadData = {
  userId: data.userId,
  studentId: data.studentId,
  studentAge: data.studentAge,
  studentGrade: data.studentGrade,
  studentGender: data.studentGender,

  // 🔑 CRITICAL JOIN KEY
  image_id: data.image_id,

  imageUrl,
  fileName: data.fileName,
  storagePath,
  uploadedAt: serverTimestamp(),
  fileSize: data.fileBlob.size,
  mimeType: data.fileBlob.type,
  description: "",

  // 🔥 LET BACKEND FILL THIS
  essay_text: "",
};


  const docRef = await addDoc(collection(db, this.COLLECTION), uploadData);

  dlog('✅ Image uploaded to Firestore:', {
    docId: docRef.id,
    userId: data.userId,
    fileName: data.fileName,
  });

  // 🟢 ADD THIS BLOCK ⬇️⬇️⬇️
if (uploadData.image_id) {
  await fetch(
    `https://sinhala-ocr-api-651457725719.asia-south1.run.app/ocr/sync?image_id=${uploadData.image_id}`,
    { method: "POST" }
  );
  dlog("🔁 OCR sync triggered for image_id:", uploadData.image_id);
}

// 🔚 THEN return
return docRef.id;
}



/**
 * Get a single image document by ID (source of truth for refresh)
 */
static async getUserImage(imageId: string): Promise<UserImageUpload> {
  if (!db) {
    throw new Error("Firestore not initialized");
  }

  const docRef = doc(db, this.COLLECTION, imageId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`Image ${imageId} not found`);
  }

  const data = snap.data();

  // 🔥 Always regenerate fresh image URL
  let imageUrl = data.imageUrl;
  if (data.storagePath && storage) {
    try {
      const storageRef = ref(storage, data.storagePath);
      imageUrl = await getDownloadURL(storageRef);
    } catch (e) {
      console.warn("Failed to refresh image URL, using stored one");
    }
  }

  return {
  id: snap.id,
  userId: data.userId,
  studentId: data.studentId,
  studentAge: data.studentAge,
  studentGrade: data.studentGrade,
  studentGender: data.studentGender,

  imageUrl,
  fileName: data.fileName,
  storagePath: data.storagePath,
  uploadedAt: data.uploadedAt?.toDate?.() || new Date(),

  description: data.description,

  // 🔥 OCR
  cleaned_text: data.cleaned_text,
  raw_text: data.raw_text,
  source: data.source,

  // Essay
  essay_text: data.essay_text,
  essay_topic: data.essay_topic,

  // Scoring
  score: data.score,
  details: data.details,
  rubric: data.rubric,
  fairness_report: data.fairness_report,

  // Feedback
  text_feedback: data.text_feedback,
  audio_feedback: data.audio_feedback,
};

}



  /**
   * Get all images uploaded by a specific user (includes migration from old system)
   */
  static async getUserImages(userId: string): Promise<UserImageUpload[]> {
    dlog('🔍 getUserImages called for userId:', userId);

    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    try {
      // Get images from new system (Firestore-tracked)
      dlog(`🔍 Querying collection '${this.COLLECTION}' for userId: ${userId}`);

      // First try simple query without orderBy to avoid potential index issues
      let q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId)
      );

      dlog('📝 Executing Firestore query (without orderBy)...');
      let querySnapshot = await getDocs(q);
      dlog(`📄 Simple query completed, found ${querySnapshot.docs.length} documents`);

      // If simple query works, try with orderBy
      if (querySnapshot.docs.length > 0) {
        try {
          dlog('📝 Trying query with orderBy...');
          q = query(
            collection(db, this.COLLECTION),
            where('userId', '==', userId),
            orderBy('uploadedAt', 'desc')
          );
          querySnapshot = await getDocs(q);
          dlog('✅ OrderBy query successful');
        } catch (orderError) {
          dwarn('⚠️ OrderBy query failed, using simple query results:', orderError);
          // Continue with simple query results
        }
      }

      const firestoreImages = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const storagePath = (data as any).storagePath;
          
          // Regenerate download URL on-the-fly to ensure token is always fresh
          let imageUrl = (data as any).imageUrl;
          if (storagePath && storage) {
            try {
              const storageRef = ref(storage, storagePath);
              imageUrl = await getDownloadURL(storageRef);
              dlog(`✅ Regenerated fresh download URL for ${storagePath}`);
            } catch (err) {
              dwarn(`⚠️ Failed to regenerate URL for ${storagePath}, using stored URL:`, err);
              // Fall back to stored URL if regeneration fails
            }
          }
          
          return {
            id: doc.id,
            ...(data as any),
            imageUrl, // Use freshly generated or fallback URL
            uploadedAt: (data as any).uploadedAt?.toDate() || new Date(),
          } as UserImageUpload;
        })
      );

      dlog(`📊 Found ${firestoreImages.length} images in Firestore for user ${userId}`);

      // Also check for old images in the legacy `images/` folder
      // Note: This is a temporary migration - in production you'd want to migrate these properly
      let legacyImages: UserImageUpload[] = [];

      if (storage) {
        try {
          const legacyRef = ref(storage, 'images/');
          const legacyResult = await listAll(legacyRef);

          dlog(`📁 Found ${legacyResult.items.length} legacy images in storage`);

          // Create placeholder entries for legacy images
          legacyImages = await Promise.all(
            legacyResult.items.map(async (item, index) => {
              const url = await getDownloadURL(item);
              const fileName = item.name;

              return {
                id: `legacy_${fileName}`,
                userId: userId, // Assume current user owns these for now
                studentId: 'LEGACY',
                imageUrl: url,
                fileName: fileName,
                storagePath: `images/${fileName}`,
                uploadedAt: new Date(Date.now() - (index * 60000)), // Fake timestamps
                fileSize: 0,
                mimeType: 'image/jpeg',
                description: 'Legacy upload (migrated)',
              } as UserImageUpload;
            })
          );
        } catch (legacyError) {
          dwarn('No legacy images found or error accessing them:', legacyError);
        }
      }

      // Combine and sort all images
      const allImages = [...firestoreImages, ...legacyImages];
      dlog(`✅ Returning ${allImages.length} total images (${firestoreImages.length} new + ${legacyImages.length} legacy)`);

      return allImages.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    } catch (error) {
      console.error('❌ Error getting user images:', error);
      return [];
    }
  }

  /**
   * Delete a user's image (both from Storage and Firestore, handles legacy images)
   */
  static async deleteUserImage(imageId: string, storagePath: string): Promise<void> {
    dlog('🗑️ deleteUserImage called:', { imageId, storagePath });

    if (!db || !storage) {
      console.error('❌ Firebase not initialized');
      throw new Error('Firebase not initialized. Check your Firebase configuration.');
    }

    try {
      // Delete from Storage
      dlog('🗑️ Deleting from Storage:', storagePath);
      const storageRef = ref(storage, storagePath);
      try {
        await deleteObject(storageRef);
        dlog('✅ Deleted from Storage');
      } catch (storageErr: any) {
        // If the object doesn't exist, continue to delete the Firestore doc
        if (storageErr?.code === 'storage/object-not-found') {
          dwarn('⚠️ Storage object not found, continuing with Firestore delete');
        } else {
          console.error('❌ Storage delete failed:', storageErr);
          throw storageErr;
        }
      }

      // Delete from Firestore (only if it's not a legacy image)
      if (!imageId.startsWith('legacy_')) {
        dlog('🗑️ Deleting from Firestore:', imageId);
        await deleteDoc(doc(db, this.COLLECTION, imageId));
        dlog('✅ Deleted from Firestore');
      } else {
        dlog('⏭️ Skipping Firestore delete (legacy image)');
      }

      dlog('✅ Image deletion complete');
    } catch (error) {
      console.error('❌ Error during deletion:', error);
      throw error;
    }
  }

  /**
   * Check if user owns an image
   */
  static async checkImageOwnership(imageId: string, userId: string): Promise<boolean> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const q = query(
      collection(db, this.COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.some(doc => doc.id === imageId);
  }

  /**
   * Get upload statistics for a user
   */
  static async getUserUploadStats(userId: string): Promise<{
    totalImages: number;
    totalSize: number;
    firstUpload?: Date;
    lastUpload?: Date;
  }> {
    const images = await this.getUserImages(userId);

    const totalSize = images.reduce((sum, img) => sum + (img.fileSize || 0), 0);
    const uploadDates = images
      .map(img => img.uploadedAt)
      .filter(date => date)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalImages: images.length,
      totalSize,
      firstUpload: uploadDates[0],
      lastUpload: uploadDates[uploadDates.length - 1],
    };
  }

  /**
   * (id:) the description/notes for an image
   */
  static async updateImageDescription(imageId: string, description: string): Promise<void> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const docRef = doc(db, this.COLLECTION, imageId);
    await updateDoc(docRef, {
      description,
    });

    dlog('✅ Image description updated:', { imageId, description });
  }

  /**
   * Update text feedback for an image (generated from API)
   */
  static async updateImageTextFeedback(imageId: string, textFeedback: any): Promise<void> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const docRef = doc(db, this.COLLECTION, imageId);
    await updateDoc(docRef, {
      text_feedback: cleanFirestore(textFeedback),
    });

    dlog('✅ Image text feedback updated:', { imageId, textFeedback });
  }

  /**
   * Update audio feedback for an image (generated from TTS API)
   * Creates document if it doesn't exist (for batch feedback)
   */
  static async updateImageAudioFeedback(imageId: string, audioFeedback: any): Promise<void> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const docRef = doc(db, this.COLLECTION, imageId);
    
    try {
      // Try to update existing document
      await updateDoc(docRef, {
        audio_feedback: cleanFirestore({
          ...audioFeedback,
          generated_at: new Date().toISOString(),
        }),
      });
      dlog('✅ Image audio feedback updated:', { imageId, audioFeedback });
    } catch (error: any) {
      // If document doesn't exist (batch feedback case), create it
      if (error.code === 'not-found') {
        dlog('📝 Document not found, creating new document for batch feedback:', { imageId });
        await addDoc(collection(db, this.COLLECTION), {
          id: imageId,
          isBatchFeedback: true,
          audio_feedback: cleanFirestore({
            ...audioFeedback,
            generated_at: new Date().toISOString(),
          }),
          createdAt: serverTimestamp(),
        });
        dlog('✅ Batch feedback audio created:', { imageId, audioFeedback });
      } else {
        throw error;
      }
    }
  }


  /**
   * Debug method to check all documents in the collection
   */
  static async debugGetAllImages(): Promise<any[]> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    try {
      dlog('🚨 DEBUG: Getting ALL documents from userImages collection...');
      const querySnapshot = await getDocs(collection(db, this.COLLECTION));
      const allDocs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      dlog(`🚨 DEBUG: Found ${allDocs.length} total documents in ${this.COLLECTION} collection`);
      allDocs.forEach(doc => {
        const data = doc as any;
        dlog(`🚨 DEBUG Doc ${doc.id}:`, { userId: data.userId, fileName: data.fileName });
      });
      return allDocs;
    } catch (error) {
      console.error('🚨 DEBUG: Error getting all images:', error);
      throw error;
    }
  }

/**
 * Update score results in Firestore
 */
static async updateImageScore(id: string, scoreData: any): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const docRef = doc(db, this.COLLECTION, id);

  // 🔥 Save ALL fields from scoreData (including essay_text + essay_topic)
  const cleanedData = cleanFirestore({
    ...scoreData,                 // <-- spread EVERYTHING coming in
    updatedAt: new Date().toISOString(),
  });

  await updateDoc(docRef, cleanedData);

  dlog("✅ Score updated:", { id, cleanedData });
}

// static listenToOCR(imageId: string, cb: (data: any) => void) {
//   const ref = doc(db, "ocr_results", imageId);
//   return onSnapshot(ref, (snap) => {
//     if (snap.exists()) cb(snap.data());
//   });
// }




}