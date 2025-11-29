// app/mindmap-demo.tsx
/**
 * Demo screen to test the mindmap visualization with sample data
 * This can be accessed during development to test the mindmap component
 */
import { MindmapData } from '@/app/api/mindmap';
import AppHeader from '@/components/AppHeader';
import { MindmapView } from '@/components/MindmapView';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Sample data matching the API response format
const SAMPLE_DATA: MindmapData = {
  nodes: [
    {
      id: "root1",
      label: "ශ්‍රී ලංකාව දකුණු ආසියාවේ පිහිටි දිවයිනකි",
      level: 0,
      type: "root",
      size: 30
    },
    {
      id: "topic1",
      label: "සුන්දර වෙරළ තීරයන්",
      level: 1,
      type: "topic",
      size: 20
    },
    {
      id: "topic2",
      label: "පුරාණ නටබුන්",
      level: 1,
      type: "topic",
      size: 20
    },
    {
      id: "topic3",
      label: "පොහොසත් සංස්කෘතිය",
      level: 1,
      type: "topic",
      size: 20
    }
  ],
  edges: [
    {
      id: "edge1",
      source: "root1",
      target: "topic1",
      type: "hierarchy"
    },
    {
      id: "edge2",
      source: "root1",
      target: "topic2",
      type: "hierarchy"
    },
    {
      id: "edge3",
      source: "root1",
      target: "topic3",
      type: "hierarchy"
    }
  ],
  metadata: {
    total_nodes: 4,
    total_edges: 3,
    text_length: 90
  }
};

export default function MindmapDemoScreen() {
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
          <MaterialIcons name="science" size={24} color="#007AFF" />
          <Text style={styles.title}>Mindmap Demo</Text>
        </View>
        
        <Text style={styles.subtitle}>
          Sample mindmap visualization with Sinhala text
        </Text>
      </View>

      {/* Mindmap View */}
      <View style={styles.mindmapContainer}>
        <MindmapView data={SAMPLE_DATA} />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          💡 Pinch to zoom • Drag to pan • This is demo data
        </Text>
      </View>
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
    marginBottom: 8,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#B0B3C6',
    fontSize: 14,
  },
  mindmapContainer: {
    flex: 1,
    backgroundColor: '#fff',
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
