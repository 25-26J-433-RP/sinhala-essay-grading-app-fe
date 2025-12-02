import AppHeader from "@/components/AppHeader";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddStudentScreen() {
  const [studentId, setStudentId] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentGender, setStudentGender] = useState("");
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const { t } = useLanguage();
  const gradeOptions = [
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
  ];
  const genderOptions = [t("addStudent.male"), t("addStudent.female")];

  const handleSaveStudent = async () => {
    // Validate all fields
    if (!studentId.trim()) {
      Alert.alert(t("addStudent.validation"), t("addStudent.enterIdRequired"));
      return;
    }
    if (!studentAge.trim()) {
      Alert.alert(t("addStudent.validation"), t("addStudent.enterAgeRequired"));
      return;
    }
    if (!studentGrade) {
      Alert.alert(
        t("addStudent.validation"),
        t("addStudent.selectGradeRequired")
      );
      return;
    }
    if (!studentGender) {
      Alert.alert(
        t("addStudent.validation"),
        t("addStudent.selectGenderRequired")
      );
      return;
    }

    if (!user) {
      Alert.alert(t("common.error"), t("addStudent.mustBeLoggedIn"));
      return;
    }

    if (!db) {
      Alert.alert(t("common.error"), t("addStudent.databaseNotInitialized"));
      return;
    }

    setSaving(true);

    try {
      // Check if student ID already exists for this user
      const studentsRef = collection(db, "students");
      const q = query(
        studentsRef,
        where("userId", "==", user.uid),
        where("studentId", "==", studentId.trim())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert(t("addStudent.duplicate"), t("addStudent.studentExists"));
        setSaving(false);
        return;
      }

      // Add new student
      await addDoc(studentsRef, {
        userId: user.uid,
        studentId: studentId.trim(),
        studentAge: parseInt(studentAge.trim(), 10),
        studentGrade: studentGrade.trim(),
        studentGender: studentGender.trim(),
        createdAt: new Date(),
      });

      Alert.alert(t("common.success"), t("addStudent.studentAdded"), [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);

      // Clear form
      setStudentId("");
      setStudentAge("");
      setStudentGrade("");
      setStudentGender("");
    } catch (error) {
      console.error("Error adding student:", error);
      Alert.alert(t("common.error"), t("addStudent.failedToAdd"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.fullBg}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader />

        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
            <Text style={styles.backButtonText}>{t("common.back")}</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person-add" size={48} color="#007AFF" />
            </View>
            <Text style={styles.title}>{t("addStudent.title")}</Text>
            <Text style={styles.subtitle}>{t("addStudent.subtitle")}</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("addStudent.studentId")} *</Text>
              <TextInput
                value={studentId}
                onChangeText={setStudentId}
                placeholder={t("addStudent.enterStudentId")}
                placeholderTextColor="#888"
                style={styles.input}
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("addStudent.studentAge")} *</Text>
              <TextInput
                value={studentAge}
                onChangeText={setStudentAge}
                placeholder={t("addStudent.enterStudentAge")}
                placeholderTextColor="#888"
                style={styles.input}
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("addStudent.studentGrade")} *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() =>
                  !saving && setShowGradeDropdown(!showGradeDropdown)
                }
                disabled={saving}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !studentGrade && styles.placeholderText,
                  ]}
                >
                  {studentGrade || t("addStudent.selectGrade")}
                </Text>
                <MaterialIcons
                  name={showGradeDropdown ? "expand-less" : "expand-more"}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
              {showGradeDropdown && (
                <View style={styles.dropdownList}>
                  {gradeOptions.map((grade) => (
                    <TouchableOpacity
                      key={grade}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setStudentGrade(grade);
                        setShowGradeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{grade}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t("addStudent.studentGender")} *
              </Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() =>
                  !saving && setShowGenderDropdown(!showGenderDropdown)
                }
                disabled={saving}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !studentGender && styles.placeholderText,
                  ]}
                >
                  {studentGender || t("addStudent.selectGender")}
                </Text>
                <MaterialIcons
                  name={showGenderDropdown ? "expand-less" : "expand-more"}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
              {showGenderDropdown && (
                <View style={styles.dropdownList}>
                  {genderOptions.map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setStudentGender(gender);
                        setShowGenderDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{gender}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveStudent}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {t("addStudent.saveStudent")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBg: {
    flex: 1,
    backgroundColor: "#181A20",
    minHeight: "100vh",
    width: "100%",
  },
  container: {
    flexGrow: 1,
    padding: 0,
    paddingHorizontal: 16,
    minHeight: "100vh",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
    backgroundColor: "transparent",
  },
  content: {
    padding: 20,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#23262F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#B0B3C6",
    fontSize: 16,
    textAlign: "center",
    maxWidth: 400,
  },
  formCard: {
    backgroundColor: "#181A20",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#333640",
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    color: "#B0B3C6",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#23262F",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333640",
    fontSize: 16,
    transition: "border-color 0.2s ease",
  },
  dropdownButton: {
    backgroundColor: "#23262F",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333640",
    transition: "border-color 0.2s ease",
  },
  dropdownButtonText: {
    color: "#fff",
    flex: 1,
    fontSize: 16,
  },
  placeholderText: {
    color: "#888",
  },
  dropdownList: {
    backgroundColor: "#23262F",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333640",
    marginTop: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333640",
    transition: "background-color 0.2s ease",
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    transition: "all 0.2s ease",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
