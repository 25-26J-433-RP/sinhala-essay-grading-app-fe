import { useLanguage } from "@/contexts/LanguageContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const { t } = useLanguage();

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
});
