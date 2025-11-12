import { useAuth } from '@/contexts/AuthContext';
import { UserImageService, UserImageUpload } from '@/services/userImageService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface StudentImageGalleryProps {
  onImagePress?: (image: UserImageUpload) => void;
}

export default function StudentImageGallery({ onImagePress }: StudentImageGalleryProps) {
  console.log('🎨 StudentImageGallery component rendered');
  
  const [images, setImages] = useState<UserImageUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  console.log('👤 StudentImageGallery user:', user?.uid || 'No user');

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(images.length / pageSize));
  const paginatedImages = images.slice((page - 1) * pageSize, page * pageSize);

  const loadUserImages = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔄 StudentImageGallery: Loading images for user:', user.uid);
      setLoading(true);
      const userImages = await UserImageService.getUserImages(user.uid);
      console.log('📸 StudentImageGallery: Loaded', userImages.length, 'images');
      setImages(userImages);
    } catch (error) {
      console.error('❌ StudentImageGallery: Error loading user images:', error);
      Alert.alert('Error', 'Failed to load your images. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserImages();
    setRefreshing(false);
  }, [loadUserImages]);

  useEffect(() => {
    loadUserImages();
  }, [loadUserImages]);

  // Refresh images when the screen comes into focus (e.g., when switching tabs)
  useFocusEffect(
    useCallback(() => {
      loadUserImages();
    }, [loadUserImages])
  );

  const handleDelete = (image: UserImageUpload) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserImageService.deleteUserImage(image.id, image.storagePath);
              setImages(prev => prev.filter(img => img.id !== image.id));
              
              // Adjust page if needed
              const newTotalPages = Math.max(1, Math.ceil((images.length - 1) / pageSize));
              if (page > newTotalPages) {
                setPage(newTotalPages);
              }
              
              Alert.alert('Success', 'Image deleted successfully.');
            } catch (error) {
              console.error('Failed to delete image:', error);
              Alert.alert('Error', 'Failed to delete image. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderImageItem = ({ item }: { item: UserImageUpload }) => (
    <TouchableOpacity
      style={styles.imageWrapper}
      onPress={() => onImagePress?.(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="delete" size={18} color="#fff" />
      </TouchableOpacity>

      <View style={styles.imageInfo}>
        <Text style={styles.imageName} numberOfLines={1}>
          {item.fileName}
        </Text>
        <Text style={styles.imageDate}>
          {formatDate(item.uploadedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your images...</Text>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="photo-library" size={64} color="#666" />
        <Text style={styles.emptyTitle}>No Images Yet</Text>
        <Text style={styles.emptyText}>
          Upload your first essay image using the scan or upload features.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Uploaded Essays</Text>
        <Text style={styles.subtitle}>{images.length} image{images.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={paginatedImages}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        renderItem={renderImageItem}
        showsVerticalScrollIndicator={false}
      />

      {totalPages > 1 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={[styles.arrowButton, page === 1 && styles.arrowButtonDisabled]}
          >
            <MaterialIcons 
              name="chevron-left" 
              size={24} 
              color={page === 1 ? '#666' : '#007AFF'} 
            />
          </TouchableOpacity>

          <Text style={styles.pageText}>
            Page {page} of {totalPages}
          </Text>

          <TouchableOpacity
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={[styles.arrowButton, page === totalPages && styles.arrowButtonDisabled]}
          >
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={page === totalPages ? '#666' : '#007AFF'} 
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#B0B3C6',
    fontSize: 16,
  },
  loadingText: {
    color: '#B0B3C6',
    marginTop: 12,
    fontSize: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#B0B3C6',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 16,
  },
  gridContainer: {
    padding: 8,
  },
  imageWrapper: {
    flex: 1,
    margin: 8,
    backgroundColor: '#23262F',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 150,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 16,
    padding: 6,
    zIndex: 2,
  },
  imageInfo: {
    padding: 12,
  },
  imageName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  imageDate: {
    color: '#B0B3C6',
    fontSize: 12,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333640',
  },
  pageText: {
    color: '#B0B3C6',
    marginHorizontal: 20,
    fontSize: 16,
  },
  arrowButton: {
    padding: 8,
    borderRadius: 20,
  },
  arrowButtonDisabled: {
    opacity: 0.5,
  },
});