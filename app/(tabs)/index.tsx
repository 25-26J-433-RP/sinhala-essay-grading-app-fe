import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { UserImageService } from '@/services/userImageService';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomeScreen() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const { userProfile, profileLoading, isStudent, isTeacher, role } = useRole();
  const { t } = useLanguage();

  const uploadImage = async (asset: any) => {
    if (!asset.uri) {
      setUploading(false);
      Alert.alert(t('common.error'), 'No image selected.');
      return;
    }

    if (!user) {
      Alert.alert(t('common.error'), 'You must be logged in to upload images.');
      return;
    }

    try {
      console.log('Uploading image:', asset);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `image_${Date.now()}.jpg`;

      // Use the new UserImageService for user-specific uploads
      const uploadedImage = await UserImageService.uploadUserImage({
        userId: user.uid,
        fileName: filename,
        fileBlob: blob,
        description: 'Essay submission', // Could be made configurable
      });

      setImageUrl(uploadedImage.imageUrl);
      console.log('Image uploaded successfully!', uploadedImage);
      Alert.alert(t('common.success'), 'Image uploaded successfully!');
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
    <ScrollView contentContainerStyle={styles.container}>
      <AppHeader />
      
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/akura-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroTitle}>{t('home.welcomeTitle')}</Text>
        <Text style={styles.heroSubtitle}>
          {t('home.welcomeSubtitle')}
        </Text>
        
        {/* {userProfile && !profileLoading && (
          <View style={styles.roleFeatures}>
            <Text style={styles.roleFeaturesTitle}>
              {isTeacher() ? 'Teacher Dashboard' : 'Student Dashboard'}
            </Text>
            <Text style={styles.roleFeaturesText}>
              {isTeacher() 
                ? 'Grade essays, provide feedback, and manage student submissions.'
                : 'Submit essays, view grades, and track your progress.'
              }
            </Text>
            
          </View>
        )} */}
      </View>
      <View style={styles.partnerContainer}>
        <Text style={styles.partnerInfo}>{t('home.developedBy')}</Text>
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
  roleFeatures: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#1A1D24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333640',
    maxWidth: 500,
  },
  roleFeaturesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleFeaturesText: {
    fontSize: 16,
    color: '#B0B3C6',
    textAlign: 'center',
    lineHeight: 24,
  },
  debugInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333640',
  },
  debugText: {
    fontSize: 12,
    color: '#34C759',
    textAlign: 'center',
    fontFamily: 'monospace',
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
