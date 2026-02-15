import { useLanguage } from "@/contexts/LanguageContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs, useRouter, useSegments } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
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
  // Treat as desktop only when running on web with a wide viewport.
  const isDesktop = Platform.OS === "web" ? screenWidth >= 768 : false;
  const hideOnMobile = !isDesktop;
  const { logout } = useAuth();

  const currentRoute = segments[segments.length - 1] || "index";

  const confirmLogout = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return Promise.resolve(window.confirm(t("auth.logoutConfirm")));
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
        { text: t("common.cancel"), style: "cancel", onPress: () => resolve(false) },
        {
          text: t("auth.logout"),
          style: "destructive",
          onPress: () => resolve(true),
        },
      ]);
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirmLogout();
    if (!confirmed) return;

    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(t("common.error") + ": Failed to logout");
      } else {
        Alert.alert(t("common.error"), "Failed to logout");
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
    { name: "uploaded-images", label: t("tabs.collection"), icon: "photo" },
    { name: "add-student", label: t("tabs.addStudent"), icon: "person" },
    { name: "profile", label: t("profile.title"), icon: "account" },
  ];

  const headerComponent = isDesktop ? (
    <View
      style={{
        height: 72,
        backgroundColor: "#0F1117",
        borderBottomWidth: 1,
        borderBottomColor: "#2D313E",
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        zIndex: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)")}
          style={{
            marginRight: 24,
            width: 44,
            height: 44,
            backgroundColor: "#1C1E26",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#2D313E",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Image
            source={require("../../assets/images/akura-logo.png")}
            style={{ width: 32, height: 32 }}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 12,
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
                    router.push(`/(tabs)/${tab.name}` as any);
                  }
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: isActive ? "#FFFFFF" : "transparent",
                  borderWidth: 1,
                  borderColor: isActive ? "#FFFFFF" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#0F1117" : "#FFFFFF",
                    fontSize: 14,
                    fontWeight: isActive ? "700" : "600",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          marginLeft: 24,
        }}
      >
        {/* Language Switcher */}
        <TouchableOpacity
          onPress={toggleLanguage}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "#1C1E26",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: "#2D313E",
          }}
        >
          <MaterialIcons name="language" size={18} color="#007AFF" />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {language === "en" ? "සිංහල" : "English"}
          </Text>
        </TouchableOpacity>

        {/* Profile Button */}
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#1C1E26",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#2D313E",
          }}
        >
          <MaterialIcons name="account-circle" size={26} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Divider */}
        <View
          style={{
            width: 1,
            height: 24,
            backgroundColor: "#2D313E",
            marginHorizontal: 4,
          }}
        />

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "#EF444420",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: "#EF444440",
          }}
        >
          <MaterialIcons name="logout" size={18} color="#EF4444" />
          <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "700" }}>
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
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "#9CA3AF",
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarShowLabel: true,
          tabBarStyle: Platform.select({
            ios: {
              position: "absolute",
              backgroundColor: "#0F1117",
              borderTopWidth: 1,
              borderTopColor: "#2D313E",
              height: 90,
              paddingBottom: 30,
              paddingTop: 10,
              display: isDesktop ? "none" : "flex",
            },
            default: {
              backgroundColor: "#0F1117",
              borderTopWidth: 1,
              borderTopColor: "#2D313E",
              height: 76,
              paddingBottom: 10,
              paddingTop: 8,
              display: isDesktop ? "none" : "flex",
            },
          }),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginBottom: 4,
          },
        }}
      >
        {
          // Define which tab screens to render depending on desktop vs mobile.
          (() => {
            const desktopOrder = [
              "index",
              "scan",
              "uploaded-images",
              "add-student",
            ];
            const mobileOrder = [
              "index",
              "scan",
              "uploaded-images",
              "add-student",
              "profile",
            ];

            const screensToRender = isDesktop ? desktopOrder : mobileOrder;

            return screensToRender.map((name) => {
              const commonOptions: any = {};

              // Hide tab buttons for screens that aren't part of the mobile order
              // This prevents their icons from appearing in the tab bar on mobile.
              const hiddenOnMobile = !isDesktop && !mobileOrder.includes(name);
              if (hiddenOnMobile) {
                // Ensure the tab has no button, icon or label on mobile.
                commonOptions.tabBarButton = () => null;
                commonOptions.tabBarIcon = () => null;
                commonOptions.tabBarLabel = () => null;
                commonOptions.title = "";
              }

              switch (name) {
                case "index":
                  commonOptions.title = t("tabs.home");
                  commonOptions.tabBarIcon = ({ color, focused }: { color: string, focused: boolean }) => (
                    <MaterialCommunityIcons
                      name={focused ? "home-variant" : "home-variant-outline"}
                      size={24}
                      color={color}
                    />
                  );
                  break;
                case "scan":
                  commonOptions.title = t("tabs.scan");
                  commonOptions.tabBarIcon = ({ color, focused }: { color: string, focused: boolean }) => (
                    <MaterialCommunityIcons
                      name={focused ? "camera" : "camera-outline"}
                      size={24}
                      color={color}
                    />
                  );
                  break;

                case "uploaded-images":
                  commonOptions.title = t("tabs.collection");
                  commonOptions.tabBarIcon = ({ color, focused }: { color: string, focused: boolean }) => (
                    <MaterialCommunityIcons
                      name={focused ? "folder-multiple-image" : "folder-multiple-outline"}
                      size={24}
                      color={color}
                    />
                  );
                  break;
                case "add-student":
                  commonOptions.title = t("tabs.addStudent");
                  commonOptions.tabBarIcon = ({ color, focused }: { color: string, focused: boolean }) => (
                    <MaterialCommunityIcons
                      name={focused ? "account-plus" : "account-plus-outline"}
                      size={24}
                      color={color}
                    />
                  );
                  break;
                case "profile":
                  commonOptions.title = t("profile.title");
                  commonOptions.tabBarIcon = ({ color, focused }: { color: string, focused: boolean }) => (
                    <MaterialCommunityIcons
                      name={focused ? "account-circle" : "account-circle-outline"}
                      size={24}
                      color={color}
                    />
                  );
                  break;
                default:
                  break;
              }

              return (
                <Tabs.Screen key={name} name={name} options={commonOptions} />
              );
            });
          })()
        }
      </Tabs>
    </>
  );
}
