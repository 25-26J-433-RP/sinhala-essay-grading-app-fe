import AppHeader from "@/components/AppHeader";
import { useToast } from '@/components/Toast';
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { UserImageService } from "@/services/userImageService";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
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
import ReactWebcam from "react-webcam"; // ✅ for web

export default function ScanScreen() {
  const [uploading, setUploading] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<
    "camera" | "gallery" | null
  >(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [showWebCamera, setShowWebCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("back");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState<boolean>(false);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  const { user } = useAuth();
  const { isStudent, isTeacher, userProfile, profileLoading } = useRole();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const webcamRef = useRef<ReactWebcam | null>(null); // ✅ for web
  const { showToast } = useToast();
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;
  const DEBUG = __DEV__ === true;

  // Fetch students for the current user
  const fetchStudents = useCallback(async () => {
    if (!user || !db) return;

    try {
      setLoadingStudents(true);
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const studentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStudents(studentList);
      if (DEBUG) console.log('📚 Loaded', studentList.length, 'students');
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  }, [user, DEBUG]);

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

  // Refresh students list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStudents();
    }, [fetchStudents])
  );

  // More robust role-based access control
  const canUpload = user && (profileLoading || !userProfile || isStudent() || isTeacher());

  // Show loading state while profile is being determined
  if (profileLoading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>Loading...</Text>
          <Text style={styles.accessDeniedText}>
            Setting up your profile...
          </Text>
        </View>
      </View>
    );
  }

  const uploadImage = async (asset: any) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    // Validate selected student
    if (!selectedStudent) {
      Alert.alert('Validation', 'Please select a student before uploading.');
      return;
    }

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `image_${Date.now()}.jpg`;
      
      // Use UserImageService for user-specific uploads with selected student data
      await UserImageService.uploadUserImage({
        userId: user.uid,
        studentId: selectedStudent.studentId,
        studentAge: selectedStudent.studentAge,
        studentGrade: selectedStudent.studentGrade,
        studentGender: selectedStudent.studentGender,
        fileName: filename,
        fileBlob: blob,
      });

      // Cross-platform success toast (top)
      showToast('Image uploaded successfully!', { type: 'success' });

      // Navigate to student essays page
      const userImages = await UserImageService.getUserImages(user.uid);
      const studentImages = userImages.filter(img => img.studentId === selectedStudent.studentId);
      
      router.push({
        pathname: '/student-essays',
        params: {
          studentData: JSON.stringify({
            studentId: selectedStudent.studentId,
            studentAge: selectedStudent.studentAge,
            studentGrade: selectedStudent.studentGrade,
            studentGender: selectedStudent.studentGender,
            essayCount: studentImages.length,
            lastUploadDate: new Date().toISOString(),
            essays: studentImages.map(essay => ({
              ...essay,
              uploadedAt: essay.uploadedAt.toISOString(),
            })),
          }),
        },
      });
      // Clear selection after successful upload
      setSelectedStudent(null);
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Upload Error", (error as Error).message);
    } finally {
      setUploading(false);
      setUploadingSource(null);
    }
  };

  // 🔹 Pick from gallery
  const pickFromLibrary = async () => {
    // Validate selected student first
    if (!selectedStudent) {
      Alert.alert('Validation', 'Please select a student before uploading.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setUploading(true);
      setUploadingSource("gallery");
      await uploadImage(result.assets[0]);
    }
  };

  // 🔹 Scan with camera (mobile web fix included)
  const scanWithCamera = async () => {
    console.log('🔥 scanWithCamera called!');
    console.log('🔥 Platform:', Platform.OS);
    console.log('🔥 selectedStudent:', selectedStudent);
    
    // Validate selected student first
    if (!selectedStudent) {
      console.log('❌ No student selected');
      Alert.alert('Validation', 'Please select a student before scanning.');
      return;
    }

    if (Platform.OS === "web") {
      // Better mobile detection - check for touch support and screen size
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && 
                       'ontouchstart' in window && 
                       window.innerWidth < 768;
      console.log('🔥 Is mobile:', isMobile);
      console.log('🔥 User agent:', navigator.userAgent);
      console.log('🔥 Has touch:', 'ontouchstart' in window);
      console.log('🔥 Screen width:', window.innerWidth);

      if (isMobile) {
        console.log('📸 Mobile web - launching camera picker');
        // ✅ Mobile web → use ImagePicker (opens native camera/photo sheet)
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        });
        if (!result.canceled) {
          setUploading(true);
          setUploadingSource("camera");
          await uploadImage(result.assets[0]);
        }
        return;
      }

      // ✅ Desktop web → show webcam
      console.log('📸 Desktop web - showing webcam interface');
      setShowWebCamera(true);
      return;
    }

    // ✅ Native apps
    console.log('📸 Native app - requesting camera permission');
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission denied", "Camera access is required!");
        return;
      }
    }

    console.log('📸 Native app - launching camera');
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

  // 🔹 Take photo on web desktop
  const captureWebcamPhoto = async () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        const blob = await (await fetch(screenshot)).blob();
        const asset = { uri: screenshot, fileName: `webcam_${Date.now()}.jpg` };
        setUploading(true);
        setUploadingSource("camera");
        await uploadImage(asset);
        setShowWebCamera(false);
      }
    }
  };

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
          <Button title="Capture" onPress={captureWebcamPhoto} />
          <Button title="Cancel" onPress={() => setShowWebCamera(false)} />
        </View>
      ) : showWebCamera ? (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing} />
          <Button title="Capture" onPress={() => {}} />
          <Button
            title="Switch Camera"
            onPress={() =>
              setCameraFacing((prev) => (prev === "back" ? "front" : "back"))
            }
          />
          <Button title="Cancel" onPress={() => setShowWebCamera(false)} />
        </View>
      ) : (
        <View style={styles.section}>
          <Animated.View
            style={[styles.selectionCardAnimated, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}
          >
            <View style={styles.selectionCard}>
              <View style={styles.iconWrap}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="school" size={28} color="#fff" />
                </View>
              </View>
              <Text style={styles.sectionTitle}>Upload Essays</Text>
              {loadingStudents ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading students...</Text>
                </View>
              ) : students.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="school" size={48} color="#666" />
                  <Text style={styles.emptyText}>No students found</Text>
                  <Text style={styles.emptySubtext}>Add a student first to upload essays</Text>
                </View>
              ) : (
                <View style={styles.studentForm}>
                  <Text style={styles.studentLabel}>Choose Student *</Text>
                  <Pressable
                    onPress={() => setShowStudentDropdown(!showStudentDropdown)}
                    style={({ hovered, pressed }) => [
                      styles.dropdownButton,
                      hovered && styles.dropdownHover,
                      pressed && styles.dropdownPressed,
                    ]}
                  >
                    <Text style={[styles.dropdownButtonText, !selectedStudent && styles.placeholderText]}>
                      {selectedStudent ? `${selectedStudent.studentId} - ${selectedStudent.studentGrade}` : 'Select a student'}
                    </Text>
                    <MaterialIcons name={showStudentDropdown ? 'expand-less' : 'expand-more'} size={22} color="#fff" />
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
                          <Text style={styles.dropdownItemText}>{student.studentId}</Text>
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
                  disabled={uploading && uploadingSource !== 'camera'}
                  onPress={scanWithCamera}
                  style={styles.buttonBase}
                >
                  <LinearGradient
                    colors={["#2ecc71", "#27ae60"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradientButton, (uploading && uploadingSource === 'camera') && styles.buttonDisabled]}
                    pointerEvents="none"
                  >
                    <MaterialIcons name="photo-camera" size={22} color="#fff" />
                    <Text style={styles.buttonText}>
                      {uploading && uploadingSource === 'camera' ? 'Uploading...' : 'Scan with Camera'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  disabled={uploading && uploadingSource !== 'gallery'}
                  onPress={pickFromLibrary}
                  style={[
                    styles.solidButton,
                    (uploading && uploadingSource === 'gallery') && styles.buttonDisabled,
                  ]}
                >
                  <MaterialIcons name="photo-library" size={22} color="#fff" />
                  <Text style={styles.buttonText}>
                    {uploading && uploadingSource === 'gallery' ? 'Uploading...' : 'Select from Gallery'}
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
    padding: 20,
    backgroundColor: '#181A20',
  },
  section: { flex: 1, justifyContent: "center", alignItems: "center" },
  cameraContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 500,
  },
  camera: { width: "100%", height: 400 },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  accessDeniedText: {
    color: '#B0B3C6',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  selectionCardAnimated: {
    width: '100%',
    maxWidth: 560,
    transform: [{ translateY: 0 }],
    opacity: 1,
  },
  selectionCard: {
    backgroundColor: '#23262F',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  iconWrap: { alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2b2f3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentForm: {
    width: '100%',
    marginBottom: 20,
  },
  studentLabel: {
    color: '#B0B3C6',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  studentInput: {
    backgroundColor: '#23262F',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333640',
  },
  dropdownButton: {
    backgroundColor: '#2a2d37',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3e49',
  },
  dropdownHover: { borderColor: '#4a4f5c' },
  dropdownPressed: { opacity: 0.9 },
  dropdownButtonText: {
    color: '#fff',
    flex: 1,
    fontSize: 16,
  },
  placeholderText: {
    color: '#888',
  },
  dropdownList: {
    backgroundColor: '#23262F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333640',
    marginTop: 6,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333640',
  },
  dropdownItemHover: { backgroundColor: '#2a2d37' },
  dropdownItemPressed: { opacity: 0.9 },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 2,
  },
  dropdownItemSubtext: {
    color: '#B0B3C6',
    fontSize: 12,
  },
  studentSelection: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: '#B0B3C6',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#B0B3C6',
    fontSize: 14,
    textAlign: 'center',
  },
  actionsRow: {
    gap: 12,
  },
  buttonBase: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  solidButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  solidButtonHover: { backgroundColor: '#1a8dff' },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
});
