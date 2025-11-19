// app/essay-mindmap.tsx
import { fetchMindmap, MindmapData } from '@/app/api/mindmap';
import AppHeader from '@/components/AppHeader';
import { MindmapView } from '@/components/MindmapView';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function EssayMindmapScreen() {
  const { essayId, essayTitle } = useLocalSearchParams<{ 
    essayId?: string;
    essayTitle?: string;
  }>();
  
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (essayId) {
      loadMindmap();
    } else {
      setError('No essay ID provided');
      setLoading(false);
    }
  }, [essayId]);

  const loadMindmap = async () => {
    if (!essayId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMindmap(essayId);
      setMindmapData(data);
    } catch (err) {
      console.error('Error loading mindmap:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mindmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <MaterialIcons name="account-tree" size={24} color="#007AFF" />
          <Text style={styles.title} numberOfLines={1}>
            {essayTitle ? decodeURIComponent(essayTitle) : 'Essay Mindmap'}
          </Text>
        </View>
        
        {mindmapData && (
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <MaterialIcons name="bubble-chart" size={16} color="#B0B3C6" />
              <Text style={styles.metadataText}>
                {mindmapData.metadata.total_nodes} nodes
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <MaterialIcons name="linear-scale" size={16} color="#B0B3C6" />
              <Text style={styles.metadataText}>
                {mindmapData.metadata.total_edges} connections
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Mindmap View */}
      <View style={styles.mindmapContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading mindmap...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
            <Text style={styles.errorTitle}>Failed to Load</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadMindmap}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : mindmapData ? (
          <MindmapView data={mindmapData} />
        ) : null}
      </View>

      {/* Instructions */}
      {!loading && !error && (
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            💡 Pinch to zoom • Drag to pan • Tap nodes for details
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333640',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  metadataContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    color: '#B0B3C6',
    fontSize: 14,
  },
  mindmapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#B0B3C6',
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#B0B3C6',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#23262F',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333640',
  },
  instructionsText: {
    color: '#B0B3C6',
    fontSize: 12,
    textAlign: 'center',
  },
});
