import { auth } from '@/config/firebase';
import { UserProfileService } from '@/services/userProfileService';
import { UserProfile } from '@/types/auth';
import {
    User,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Subscribe to user profile changes
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    setProfileLoading(true);
    
    // Subscribe to real-time profile updates
    const unsubscribeProfile = UserProfileService.subscribeToUserProfile(
      user.uid,
      (profile) => {
        setUserProfile(profile);
        setProfileLoading(false);
      }
    );

    return unsubscribeProfile;
  }, [user]);

  useEffect(() => {
    if (!auth) {
      // Firebase not initialized (missing config)
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase Auth not initialized. Check your Firebase configuration.');
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase Auth not initialized. Check your Firebase configuration.');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore with default role (teacher)
    // Backend can later update the role to student if needed
    try {
      await UserProfileService.createUserProfile({
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        role: 'teacher', // Default role - backend can change this
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Don't throw here to avoid blocking registration
      // Profile can be created later or by backend
    }
  };

  const refreshProfile = React.useCallback(async () => {
    if (!user) return;
    
    setProfileLoading(true);
    try {
      const profile = await UserProfileService.getUserProfile(user.uid);
      if (!profile && user) {
        // If no profile exists, create one (this handles cases where registration profile creation failed)
        console.log('No profile found, creating default profile...');
        await UserProfileService.createUserProfile({
          uid: user.uid,
          email: user.email || 'unknown@email.com',
          role: 'teacher',
        });
        // Fetch the newly created profile
        const newProfile = await UserProfileService.getUserProfile(user.uid);
        setUserProfile(newProfile);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Auto-create profile if user exists but no profile found (run only once when conditions change)
  const hasAttemptedProfileCreation = React.useRef(false);
  
  useEffect(() => {
    if (user && !userProfile && !profileLoading && !hasAttemptedProfileCreation.current) {
      console.log('User authenticated but no profile found, attempting to create/fetch profile...');
      hasAttemptedProfileCreation.current = true;
      refreshProfile();
    }
    
    // Reset flag when user changes
    if (!user) {
      hasAttemptedProfileCreation.current = false;
    }
  }, [user, userProfile, profileLoading, refreshProfile]);

  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase Auth not initialized. Check your Firebase configuration.');
    }
    await signOut(auth);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    profileLoading,
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}