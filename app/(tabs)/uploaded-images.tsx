import AppHeader from '@/components/AppHeader';
import StudentImageGallery from '@/components/StudentImageGallery';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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

  // Show role-based content - allow students and users without profiles (newly registered)
  // Also show for students who might not be marked as active yet
  if (isStudent() || (!userProfile && user) || (userProfile?.role === 'student')) {
    console.log('📚 Showing StudentImageGallery for student user');
    return (
      <View style={styles.container}>
        <AppHeader />
        <StudentImageGallery 
          onImagePress={(image) => {
            // Future: Navigate to image details or preview
            console.log('Image pressed:', image.fileName);
          }}
        />
      </View>
    );
  }

  if (isTeacher()) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.centerContent}>
          <MaterialIcons name="school" size={64} color="#666" />
          <Text style={styles.title}>Teacher Dashboard</Text>
          <Text style={styles.description}>
            As a teacher, you can view and grade student submissions. 
            Student image galleries are private to each individual student.
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>📚 Review student submissions</Text>
            <Text style={styles.featureItem}>✏️ Provide feedback and grades</Text>
            <Text style={styles.featureItem}>📊 Track student progress</Text>
          </View>
        </View>
      </ScrollView>
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
