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

import { fetchMindmap, generateMindmap, MindmapData } from "@/app/api/mindmap";
import {
  scoreSinhala,
  SinhalaScoreResponse,
} from "@/app/api/scoreSinhala"; // ✅ FIXED IMPORT

import { MindmapView } from "@/components/MindmapView";

// 🔥 Prevent Firestore from rejecting undefined/null fields
function cleanFirestore(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      value === undefined ? null : value
    )
  );
}

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
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);
  const [mindmapLoading, setMindmapLoading] = useState(false);
  const [mindmapError, setMindmapError] = useState<string | null>(null);

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

  // Load mindmap once imageData is available (uses essay/image id)
  useEffect(() => {
    if (!imageData?.id) return;
    let cancelled = false;
    const load = async () => {
      setMindmapLoading(true);
      setMindmapError(null);
      try {
        const data = await fetchMindmap(imageData.id);
        if (!cancelled) setMindmapData(data);
      } catch (err: any) {
        if (!cancelled) setMindmapError(err?.message || "Failed to load mindmap");
      } finally {
        if (!cancelled) setMindmapLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [imageData?.id]);

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

                // 🔥 SAVE TO FIRESTORE (with cleaning)
                await UserImageService.updateImageScore(
                  imageData.id,
                  cleanFirestore(result)
                );

                showToast("Score saved to database!", { type: "success" });

                // ✅ GENERATE MINDMAP
                try {
                  console.log('🧠 Generating mindmap for essay:', imageData.id);
                  await generateMindmap(imageData.id, inputText);
                  console.log('✅ Mindmap generation triggered');
                  
                  // Fetch the generated mindmap
                  setMindmapLoading(true);
                  setMindmapError(null);
                  const mindmap = await fetchMindmap(imageData.id);
                  setMindmapData(mindmap);
                  setMindmapLoading(false);
                  showToast("Mindmap generated!", { type: "success" });
                } catch (mindmapErr: any) {
                  console.error('❌ Mindmap generation failed:', mindmapErr);
                  setMindmapError(mindmapErr?.message || "Failed to generate mindmap");
                  setMindmapLoading(false);
                  // Don't block the main flow - mindmap is optional
                }

              } catch (err: any) {
                console.log("🔥 FIREBASE ERROR (full):", JSON.stringify(err, null, 2));
                console.log("🔥 FIREBASE ERROR MESSAGE:", err?.message);
                console.log("🔥 FIREBASE ERROR CODE:", err?.code);

                if (err?.message?.includes("Missing or insufficient permissions")) {
                  showToast("❌ Firestore rules blocked the write", { type: "error" });
                }

                showToast("Failed to score or save", { type: "error" });
              }
              finally {
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
                Model: {scoreData.details.model}
              </Text>

              <Text style={styles.scoreDetail}>
                Dyslexic: {scoreData.details.dyslexic_flag ? "Yes" : "No"}
              </Text>

              <Text style={styles.scoreDetail}>
                Topic: {scoreData.details.topic || "—"}
              </Text>

            </View>
          )}

          {/* ==================== RUBRIC SECTION ==================== */}
          {scoreData && (
            <View style={styles.rubricCard}>
              <Text style={styles.rubricTitle}>Rubric Breakdown</Text>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>Richness (5)</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.richness_5 ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>Organization / Creativity (6)</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.organization_6 ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>Technical Skills (3)</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.technical_3 ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricTotalRow}>
                <Text style={[styles.rubricLabel, { fontSize: 16 }]}>Total (14)</Text>
                <Text style={styles.rubricTotalValue}>
                  {scoreData.rubric?.total_14 ?? "—"}
                </Text>
              </View>
            </View>
          )}

          {/* ==================== FAIRNESS SECTION ==================== */}
          {scoreData && (
            <View style={styles.fairnessCard}>
              <Text style={styles.rubricTitle}>Fairness Metrics</Text>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>SPD</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.fairness_report?.spd ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>DIR</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.fairness_report?.dir ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>EOD</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.fairness_report?.eod ?? "—"}
                </Text>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.fairnessNote}>
                  Mitigation Used:{" "}
                  <Text style={{ color: "#60A5FA" }}>
                    {scoreData.fairness_report?.mitigation_used ?? "—"}
                  </Text>
                </Text>
              </View>
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
            <MaterialIcons name="fingerprint" size={20} color="#007AFF" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Essay ID</Text>
              <Text style={styles.detailValue}>{imageData.id}</Text>
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

        {/* MINDMAP SECTION */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Essay Mindmap</Text>
          {mindmapLoading && (
            <View style={styles.mindmapStatusBox}>
              <ActivityIndicator color="#007AFF" />
              <Text style={styles.loadingText}>Loading mindmap...</Text>
            </View>
          )}
          {mindmapError && (
            <View style={styles.mindmapStatusBox}>
              <MaterialIcons name="error-outline" size={32} color="#FF3B30" />
              <Text style={styles.errorTitle}>Mindmap Error</Text>
              <Text style={styles.errorTextSmall}>{mindmapError}</Text>
              <TouchableOpacity
                style={styles.reloadMindmapButton}
                onPress={() => {
                  if (!imageData?.id) return;
                  setMindmapLoading(true);
                  setMindmapError(null);
                  fetchMindmap(imageData.id)
                    .then(setMindmapData)
                    .catch(e => setMindmapError(e.message || "Failed again"))
                    .finally(() => setMindmapLoading(false));
                }}
              >
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.reloadMindmapText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          {mindmapData && !mindmapLoading && !mindmapError && (
            <View style={styles.mindmapContainer}>
              <MindmapView data={mindmapData} />
              <Text style={styles.mindmapMeta}>
                Nodes: {mindmapData.metadata.total_nodes} • Edges: {mindmapData.metadata.total_edges}
              </Text>
              <Text style={styles.mindmapHint}>Pinch to zoom • Drag to pan</Text>
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
   // Mindmap styles
  mindmapStatusBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  errorTextSmall: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  reloadMindmapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "center",
  },
  reloadMindmapText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  mindmapContainer: {
    height: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  mindmapMeta: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  mindmapHint: {
    color: "#666",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
  },
   rubricCard: {
    backgroundColor: "#1f2128",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: 20,
  },

  rubricTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
  },

  rubricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  rubricLabel: {
    color: "#9CA3AF",
    fontSize: 14,
  },

  rubricValue: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "bold",
  },

  rubricTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },

  rubricTotalValue: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "bold",
  },

  fairnessCard: {
    backgroundColor: "#1f2128",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6D28D9",
    marginBottom: 20,
  },

  fairnessNote: {
    color: "#D1D5DB",
    fontSize: 13,
  },
});
