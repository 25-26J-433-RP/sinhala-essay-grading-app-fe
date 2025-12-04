import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Language {
  code: string;
  label: string;
  flag?: string;
}

interface LanguageDropdownProps {
  currentLanguage: string;
  languages: Language[];
  onSelect: (languageCode: string) => void;
  style?: any;
}

export default function LanguageDropdown({
  currentLanguage,
  languages,
  onSelect,
  style,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLanguage = languages.find(
    (lang) => lang.code === currentLanguage
  );

  const handleSelect = (languageCode: string) => {
    onSelect(languageCode);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="language" size={20} color="#007AFF" />
        <Text style={styles.buttonText}>
          {selectedLanguage?.label || "Select Language"}
        </Text>
        <MaterialIcons
          name={isOpen ? "expand-less" : "expand-more"}
          size={20}
          color="#007AFF"
          style={styles.dropdownIcon}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.option,
                currentLanguage === language.code && styles.optionSelected,
              ]}
              onPress={() => handleSelect(language.code)}
              activeOpacity={0.6}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    currentLanguage === language.code &&
                      styles.optionTextSelected,
                  ]}
                >
                  {language.flag && <Text>{language.flag} </Text>}
                  {language.label}
                </Text>
              </View>
              {currentLanguage === language.code && (
                <MaterialIcons name="check" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 10,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1f2128",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
  },

  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },

  dropdownIcon: {
    marginLeft: 4,
  },

  dropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    backgroundColor: "#23262F",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333640",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
    zIndex: 20,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333640",
  },

  optionSelected: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },

  optionContent: {
    flex: 1,
  },

  optionText: {
    color: "#B0B3C6",
    fontSize: 14,
    fontWeight: "500",
  },

  optionTextSelected: {
    color: "#007AFF",
    fontWeight: "700",
  },
});
