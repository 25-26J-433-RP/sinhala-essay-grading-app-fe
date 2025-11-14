import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

/**
 * Hook for role-based access control
 */
export function useRole() {
  const { userProfile, profileLoading } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const isStudent = (): boolean => {
    return hasRole('student');
  };

  const isTeacher = (): boolean => {
    return hasRole('teacher');
  };

  const isActive = (): boolean => {
    return userProfile?.isActive === true;
  };

  const canAccessTeacherFeatures = (): boolean => {
    return isTeacher() && isActive();
  };

  const canAccessStudentFeatures = (): boolean => {
    return isStudent() && isActive();
  };

  return {
    userProfile,
    profileLoading,
    hasRole,
    isStudent,
    isTeacher,
    isActive,
    canAccessTeacherFeatures,
    canAccessStudentFeatures,
    role: userProfile?.role,
  };
}