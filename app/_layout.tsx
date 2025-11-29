import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import AuthWrapper from '@/components/auth/AuthWrapper';
import { ConfirmProvider } from '@/components/Confirm';
import { ToastProvider } from '@/components/Toast';
import '@/config/i18n'; // Initialize i18n
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <ToastProvider>
            <ConfirmProvider>
              <AuthWrapper>
                <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="profile" 
                  options={{ 
                    headerShown: true,
                    title: 'Profile',
                    headerStyle: {
                      backgroundColor: '#23262F',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                  }} 
                />
                <Stack.Screen name="+not-found" />
                </Stack>
              </AuthWrapper>
            </ConfirmProvider>
          </ToastProvider>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
