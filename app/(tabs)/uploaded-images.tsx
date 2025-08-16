import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Image, Text, Button, ActivityIndicator } from 'react-native';
import { storage } from '@/config/firebase';
import { getDownloadURL, listAll, ref } from 'firebase/storage';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Uploaded Images</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : allImages.length === 0 ? (
        <Text style={styles.emptyText}>No images uploaded yet.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
            {paginatedImages.map((url, idx) => (
              <Image
                key={url + idx}
                source={{ uri: url }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.paginationRow}>
            <Button
              title="Prev"
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            />
            <Text style={styles.pageText}>
              Page {page} of {totalPages}
            </Text>
            <Button
              title="Next"
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            />
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
});
