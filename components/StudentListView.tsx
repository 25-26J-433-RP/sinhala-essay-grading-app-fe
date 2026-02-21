import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserImageService, UserImageUpload } from "@/services/userImageService";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useConfirm } from "./Confirm";
import { useToast } from "./Toast";

interface StudentInfo {
  studentId: string;
  studentAge?: number;
  studentGrade?: string;
  studentGender?: string;
  essayCount: number;
  lastUploadDate: Date;
  essays: UserImageUpload[];
  scoredCount: number;
  averageScore: number | null;
}

interface StudentListViewProps {
  onStudentPress?: (studentInfo: StudentInfo) => void;
  scrollEnabled?: boolean;
}

export default function StudentListView({
  onStudentPress,
  scrollEnabled = true,
}: StudentListViewProps) {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const confirm = useConfirm();
  const { showToast } = useToast();

  // Edit State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentInfo | null>(null);
  const [editedId, setEditedId] = useState("");
  const [editedAge, setEditedAge] = useState("");
  const [editedGrade, setEditedGrade] = useState("");
  const [editedGender, setEditedGender] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const gradeOptions = [
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
  ];
  const genderOptions = [t("addStudent.male"), t("addStudent.female")];

  // Responsive: 1 column on mobile, 2 on web
  let numColumns = 1;
  if (Platform.OS === "web") {
    numColumns = width >= 768 ? 2 : 1;
  }

  const loadStudentData = useCallback(async () => {
    if (!user) return;

    try {
      if (__DEV__)
        console.log("🔄 StudentListView: Loading data for user:", user.uid);
      setLoading(true);

      // 1. Fetch all students and images in parallel
      const [allStudents, userImages] = await Promise.all([
        UserImageService.getStudents(user.uid),
        UserImageService.getUserImages(user.uid)
      ]);

      if (__DEV__)
        console.log(`📸 StudentListView: Loaded ${allStudents.length} students and ${userImages.length} images`);

      // 2. Initialize map with all registered students
      const studentMap = new Map<string, StudentInfo>();

      allStudents.forEach(student => {
        studentMap.set(student.studentId, {
          studentId: student.studentId,
          studentAge: student.studentAge,
          studentGrade: student.studentGrade,
          studentGender: student.studentGender,
          essayCount: 0,
          lastUploadDate: student.createdAt || new Date(0), // Default to early date if no essays
          essays: [],
          scoredCount: 0,
          averageScore: null,
        });
      });

      // 3. Merge image data into student objects
      userImages.forEach((image) => {
        let student = studentMap.get(image.studentId);

        // If student not in 'students' collection but has images (legacy or edge case)
        if (!student) {
          student = {
            studentId: image.studentId,
            studentAge: image.studentAge,
            studentGrade: image.studentGrade,
            studentGender: image.studentGender,
            essayCount: 0,
            lastUploadDate: new Date(0),
            essays: [],
            scoredCount: 0,
            averageScore: null,
          };
          studentMap.set(image.studentId, student);
        }

        student.essayCount++;
        student.essays.push(image);

        // Update last upload date
        if (image.uploadedAt > student.lastUploadDate) {
          student.lastUploadDate = image.uploadedAt;
        }

        // Calculate average score
        if (typeof image.score === "number") {
          student.scoredCount++;
          const total =
            student.averageScore !== null
              ? student.averageScore * (student.scoredCount - 1) + image.score
              : image.score;
          student.averageScore = total / student.scoredCount;
        }
      });

      // 4. Convert map to array and sort
      const studentList = Array.from(studentMap.values()).sort((a, b) => {
        // Sort by last upload date first, then by registration date (represented by createdAt/lastUploadDate if 0)
        return b.lastUploadDate.getTime() - a.lastUploadDate.getTime();
      });

      // Round average scores to 2 decimals for display consistency
      studentList.forEach((s) => {
        if (s.averageScore !== null) {
          s.averageScore = Math.round(s.averageScore * 100) / 100;
        }
      });

      setStudents(studentList);
      if (__DEV__)
        console.log(
          "👥 StudentListView: Found",
          studentList.length,
          "unique students"
        );
    } catch (error) {
      console.error("❌ StudentListView: Error loading student data:", error);
      Alert.alert("Error", "Failed to load student data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudentData();
    setRefreshing(false);
  }, [loadStudentData]);

  // Refresh when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStudentData();
    }, [loadStudentData])
  );

  const handleDeleteStudent = async (student: StudentInfo) => {
    if (!user) return;

    const confirmed = await confirm({
      title: t("student.deleteStudent"),
      message: t("student.deleteConfirm", { studentId: student.studentId }),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
    });

    if (confirmed) {
      try {
        setLoading(true);
        await UserImageService.deleteStudent(user.uid, student.studentId);
        showToast(t("student.deleteSuccess"), { type: "info" });
        loadStudentData();
      } catch (error) {
        console.error("Error deleting student:", error);
        Alert.alert("Error", "Failed to delete student. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const openEditModal = (student: StudentInfo) => {
    setEditingStudent(student);
    setEditedId(student.studentId);
    setEditedAge(student.studentAge?.toString() || "");
    setEditedGrade(student.studentGrade || "");
    setEditedGender(student.studentGender || "");
    setIsEditModalVisible(true);
  };

  const handleUpdateStudent = async () => {
    if (!user || !editingStudent) return;

    if (!editedId.trim()) {
      Alert.alert(t("common.error"), t("student.studentIdRequired"));
      return;
    }

    try {
      setIsUpdating(true);
      await UserImageService.updateStudentDetails(user.uid, editingStudent.studentId, {
        studentId: editedId.trim(),
        studentAge: editedAge ? parseInt(editedAge) : undefined,
        studentGrade: editedGrade,
        studentGender: editedGender,
      });
      setIsEditModalVisible(false);
      showToast(t("student.updateSuccess"), { type: "success" });
      loadStudentData();
    } catch (error) {
      console.error("Error updating student:", error);
      Alert.alert("Error", "Failed to update student. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: Platform.OS === "web" ? "numeric" : undefined,
    });
  };

  const renderStudentItem = ({ item }: { item: StudentInfo }) => (
    <TouchableOpacity
      style={[
        styles.studentCard,
        Platform.OS === "web" && styles.studentCardWeb,
      ]}
      onPress={() => onStudentPress?.(item)}
      activeOpacity={0.8}
    >
      <View style={styles.studentHeader}>
        <View style={styles.studentIconContainer}>
          <MaterialIcons name="person" size={28} color="#007AFF" />
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentId}>{item.studentId}</Text>
          <Text style={styles.detailText}>
            {[
              item.studentAge ? `Age: ${item.studentAge}` : null,
              item.studentGrade || null,
              item.studentGender || null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => openEditModal(item)}
          >
            <MaterialIcons name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => handleDeleteStudent(item)}
          >
            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
          <View style={styles.arrowIcon}>
            <MaterialIcons name="arrow-forward-ios" size={14} color="#4B5563" />
          </View>
        </View>
      </View>

      <View style={styles.studentFooter}>
        <View style={styles.statChip}>
          <MaterialIcons name="description" size={Platform.OS === "web" ? 14 : 12} color="#007AFF" />
          <Text style={styles.statText}>
            {item.essayCount} {item.essayCount === 1 ? 'Essay' : 'Essays'}
          </Text>
        </View>

        <View style={styles.statChip}>
          <MaterialIcons name="stars" size={Platform.OS === "web" ? 14 : 12} color="#10B981" />
          <Text style={styles.statText}>
            {item.averageScore !== null ? `${item.averageScore.toFixed(0)}% Avg` : "No Score"}
          </Text>
        </View>

        <View style={styles.statChip}>
          <MaterialIcons name="event" size={Platform.OS === "web" ? 14 : 12} color="#9CA3AF" />
          <Text style={styles.statText}>
            {item.essayCount > 0 ? formatDate(item.lastUploadDate) : "No Uploads"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t("student.loadingStudents")}</Text>
      </View>
    );
  }

  if (students.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="school" size={64} color="#666" />
        <Text style={styles.emptyTitle}>{t("student.noStudentsYet")}</Text>
        <Text style={styles.emptyText}>{t("student.noStudentsText")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("student.collection")}</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Student Count</Text>
            <Text style={styles.summaryValue}>{students.length}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <MaterialIcons name="people" size={24} color="#007AFF" />
          </View>
        </View>
      </View>
      <FlatList
        data={students}
        renderItem={renderStudentItem}
        key={`students-${numColumns}`}
        keyExtractor={(item) => item.studentId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        numColumns={numColumns}
        columnWrapperStyle={
          Platform.OS === "web" && numColumns > 1 ? styles.gridRow : undefined
        }
        scrollEnabled={scrollEnabled}
      />

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("student.editTitle")}</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("student.studentId")}</Text>
              <TextInput
                value={editedId}
                onChangeText={setEditedId}
                style={styles.input}
                placeholder={t("student.enterStudentId")}
                placeholderTextColor="#4B5563"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("student.age")}</Text>
              <TextInput
                value={editedAge}
                onChangeText={setEditedAge}
                style={styles.input}
                keyboardType="numeric"
                placeholder={t("student.enterAge")}
                placeholderTextColor="#4B5563"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("student.grade")}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowGradeDropdown(!showGradeDropdown)}
              >
                <Text style={[styles.dropdownText, !editedGrade && { color: "#4B5563" }]}>
                  {editedGrade || t("student.selectGrade")}
                </Text>
                <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showGradeDropdown && (
                <View style={styles.dropdownMenu}>
                  {gradeOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setEditedGrade(opt);
                        setShowGradeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("student.gender")}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowGenderDropdown(!showGenderDropdown)}
              >
                <Text style={[styles.dropdownText, !editedGender && { color: "#4B5563" }]}>
                  {editedGender || t("student.selectGender")}
                </Text>
                <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showGenderDropdown && (
                <View style={styles.dropdownMenu}>
                  {genderOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setEditedGender(opt);
                        setShowGenderDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isUpdating && { opacity: 0.7 }]}
              onPress={handleUpdateStudent}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t("student.saveChanges")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#0F1117",
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "space-between",
    alignItems: Platform.OS === "web" ? "center" : "flex-start",
    flexWrap: "wrap",
    gap: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: Platform.OS === "web" ? 0 : 20,
  },
  summaryCard: {
    backgroundColor: "#1C1E26",
    borderRadius: 20,
    padding: Platform.OS === "web" ? 14 : 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#2D313E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    minWidth: Platform.OS === "web" ? 220 : "100%",
  },
  summaryInfo: {
    flex: 1,
    marginRight: Platform.OS === "web" ? 16 : 0,
  },
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#fff",
    fontSize: Platform.OS === "web" ? 22 : 32,
    fontWeight: "900",
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0F1117",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  listContent: {
    paddingHorizontal: Platform.OS === "web" ? 12 : 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  studentCard: {
    backgroundColor: "#1C1E26",
    borderRadius: 24,
    padding: 10,
    marginBottom: 25,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#2D313E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  studentCardWeb: {
    marginBottom: 20,
    cursor: "pointer",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "stretch",
    gap: Platform.OS === "web" ? 24 : 12,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  studentIconContainer: {
    width: Platform.OS === "web" ? 52 : 44,
    height: Platform.OS === "web" ? 52 : 44,
    borderRadius: Platform.OS === "web" ? 26 : 22,
    backgroundColor: "#0F1117",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Platform.OS === "web" ? 16 : 10,
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  studentInfo: {
    flex: 1,
  },
  studentId: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: 0,
  },
  detailText: {
    color: "#9CA3AF",
    fontSize: Platform.OS === "web" ? 13 : 11,
    fontWeight: "500",
  },
  arrowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0F1117",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  studentFooter: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1117",
    paddingVertical: Platform.OS === "web" ? 6 : 4,
    paddingHorizontal: Platform.OS === "web" ? 12 : 8,
    borderRadius: 20,
    gap: Platform.OS === "web" ? 6 : 3,
    borderWidth: 1,
    borderColor: "#2D313E",
    justifyContent: "center",
  },
  statText: {
    color: "#E5E7EB",
    fontSize: Platform.OS === "web" ? 12 : 8,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Platform.OS === "web" ? 8 : 4,
  },
  actionIcon: {
    width: Platform.OS === "web" ? 36 : 32,
    height: Platform.OS === "web" ? 36 : 32,
    borderRadius: Platform.OS === "web" ? 18 : 16,
    backgroundColor: "#0F1117",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#1C1E26",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#0F1117",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  dropdownButton: {
    backgroundColor: "#0F1117",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  dropdownText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dropdownMenu: {
    backgroundColor: "#0F1117",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#007AFF",
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1C1E26",
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
