import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup =
      segments[0] === "(auth)" ||
      segments[0] === "login" ||
      segments[0] === "register" ||
      segments[0] === "guest";

    if (!user) {
      // User is not logged in, redirect to guest page
      if (!inAuthGroup && segments[0] !== "guest") {
        router.replace("/guest");
      }
    } else {
      // User is logged in, redirect to home/tabs
      if (inAuthGroup || segments[0] === "guest") {
        router.replace("/(tabs)");
      }
    }
  }, [user, loading, segments, router]);

  if (loading) {
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
