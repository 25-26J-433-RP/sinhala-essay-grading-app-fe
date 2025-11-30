import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LanguageSwitcher from "./LanguageSwitcher";

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  hideRightSection?: boolean;
}

export default function AppHeader({
  title,
  showBackButton = false,
  onBackPress,
  hideRightSection = false,
}: AppHeaderProps) {
  const { logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert(t("common.error"), "Failed to logout. Please try again.");
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        {title && (
          <Text style={[styles.title, showBackButton && styles.titleWithBack]}>
            {title}
          </Text>
        )}
      </View>

      {!hideRightSection && (
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/profile")}
            title={t("common.profile")}
          >
            <MaterialIcons name="account-circle" size={28} color="#007AFF" />
          </TouchableOpacity>
          <LanguageSwitcher />
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>{t("auth.logout")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: "#181A20",
    borderBottomWidth: 1,
    borderBottomColor: "#333640",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  titleWithBack: {
    fontSize: 18,
  },
  profileButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 4,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
