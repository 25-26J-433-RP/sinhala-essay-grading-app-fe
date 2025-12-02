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
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

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
}

export default function StudentListView({
  onStudentPress,
}: StudentListViewProps) {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();

  // Responsive: 1 column on mobile, 2-4 on web depending on width
  let numColumns = 1;
  if (Platform.OS === "web") {
    if (width > 1200) numColumns = 4;
    else if (width > 900) numColumns = 3;
    else if (width > 600) numColumns = 2;
  }

  const loadStudentData = useCallback(async () => {
    if (!user) return;

    try {
      if (__DEV__)
        console.log("🔄 StudentListView: Loading images for user:", user.uid);
      setLoading(true);
      const userImages = await UserImageService.getUserImages(user.uid);
      if (__DEV__)
        console.log("📸 StudentListView: Loaded", userImages.length, "images");

      // Group images by studentId
      const studentMap = new Map<string, StudentInfo>();

      userImages.forEach((image) => {
        const existing = studentMap.get(image.studentId);

        if (existing) {
          existing.essayCount++;
          existing.essays.push(image);
          // Update last upload date if this image is more recent
          if (image.uploadedAt > existing.lastUploadDate) {
            existing.lastUploadDate = image.uploadedAt;
          }
          if (typeof image.score === "number") {
            existing.scoredCount++;
            const total =
              existing.averageScore !== null
                ? existing.averageScore * (existing.scoredCount - 1) +
                  image.score
                : image.score;
            existing.averageScore = total / existing.scoredCount;
          }
        } else {
          let scoredCount = 0;
          let averageScore: number | null = null;
          if (typeof image.score === "number") {
            scoredCount = 1;
            averageScore = image.score;
          }
          studentMap.set(image.studentId, {
            studentId: image.studentId,
            studentAge: image.studentAge,
            studentGrade: image.studentGrade,
            studentGender: image.studentGender,
            essayCount: 1,
            lastUploadDate: image.uploadedAt,
            essays: [image],
            scoredCount,
            averageScore,
          });
        }
      });

      // Convert map to array and sort by last upload date (most recent first)
      const studentList = Array.from(studentMap.values()).sort(
        (a, b) => b.lastUploadDate.getTime() - a.lastUploadDate.getTime()
      );
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStudentItem = ({ item }: { item: StudentInfo }) => (
    <TouchableOpacity
      style={[
        styles.studentCard,
        Platform.OS === "web" && styles.studentCardWeb,
      ]}
      onPress={() => onStudentPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentHeader}>
        <View style={styles.studentIconContainer}>
          <MaterialIcons name="person" size={32} color="#007AFF" />
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
        <MaterialIcons name="chevron-right" size={24} color="#B0B3C6" />
      </View>
      <View style={styles.studentFooter}>
        <View style={styles.statItem}>
          <MaterialIcons name="description" size={16} color="#007AFF" />
          <Text style={styles.statText}>
            {item.essayCount} Essay{item.essayCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="grade" size={16} color="#10B981" />
          <Text style={styles.statText}>
            Avg: {item.averageScore !== null ? item.averageScore : "-"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="access-time" size={16} color="#B0B3C6" />
          <Text style={styles.statText}>
            Last: {formatDate(item.lastUploadDate)}
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
        <Text style={styles.headerSubtitle}>
          {students.length} {t("student.students")}
        </Text>
      </View>
      <FlatList
        data={students}
        renderItem={renderStudentItem}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181A20",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#181A20",
  },
  loadingText: {
    color: "#B0B3C6",
    marginTop: 16,
    fontSize: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: "#B0B3C6",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#B0B3C6",
    fontSize: 14,
  },
  listContent: {
    padding: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  studentCard: {
    backgroundColor: "#23262F",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Default: full width on mobile
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    // Prevent vertical overlap on mobile
    minHeight: 140,
    // Add subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    transition: "box-shadow 0.2s",
  },
  studentCardWeb: {
    // On web, cards are narrower and spaced
    maxWidth: 320,
    marginHorizontal: 8,
    marginBottom: 16,
    minHeight: 160,
    flexGrow: 1,
    flexBasis: 0,
    cursor: "pointer",
    transition: "box-shadow 0.2s",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "stretch",
    gap: 16,
    marginBottom: 16,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  studentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#181A20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentId: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    color: "#B0B3C6",
    fontSize: 13,
  },
  studentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333640",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    color: "#B0B3C6",
    fontSize: 13,
  },
});
