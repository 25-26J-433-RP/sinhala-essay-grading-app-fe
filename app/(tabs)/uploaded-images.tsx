import AppHeader from "@/components/AppHeader";
import StudentListView from "@/components/StudentListView";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

export default function UploadedImagesScreen() {
  const { user } = useAuth();
  const { isStudent, isTeacher, isParent, userProfile, profileLoading } = useRole();
  const { t } = useLanguage();

  const roleLabel = userProfile?.role
    ? userProfile.role === "teacher"
      ? t("auth.teacher")
      : userProfile.role === "student"
        ? t("auth.student")
        : t("auth.parent")
    : t("auth.teacher");

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
  if (user && (isStudent() || isTeacher() || isParent() || !userProfile)) {
    console.log("📚 Showing StudentListView for user");

    const Content = (
      <StudentListView
        onStudentPress={(studentInfo) => {
          // Navigate to student essays page
          router.push({
            pathname: "/student-essays",
            params: {
              studentId: studentInfo.studentId,
            },
          });
        }}
        scrollEnabled={Platform.OS !== "web"}
      />
    );

    if (Platform.OS === "web") {
      return (
        <View style={styles.fullBg}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.container}>
              <AppHeader />
              {Content}
            </View>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.fullBg}>
        <View style={styles.container}>
          <AppHeader />
          {Content}
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
                {roleLabel}
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
    backgroundColor: "#0F1117",
    width: "100%",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "600",
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
    borderRadius: 30,
    backgroundColor: "#1C1E26",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2D313E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    padding: 24,
    backgroundColor: "#1C1E26",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2D313E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  profileText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
});
