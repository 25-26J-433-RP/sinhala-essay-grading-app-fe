import { db } from '@/config/firebase';
import { CreateUserProfileData, UpdateUserProfileData, UserProfile } from '@/types/auth';
import {
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    Unsubscribe,
    updateDoc
} from 'firebase/firestore';

export class UserProfileService {
  private static readonly COLLECTION = 'userProfiles';

  /**
   * Creates a new user profile in Firestore
   */
  static async createUserProfile(data: CreateUserProfileData): Promise<void> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const userProfile: any = {
      uid: data.uid,
      email: data.email,
      role: data.role || 'teacher', // Default to teacher role
      isActive: true,
    };

    // Only add optional fields if they are defined
    if (data.displayName) userProfile.displayName = data.displayName;
    if (data.institution) userProfile.institution = data.institution;
    if (data.grade) userProfile.grade = data.grade;
    if (data.subjects) userProfile.subjects = data.subjects;

    const docRef = doc(db, this.COLLECTION, data.uid);
    
    await setDoc(docRef, {
      ...userProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Gets user profile by UID
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const docRef = doc(db, this.COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    }

    return null;
  }

  /**
   * Updates user profile (typically called by backend admin functions)
   */
  static async updateUserProfile(data: UpdateUserProfileData): Promise<void> {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const docRef = doc(db, this.COLLECTION, data.uid);
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    // Remove uid from update data since it's the document ID
    delete (updateData as any).uid;

    await updateDoc(docRef, updateData);
  }

  /**
   * Subscribes to user profile changes in real-time
   */
  static subscribeToUserProfile(
    uid: string, 
    callback: (profile: UserProfile | null) => void
  ): Unsubscribe {
    if (!db) {
      throw new Error('Firestore not initialized. Check your Firebase configuration.');
    }

    const docRef = doc(db, this.COLLECTION, uid);
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const profile: UserProfile = {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as UserProfile;
        callback(profile);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to user profile:', error);
      callback(null);
    });
  }

  /**
   * Checks if user profile exists
   */
  static async userProfileExists(uid: string): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    return profile !== null;
  }
}