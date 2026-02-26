import { useAuth } from "@/contexts/AuthContext";
import { UserImageService } from "@/services/userImageService";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, userProfile, profileLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [checkingStudentProfile, setCheckingStudentProfile] = useState(false);

  useEffect(() => {
    if (loading || profileLoading) return;

    const inAuthGroup =
      segments[0] === "(auth)" ||
      segments[0] === "login" ||
      segments[0] === "register" ||
      segments[0] === "guest";

    // Allow public shares without authentication
    const isPublicShare = segments[0] === "shared";

    if (!user) {
      // User is not logged in, redirect to guest page
      if (!inAuthGroup && segments[0] !== "guest" && !isPublicShare) {
        router.replace("/guest");
      }
    } else {
      // User is logged in
      if (inAuthGroup || segments[0] === "guest") {
        // Check if student needs to complete their profile
        if (userProfile?.role === "student") {
          checkStudentProfile();
        } else {
          router.replace("/(tabs)");
        }
      }
    }
  }, [user, loading, userProfile, profileLoading, segments, router]);

  const checkStudentProfile = async () => {
    if (!user) return;

    setCheckingStudentProfile(true);
    try {
      const students = await UserImageService.getStudents(user.uid);
      
      // If student has no profile, redirect to add-student
      if (!students || students.length === 0) {
        router.replace("/(tabs)/add-student");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Error checking student profile:", error);
      // If there's an error, redirect to home - they can fill it in later
      router.replace("/(tabs)");
    } finally {
      setCheckingStudentProfile(false);
    }
  };

  if (loading || profileLoading || checkingStudentProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#181A20",
    justifyContent: "center",
    alignItems: "center",
  },
});
