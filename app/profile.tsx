import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { userProfile, profileLoading, isStudent, isTeacher, role } = useRole();
  const { t } = useLanguage();

  const handleLogout = async () => {
    Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const { width } = useWindowDimensions();

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t("profile.loadingProfile")}</Text>
      </View>
    );
  }

  // Add horizontal padding for mobile view (width < 768)
  const mobilePadding =
    Platform.OS !== "web" || width < 768 ? { paddingHorizontal: 16 } : {};

  return (
    <ScrollView
      style={[styles.container, mobilePadding]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="account-circle" size={80} color="#007AFF" />
        </View>
        <Text style={styles.displayName}>
          {userProfile?.displayName || user?.email?.split("@")[0] || "User"}
        </Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.accountInfo")}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={20} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("profile.email")}</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          {userProfile && (
            <>
              <View style={styles.infoRow}>
                <MaterialIcons name="badge" size={20} color="#007AFF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t("profile.role")}</Text>
                  <Text style={styles.infoValue}>
                    {role === "teacher" ? t("auth.teacher") : t("auth.student")}
                  </Text>
                </View>
              </View>

              {userProfile.institution && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="school" size={20} color="#007AFF" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Institution</Text>
                    <Text style={styles.infoValue}>
                      {userProfile.institution}
                    </Text>
                  </View>
                </View>
              )}

              {userProfile.grade && isStudent() && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="grade" size={20} color="#007AFF" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Grade</Text>
                    <Text style={styles.infoValue}>{userProfile.grade}</Text>
                  </View>
                </View>
              )}

              {userProfile.subjects &&
                isTeacher() &&
                userProfile.subjects.length > 0 && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="subject" size={20} color="#007AFF" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Subjects</Text>
                      <Text style={styles.infoValue}>
                        {userProfile.subjects.join(", ")}
                      </Text>
                    </View>
                  </View>
                )}

              <View style={styles.infoRow}>
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color="#007AFF"
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {t("profile.memberSince")}
                  </Text>
                  <Text style={styles.infoValue}>
                    {formatDate(userProfile.createdAt)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Account Status */}
      {userProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons
                name={userProfile.isActive ? "check-circle" : "cancel"}
                size={20}
                color={userProfile.isActive ? "#34C759" : "#FF3B30"}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: userProfile.isActive ? "#34C759" : "#FF3B30" },
                  ]}
                >
                  {userProfile.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181A20",
  },
  contentContainer: {
    paddingBottom: 40,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#181A20",
  },
  loadingText: {
    color: "#B0B3C6",
    fontSize: 16,
  },
  header: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#23262F",
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
    borderRadius: 20,
    marginHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  displayName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  email: {
    color: "#B0B3C6",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  roleBadgeContainer: {
    marginTop: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  teacherBadge: {
    backgroundColor: "#34C759",
  },
  studentBadge: {
    backgroundColor: "#007AFF",
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    margin: 20,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#23262F",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333640",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    color: "#B0B3C6",
    fontSize: 14,
    marginBottom: 2,
  },
  infoValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
