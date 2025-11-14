import AppHeader from '@/components/AppHeader';
import StudentListView from '@/components/StudentListView';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function UploadedImagesScreen() {
  const { user } = useAuth();
  const { isStudent, isTeacher, userProfile, profileLoading } = useRole();

  // Debug logging
  console.log('📱 UploadedImagesScreen - Debug Info:', {
    hasUser: !!user,
    userId: user?.uid,
    profileLoading,
    hasProfile: !!userProfile,
    userRole: userProfile?.role,
    isStudentResult: isStudent(),
    isTeacherResult: isTeacher(),
  });

  // Show loading state while profile is being loaded
  if (profileLoading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Setting up your profile...</Text>
        </View>
      </View>
    );
  }

  // Show StudentListView for both students and teachers (teachers manage student essays)
  if (user && (isStudent() || isTeacher() || !userProfile)) {
    console.log('📚 Showing StudentListView for user');
    return (
      <View style={styles.container}>
        <AppHeader />
        <StudentListView 
          onStudentPress={(studentInfo) => {
            // Navigate to student essays page
            router.push({
              pathname: '/student-essays',
              params: {
                studentData: JSON.stringify({
                  ...studentInfo,
                  lastUploadDate: studentInfo.lastUploadDate.toISOString(),
                  essays: studentInfo.essays.map(essay => ({
                    ...essay,
                    uploadedAt: essay.uploadedAt.toISOString(),
                  })),
                }),
              },
            });
          }}
        />
      </View>
    );
  }

  // Fallback - this should rarely be reached now
  return (
    <View style={styles.container}>
      <AppHeader />
      <View style={styles.centerContent}>
        <MaterialIcons name="info" size={64} color="#007AFF" />
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.description}>
          Your profile is being set up. You should have access to upload and view your images shortly.
        </Text>
        {userProfile && (
          <View style={styles.profileInfo}>
            <Text style={styles.profileText}>Email: {userProfile.email}</Text>
            <Text style={styles.profileText}>Role: {userProfile.role || 'Teacher'}</Text>
            <Text style={styles.profileText}>Status: {userProfile.isActive ? 'Active' : 'Setting up...'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#B0B3C6',
    fontSize: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    color: '#B0B3C6',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 400,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    color: '#B0B3C6',
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 24,
  },
  profileInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#23262F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333640',
  },
  profileText: {
    color: '#B0B3C6',
    fontSize: 14,
    marginBottom: 4,
  },
});
