// User role types
export type UserRole = 'student' | 'teacher';

// User profile interface that extends Firebase User with additional app-specific data
export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  // Additional profile fields that can be set by backend
  displayName?: string;
  institution?: string;
  grade?: string; // For students
  subjects?: string[]; // For teachers - subjects they can grade
  isActive: boolean;
}

// Default user profile creation
export interface CreateUserProfileData {
  uid: string;
  email: string;
  role?: UserRole; // Optional - backend can set this, defaults to 'teacher'
  displayName?: string;
  institution?: string;
  grade?: string;
  subjects?: string[];
}

// User profile update data (all fields optional except uid)
export interface UpdateUserProfileData {
  uid: string;
  role?: UserRole;
  displayName?: string;
  institution?: string;
  grade?: string;
  subjects?: string[];
  isActive?: boolean;
}