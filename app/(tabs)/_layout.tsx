import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
            paddingTop: 8,
            height: 74,
          },
          default: {
            paddingTop: 8,
            height: 64,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="camera-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recording"
        options={{
          title: 'Recording',
          tabBarIcon: ({ color }: { color: string }) => (
            <FontAwesome5 name="microphone-alt" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="uploaded-images"
        options={{
          title: 'Collection',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="photo-library" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
