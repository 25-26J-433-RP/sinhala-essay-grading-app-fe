// components/LanguageSwitcher.tsx
import { useLanguage } from '@/contexts/LanguageContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'si' : 'en';
    await changeLanguage(newLang);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleLanguage}
      activeOpacity={0.7}
    >
      <MaterialIcons name="language" size={20} color="#007AFF" />
      <Text style={styles.text}>
        {language === 'en' ? 'සිංහල' : 'English'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1C1E26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D313E',
  },
  text: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
