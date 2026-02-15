import AppHeader from "@/components/AppHeader";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/components/Toast";
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
  const [ageHasNonNumeric, setAgeHasNonNumeric] = useState(false);
  const [ageInputError, setAgeInputError] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentGender, setStudentGender] = useState("");
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const gradeOptions = [
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
  ];
  const genderOptions = [t("addStudent.male"), t("addStudent.female")];
  const STUDENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;
  const MIN_STUDENT_AGE = 3;
  const MAX_STUDENT_AGE = 25;

  const handleSaveStudent = async () => {
    const trimmedId = studentId.trim();
    const trimmedAge = studentAge.trim();
    const ageNumber = Number(trimmedAge);

    // Validate all fields
    if (!trimmedId) {
      showToast(t("addStudent.enterIdRequired"), { type: "error" });
      return;
    }
    if (!STUDENT_ID_PATTERN.test(trimmedId)) {
      showToast(t("addStudent.invalidStudentId"), { type: "error" });
      return;
    }
    if (ageHasNonNumeric) {
      showToast(t("addStudent.invalidAgeChars"), { type: "error" });
      return;
    }
    if (!trimmedAge) {
      showToast(t("addStudent.enterAgeRequired"), { type: "error" });
      return;
    }
    if (!Number.isInteger(ageNumber) || ageNumber < MIN_STUDENT_AGE || ageNumber > MAX_STUDENT_AGE) {
      showToast(t("addStudent.invalidAge"), { type: "error" });
      return;
    }
    if (!studentGrade || !gradeOptions.includes(studentGrade)) {
      showToast(t("addStudent.selectGradeRequired"), { type: "error" });
      return;
    }
    if (!studentGender || !genderOptions.includes(studentGender)) {
      showToast(t("addStudent.selectGenderRequired"), { type: "error" });
      return;
    }

    if (!user) {
      showToast(t("addStudent.mustBeLoggedIn"), { type: "error" });
      return;
    }

    if (!db) {
      showToast(t("addStudent.databaseNotInitialized"), { type: "error" });
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
        showToast(t("addStudent.studentExists"), { type: "error" });
        setSaving(false);
        return;
      }

      // Add new student
      await addDoc(studentsRef, {
        userId: user.uid,
        studentId: trimmedId,
        studentAge: ageNumber,
        studentGrade: studentGrade.trim(),
        studentGender: studentGender.trim(),
        createdAt: new Date(),
      });

      showToast(t("addStudent.studentAdded"), { type: "success" });
      router.back();

      // Clear form
      setStudentId("");
      setStudentAge("");
      setStudentGrade("");
      setStudentGender("");
    } catch (error) {
      console.error("Error adding student:", error);
      showToast(t("addStudent.failedToAdd"), { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.fullBg}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader showBackButton title={t("addStudent.title")} />

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person-add" size={40} color="#007AFF" />
            </View>
            <Text style={styles.subtitle}>{t("addStudent.subtitle")}</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("addStudent.studentId")} *</Text>
              <TextInput
                value={studentId}
                onChangeText={setStudentId}
                placeholder={t("addStudent.enterStudentId")}
                placeholderTextColor="#4B5563"
                style={styles.input}
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("addStudent.studentAge")} *</Text>
              <TextInput
                value={studentAge}
                onChangeText={(value) => {
                  const hasNonNumeric = /[^0-9]/.test(value);
                  setAgeHasNonNumeric(hasNonNumeric);
                  setAgeInputError(
                    hasNonNumeric ? t("addStudent.invalidAgeChars") : ""
                  );
                  setStudentAge(value.replace(/[^0-9]/g, ""));
                }}
                placeholder={t("addStudent.enterStudentAge")}
                placeholderTextColor="#4B5563"
                style={styles.input}
                keyboardType="numeric"
                editable={!saving}
              />
              {!!ageInputError && (
                <Text style={styles.inputErrorText}>{ageInputError}</Text>
              )}
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
    backgroundColor: "#0F1117",
    minHeight: "100%",
    width: "100%",
  },
  container: {
    flexGrow: 1,
    padding: 0,
    minHeight: "100%",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
    backgroundColor: "transparent",
  },
  content: {
    padding: 24,
    flex: 1,
    paddingTop: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    width: "100%",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1C1E26",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#2D313E",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 16,
    textAlign: "center",
    maxWidth: 400,
    fontWeight: "500",
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: "#1C1E26",
    borderRadius: 32,
    padding: 32,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  formGroup: {
    marginBottom: 24,
    width: "100%",
  },
  label: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 10,
    fontWeight: "800",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: "#0F1117",
    color: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2D313E",
    fontSize: 16,
    fontWeight: "600",
  },
  inputErrorText: {
    color: "#EF4444",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  dropdownButton: {
    backgroundColor: "#0F1117",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2D313E",
  },
  dropdownButtonText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  placeholderText: {
    color: "#4B5563",
  },
  dropdownList: {
    backgroundColor: "#0F1117",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#007AFF",
    marginTop: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownItem: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1C1E26",
  },
  dropdownItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 16,
    gap: 12,
    marginTop: 16,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
