import { storage } from "@/config/firebase";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
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

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const webcamRef = useRef<ReactWebcam | null>(null); // ✅ for web

  // 🔹 Fetch all images
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
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `image_${Date.now()}.jpg`;
      const storageRef = ref(storage, `images/${filename}`);
      await uploadBytes(storageRef, blob);
      await getDownloadURL(storageRef);
      fetchAllImages();
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

  // 🔹 Mobile camera
  const scanWithCamera = async () => {
    if (Platform.OS === "web") {
      setShowWebCamera(true);
      return;
    }

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

  // 🔹 Take photo on web
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
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  section: { flex: 1, justifyContent: "center", alignItems: "center" },
  cameraContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 500,
  },
  camera: { width: "100%", height: 400 },
});
