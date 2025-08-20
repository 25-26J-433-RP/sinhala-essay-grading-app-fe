import { storage } from '@/config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, View } from 'react-native';

export default function ScanScreen() {
  const [uploading, setUploading] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<'camera' | 'gallery' | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(allImages.length / pageSize));
  const paginatedImages = allImages.slice((page - 1) * pageSize, page * pageSize);

  // ✅ Fetch all images function moved out
  const fetchAllImages = async () => {
    try {
      const imagesRef = ref(storage, 'images/');
      const result = await listAll(imagesRef);
      const urls = await Promise.all(result.items.map(item => getDownloadURL(item)));
      setAllImages(urls.reverse()); // newest first
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  useEffect(() => {
    fetchAllImages();
  }, []);

  const uploadImage = async (asset: any) => {
    if (!asset.uri) {
      setUploading(false);
      Alert.alert('Error', 'No image selected.');
      return;
    }
    try {
      console.log('Uploading image:', asset);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `image_${Date.now()}`;
      const storageRef = ref(storage, `images/${filename}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
      console.log('Image uploaded successfully! URL:', url);
      Alert.alert('Success', 'Image uploaded successfully!');
      fetchAllImages();
      setPage(1);
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Error', (error as Error).message);
    } finally {
      setUploading(false);
      setUploadingSource(null);
    }
  };

  // ✅ Expo version of picking from gallery
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setUploading(true);
      setUploadingSource('gallery');
      await uploadImage(result.assets[0]);
    }
  };

  // ✅ Expo version of taking photo from camera
  const scanWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera access is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setUploading(true);
      setUploadingSource('camera');
      await uploadImage(result.assets[0]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Button
            title={uploading && uploadingSource === 'camera' ? 'Uploading...' : 'Scan Photo from Camera'}
            onPress={scanWithCamera}
            disabled={uploading && uploadingSource !== 'camera'}
          />
          {uploading && uploadingSource === 'camera' && <ActivityIndicator style={{ marginTop: 8 }} />}
        </View>
        <View style={{ height: 16 }} />
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Button
            title={uploading && uploadingSource === 'gallery' ? 'Uploading...' : 'Select Photo from Gallery'}
            onPress={pickFromLibrary}
            disabled={uploading && uploadingSource !== 'gallery'}
          />
          {uploading && uploadingSource === 'gallery' && <ActivityIndicator style={{ marginTop: 8 }} />}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  section: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
