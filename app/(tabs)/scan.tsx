import { storage } from '@/config/firebase';
import { getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export default function ScanScreen() {
  const [uploading, setUploading] = useState(false);
  const [uploadingSource, setUploadingSource] = useState<'camera' | 'gallery' | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(allImages.length / pageSize));
  const paginatedImages = allImages.slice((page - 1) * pageSize, page * pageSize);

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
      // Refresh all images after upload
      setTimeout(() => {
        fetchAllImages();
        setPage(1); // Reset to first page after upload
      }, 1000);
  // Fetch all images from Firebase Storage
  const fetchAllImages = async () => {
    try {
      const imagesRef = ref(storage, 'images/');
      const result = await listAll(imagesRef);
      const urls = await Promise.all(result.items.map(item => getDownloadURL(item)));
      // Show newest first
      setAllImages(urls.reverse());
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  React.useEffect(() => {
    fetchAllImages();
  }, []);
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Error', (error as Error).message);
    } finally {
  setUploading(false);
  setUploadingSource(null);
    }
  };

  const pickFromLibrary = async () => {
    launchImageLibrary({ mediaType: 'photo' }, async (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return;
      }
      setUploading(true);
      setUploadingSource('gallery');
      await uploadImage(response.assets[0]);
    });
  };

  const scanWithCamera = async () => {
    launchCamera({ mediaType: 'photo', cameraType: 'back' }, async (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return;
      }
      setUploading(true);
      setUploadingSource('camera');
      await uploadImage(response.assets[0]);
    });
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
  {/* Uploaded images section moved to its own page */}
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
