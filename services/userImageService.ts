import { db, storage } from '@/config/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';

export interface UserImageUpload {
  id: string;
  userId: string;
  imageUrl: string;
  fileName: string;
  storagePath: string;
  uploadedAt: Date;
  fileSize?: number;
  mimeType?: string;
  description?: string;
}

export interface CreateImageUploadData {
  userId: string;
  fileName: string;
  fileBlob: Blob;
  description?: string;
}

export class UserImageService {
  private static readonly COLLECTION = 'userImages';
  private static readonly STORAGE_PATH = 'user-images';

  /**
   * Upload an image for a specific user
   */
  static async uploadUserImage(data: CreateImageUploadData): Promise<UserImageUpload> {
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

    // Save metadata to Firestore
    const uploadData = {
      userId: data.userId,
      imageUrl,
      fileName: data.fileName,
      storagePath,
      uploadedAt: serverTimestamp(),
      fileSize: data.fileBlob.size,
      mimeType: data.fileBlob.type,
      description: data.description || '',
    };

    const docRef = await addDoc(collection(db, this.COLLECTION), uploadData);

    console.log('✅ Image uploaded to Firestore:', {
      docId: docRef.id,
      userId: data.userId,
      fileName: data.fileName,
      collection: this.COLLECTION
    });

    return {
      id: docRef.id,
      ...uploadData,
      uploadedAt: new Date(),
    } as UserImageUpload;
  }

  /**
   * Get all images uploaded by a specific user (includes migration from old system)
   */
  static async getUserImages(userId: string): Promise<UserImageUpload[]> {
    console.log('🔍 getUserImages called for userId:', userId);
    
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    try {
      // Get images from new system (Firestore-tracked)
      console.log(`🔍 Querying collection '${this.COLLECTION}' for userId: ${userId}`);
      
      // First try simple query without orderBy to avoid potential index issues
      let q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId)
      );

      console.log('📝 Executing Firestore query (without orderBy)...');
      let querySnapshot = await getDocs(q);
      console.log(`📄 Simple query completed, found ${querySnapshot.docs.length} documents`);
      
      // If simple query works, try with orderBy
      if (querySnapshot.docs.length > 0) {
        try {
          console.log('📝 Trying query with orderBy...');
          q = query(
            collection(db, this.COLLECTION),
            where('userId', '==', userId),
            orderBy('uploadedAt', 'desc')
          );
          querySnapshot = await getDocs(q);
          console.log('✅ OrderBy query successful');
        } catch (orderError) {
          console.warn('⚠️ OrderBy query failed, using simple query results:', orderError);
          // Continue with simple query results
        }
      }
      
      const firestoreImages = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📄 Document ${doc.id}:`, { userId: data.userId, fileName: data.fileName });
        return {
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate() || new Date(),
        };
      }) as UserImageUpload[];

      console.log(`📊 Found ${firestoreImages.length} images in Firestore for user ${userId}`);

      // Also check for old images in the legacy `images/` folder
      // Note: This is a temporary migration - in production you'd want to migrate these properly
      let legacyImages: UserImageUpload[] = [];
      
      if (storage) {
        try {
          const legacyRef = ref(storage, 'images/');
          const legacyResult = await listAll(legacyRef);
          
          console.log(`📁 Found ${legacyResult.items.length} legacy images in storage`);
          
          // Create placeholder entries for legacy images
          legacyImages = await Promise.all(
            legacyResult.items.map(async (item, index) => {
              const url = await getDownloadURL(item);
              const fileName = item.name;
              
              return {
                id: `legacy_${fileName}`,
                userId: userId, // Assume current user owns these for now
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
          console.log('No legacy images found or error accessing them:', legacyError);
        }
      }

      // Combine and sort all images
      const allImages = [...firestoreImages, ...legacyImages];
      console.log(`✅ Returning ${allImages.length} total images (${firestoreImages.length} new + ${legacyImages.length} legacy)`);
      
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
    if (!db || !storage) {
      throw new Error('Firebase not initialized. Check your Firebase configuration.');
    }

    // Delete from Storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // Delete from Firestore (only if it's not a legacy image)
    if (!imageId.startsWith('legacy_')) {
      await deleteDoc(doc(db, this.COLLECTION, imageId));
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
   * Debug method to check all documents in the collection
   */
  static async debugGetAllImages(): Promise<any[]> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    try {
      console.log('🚨 DEBUG: Getting ALL documents from userImages collection...');
      const querySnapshot = await getDocs(collection(db, this.COLLECTION));
      const allDocs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`🚨 DEBUG: Found ${allDocs.length} total documents in ${this.COLLECTION} collection`);
      allDocs.forEach(doc => {
        const data = doc as any;
        console.log(`🚨 DEBUG Doc ${doc.id}:`, { userId: data.userId, fileName: data.fileName });
      });
      return allDocs;
    } catch (error) {
      console.error('🚨 DEBUG: Error getting all images:', error);
      throw error;
    }
  }
}