import AppHeader from "@/components/AppHeader";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { UserImageService, UserImageUpload } from "@/services/userImageService";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";

import {
  scoreSinhala,
  SinhalaScoreResponse,
} from "@/app/api/scoreSinhala"; // ✅ FIXED IMPORT

export default function ImageDetailScreen() {
  const { imageData: imageDataParam } = useLocalSearchParams<{
    imageData?: string;
  }>();

  const [imageData, setImageData] = useState<UserImageUpload | null>(null);
  const [loading, setLoading] = useState(true);

  const [essayTopic, setEssayTopic] = useState("");
  const [inputText, setInputText] = useState("");

  const [isScoring, setIsScoring] = useState(false);
  const [scoreData, setScoreData] = useState<SinhalaScoreResponse | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();
  const confirm = useConfirm();
  const DEBUG = __DEV__ === true;
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    try {
      if (typeof imageDataParam === "string") {
        const parsed = JSON.parse(imageDataParam);
        setImageData(parsed);
        setInputText(parsed.description || "");
      }
    } catch (error) {
      console.error("Error parsing image data:", error);
    } finally {
      setLoading(false);
      initializedRef.current = true;
    }
  }, [imageDataParam]);

  const handleDeleteImage = async () => {
    const ok = await confirm({
      title: "Delete Essay",
      message: "Are you sure you want to delete this essay?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!ok) return;

    if (!imageData?.id || !imageData?.storagePath) {
      showToast("Missing image data", { type: "error" });
      return;
    }

    setIsDeleting(true);

    try {
      await UserImageService.deleteUserImage(
        imageData.id,
        imageData.storagePath
      );

      showToast("Essay deleted!", { type: "success" });

      setTimeout(() => {
        router.push("/(tabs)/uploaded-images");
      }, 300);
    } catch (err) {
      showToast("Failed to delete", { type: "error" });
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading image...</Text>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/uploaded-images")}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => router.push("/(tabs)/uploaded-images")}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonTopText}>Back to Collection</Text>
        </TouchableOpacity>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageData.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* SCORING INPUT CARD */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Enter Sinhala Essay</Text>

          {/* Topic */}
          <Text style={styles.detailLabel}>Topic (optional)</Text>
          <TextInput
            value={essayTopic}
            onChangeText={setEssayTopic}
            placeholder="e.g. මගේ පාසල"
            style={styles.textInput}
          />

          {/* Essay */}
          <Text style={styles.detailLabel}>Essay *</Text>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Paste Sinhala essay here"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            style={[styles.textInput, { minHeight: 160 }]}
          />

          {/* Score Button */}
          <TouchableOpacity
            style={[styles.scoreButton, isScoring && { opacity: 0.6 }]}
            disabled={isScoring}
            onPress={async () => {
              if (!inputText.trim()) {
                Alert.alert("Validation", "Please enter an essay.");
                return;
              }

              setIsScoring(true);

              try {
                const result = await scoreSinhala({
                  text: inputText,
                  grade: Number(imageData.studentGrade) || 6,
                  topic: essayTopic || undefined,
                });

                // UI update
                setScoreData(result);
                showToast("Score calculated!", { type: "success" });

                // ✅ SAVE SCORE TO FIREBASE
                await UserImageService.updateImageScore(imageData.id, result);

                showToast("Score saved to database!", { type: "success" });

              } catch (err: any) {
                console.error(err);
                showToast("Failed to score or save", { type: "error" });
              } finally {
                setIsScoring(false);
              }
            }}
          >
            {isScoring ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scoreButtonText}>Score Essay</Text>
            )}
          </TouchableOpacity>

        </View>

        {/* SCORE DISPLAY */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Essay Details & Score</Text>

          {scoreData && (
            <View style={styles.scoreBox}>
              <Text style={styles.scoreMain}>Score: {scoreData.score}</Text>

              <Text style={styles.scoreDetail}>
                Word Count: {scoreData.details.word_count}
              </Text>
              <Text style={styles.scoreDetail}>
                Unique Words: {scoreData.details.unique_words}
              </Text>
              <Text style={styles.scoreDetail}>
                Avg Word Length: {scoreData.details.avg_word_length}
              </Text>
            </View>
          )}

          {/* FILE DETAILS */}
          <View style={styles.detailRow}>
            <MaterialIcons name="insert-drive-file" size={20} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>File Name</Text>
              <Text style={styles.detailValue}>{imageData.fileName}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={20} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Student ID</Text>
              <Text style={styles.detailValue}>{imageData.studentId}</Text>
            </View>
          </View>
          {/* Student Age */}
          {imageData.studentAge && (
            <View style={styles.detailRow}>
              <MaterialIcons name="cake" size={20} color="#007AFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Student Age</Text>
                <Text style={styles.detailValue}>{imageData.studentAge} years</Text>
              </View>
            </View>
          )}

          {/* Student Grade */}
          {imageData.studentGrade && (
            <View style={styles.detailRow}>
              <MaterialIcons name="school" size={20} color="#007AFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Student Grade</Text>
                <Text style={styles.detailValue}>{imageData.studentGrade}</Text>
              </View>
            </View>
          )}

          {/* Gender */}
          {imageData.studentGender && (
            <View style={styles.detailRow}>
              <MaterialIcons name="wc" size={20} color="#007AFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Student Gender</Text>
                <Text style={styles.detailValue}>{imageData.studentGender}</Text>
              </View>
            </View>
          )}

          {/* Uploaded At */}
          <View style={styles.detailRow}>
            <MaterialIcons name="access-time" size={20} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Uploaded At</Text>
              <Text style={styles.detailValue}>
                {new Date(imageData.uploadedAt).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* File Size */}
          <View style={styles.detailRow}>
            <MaterialIcons name="storage" size={20} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>File Size</Text>
              <Text style={styles.detailValue}>
                {imageData.fileSize
                  ? (imageData.fileSize / 1024).toFixed(2) + " KB"
                  : "Unknown"}
              </Text>
            </View>
          </View>

          {/* MIME Type */}
          {imageData.mimeType && (
            <View style={styles.detailRow}>
              <MaterialIcons name="image" size={20} color="#007AFF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{imageData.mimeType}</Text>
              </View>
            </View>
          )}

        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="download" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.shareButton]}>
            <MaterialIcons name="share" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteImage}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="delete" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#181A20" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: { padding: 20 },

  imageContainer: {
    backgroundColor: "#23262F",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  image: { width: "100%", height: 300, borderRadius: 8 },

  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },

  inputCard: {
    backgroundColor: "#23262F",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },

  textInput: {
    backgroundColor: "#1f2128",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderColor: "#333",
    borderWidth: 1,
    fontSize: 16,
  },

  detailLabel: {
    color: "#9CA3AF",
    marginBottom: 6,
    fontSize: 13,
  },

  scoreButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  scoreButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  detailsCard: {
    backgroundColor: "#23262F",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },

  scoreBox: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2563eb",
    marginBottom: 20,
  },

  scoreMain: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#3B82F6",
    marginBottom: 10,
  },

  scoreDetail: { color: "#E5E7EB", marginBottom: 4 },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  detailContent: { marginLeft: 12, flex: 1 },

  detailValue: { color: "#fff", fontSize: 16 },

  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 30,
  },

  actionButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  shareButton: {
    backgroundColor: "#10B981",
  },

  deleteButton: {
    backgroundColor: "#EF4444",
  },

  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 16,
  },

  errorTitle: {
    color: "#FF3B30",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },


  backButtonTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButtonTopText: { color: "#007AFF", marginLeft: 8 },
  backButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontWeight: "bold" },
});
