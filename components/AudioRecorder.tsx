import { storage } from '@/config/firebase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Audio } from 'expo-av';
import { getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Recording {
  id: string;
  uri: string;
  name: string;
  duration?: number;
  size?: number;
}

export default function AudioRecorderScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecordings();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Auto-refresh recordings every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRecording && !uploading) {
        loadRecordings();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isRecording, uploading]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      console.log('Loading recordings from Firebase...');
      const audioRef = ref(storage, 'audio/');
      const result = await listAll(audioRef);
      const recordingsList: Recording[] = [];
      
      console.log('Found', result.items.length, 'audio files');
      
      for (const item of result.items) {
        try {
          const url = await getDownloadURL(item);
          recordingsList.push({
            id: item.name,
            uri: url,
            name: item.name,
          });
          console.log('Loaded recording:', item.name);
        } catch (error) {
          console.error('Error loading recording:', item.name, error);
        }
      }
      
      // Sort by name (which includes timestamp) to show newest first
      recordingsList.sort((a, b) => b.name.localeCompare(a.name));
      
      setRecordings(recordingsList);
      console.log('Successfully loaded', recordingsList.length, 'recordings');
    } catch (error) {
      console.error('Error loading recordings:', error);
      Alert.alert('Error', 'Failed to load recordings from Firebase');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    if (!recording) return;

    setIsRecording(false);
    setRecording(null);
    
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      if (uri) {
        await uploadRecording(uri);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const uploadRecording = async (uri: string) => {
    setUploading(true);
    try {
      console.log('Starting upload to Firebase...');
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `recording_${Date.now()}.m4a`;
      const storageRef = ref(storage, `audio/${filename}`);
      
      console.log('Uploading file:', filename);
      await uploadBytes(storageRef, blob);
      console.log('Audio uploaded successfully to Firebase!');
      Alert.alert('Success', 'Recording uploaded successfully!');
      
      // Force reload recordings to show the new one immediately
      setTimeout(async () => {
        await loadRecordings();
      }, 1000); // Small delay to ensure Firebase has processed the upload
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Error', `Failed to upload: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const playSound = async (uri: string, id: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      console.log('Loading Sound');
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setCurrentPlayingId(id);
      setIsPlaying(true);

      console.log('Playing Sound');
      await newSound.playAsync();
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };

  const deleteRecording = async (id: string) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const audioRef = ref(storage, `audio/${id}`);
              await (await import('firebase/storage')).deleteObject(audioRef);
              setRecordings(recordings.filter(r => r.id !== id));
              Alert.alert('Success', 'Recording deleted from Firebase');
            } catch (error) {
              console.error('Failed to delete recording from Firebase:', error);
              Alert.alert('Error', 'Failed to delete recording from Firebase');
            }
          },
        },
      ]
    );
  };

  const renderRecording = ({ item }: { item: Recording }) => (
    <View style={styles.recordingItem}>
      <View style={styles.recordingInfo}>
  <Text style={styles.recordingName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        <Text style={styles.recordingDetails}>Tap to play</Text>
      </View>
  <View style={styles.recordingActions}>
        <TouchableOpacity
          style={[
            styles.playButton,
            currentPlayingId === item.id && isPlaying ? styles.stopButton : null,
          ]}
          onPress={() => {
            if (currentPlayingId === item.id && isPlaying) {
              stopSound();
            } else {
              playSound(item.uri, item.id);
            }
          }}
        >
          <MaterialIcons
            name={currentPlayingId === item.id && isPlaying ? 'stop' : 'play-arrow'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteRecordingButton}
          onPress={() => deleteRecording(item.id)}
        >
          <MaterialIcons name="delete" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
  {/* Logo removed as requested */}
      <Text style={styles.title}>Essay Reading Recorder</Text>
      
      <View style={styles.recordingControls}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording ? styles.recordingActive : null,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={uploading}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
        
        {uploading && (
          <Text style={styles.uploadingText}>Uploading...</Text>
        )}
      </View>

      <View style={styles.recordingsContainer}>
        <Text style={styles.sectionTitle}>Recordings</Text>
        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : (
          <FlatList
            data={recordings}
            renderItem={renderRecording}
            keyExtractor={(item) => item.id}
            style={styles.recordingsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No recordings yet</Text>
            }
          />
        )}
      </View>
      
  {/* Manual refresh removed - recordings auto-refresh periodically */}
    </View>
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
    flex: 1,
    padding: 20,
    backgroundColor: '#23262F',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#fff',
  },
  recordingControls: {
    alignItems: 'center',
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: '#FF3B30',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#666',
  },
  recordingsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#B0B3C6',
  },
  recordingsList: {
    flex: 1,
  },
  recordingItem: {
    flexDirection: 'row',
    backgroundColor: '#181A20',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
  fontSize: 12,
  fontWeight: '400',
    color: '#fff',
  },
  recordingDetails: {
    fontSize: 14,
    color: '#B0B3C6',
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#34C759',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  marginLeft: 12,
  },
  stopButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    padding: 6,
    borderRadius: 18,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#B0B3C6',
    fontSize: 16,
    marginTop: 50,
  },
  // refreshButton removed - auto-refresh handled in code
  deleteRecordingButton: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
