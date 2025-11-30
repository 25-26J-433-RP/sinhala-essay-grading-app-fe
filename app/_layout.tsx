import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import AuthWrapper from "@/components/auth/AuthWrapper";
import { ConfirmProvider } from "@/components/Confirm";
import { ToastProvider } from "@/components/Toast";
import "@/config/i18n"; // Initialize i18n
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/useColorScheme";

function RootLayoutContent() {
  const { t } = useLanguage();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: t("screenTitles.profile"),
          headerStyle: {
            backgroundColor: "#23262F",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
      <Stack.Screen
        name="add-student"
        options={{ title: t("screenTitles.addStudent") }}
      />
      <Stack.Screen
        name="student-essays"
        options={{ title: t("screenTitles.studentEssays") }}
      />
      <Stack.Screen
        name="image-detail"
        options={{ title: t("screenTitles.imageDetail") }}
      />
      <Stack.Screen
        name="essay-mindmap"
        options={{ title: t("screenTitles.essayMindmap") }}
      />
      <Stack.Screen
        name="mindmap-demo"
        options={{ title: t("screenTitles.mindmapDemo") }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <ToastProvider>
            <ConfirmProvider>
              <AuthWrapper>
                <RootLayoutContent />
              </AuthWrapper>
            </ConfirmProvider>
          </ToastProvider>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
