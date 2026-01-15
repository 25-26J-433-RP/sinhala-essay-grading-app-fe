import { useLanguage } from "@/contexts/LanguageContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs, useRouter, useSegments } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t, language, changeLanguage } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const segments = useSegments();
  const isDesktop = screenWidth >= 768;
  const { logout } = useAuth();

  const currentRoute = segments[segments.length - 1] || "index";

  const handleLogout = async () => {
    const confirmed = window.confirm(t("auth.logoutConfirm"));
    if (confirmed) {
      try {
        await logout();
        router.replace("/login");
      } catch (error) {
        console.error("Logout error:", error);
        alert(t("common.error") + ": Failed to logout");
      }
    }
  };

  const toggleLanguage = async () => {
    const newLang = language === "en" ? "si" : "en";
    await changeLanguage(newLang);
  };

  const navTabs = [
    { name: "index", label: t("tabs.home"), icon: "house.fill" },
    { name: "scan", label: t("tabs.scan"), icon: "camera" },
    { name: "score", label: t("tabs.score"), icon: "file" },
    { name: "sinhala-score", label: t("tabs.sinhalaScore"), icon: "book" },
    { name: "ai-correction", label: t("tabs.aiCorrection"), icon: "brain" },
    { name: "uploaded-images", label: t("tabs.collection"), icon: "photo" },
    { name: "add-student", label: t("tabs.addStudent"), icon: "person" },
    { name: "profile", label: t("profile.title"), icon: "account" },
  ];

  const headerComponent = isDesktop ? (
    <View
      style={{
        height: 64,
        backgroundColor: Colors[colorScheme ?? "light"].background,
        borderBottomWidth: 1,
        borderBottomColor: Colors[colorScheme ?? "light"].tabIconDefault,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {navTabs.map((tab) => {
          const isActive = currentRoute === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                if (tab.name === "index") {
                  router.push("/(tabs)");
                } else {
                  router.push(`/(tabs)/${tab.name}`);
                }
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: isActive
                  ? Colors[colorScheme ?? "light"].tint
                  : Colors[colorScheme ?? "light"].tint + "15",
                borderBottomWidth: isActive ? 3 : 0,
                borderBottomColor: Colors[colorScheme ?? "light"].tint,
              }}
            >
              <Text
                style={{
                  color: isActive
                    ? Colors[colorScheme ?? "light"].background
                    : Colors[colorScheme ?? "light"].text,
                  fontSize: 14,
                  fontWeight: isActive ? "600" : "500",
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginLeft: 12,
        }}
      >
        {/* Profile Button */}
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={{
            padding: 8,
            borderRadius: 6,
            backgroundColor: Colors[colorScheme ?? "light"].tint + "15",
          }}
        >
          <MaterialIcons
            name="account-circle"
            size={24}
            color={Colors[colorScheme ?? "light"].tint}
          />
        </TouchableOpacity>

        {/* Language Switcher */}
        <TouchableOpacity
          onPress={toggleLanguage}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 6,
            backgroundColor: Colors[colorScheme ?? "light"].tint + "15",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MaterialIcons
            name="language"
            size={18}
            color={Colors[colorScheme ?? "light"].tint}
          />
          <Text
            style={{
              color: Colors[colorScheme ?? "light"].tint,
              fontSize: 13,
              fontWeight: "500",
            }}
          >
            {language === "en" ? "සි" : "EN"}
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 6,
            backgroundColor: "#EF4444",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MaterialIcons name="logout" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>
            {t("auth.logout")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  return (
    <>
      {headerComponent}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: "absolute",
              paddingTop: 8,
              height: 74,
              display: isDesktop ? "none" : "flex",
            },
            default: {
              paddingTop: 8,
              height: 64,
              display: isDesktop ? "none" : "flex",
            },
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color }: { color: string }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: t("tabs.scan"),
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialCommunityIcons
                name="camera-outline"
                size={26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="score"
          options={{
            title: t("tabs.score"),
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialCommunityIcons
                name="file-document-edit-outline"
                size={26}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="sinhala-score"
          options={{
            title: t("tabs.sinhalaScore"),
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="book-open-variant"
                size={26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="ai-correction"
          options={{
            title: t("tabs.aiCorrection"),
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="brain" size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="uploaded-images"
          options={{
            title: t("tabs.collection"),
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialIcons name="photo-library" size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add-student"
          options={{
            title: "Add Student",
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialIcons name="person-add" size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("profile.title"),
            tabBarIcon: ({ color }: { color: string }) => (
              <MaterialIcons name="account-circle" size={26} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
