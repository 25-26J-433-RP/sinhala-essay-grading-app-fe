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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#23262F',
    borderRadius: 8,
  },
  text: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
