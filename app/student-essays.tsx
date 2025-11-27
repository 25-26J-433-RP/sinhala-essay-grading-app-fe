import AppHeader from '@/components/AppHeader';
import { useConfirm } from '@/components/Confirm';
import { useToast } from '@/components/Toast';
import { UserImageService, UserImageUpload } from '@/services/userImageService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function StudentEssaysScreen() {
  const { studentData } = useLocalSearchParams<{ studentData?: string }>();
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const DEBUG = __DEV__ === true;
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    try {
      if (typeof studentData === 'string') {
        const parsed = JSON.parse(studentData);
        // Convert date strings back to Date objects
        parsed.lastUploadDate = new Date(parsed.lastUploadDate);
        parsed.essays = parsed.essays.map((essay: any) => ({
          ...essay,
          uploadedAt: new Date(essay.uploadedAt),
        }));
        setStudentInfo(parsed);
      }
    } catch (error) {
      console.error('Error parsing student data:', error);
    } finally {
      setLoading(false);
      initializedRef.current = true;
    }
  }, [studentData]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteEssay = async (essay: UserImageUpload) => {
    if (DEBUG) console.log('🗑️ handleDeleteEssay called for:', { id: essay.id, fileName: essay.fileName, storagePath: essay.storagePath });
    const ok = await confirm({
      title: 'Delete Essay',
      message: `Are you sure you want to delete "${essay.fileName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) {
      if (DEBUG) console.log('❌ Delete cancelled');
      return;
    }
    if (DEBUG) console.log('✅ Delete confirmed');
    if (DEBUG) console.log('🔄 Starting deletion for essay:', essay.id);
    setDeletingId(essay.id);
    try {
      if (DEBUG) console.log('📞 Calling UserImageService.deleteUserImage...');
      await UserImageService.deleteUserImage(essay.id, essay.storagePath);
      if (DEBUG) console.log('✅ Deletion successful');
      showToast('Essay deleted successfully!', { type: 'success' });
      // Remove from local state
      setStudentInfo((prev: any) => ({
        ...prev,
        essays: prev.essays.filter((e: UserImageUpload) => e.id !== essay.id),
        essayCount: prev.essayCount - 1,
      }));
    } catch (error) {
      console.error('❌ Error deleting essay:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      showToast('Failed to delete essay. Please try again.', { type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading essays...</Text>
        </View>
      </View>
    );
  }

  if (!studentInfo) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Student Not Found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderEssayItem = ({ item }: { item: UserImageUpload }) => (
    <View style={styles.essayCardWrapper}>
      <TouchableOpacity
        style={styles.essayCard}
        onPress={() => {
          router.push({
            pathname: '/image-detail',
            params: {
              imageData: JSON.stringify({
                ...item,
                uploadedAt: item.uploadedAt.toISOString(),
              }),
            },
          });
        }}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.thumbnail} 
          resizeMode="cover" 
        />
        <View style={styles.essayInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={styles.uploadDate}>
            {formatDate(item.uploadedAt)}
          </Text>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {/* Mindmap Button */}
          <TouchableOpacity
            style={styles.mindmapButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/essay-mindmap',
                params: {
                  essayId: item.id,
                  essayTitle: encodeURIComponent(item.fileName),
                },
              });
            }}
          >
            <MaterialIcons name="account-tree" size={16} color="#007AFF" />
            <Text style={styles.mindmapButtonText}>View Mindmap</Text>
          </TouchableOpacity>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#B0B3C6" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteIconButton}
        onPress={() => handleDeleteEssay(item)}
        disabled={deletingId === item.id}
      >
        {deletingId === item.id ? (
          <ActivityIndicator size="small" color="#FF3B30" />
        ) : (
          <MaterialIcons name="delete" size={24} color="#FF3B30" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <AppHeader />
      
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButtonTop}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonTopText}>Back to Students</Text>
        </TouchableOpacity>

        {/* Student Info Card */}
        <View style={styles.studentInfoCard}>
          <View style={styles.studentHeader}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person" size={40} color="#007AFF" />
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentId}>{studentInfo.studentId}</Text>
              <View style={styles.detailsRow}>
                {[
                  studentInfo.studentAge && { icon: 'cake', text: `${studentInfo.studentAge} years` },
                  studentInfo.studentGrade && { icon: 'school', text: studentInfo.studentGrade },
                  studentInfo.studentGender && { icon: 'wc', text: studentInfo.studentGender },
                ].filter(Boolean).map((detail, index) => (
                  <View key={index} style={styles.detailItem}>
                    <MaterialIcons name={detail.icon as any} size={16} color="#B0B3C6" />
                    <Text style={styles.detailText}>{detail.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{studentInfo.essayCount}</Text>
              <Text style={styles.statLabel}>Essay{studentInfo.essayCount !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {formatDate(studentInfo.lastUploadDate).split(',')[0]}
              </Text>
              <Text style={styles.statLabel}>Last Upload</Text>
            </View>
          </View>
        </View>

        {/* Essays List */}
        <View style={styles.essaysSection}>
          <Text style={styles.sectionTitle}>Submitted Essays</Text>
          <FlatList
            data={studentInfo.essays}
            renderItem={renderEssayItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
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
  studentInfoCard: {
    backgroundColor: '#23262F',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#181A20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  studentDetails: {
    flex: 1,
  },
  studentId: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    color: '#B0B3C6',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333640',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#181A20',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#B0B3C6',
    fontSize: 12,
  },
  essaysSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  essayCardWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  essayCard: {
    flexDirection: 'row',
    backgroundColor: '#23262F',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  deleteIconButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181A20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  essayInfo: {
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadDate: {
    color: '#B0B3C6',
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
  },
  mindmapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignSelf: 'flex-start',
    gap: 4,
  },
  mindmapButtonText: {
    color: '#007AFF',
    fontSize: 12,
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
