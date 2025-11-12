import AppHeader from "@/components/AppHeader";
import { storage } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { UserImageService } from "@/services/userImageService";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, listAll, ref } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Button,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
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

  const { user } = useAuth();
  const { isStudent, isTeacher, userProfile, profileLoading } = useRole();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const webcamRef = useRef<ReactWebcam | null>(null); // ✅ for web

  // More robust role-based access control
  // Allow access if user is authenticated and either:
  // 1. Profile is still loading, OR
  // 2. User is a student (regardless of isActive for now), OR
  // 3. No profile exists yet (newly registered users)
  const canUpload = user && (profileLoading || !userProfile || isStudent());

  // Show access denied only for confirmed teachers
  if (user && !profileLoading && userProfile && isTeacher()) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>Teacher Access</Text>
          <Text style={styles.accessDeniedText}>
            Image scanning and uploading is available for students. Teachers can view student submissions in other sections.
          </Text>
        </View>
      </View>
    );
  }

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

  // 🔹 Fetch all images (keeping for backward compatibility, but not used for student view)
  const fetchAllImages = async () => {
    try {
      const imagesRef = ref(storage, "images/");
      const result = await listAll(imagesRef);
      const urls = await Promise.all(
        result.items.map((item) => getDownloadURL(item))
      );
      setAllImages(urls.reverse());
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  useEffect(() => {
    fetchAllImages();
  }, []);

  const uploadImage = async (asset: any) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `image_${Date.now()}.jpg`;
      
      // Use UserImageService for user-specific uploads
      await UserImageService.uploadUserImage({
        userId: user.uid,
        fileName: filename,
        fileBlob: blob,
        description: 'Scanned essay document',
      });

      Alert.alert('Success', 'Image uploaded successfully!');
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
    if (Platform.OS === "web") {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);

      if (isMobile) {
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
      setShowWebCamera(true);
      return;
    }

    // ✅ Native apps
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission denied", "Camera access is required!");
        return;
      }
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
          <Button
            title={
              uploading && uploadingSource === "camera"
                ? "Uploading..."
                : "Scan with Camera"
            }
            onPress={scanWithCamera}
            disabled={uploading && uploadingSource !== "camera"}
            color="green"
          />
          <View style={{ height: 16 }} />
          <Button
            title={
              uploading && uploadingSource === "gallery"
                ? "Uploading..."
                : "Select from Gallery"
            }
            onPress={pickFromLibrary}
            disabled={uploading && uploadingSource !== "gallery"}
            color="blue"
          />
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
});
