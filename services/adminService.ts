import { UserProfileService } from '@/services/userProfileService';
import { UserRole } from '@/types/auth';

/**
 * Admin utility functions for managing user roles
 * These functions would typically be called by your backend/admin panel
 * but are included here for demonstration and testing purposes
 */
export class AdminService {
  /**
   * Assign a role to a user (would typically be done by backend admin)
   */
  static async assignUserRole(uid: string, role: UserRole): Promise<void> {
    await UserProfileService.updateUserProfile({
      uid,
      role,
    });
  }

  /**
   * Update user's active status (enable/disable account)
   */
  static async setUserActiveStatus(uid: string, isActive: boolean): Promise<void> {
    await UserProfileService.updateUserProfile({
      uid,
      isActive,
    });
  }

  /**
   * Update teacher's subjects (for teachers only)
   */
  static async updateTeacherSubjects(uid: string, subjects: string[]): Promise<void> {
    const profile = await UserProfileService.getUserProfile(uid);
    
    if (!profile || profile.role !== 'teacher') {
      throw new Error('User is not a teacher or profile not found');
    }

    await UserProfileService.updateUserProfile({
      uid,
      subjects,
    });
  }

  /**
   * Update student's grade level (for students only)
   */
  static async updateStudentGrade(uid: string, grade: string): Promise<void> {
    const profile = await UserProfileService.getUserProfile(uid);
    
    if (!profile || profile.role !== 'student') {
      throw new Error('User is not a student or profile not found');
    }

    await UserProfileService.updateUserProfile({
      uid,
      grade,
    });
  }

  /**
   * Get all user profiles (admin function - would have proper permissions in backend)
   */
  static async getAllUserProfiles(): Promise<void> {
    // This would typically be implemented with proper Firestore queries
    // and admin permissions in a real backend
    console.log('This function would be implemented in your backend with proper admin permissions');
  }
}

/**
 * Development helper function to quickly switch roles for testing
 * Remove this in production - roles should only be set by backend admins
 */
export class DevRoleHelper {
  static async switchToTeacher(uid: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Role switching is only available in development mode');
    }
    
    await AdminService.assignUserRole(uid, 'teacher');
    console.log('Switched user to teacher role (DEV MODE ONLY)');
  }

  static async switchToStudent(uid: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Role switching is only available in development mode');
    }
    
    await AdminService.assignUserRole(uid, 'student');
    console.log('Switched user to student role (DEV MODE ONLY)');
  }
}