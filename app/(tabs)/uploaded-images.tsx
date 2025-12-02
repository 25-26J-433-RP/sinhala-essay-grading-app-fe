import AppHeader from "@/components/AppHeader";
import StudentListView from "@/components/StudentListView";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function UploadedImagesScreen() {
  const { user } = useAuth();
  const { isStudent, isTeacher, userProfile, profileLoading } = useRole();
  const { t } = useLanguage();

  // Debug logging
  console.log("📱 UploadedImagesScreen - Debug Info:", {
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
      <View style={styles.fullBg}>
        <View style={styles.container}>
          <AppHeader />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {t("uploadedImages.settingUpProfile")}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Show StudentListView for both students and teachers (teachers manage student essays)
  if (user && (isStudent() || isTeacher() || !userProfile)) {
    console.log("📚 Showing StudentListView for user");
    return (
      <View style={styles.fullBg}>
        <View style={styles.container}>
          <AppHeader />
          <StudentListView
            onStudentPress={(studentInfo) => {
              // Navigate to student essays page
              router.push({
                pathname: "/student-essays",
                params: {
                  studentData: JSON.stringify({
                    ...studentInfo,
                    lastUploadDate: studentInfo.lastUploadDate.toISOString(),
                    essays: studentInfo.essays.map((essay) => ({
                      ...essay,
                      uploadedAt: essay.uploadedAt.toISOString(),
                    })),
                  }),
                },
              });
            }}
          />
        </View>
      </View>
    );
  }

  // Fallback - this should rarely be reached now
  return (
    <View style={styles.fullBg}>
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContent}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="info" size={64} color="#007AFF" />
          </View>
          <Text style={styles.title}>{t("uploadedImages.welcome")}</Text>
          <Text style={styles.description}>
            {t("uploadedImages.profileBeingSetup")}
          </Text>
          {userProfile && (
            <View style={styles.profileInfo}>
              <Text style={styles.profileText}>
                {t("uploadedImages.email")}: {userProfile.email}
              </Text>
              <Text style={styles.profileText}>
                {t("uploadedImages.role")}:{" "}
                {userProfile.role || t("auth.teacher")}
              </Text>
              <Text style={styles.profileText}>
                {t("uploadedImages.status")}:{" "}
                {userProfile.isActive
                  ? t("uploadedImages.active")
                  : t("uploadedImages.settingUp")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBg: {
    flex: 1,
    backgroundColor: "#181A20",
    minHeight: "100vh",
    width: "100%",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
    minHeight: "100vh",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    color: "#B0B3C6",
    fontSize: 16,
    marginTop: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#23262F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    color: "#B0B3C6",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 500,
  },
  featureList: {
    alignItems: "flex-start",
  },
  featureItem: {
    color: "#B0B3C6",
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 24,
  },
  profileInfo: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#23262F",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333640",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  profileText: {
    color: "#B0B3C6",
    fontSize: 14,
    marginBottom: 8,
  },
});
