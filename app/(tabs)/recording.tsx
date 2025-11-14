import AppHeader from '@/components/AppHeader';
import AudioRecorder from '@/components/AudioRecorder';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function RecordingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppHeader />
      <View style={styles.section}>
        <AudioRecorder />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#181A20',
  },
  section: {
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: '#23262F',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
});
