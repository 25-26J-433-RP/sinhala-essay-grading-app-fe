import AppHeader from "@/components/AppHeader";
import { useToast } from "@/components/Toast";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import { UserImageService } from "@/services/userImageService";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
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
  const [existingStudent, setExistingStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const { user } = useAuth();
  const { isStudent } = useRole();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive button width calculation
  const isSmallScreen = screenWidth < 600;
  const getButtonStyle = () => {
    if (isSmallScreen) {
      return { width: '100%', marginTop: 8 };
    }
    return { flex: 1 };
  };
  
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

  // Load existing student profile for students
  useEffect(() => {
    const loadStudentProfile = async () => {
      if (!user || !isStudent()) {
        setLoading(false);
        return;
      }

      try {
        const students = await UserImageService.getStudents(user.uid);
        if (students && students.length > 0) {
          setExistingStudent(students[0]);
          // Pre-fill form fields for edit mode
          setStudentId(students[0].studentId || "");
          setStudentAge(students[0].studentAge?.toString() || "");
          setStudentGrade(students[0].studentGrade || "");
          setStudentGender(students[0].studentGender || "");
        }
      } catch (error) {
        console.error("Error loading student profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentProfile();
  }, [user, isStudent]);

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
      // If in edit mode and is a student, update the existing profile
      if (isEditMode && isStudent() && existingStudent) {
        const studentsRef = collection(db, "students");
        const studentDocRef = doc(studentsRef, existingStudent.id);

        await updateDoc(studentDocRef, {
          studentAge: ageNumber,
          studentGrade: studentGrade.trim(),
          studentGender: studentGender.trim(),
          updatedAt: new Date(),
        });

        showToast(t("addStudent.profileUpdated"), { type: "success" });
        setExistingStudent({
          ...existingStudent,
          studentAge: ageNumber,
          studentGrade: studentGrade.trim(),
          studentGender: studentGender.trim(),
        });
        setIsEditMode(false);
        return;
      }

      // Check if student ID already exists for this user (for new students)
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
      
      // Clear form
      setStudentId("");
      setStudentAge("");
      setStudentGrade("");
      setStudentGender("");

      // If student is filling in their own profile, redirect to home
      // Otherwise, go back (for teachers adding students)
      if (isStudent()) {
        router.replace("/(tabs)");
      } else {
        router.back();
      }
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
        <AppHeader 
          showBackButton 
          title={isStudent() ? t("addStudent.titleStudent") : t("addStudent.title")}
          onBackPress={isStudent() ? () => router.replace("/(tabs)") : undefined}
        />

        <View style={styles.content}>
          {/* If student already has a profile, show existing profile card */}
          {isStudent() && loading && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}

          {isStudent() && !loading && existingStudent && (
            <>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name={isEditMode ? "edit" : "check-circle"} size={40} color={isEditMode ? "#007AFF" : "#10B981"} />
                </View>
                <Text style={styles.subtitle}>
                  {isEditMode ? t("addStudent.editProfile") : t("addStudent.profileComplete")}
                </Text>
              </View>

              <View style={styles.formCard}>
                {/* Display mode - show profile */}
                {!isEditMode && (
                  <>
                    <View style={styles.profileSection}>
                      <View style={styles.profileRow}>
                        <MaterialIcons name="person" size={20} color="#007AFF" style={{ marginRight: 12 }} />
                        <View style={styles.profileContent}>
                          <Text style={styles.profileLabel}>{t("addStudent.studentId")}</Text>
                          <Text style={styles.profileValue}>{existingStudent.studentId}</Text>
                        </View>
                      </View>

                      <View style={styles.profileRow}>
                        <MaterialIcons name="cake" size={20} color="#007AFF" style={{ marginRight: 12 }} />
                        <View style={styles.profileContent}>
                          <Text style={styles.profileLabel}>{t("addStudent.studentAge")}</Text>
                          <Text style={styles.profileValue}>{existingStudent.studentAge}</Text>
                        </View>
                      </View>

                      <View style={styles.profileRow}>
                        <MaterialIcons name="school" size={20} color="#007AFF" style={{ marginRight: 12 }} />
                        <View style={styles.profileContent}>
                          <Text style={styles.profileLabel}>{t("addStudent.studentGrade")}</Text>
                          <Text style={styles.profileValue}>{existingStudent.studentGrade}</Text>
                        </View>
                      </View>

                      <View style={styles.profileRow}>
                        <MaterialIcons name="wc" size={20} color="#007AFF" style={{ marginRight: 12 }} />
                        <View style={styles.profileContent}>
                          <Text style={styles.profileLabel}>{t("addStudent.studentGender")}</Text>
                          <Text style={styles.profileValue}>{existingStudent.studentGender}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.buttonRow, isSmallScreen && { flexDirection: 'column' }]}>
                      <TouchableOpacity
                        style={[styles.editButton, getButtonStyle()]}
                        onPress={() => setIsEditMode(true)}
                      >
                        <MaterialIcons name="edit" size={20} color="#007AFF" />
                        <Text style={styles.editButtonText}>{t("addStudent.editButton")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.goHomeButton, getButtonStyle()]}
                        onPress={() => router.replace("/(tabs)")}
                      >
                        <MaterialIcons name="home" size={20} color="#fff" />
                        <Text style={styles.goHomeButtonText}>{t("addStudent.goHome")}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Edit mode - show form fields */}
                {isEditMode && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>{t("addStudent.studentId")} *</Text>
                      <Text style={styles.staticFieldValue}>{existingStudent.studentId}</Text>
                      <Text style={styles.staticFieldNote}>{t("addStudent.cannotEditId")}</Text>
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

                    <View style={[styles.buttonRow, isSmallScreen && { flexDirection: 'column' }]}>
                      <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled, getButtonStyle()]}
                        onPress={handleSaveStudent}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="save" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>
                              {t("addStudent.saveButton")}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cancelButton, getButtonStyle()]}
                        onPress={() => setIsEditMode(false)}
                        disabled={saving}
                      >
                        <MaterialIcons name="close" size={20} color="#007AFF" />
                        <Text style={styles.cancelButtonText}>{t("addStudent.cancelButton")}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </>
          )}

          {/* Show form for teachers and students without profiles */}
          {(!isStudent() || (isStudent() && !loading && !existingStudent)) && (
            <>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name={isStudent() ? "person" : "person-add"} size={40} color="#007AFF" />
                </View>
                <Text style={styles.subtitle}>
                  {isStudent() ? t("addStudent.subtitleStudent") : t("addStudent.subtitle")}
                </Text>
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
              style={[styles.saveButton, saving && styles.saveButtonDisabled, { paddingVertical: isSmallScreen ? 16 : 20 }]}
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
            </>
          )}
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  profileSection: {
    gap: 16,
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#181A20",
    borderRadius: 12,
  },
  profileContent: {
    flex: 1,
  },
  profileLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cannotChangeText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
  },
  noteText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "700",
  },
  goHomeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  goHomeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  staticFieldValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#181A20",
    borderRadius: 8,
    marginTop: 8,
  },
  staticFieldNote: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
    fontStyle: "italic",
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#EF4444",
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
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
