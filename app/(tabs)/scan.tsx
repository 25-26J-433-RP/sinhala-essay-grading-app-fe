import { runOcr } from "@/app/api/ocr";

import AppHeader from "@/components/AppHeader";
import { useToast } from "@/components/Toast";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import { UserImageService } from "@/services/userImageService";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Button,
    Easing,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import ReactWebcam from "react-webcam";

export default function ScanScreen() {
  const [uploading, setUploading] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<
    "camera" | "gallery" | null
  >(null);
  const [showWebCamera, setShowWebCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("back");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentDropdown, setShowStudentDropdown] =
    useState<boolean>(false);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  const { user } = useAuth();
  const { profileLoading, isStudent } = useRole();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const webcamRef = useRef<ReactWebcam | null>(null);
  const { showToast } = useToast();
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;
  const DEBUG = __DEV__ === true;
  const { t } = useLanguage();

  // 🔹 Fetch students
  const fetchStudents = useCallback(async () => {
    if (!user || !db) return;

    try {
      setLoadingStudents(true);
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const studentList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setStudents(studentList);
      if (DEBUG) console.log("📚 Loaded", studentList.length, "students");
    } catch (error) {
      console.error("Error fetching students:", error);
      Alert.alert(t("common.error"), t("scan.loadingStudents"));
    } finally {
      setLoadingStudents(false);
    }
  }, [user, DEBUG, t]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [cardOpacity, cardTranslateY]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useFocusEffect(
    useCallback(() => {
      fetchStudents();
    }, [fetchStudents])
  );

  // Auto-select student in student role
  useEffect(() => {
    if (isStudent() && students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0]);
    }
  }, [isStudent, students, selectedStudent]);

  if (!user) return null;

  if (profileLoading) {
    return (
      <View>
        <AppHeader />
        <Text>{t("common.loading")}</Text>
      </View>
    );
  }

  // ===============================
  // 🔥 IMAGE UPLOAD (OCR ADDED HERE)
  // ===============================
  const uploadImage = async (asset: any) => {
    if (!user || !selectedStudent) return;

    try {
      let blob: Blob;

      if (Platform.OS === "web" && asset.file) {
        blob = asset.file;
      } else {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }

      const filename = asset.fileName || `image_${Date.now()}.jpg`;
      const ocrImageId = `${user.uid}_${Date.now()}`;

      const uploadedId = await UserImageService.uploadUserImage({
        userId: user.uid,
        studentId: selectedStudent.studentId,
        studentAge: selectedStudent.studentAge,
        studentGrade: selectedStudent.studentGrade,
        studentGender: selectedStudent.studentGender,
        fileName: filename,
        fileBlob: blob,
        image_id: ocrImageId
      });

      if (Platform.OS === "web" && asset.file) {
        runOcr(asset.file, ocrImageId).catch((err) => {
          console.warn("OCR request failed", err);
        });
      }

      setUploading(false);
      setUploadingSource(null);

      router.push({
        pathname: "/image-detail",
        params: {
          imageId: uploadedId
        }
      });

      setSelectedStudent(null);
    } catch (err) {
      console.error("Upload error:", err);
      setUploading(false);
      setUploadingSource(null);
    }
  };



  // 🔹 Pick from gallery
  // 🔹 Pick from gallery (FIXED)
  const pickFromLibrary = async () => {
    if (!selectedStudent) {
      Alert.alert(t("scan.validation"), t("scan.selectStudentFirst"));
      return;
    }

    // ✅ ADD THIS — REQUIRED FOR WEB
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t("common.permissionDenied"),
        t("scan.mediaPermissionRequired")
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });

    if (!result.canceled && result.assets?.length > 0) {
      setUploading(true);
      setUploadingSource("gallery");
      await uploadImage(result.assets[0]);
    }
  };

  // 🔹 Scan with camera
  const scanWithCamera = async () => {
    if (!selectedStudent) {
      Alert.alert(t("scan.validation"), t("scan.selectStudentFirst"));
      return;
    }

    if (Platform.OS === "web") {
      setShowWebCamera(true);
      return;
    }

    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });

    if (!result.canceled) {
      setUploading(true);
      setUploadingSource("camera");
      await uploadImage(result.assets[0]);
    }
  };

  // 🔹 Webcam capture
  const captureWebcamPhoto = async () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        const asset = {
          uri: screenshot,
          fileName: `webcam_${Date.now()}.jpg`
        };
        setUploading(true);
        setUploadingSource("camera");
        await uploadImage(asset);
        setShowWebCamera(false);
      }
    }
  };

  // ===============================
  // UI BELOW — COMPLETELY UNCHANGED
  // ===============================

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppHeader />
      {showWebCamera && Platform.OS === "web" ? (
        <View style={styles.cameraContainer}>
          <ReactWebcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            style={styles.camera}
          />
          <Button title={t("scan.capture")} onPress={captureWebcamPhoto} />
          <Button
            title={t("common.cancel")}
            onPress={() => setShowWebCamera(false)}
          />
        </View>
      ) : showWebCamera ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
          />
          <Button title={t("scan.capture")} onPress={() => { }} />
          <Button
            title={t("scan.switchCamera")}
            onPress={() =>
              setCameraFacing((prev) => (prev === "back" ? "front" : "back"))
            }
          />
          <Button
            title={t("common.cancel")}
            onPress={() => setShowWebCamera(false)}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Animated.View
            style={[
              styles.selectionCardAnimated,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }]
              }
            ]}
          >
            <View style={styles.selectionCard}>
              <View style={styles.iconWrap}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="grading" size={32} color="#fff" />
                </View>
              </View>
              <Text style={styles.sectionTitle}>{t("scan.uploadEssays")}</Text>
              {loadingStudents ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>
                    {t("scan.loadingStudents")}
                  </Text>
                </View>
              ) : students.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="school" size={48} color="#666" />
                  <Text style={styles.emptyText}>
                    {t("scan.noStudentsFound")}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {t("scan.addStudentFirst")}
                  </Text>
                </View>
              ) : (
                <View style={styles.studentForm}>
                  <Pressable
                    disabled={isStudent()}
                    onPress={() => setShowStudentDropdown(!showStudentDropdown)}
                    style={({ hovered, pressed }) => [
                      styles.dropdownButton,
                      hovered && !isStudent() && styles.dropdownHover,
                      pressed && !isStudent() && styles.dropdownPressed,
                      isStudent() && styles.dropdownDisabled
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownButtonText,
                        !selectedStudent && styles.placeholderText
                      ]}
                    >
                      {selectedStudent
                        ? `${selectedStudent.studentId} - ${selectedStudent.studentGrade}`
                        : t("scan.selectStudent")}
                    </Text>
                    <MaterialIcons
                      name={showStudentDropdown ? "expand-less" : "expand-more"}
                      size={22}
                      color="#fff"
                    />
                  </Pressable>
                  {showStudentDropdown && !isStudent() && (
                    <View style={styles.dropdownList}>
                      {students.map((student) => (
                        <Pressable
                          key={student.id}
                          style={({ pressed, hovered }) => [
                            styles.dropdownItem,
                            hovered && styles.dropdownItemHover,
                            pressed && styles.dropdownItemPressed
                          ]}
                          onPress={() => {
                            setSelectedStudent(student);
                            setShowStudentDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>
                            {student.studentId}
                          </Text>
                          <Text style={styles.dropdownItemSubtext}>
                            {`${student.studentGrade} • Age ${student.studentAge} • ${student.studentGender}`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.actionsRow}>
                <Pressable
                  disabled={uploading && uploadingSource !== "camera"}
                  onPress={scanWithCamera}
                  style={styles.buttonBase}
                >
                  <View
                    style={[
                      styles.gradientButton,
                      uploading &&
                      uploadingSource === "camera" &&
                      styles.buttonDisabled
                    ]}
                    pointerEvents="none"
                  >
                    <MaterialIcons name="photo-camera" size={22} color="#0F1117" />
                    <Text style={styles.buttonTextPrimary}>
                      {uploading && uploadingSource === "camera"
                        ? t("scan.uploading")
                        : t("scan.scanWithCamera")}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  disabled={uploading && uploadingSource !== "gallery"}
                  onPress={pickFromLibrary}
                  style={[
                    styles.solidButton,
                    uploading &&
                    uploadingSource === "gallery" &&
                    styles.buttonDisabled
                  ]}
                >
                  <MaterialIcons name="photo-library" size={22} color="#fff" />
                  <Text style={styles.buttonText}>
                    {uploading && uploadingSource === "gallery"
                      ? t("scan.uploading")
                      : t("scan.selectFromGallery")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#0F1117",
    width: "100%",
  },
  section: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 20
  },
  cameraContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 500,
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#000"
  },
  camera: {
    width: "100%",
    height: "100%",
    borderRadius: 20
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    maxWidth: 600
  },
  accessDeniedTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  accessDeniedText: {
    color: "#B0B3C6",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 500
  },
  selectionCardAnimated: {
    width: "100%",
    maxWidth: 500,
  },
  selectionCard: {
    backgroundColor: "#1C1E26", // Matched Home screen hero card
    borderRadius: 32,
    padding: 32,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  iconWrap: { alignItems: "center", marginBottom: 16 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0F1117", // Darker contrast
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  studentForm: {
    width: "100%",
    marginBottom: 24
  },
  studentInput: {
    backgroundColor: "#23262F",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333640"
  },
  dropdownButton: {
    backgroundColor: "#0F1117",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2D313E"
  },
  dropdownHover: { borderColor: "#3B82F6" },
  dropdownPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  dropdownDisabled: { opacity: 0.6 },
  dropdownButtonText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 16,
    fontWeight: "600"
  },
  placeholderText: {
    color: "#4B5563"
  },
  dropdownList: {
    backgroundColor: "#1C1E26",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    marginTop: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2D313E"
  },
  dropdownItemHover: { backgroundColor: "#22252F" },
  dropdownItemPressed: { backgroundColor: "#3B82F6" },
  dropdownItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  dropdownItemSubtext: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500"
  },
  studentSelection: {
    width: "100%",
    marginBottom: 24
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 28, // Slightly larger to match Home titles
    fontWeight: "800",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 0.5
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "500"
  },
  emptyContainer: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#0F1117",
    borderRadius: 20,
    marginBottom: 20
  },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 6
  },
  emptySubtext: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  },
  actionsRow: {
    gap: 16
  },
  buttonBase: {
    borderRadius: 16,
    overflow: "hidden",
    // Premium shadow for the white button
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18, // Slightly thicker for premium feel
    paddingHorizontal: 20,
    gap: 12,
    minHeight: 64,
    backgroundColor: "#FFFFFF", // Matched Home screen primary button
  },
  solidButton: {
    backgroundColor: "#007AFF", // Matched Sinhala language selector blue
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 12,
    minHeight: 64,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  buttonTextPrimary: {
    color: "#0F1117", // Dark text for white button
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 22
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 22
  },
  buttonDisabled: { opacity: 0.5 }
});
