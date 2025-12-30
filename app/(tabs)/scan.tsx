import * as OcrApi from "../api/ocrApi"; // ✅ ADDED

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
import { LinearGradient } from "expo-linear-gradient";
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
  View,
} from "react-native";
import ReactWebcam from "react-webcam";

export default function ScanScreen() {
  const [uploading, setUploading] = useState(false);
  const [uploadingSource, setUploadingSource] =
    useState<"camera" | "gallery" | null>(null);
  const [showWebCamera, setShowWebCamera] = useState(false);
  const [cameraFacing, setCameraFacing] =
    useState<"front" | "back">("back");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentDropdown, setShowStudentDropdown] =
    useState<boolean>(false);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  const { user } = useAuth();
  const { profileLoading } = useRole();
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
        ...doc.data(),
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
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
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

// ===============================
// ✅ CORRECT ORDER (OCR → Firestore)
// ===============================

// 1️⃣ Call OCR FIRST
const ocrRes = await OcrApi.callOcrApi(blob, filename);

if (!ocrRes?.image_id) {
  throw new Error("OCR did not return image_id");
}

// 2️⃣ NOW create Firestore document (image_id is guaranteed)
const userImageId = await UserImageService.uploadUserImage({
  userId: user.uid,
  studentId: selectedStudent.studentId,
  studentAge: selectedStudent.studentAge,
  studentGrade: selectedStudent.studentGrade,
  studentGender: selectedStudent.studentGender,
  fileName: filename,
  fileBlob: blob,
  image_id: ocrRes.image_id, // ✅ ALWAYS DEFINED
});


    // 🔥 OCR — background only
   OcrApi.callOcrApi(blob, filename)
  .then(async (res) => {
    console.log("🧠 OCR finished:", res);

    await UserImageService.updateUserImage(userImageId, {
  image_id: res.image_id,
  image_url: res.image_url,
});


    console.log("🔗 OCR linked to userImage:", userImageId);
  })
  .catch((err) => {
    console.warn("⚠️ OCR failed (background)", err);
  });


    const userImages = await UserImageService.getUserImages(user.uid);
    const studentImages = userImages.filter(
      (img) => img.studentId === selectedStudent.studentId
    );

    setUploading(false);
    setUploadingSource(null);

    router.push({
      pathname: "/student-essays",
      params: {
        studentData: JSON.stringify({
          studentId: selectedStudent.studentId,
          studentAge: selectedStudent.studentAge,
          studentGrade: selectedStudent.studentGrade,
          studentGender: selectedStudent.studentGender,
          essayCount: studentImages.length,
          lastUploadDate: new Date().toISOString(),
          essays: studentImages.map((essay) => ({
            ...essay,
            uploadedAt: essay.uploadedAt.toISOString(),
          })),
        }),
        ocrText: "",
      },
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
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      t("common.permissionDenied"),
      t("scan.mediaPermissionRequired")
    );
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
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
      quality: 1,
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
          fileName: `webcam_${Date.now()}.jpg`,
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
          <Button title={t("scan.capture")} onPress={() => {}} />
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
                transform: [{ translateY: cardTranslateY }],
              },
            ]}
          >
            <View style={styles.selectionCard}>
              <View style={styles.iconWrap}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="school" size={28} color="#fff" />
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
                  <Text style={styles.studentLabel}>
                    {t("scan.chooseStudent")} *
                  </Text>
                  <Pressable
                    onPress={() => setShowStudentDropdown(!showStudentDropdown)}
                    style={({ hovered, pressed }) => [
                      styles.dropdownButton,
                      hovered && styles.dropdownHover,
                      pressed && styles.dropdownPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownButtonText,
                        !selectedStudent && styles.placeholderText,
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
                  {showStudentDropdown && (
                    <View style={styles.dropdownList}>
                      {students.map((student) => (
                        <Pressable
                          key={student.id}
                          style={({ pressed, hovered }) => [
                            styles.dropdownItem,
                            hovered && styles.dropdownItemHover,
                            pressed && styles.dropdownItemPressed,
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
                  <LinearGradient
                    colors={["#2ecc71", "#27ae60"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.gradientButton,
                      uploading &&
                        uploadingSource === "camera" &&
                        styles.buttonDisabled,
                    ]}
                    pointerEvents="none"
                  >
                    <MaterialIcons name="photo-camera" size={22} color="#fff" />
                    <Text style={styles.buttonText}>
                      {uploading && uploadingSource === "camera"
                        ? t("scan.uploading")
                        : t("scan.scanWithCamera")}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  disabled={uploading && uploadingSource !== "gallery"}
                  onPress={pickFromLibrary}
                  style={[
                    styles.solidButton,
                    uploading &&
                      uploadingSource === "gallery" &&
                      styles.buttonDisabled,
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#181A20",
    width: "100%",
    minHeight: "100vh",
  },
  section: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#181A20",
  },
  cameraContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 500,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  camera: {
    width: "100%",
    height: 400,
    borderRadius: 12,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    maxWidth: 600,
  },
  accessDeniedTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  accessDeniedText: {
    color: "#B0B3C6",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 500,
  },
  selectionCardAnimated: {
    width: "100%",
    maxWidth: 600,
    transform: [{ translateY: 0 }],
    opacity: 1,
  },
  selectionCard: {
    backgroundColor: "#0F1117",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconWrap: { alignItems: "center", marginBottom: 8 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2b2f3a",
    alignItems: "center",
    justifyContent: "center",
  },
  studentForm: {
    width: "100%",
    marginBottom: 20,
  },
  studentLabel: {
    color: "#B0B3C6",
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  studentInput: {
    backgroundColor: "#23262F",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333640",
  },
  dropdownButton: {
    backgroundColor: "#2a2d37",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3e49",
  },
  dropdownHover: { borderColor: "#4a4f5c" },
  dropdownPressed: { opacity: 0.9 },
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
    marginTop: 6,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333640",
  },
  dropdownItemHover: { backgroundColor: "#2a2d37" },
  dropdownItemPressed: { opacity: 0.9 },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 2,
  },
  dropdownItemSubtext: {
    color: "#B0B3C6",
    fontSize: 12,
  },
  studentSelection: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: "#B0B3C6",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    color: "#B0B3C6",
    fontSize: 14,
    textAlign: "center",
  },
  actionsRow: {
    gap: 12,
  },
  buttonBase: {
    borderRadius: 12,
    overflow: "hidden",
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  solidButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  solidButtonHover: { backgroundColor: "#1a8dff" },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
