import {
  collection,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  query,
  where,
  getDocs,
  Firestore,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { storage } from "@/config/firebase";
import { getDownloadURL, ref as storageRef } from "firebase/storage";

export interface PublicShare {
  id: string;
  imageId: string;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  viewCount: number;
}

/**
 * Generate a unique share ID for an essay
 */
export async function generateShareLink(imageId: string): Promise<string> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    console.log('📝 generateShareLink called with imageId:', imageId);
    console.log('📝 imageId type:', typeof imageId);
    console.log('📝 imageId length:', imageId?.length);

    // Generate a unique token using random characters
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let shareId = "";
    for (let i = 0; i < 12; i++) {
      shareId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    console.log('🔑 Generated shareId:', shareId);

    // Store the share mapping in Firestore
    const sharesCollection = collection(db as Firestore, "public_shares");
    const shareRef = doc(sharesCollection, shareId);

    const shareData = {
      id: shareId,
      imageId: imageId,
      createdAt: Timestamp.now(),
      viewCount: 0,
    };

    console.log('💾 Storing share data:', shareData);

    await setDoc(shareRef, shareData as PublicShare);

    console.log('✅ Share created successfully. ID:', shareId);
    return shareId;
  } catch (error) {
    console.error("❌ Error generating share link:", error);
    throw error;
  }
}

/**
 * Get essay data using a share ID (public access)
 */
export async function getSharedEssayData(shareId: string): Promise<any> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    // Get share mapping
    const shareRef = doc(db as Firestore, "public_shares", shareId);
    const shareDoc = await getDoc(shareRef);

    if (!shareDoc.exists()) {
      throw new Error("Share link not found or expired");
    }

    const shareData = shareDoc.data() as PublicShare;
    console.log('📋 Share data found:', {
      shareId,
      imageId: shareData.imageId,
      rawImageId: shareData.imageId?.toString?.(),
      imageIdType: typeof shareData.imageId,
      createdAt: shareData.createdAt?.toDate?.(),
      viewCount: shareData.viewCount,
      allFields: shareData,
    });

    // Try multiple possible collection names
    const possibleCollections = ['userImages', 'images', 'user_images', 'essays'];
    let imageDoc: any = null;
    let foundCollection = '';

    for (const collectionName of possibleCollections) {
      console.log(`🔍 Trying collection: "${collectionName}" with ID: "${shareData.imageId}"`);
      const imageRef = doc(db as Firestore, collectionName, shareData.imageId);
      const testDoc = await getDoc(imageRef);
      
      if (testDoc.exists()) {
        console.log(`✅ Found essay in collection: "${collectionName}"`);
        imageDoc = testDoc;
        foundCollection = collectionName;
        break;
      } else {
        console.log(`❌ Not found in "${collectionName}"`);
      }
    }

    if (!imageDoc) {
      // If not found, log all collections to help debug
      const errorMsg = `Essay data not found. Searched collections: [${possibleCollections.join(', ')}] with ID: ${shareData.imageId}`;
      console.error('🔴', errorMsg);
      throw new Error(errorMsg);
    }

    const essayData = imageDoc.data();
    console.log('📄 Essay data loaded from collection:', foundCollection);
    console.log('📄 Essay data structure:', {
      hasImageUrl: !!essayData?.imageUrl,
      hasImage: !!essayData?.image,
      hasStudentId: !!essayData?.studentId,
      hasScore: !!essayData?.score,
      keys: Object.keys(essayData || {}),
    });

    // Resolve image URL if it's a Firebase Storage path
    // Check both imageUrl (correct field) and image (fallback)
    const imageField = essayData?.imageUrl || essayData?.image;
    if (essayData && imageField) {
      try {
        // If it's a gs:// path, get the download URL
        if (imageField.startsWith?.('gs://')) {
          const downloadUrl = await getDownloadURL(storageRef(storage as any, imageField));
          essayData.imageUrl = downloadUrl;
          console.log('✅ Resolved image URL from gs:// path');
        } else {
          // Otherwise use it as is
          essayData.imageUrl = imageField;
        }
      } catch (err) {
        console.log('⚠️ Could not resolve image URL:', err);
        // Keep the original image value
        essayData.imageUrl = imageField;
      }
    }

    // Increment view count
    await setDoc(
      shareRef,
      { viewCount: (shareData.viewCount || 0) + 1 },
      { merge: true }
    );

    return essayData;
  } catch (error) {
    console.error("❌ Error fetching shared essay data:", error);
    throw error;
  }
}

/**
 * Check if a share link exists
 */
export async function shareExists(shareId: string): Promise<boolean> {
  try {
    if (!db) {
      return false;
    }

    const shareRef = doc(db as Firestore, "public_shares", shareId);
    const shareDoc = await getDoc(shareRef);
    return shareDoc.exists();
  } catch {
    return false;
  }
}

/**
 * Delete a share link
 */
export async function deleteShare(shareId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error("Firebase not initialized");
    }

    const shareRef = doc(db as Firestore, "public_shares", shareId);
    // Instead of deleting, we could mark as deleted
    await setDoc(shareRef, { deleted: true }, { merge: true });
  } catch (error) {
    console.error("❌ Error deleting share:", error);
    throw error;
  }
}
