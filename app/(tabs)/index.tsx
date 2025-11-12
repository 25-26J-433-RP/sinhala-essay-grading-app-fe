import { storage } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export default function HomeScreen() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { user, logout } = useAuth();

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/akura-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroTitle}>Welcome to the Essay Grading System</Text>
        <Text style={styles.heroSubtitle}>
          Effortlessly record, upload, and grade student essays with AI-powered feedback and analytics. Start by exploring the tabs for scanning essays or recording readings.
        </Text>
      </View>
      <View style={styles.partnerContainer}>
        <Text style={styles.partnerInfo}>Developed by Team Akura</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  container: {
    flexGrow: 1,
    padding: 0,
    paddingHorizontal: 20,
    backgroundColor: '#181A20',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: '#23262F',
    // borderBottomLeftRadius: 32,
    // borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#B0B3C6',
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 28,
  },
  partnerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  partnerInfo: {
    color: '#B0B3C6',
    fontSize: 13,
    textAlign: 'center',
  },
});
