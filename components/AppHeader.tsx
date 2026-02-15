import LanguageSwitcher from "@/components/LanguageSwitcher";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";

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
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" ? width >= 768 : false;

  const hasLeftContent = showBackButton || title;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  if (isDesktop && !hasLeftContent) {
    return null;
  }

  return (
    <View
      style={[
        styles.header,
        { justifyContent: hasLeftContent ? "space-between" : "center" }
      ]}
    >
      {!hasLeftContent ? (
        <LanguageSwitcher />
      ) : (
        <>
          <View style={styles.leftSection}>
            {showBackButton && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackPress}
              >
                <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
              </TouchableOpacity>
            )}
            {title && (
              <Text
                style={[styles.title, showBackButton && styles.titleWithBack]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            )}
          </View>
          {!hideRightSection && !isDesktop && (
            <View style={styles.rightSection}>
              <LanguageSwitcher />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  rightSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    flexShrink: 1,
  },
  titleWithBack: {
    fontSize: 18,
  },
});
