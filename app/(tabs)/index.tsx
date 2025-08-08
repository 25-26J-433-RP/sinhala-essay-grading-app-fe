import { storage } from '@/config/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, StyleSheet, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export default function HomeScreen() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Error', (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const pickFromLibrary = async () => {
    launchImageLibrary({ mediaType: 'photo' }, async (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return;
      }
      setUploading(true);
      await uploadImage(response.assets[0]);
    });
  };

  const scanWithCamera = async () => {
    launchCamera({ mediaType: 'photo' }, async (response) => {
      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return;
      }
      setUploading(true);
      await uploadImage(response.assets[0]);
    });
  };

  return (
    <View style={styles.container}>
      <Button
        title={uploading ? 'Uploading...' : 'Scan Photo from Camera'}
        onPress={scanWithCamera}
        disabled={uploading}
      />
      <View style={{ height: 16 }} />
      <Button
        title={uploading ? 'Uploading...' : 'Select Photo from Gallery'}
        onPress={pickFromLibrary}
        disabled={uploading}
      />
      {uploading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 200, height: 200, marginTop: 16, borderRadius: 8 }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
