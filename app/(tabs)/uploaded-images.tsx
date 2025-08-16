import { storage } from '@/config/firebase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { deleteObject, getDownloadURL, listAll, ref } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UploadedImagesScreen() {
  const [allImages, setAllImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(allImages.length / pageSize));
  const paginatedImages = allImages.slice((page - 1) * pageSize, page * pageSize);

  const fetchAllImages = async () => {
    setLoading(true);
    try {
      const imagesRef = ref(storage, 'images/');
      const result = await listAll(imagesRef);
      const urls = await Promise.all(result.items.map(item => getDownloadURL(item)));
      setAllImages(urls.reverse());
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllImages();
  }, []);
    const handleDelete = (url: string) => {
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to delete this photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Extract the filename from the URL
                const match = url.match(/%2F([^?]+)\?/);
                const filename = match ? match[1] : null;
                if (!filename) throw new Error('Could not extract filename');
                const imageRef = ref(storage, `images/${filename}`);
                await deleteObject(imageRef);
                setAllImages((imgs) => imgs.filter((img) => img !== url));
                Alert.alert('Deleted', 'Photo deleted successfully.');
              } catch (error) {
                console.error('Failed to delete image:', error);
                Alert.alert('Error', 'Failed to delete image.');
              }
            },
          },
        ]
      );
    };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Uploaded Essays</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : allImages.length === 0 ? (
        <Text style={styles.emptyText}>No images uploaded yet.</Text>
      ) : (
        <>
          <FlatList
            data={paginatedImages}
            keyExtractor={(item, index) => item + index}
            numColumns={3}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContainer}
            renderItem={({ item }) => (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                  <MaterialIcons name="delete" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          />
          <View style={styles.paginationRow}>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={[styles.arrowButton, page === 1 && styles.arrowButtonDisabled]}
            >
              <MaterialIcons name="chevron-left" size={32} color={page === 1 ? '#444' : '#fff'} />
            </TouchableOpacity>
            <Text style={styles.pageText}>
              Page {page} of {totalPages}
            </Text>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={[styles.arrowButton, page === totalPages && styles.arrowButtonDisabled]}
            >
              <MaterialIcons name="chevron-right" size={32} color={page === totalPages ? '#444' : '#fff'} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flex: 1,
    backgroundColor: '#181A20',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#23262F',
  },
  emptyText: {
    color: '#B0B3C6',
    textAlign: 'center',
    marginTop: 32,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  pageText: {
    color: '#B0B3C6',
    marginHorizontal: 16,
  },
  arrowButton: {
    backgroundColor: 'transparent',
    padding: 4,
    borderRadius: 20,
  },
  arrowButtonDisabled: {
    opacity: 0.5,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
    marginBottom: 12,
  },
  // image style is already defined above, so remove duplicate
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
    zIndex: 2,
  },
  gridContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
});
