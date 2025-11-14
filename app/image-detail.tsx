import AppHeader from '@/components/AppHeader';
import { useConfirm } from '@/components/Confirm';
import { useToast } from '@/components/Toast';
import { UserImageService, UserImageUpload } from '@/services/userImageService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ImageDetailScreen() {
  const { imageData: imageDataParam } = useLocalSearchParams<{ imageData?: string }>();
  const [imageData, setImageData] = useState<UserImageUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const DEBUG = __DEV__ === true;
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    try {
      if (typeof imageDataParam === 'string') {
        const parsed = JSON.parse(imageDataParam);
        setImageData(parsed);
        setInputText(parsed.description || '');
      }
    } catch (error) {
      console.error('Error parsing image data:', error);
    } finally {
      setLoading(false);
      initializedRef.current = true;
    }
  }, [imageDataParam]);

  const handleSaveInput = async () => {
    if (!inputText.trim()) {
      Alert.alert('Validation', 'Please enter some text before saving.');
      return;
    }

    if (!imageData?.id) {
      Alert.alert('Error', 'Unable to save. Image ID not found.');
      return;
    }

    setIsSaving(true);
    
    try {
      await UserImageService.updateImageDescription(imageData.id, inputText.trim());
      
      // Update local state so the change is reflected immediately
      setImageData({
        ...imageData,
        description: inputText.trim(),
      });
      
      showToast('Notes saved successfully!', { type: 'success' });
      console.log('Saved text:', inputText);
    } catch (error) {
      console.error('Error saving notes:', error);
      showToast('Failed to save notes. Please try again.', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = async () => {
    if (DEBUG) console.log('🗑️ handleDeleteImage called');
    if (DEBUG) console.log('📊 Image data:', { id: imageData?.id, storagePath: imageData?.storagePath });
    const ok = await confirm({
      title: 'Delete Essay',
      message: 'Are you sure you want to delete this essay? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) {
      console.log('❌ Delete cancelled');
      return;
    }

    if (!imageData?.id || !imageData?.storagePath) {
      console.error('❌ Missing image data:', { id: imageData?.id, storagePath: imageData?.storagePath });
      showToast('Unable to delete. Image data not found.', { type: 'error' });
      return;
    }

    console.log('🔄 Starting deletion...');
    setIsDeleting(true);
    try {
      console.log('📞 Calling UserImageService.deleteUserImage...');
      await UserImageService.deleteUserImage(imageData.id, imageData.storagePath);
      if (DEBUG) console.log('✅ Deletion successful');
      showToast('Essay deleted successfully!', { type: 'success' });
      // Navigate back after a short delay
      setTimeout(() => {
        if (DEBUG) console.log('🔙 Navigating back');
        router.push('/(tabs)/uploaded-images');
      }, 500);
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      showToast('Failed to delete essay. Please try again.', { type: 'error' });
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading image details...</Text>
        </View>
      </View>
    );
  }

  if (!imageData) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Image Not Found</Text>
          <Text style={styles.errorText}>
            Unable to load image details. Please try again.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/uploaded-images')}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <ScrollView style={styles.container}>
      <AppHeader />
      
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButtonTop}
          onPress={() => {
            if (DEBUG) console.log('Back button pressed');
            router.push('/(tabs)/uploaded-images');
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonTopText}>Back to Collection</Text>
        </TouchableOpacity>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageData.imageUrl }} 
            style={styles.image} 
            resizeMode="contain"
          />
        </View>

        {/* Input Field Section */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Extracted Essay</Text>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Edit essay text here..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveInput}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="save" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Image Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Essay Details</Text>
          
          <View style={styles.detailRow}>
            {[
              <MaterialIcons key="icon" name="insert-drive-file" size={20} color="#007AFF" />,
              <View key="content" style={styles.detailContent}>
                <Text style={styles.detailLabel}>File Name</Text>
                <Text style={styles.detailValue}>{imageData.fileName}</Text>
              </View>,
            ]}
          </View>

          <View style={styles.detailRow}>
            {[
              <MaterialIcons key="icon" name="person" size={20} color="#007AFF" />,
              <View key="content" style={styles.detailContent}>
                <Text style={styles.detailLabel}>Student ID</Text>
                <Text style={styles.detailValue}>{imageData.studentId}</Text>
              </View>,
            ]}
          </View>

          {imageData.studentAge && (
            <View style={styles.detailRow}>
              {[
                <MaterialIcons key="icon" name="cake" size={20} color="#007AFF" />,
                <View key="content" style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Student Age</Text>
                  <Text style={styles.detailValue}>{imageData.studentAge} years</Text>
                </View>,
              ]}
            </View>
          )}

          {imageData.studentGrade && (
            <View style={styles.detailRow}>
              {[
                <MaterialIcons key="icon" name="school" size={20} color="#007AFF" />,
                <View key="content" style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Student Grade</Text>
                  <Text style={styles.detailValue}>{imageData.studentGrade}</Text>
                </View>,
              ]}
            </View>
          )}

          {imageData.studentGender && (
            <View style={styles.detailRow}>
              {[
                <MaterialIcons key="icon" name="wc" size={20} color="#007AFF" />,
                <View key="content" style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Student Gender</Text>
                  <Text style={styles.detailValue}>{imageData.studentGender}</Text>
                </View>,
              ]}
            </View>
          )}

          <View style={styles.detailRow}>
            {[
              <MaterialIcons key="icon" name="access-time" size={20} color="#007AFF" />,
              <View key="content" style={styles.detailContent}>
                <Text style={styles.detailLabel}>Uploaded At</Text>
                <Text style={styles.detailValue}>{formatDate(imageData.uploadedAt)}</Text>
              </View>,
            ]}
          </View>

          <View style={styles.detailRow}>
            {[
              <MaterialIcons key="icon" name="storage" size={20} color="#007AFF" />,
              <View key="content" style={styles.detailContent}>
                <Text style={styles.detailLabel}>File Size</Text>
                <Text style={styles.detailValue}>{formatFileSize(imageData.fileSize)}</Text>
              </View>,
            ]}
          </View>

          {imageData.mimeType && (
            <View style={styles.detailRow}>
              {[
                <MaterialIcons key="icon" name="image" size={20} color="#007AFF" />,
                <View key="content" style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{imageData.mimeType}</Text>
                </View>,
              ]}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // Future: Implement download functionality
              console.log('Download image:', imageData.fileName);
            }}
          >
            {[
              <MaterialIcons key="icon" name="download" size={24} color="#fff" />,
              <Text key="label" style={styles.actionButtonText}>Download</Text>,
            ]}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => {
              // Future: Implement share functionality
              console.log('Share image:', imageData.fileName);
            }}
          >
            {[
              <MaterialIcons key="icon" name="share" size={24} color="#fff" />,
              <Text key="label" style={styles.actionButtonText}>Share</Text>,
            ]}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteImage}
            disabled={isDeleting}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color="#fff" />
              : [
                  <MaterialIcons key="icon" name="delete" size={24} color="#fff" />,
                  <Text key="label" style={styles.actionButtonText}>Delete</Text>,
                ]
            }
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    padding: 20,
  },
  loadingText: {
    color: '#B0B3C6',
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#B0B3C6',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonTopText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  imageContainer: {
    backgroundColor: '#23262F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  inputCard: {
    backgroundColor: '#23262F',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: '#181A20',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#333640',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#23262F',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    color: '#B0B3C6',
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
