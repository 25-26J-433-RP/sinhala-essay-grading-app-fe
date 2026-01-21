import AppHeader from "@/components/AppHeader";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

import { UserImageService, UserImageUpload } from "@/services/userImageService";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// Resolve Firebase Storage download URLs when a gs:// path or storagePath is provided
import { storage } from "@/config/firebase";
import { getDownloadURL, ref as storageRef } from "firebase/storage";

import { generateAudioFeedback } from "@/app/api/audioFeedback";
import { fetchMindmap, generateMindmap, MindmapData } from "@/app/api/mindmap";
import { scoreSinhala, SinhalaScoreResponse } from "@/app/api/scoreSinhala"; // âœ… FIXED IMPORT
import {
  fetchTextFeedback,
  TextFeedbackResponse,
} from "@/app/api/textFeedback";

import { MindmapView } from "@/components/MindmapView";
import { Audio } from "expo-av";

// ðŸ”¥ Prevent Firestore from rejecting undefined/null fields
function cleanFirestore(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => (value === undefined ? null : value))
  );
}

export default function ImageDetailScreen() {


  const [imageData, setImageData] = useState<UserImageUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrlResolved, setImageUrlResolved] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageLoadingError, setImageLoadingError] = useState<string | null>(
    null
  );
  const ocrAppliedRef = useRef(false);

  const [essayTopic, setEssayTopic] = useState("");
  const [inputText, setInputText] = useState("");
  const [isDyslexic, setIsDyslexic] = useState(false);

  const [isScoring, setIsScoring] = useState(false);
  const [scoreData, setScoreData] = useState<SinhalaScoreResponse | null>(null);
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);
  const [mindmapLoading, setMindmapLoading] = useState(false);
  const [mindmapError, setMindmapError] = useState<string | null>(null);
  const { imageId, imageData: imageDataParam } = useLocalSearchParams<{ imageId?: string; imageData?: string }>();

  // Text feedback state
  const [textFeedback, setTextFeedback] = useState<TextFeedbackResponse | null>(
    null
  );
  const [textFeedbackLoading, setTextFeedbackLoading] = useState(false);
  const [textFeedbackError, setTextFeedbackError] = useState<string | null>(
    null
  );

  // Audio feedback state
  const [audioFeedback, setAudioFeedback] = useState<any>(null);
  const [audioFeedbackLoading, setAudioFeedbackLoading] = useState(false);
  const [audioFeedbackError, setAudioFeedbackError] = useState<string | null>(
    null
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioPlayerRef = useRef<Audio.Sound | null>(null);

  // const [isSaving, setIsSaving] = useState(false); // not used currently
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();
  const confirm = useConfirm();
  const { t } = useLanguage();
  // const DEBUG = __DEV__ === true; // not used currently


  useEffect(() => {
    if (!imageData?.id) return;

    if (imageData.essay_text && imageData.essay_text.trim() !== "") {
      // OCR already present
      if (!inputText || inputText.trim() === "") {
        setInputText(imageData.essay_text);
        console.log("✅ OCR text applied to textbox");
      }
      return;
    }

    // OCR not ready yet → poll Firestore
    const interval = setInterval(async () => {
      console.log("⏳ Waiting for OCR result...");
      const fresh = await UserImageService.getUserImage(imageData.id);

      if (fresh.essay_text && fresh.essay_text.trim() !== "") {
        setImageData(fresh);
        setInputText(fresh.essay_text);
        console.log("🎯 OCR text arrived, textbox updated");
        clearInterval(interval);
      }
    }, 3000); // every 3 seconds

    return () => clearInterval(interval);
  }, [imageData?.id]);


  useEffect(() => {
    if (!imageData?.id) return;

    console.log("📝 Setting inputText from Firestore:", imageData.essay_text);

    setInputText(imageData.essay_text ?? "");
  }, [imageData?.id]);







  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.unloadAsync();
      }
    };
  }, []);

  // Resolve a valid HTTPS image URL for Firebase Storage if needed
  // ALWAYS regenerate from storagePath to ensure token is fresh, not using potentially stale imageUrl
  useEffect(() => {
    const resolveUrl = async () => {
      if (!imageData?.storagePath) return;

      setImageLoading(true);
      setImageLoadingError(null);

      try {
        let path = imageData.storagePath;

        // Handle gs:// paths safely
        if (path.startsWith("gs://")) {
          const parts = path.replace("gs://", "").split("/");
          path = parts.slice(1).join("/");
        }

        const ref = storageRef(storage, path);
        const freshUrl = await getDownloadURL(ref);

        setImageUrlResolved(freshUrl);
      } catch (err) {
        console.error("❌ Failed to resolve image URL", err);
        setImageLoadingError("Failed to load image");
        setImageUrlResolved(null);
      } finally {
        setImageLoading(false);
      }
    };

    resolveUrl();
  }, [imageData?.storagePath]);


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
        if (!cancelled)
          setMindmapError(err?.message || "Failed to load mindmap");
      } finally {
        if (!cancelled) setMindmapLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [imageData?.id]);








  useEffect(() => {
    // First, try to use imageDataParam if available
    if (imageDataParam) {
      try {
        const parsed = JSON.parse(imageDataParam);
        setImageData(parsed);
        setEssayTopic(parsed.essay_topic || "");
        setLoading(false);
        return;
      } catch (err) {
        console.warn("Failed to parse imageDataParam:", err);
      }
    }

    // Fallback: fetch by imageId if provided
    if (!imageId) return;

    (async () => {
      setLoading(true);
      const freshImage = await UserImageService.getUserImage(imageId);
      setImageData(freshImage);


      setEssayTopic(freshImage.essay_topic || "");
      setLoading(false);
    })();
  }, [imageId, imageDataParam]);



  const handleDeleteImage = async () => {
    const ok = await confirm({
      title: t("essay.deleteEssay"),
      message: t("essay.deleteConfirm"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
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

      showToast(t("essay.essayDeleted"), { type: "success" });

      setTimeout(() => {
        router.push("/(tabs)/uploaded-images");
      }, 300);
    } catch (err) {
      console.error("Delete image failed", err);
      showToast(t("essay.failedToDelete"), { type: "error" });
      setIsDeleting(false);
    }
  };




  const refreshImageData = async () => {
    if (!imageData?.id) return;

    try {
      console.log("🔄 Refreshing image metadata from Firestore...");

      const freshImage = await UserImageService.getUserImage(imageData.id);
      setImageData(freshImage);

      setEssayTopic(freshImage.essay_topic || "");

      if (freshImage.score) {
        setScoreData({
          score: freshImage.score,
          details: freshImage.details || {},
          rubric: freshImage.rubric || {},
          fairness_report: freshImage.fairness_report || {},
        });
      }

      if (freshImage.text_feedback) {
        setTextFeedback(freshImage.text_feedback);
      }

      if (freshImage.audio_feedback) {
        setAudioFeedback(freshImage.audio_feedback);
      }

      // 🔥 THIS WAS MISSING
      if (
        freshImage.essay_text &&
        (!inputText || inputText.trim() === "")
      ) {
        setInputText(freshImage.essay_text);
        ocrAppliedRef.current = true;
        console.log("🛡 Restored essay text after refresh");
      }

      console.log("✅ Image metadata refreshed");
    } catch (err) {
      console.error("❌ Refresh failed:", err);
    }
  };




  const handleFetchTextFeedback = async () => {
    if (!imageData?.id || !inputText.trim()) {
      showToast("Missing essay data for feedback", { type: "error" });
      return;
    }

    setTextFeedbackLoading(true);
    setTextFeedbackError(null);

    try {
      console.log("ðŸ”„ Fetching text feedback...");
      const response = await fetchTextFeedback(imageData.id, inputText);
      setTextFeedback(response);
      console.log("âœ… Text feedback received:", response);

      // Save feedback to Firestore
      await UserImageService.updateImageTextFeedback(imageData.id, response);
      console.log("ðŸ’¾ Feedback saved to Firestore");

      showToast("Feedback generated successfully", { type: "success" });
    } catch (error: any) {
      console.error("âŒ Failed to fetch text feedback:", error);
      setTextFeedbackError(error.message || "Failed to fetch feedback");
      showToast("Failed to generate feedback", { type: "error" });
    } finally {
      setTextFeedbackLoading(false);
    }
  };

  const handleGenerateAudioFeedback = async () => {
    if (!imageData?.id || !textFeedback?.feedback) {
      showToast("Generate text feedback first to create audio", {
        type: "error",
      });
      return;
    }

    setAudioFeedbackLoading(true);
    setAudioFeedbackError(null);

    try {
      console.log("ðŸŽ™ï¸ Generating audio feedback for essay:", imageData.id);

      const response = await generateAudioFeedback(
        imageData.id,
        textFeedback.feedback
      );

      setAudioFeedback(response);
      console.log("âœ… Audio feedback generated:", response);

      // Save audio feedback to Firestore
      await UserImageService.updateImageAudioFeedback(imageData.id, response);
      console.log("ðŸ’¾ Audio feedback saved to Firestore");

      showToast("Audio feedback generated successfully", { type: "success" });
    } catch (error: any) {
      console.error("âŒ Failed to generate audio feedback:", error);
      setAudioFeedbackError(error.message || "Failed to generate audio");
      showToast("Failed to generate audio feedback", { type: "error" });
    } finally {
      setAudioFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader hideRightSection />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t("essay.loadingImage")}</Text>
        </View>
      </View>
    );
  }

  if (!imageData) {
    return (
      <View style={styles.container}>
        <AppHeader hideRightSection />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>{t("essay.imageNotFound")}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/uploaded-images")}
          >
            <Text style={styles.backButtonText}>{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <AppHeader hideRightSection />

      <View style={styles.content}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {imageLoading ? (
            <View style={styles.imageFallback}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.imageFallbackText}>
                {t("essay.loadingImage")}
              </Text>
            </View>
          ) : imageUrlResolved ? (
            Platform.OS === "web" ? (
              <img
                src={imageUrlResolved}
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 8,
                  objectFit: "contain",
                }}
                onError={(e) => {
                  console.error("Web img failed to load", {
                    resolvedUrl: imageUrlResolved,
                    errorEvent: e,
                  });
                  setImageUrlResolved(null);
                }}
                onLoad={() => console.info("âœ… Web img loaded successfully")}
              />
            ) : (
              <Image
                source={{ uri: imageUrlResolved }}
                style={styles.image}
                resizeMode="contain"
                onError={(e) => {
                  console.error("Native Image failed to load", {
                    error: e.nativeEvent?.error,
                    resolvedUrl: imageUrlResolved,
                    originalUrl: imageData?.imageUrl,
                    storagePath: imageData?.storagePath,
                  });
                  setImageUrlResolved(null);
                }}
              />
            )
          ) : (
            <View style={styles.imageFallback}>
              <MaterialIcons
                name="image-not-supported"
                size={28}
                color="#B0B3C6"
              />
              <Text style={styles.imageFallbackText}>
                {imageLoadingError || "Image not available"}
              </Text>
              <TouchableOpacity
                style={styles.reloadMindmapButton}
                onPress={async () => {
                  // Try resolving again and log details
                  console.info("Retrying image URL resolution", {
                    originalUrl: imageData?.imageUrl,
                    storagePath: imageData?.storagePath,
                  });
                  try {
                    const candidate =
                      imageData?.imageUrl || imageData?.storagePath || "";
                    if (candidate && candidate.startsWith("http")) {
                      setImageUrlResolved(candidate);
                      return;
                    }
                    if (candidate) {
                      let normalizedPath = candidate;
                      if (candidate.startsWith("gs://")) {
                        const parts = candidate.replace("gs://", "").split("/");
                        normalizedPath = parts.slice(1).join("/");
                      }
                      const ref = storageRef(storage, normalizedPath);
                      const url = await getDownloadURL(ref);
                      console.info("âœ… Resolved download URL", { url });
                      setImageUrlResolved(url);
                    }
                  } catch (err) {
                    console.error("âŒ Retry resolution failed", err);
                  }
                }}
              >
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.reloadMindmapText}>
                  {t("common.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SCORING INPUT CARD */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>{t("essay.enterSinhalaEssay")}</Text>

          {/* Topic */}
          <Text style={styles.detailLabel}>{t("essay.topic")}</Text>
          <TextInput
            value={essayTopic}
            onChangeText={setEssayTopic}
            placeholder={t("essay.topicPlaceholder")}
            style={styles.textInput}
          />

          {/* Essay */}
          <Text style={styles.detailLabel}>{t("essay.essayRequired")}</Text>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t("essay.essayPlaceholder")}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            style={[styles.textInput, { minHeight: 160 }]}
          />

          {/* Debug Mode Toggle */}
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Simulate Dyslexic Student (Debug)</Text>
            <Switch
              value={isDyslexic}
              onValueChange={setIsDyslexic}
              trackColor={{ false: "#374151", true: "#6D28D9" }}
              thumbColor={isDyslexic ? "#fff" : "#9CA3AF"}
            />
          </View>

          {/* Score Button */}
          <TouchableOpacity
            style={[styles.scoreButton, isScoring && { opacity: 0.6 }]}
            disabled={isScoring}
            onPress={async () => {
              if (!inputText.trim()) {
                Alert.alert(t("essay.validation"), t("essay.pleaseEnterEssay"));
                return;
              }

              setIsScoring(true);

              try {
                // Extract grade number from "Grade X" format (e.g., "Grade 8" -> 8)
                const gradeStr = imageData.studentGrade?.toString() || "";
                const gradeMatch = gradeStr.match(/\d+/);
                const gradeNumber = gradeMatch ? Number(gradeMatch[0]) : 6;

                const result = await scoreSinhala({
                  text: inputText,  // âœ… Changed from essay_text to text
                  grade: gradeNumber,
                  topic: essayTopic || undefined,
                  dyslexic_flag: isDyslexic,  // âœ… Added dyslexic_flag
                  error_tags: [],        // âœ… Added error_tags
                });

                // UI update
                setScoreData(result);
                showToast(t("essay.scoreCalculated"), { type: "success" });

                // ðŸ”¥ SAVE TO FIRESTORE (with cleaning)
                const firestoreScorePayload = cleanFirestore({
                  score: result.score,

                  details: {
                    // grade: result.details.grade,
                    // topic: result.details.topic ?? null,
                    dyslexic_flag: result.details.dyslexic_flag,
                    error_tags: result.details.error_tags ?? [],
                    // model: result.details.model,
                  },

                  rubric: {
                    richness_5: result.rubric.richness_5,
                    organization_6: result.rubric.organization_6,
                    technical_3: result.rubric.technical_3,
                    total_14: result.rubric.total_14,
                  },

                  // ðŸ” Firestore-safe (can be null)
                  fairness_report: result.fairness_report ?? null,

                  essay_text: inputText,
                  essay_topic: essayTopic || null,
                  studentGrade: imageData.studentGrade || null,

                  scored_at: new Date().toISOString(),
                });

                await UserImageService.updateImageScore(
                  imageData.id,
                  firestoreScorePayload
                );

                showToast(t("essay.scoreSaved"), { type: "success" });

                // ✅ REFRESH DATA FROM FIRESTORE - This ensures everything is in sync
                await refreshImageData();

                // âœ… GENERATE MINDMAP
                try {
                  console.log("ðŸ§  Generating mindmap for essay:", imageData.id);
                  await generateMindmap(imageData.id, inputText);
                  console.log("âœ… Mindmap generation triggered");

                  // Fetch the generated mindmap
                  setMindmapLoading(true);
                  setMindmapError(null);
                  const mindmap = await fetchMindmap(imageData.id);
                  setMindmapData(mindmap);
                  setMindmapLoading(false);
                  showToast(t("essay.mindmapGenerated"), { type: "success" });
                } catch (mindmapErr: any) {
                  console.error("âŒ Mindmap generation failed:", mindmapErr);
                  setMindmapError(
                    mindmapErr?.message || t("mindmap.generationFailed")
                  );
                  setMindmapLoading(false);
                  // Don't block the main flow - mindmap is optional
                }

                // âœ… FETCH TEXT FEEDBACK
                try {
                  console.log(
                    "ðŸ“¤ Fetching text feedback for essay:",
                    imageData.id
                  );
                  const feedback = await fetchTextFeedback(
                    imageData.id,
                    inputText
                  );
                  setTextFeedback(feedback);
                  console.log("âœ… Text feedback received:", feedback);
                  showToast("Text feedback generated!", { type: "success" });
                  // Refresh to get the saved feedback from Firestore
                  await refreshImageData();
                } catch (feedbackErr: any) {
                  console.error(
                    "âŒ Text feedback generation failed:",
                    feedbackErr
                  );
                  setTextFeedbackError(
                    feedbackErr?.message || "Failed to generate text feedback"
                  );
                  // Don't block the main flow - text feedback is optional
                }
              } catch (err: any) {
                console.log(
                  "ðŸ”¥ FIREBASE ERROR (full):",
                  JSON.stringify(err, null, 2)
                );
                console.log("ðŸ”¥ FIREBASE ERROR MESSAGE:", err?.message);
                console.log("ðŸ”¥ FIREBASE ERROR CODE:", err?.code);

                if (
                  err?.message?.includes("Missing or insufficient permissions")
                ) {
                  showToast("âŒ Firestore rules blocked the write", {
                    type: "error",
                  });
                }

                showToast(t("essay.failedToScore"), { type: "error" });
              } finally {
                setIsScoring(false);
              }
            }}
          >
            {isScoring ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scoreButtonText}>
                {t("essay.scoreEssay")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* SCORE DISPLAY */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{t("essay.essayDetails")}</Text>

          {scoreData && (
            <View style={styles.scoreBox}>
              <Text style={styles.scoreMain}>
                {t("essay.score")}: {scoreData.score}
              </Text>

              {/* <Text style={styles.scoreDetail}>
                Model: {scoreData.details.model}
              </Text> */}

              <Text style={styles.scoreDetail}>
                Dyslexic: {scoreData.details.dyslexic_flag ? "Yes" : "No"}
              </Text>

              {/* <Text style={styles.scoreDetail}>
                Topic: {scoreData.details.topic || "â€”"}
              </Text> */}
            </View>
          )}

          {/* ==================== RUBRIC SECTION ==================== */}
          {scoreData && (
            <View style={styles.rubricCard}>
              <Text style={styles.rubricTitle}>
                {t("essay.rubricBreakdown")}
              </Text>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>Richness (5)</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.richness_5 ?? "â€”"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>
                  Organization / Creativity (6)
                </Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.organization_6 ?? "â€”"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>Technical Skills (3)</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.technical_3 ?? "â€”"}
                </Text>
              </View>

              <View style={styles.rubricTotalRow}>
                <Text style={[styles.rubricLabel, { fontSize: 16 }]}>
                  Total (14)
                </Text>
                <Text style={styles.rubricTotalValue}>
                  {scoreData.rubric?.total_14 ?? "â€”"}
                </Text>
              </View>
            </View>
          )}

          {/* ==================== FAIRNESS SECTION ====================
          {scoreData && (
            <View style={styles.fairnessCard}>
              <Text style={styles.rubricTitle}>
                {t("essay.fairnessMetrics")}
              </Text>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>SPD</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.fairness_report?.spd ?? "â€”"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>DIR</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.fairness_report?.dir ?? "â€”"}
                </Text>
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>EOD</Text>
                <Text style={styles.rubricValue}>
                  {scoreData.fairness_report?.eod ?? "â€”"}
                </Text>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.fairnessNote}>
                  {t("essay.mitigation")}:
                  <Text style={{ color: "#60A5FA" }}>
                    {scoreData.fairness_report?.mitigation_used ?? "â€”"}
                  </Text>
                </Text>
              </View>
            </View>
          )} */}

          {/* PERSONALIZED FEEDBACK SECTION - DYNAMIC API RESPONSE */}
          {scoreData && (
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Text style={styles.rubricTitle}>
                  {t("essay.personalizedFeedback")}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.feedbackRefreshButton,
                    textFeedbackLoading && { opacity: 0.6 },
                  ]}
                  onPress={handleFetchTextFeedback}
                  disabled={textFeedbackLoading}
                >
                  {textFeedbackLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="refresh" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {textFeedbackLoading && (
                <View style={styles.feedbackStatusBox}>
                  <ActivityIndicator color="#3B82F6" />
                  <Text style={styles.feedbackStatusText}>
                    Generating feedback...
                  </Text>
                </View>
              )}

              {textFeedbackError && (
                <View style={styles.feedbackErrorBox}>
                  <MaterialIcons
                    name="error-outline"
                    size={20}
                    color="#EF4444"
                  />
                  <Text style={styles.feedbackErrorText}>
                    {textFeedbackError}
                  </Text>
                </View>
              )}

              {textFeedback ? (
                <View style={styles.feedbackContent}>
                  {/* Main Feedback */}
                  <View style={styles.feedbackMainBox}>
                    <MaterialIcons
                      name="lightbulb"
                      size={20}
                      color="#F59E0B"
                      style={styles.feedbackIcon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.feedbackLabel}>General Feedback</Text>
                      <Text style={styles.feedbackText}>
                        {textFeedback.feedback}
                      </Text>
                    </View>
                  </View>

                  {/* Suggestions */}
                  {textFeedback.suggestions &&
                    textFeedback.suggestions.length > 0 && (
                      <View style={styles.suggestionsBox}>
                        <Text style={styles.suggestionsTitle}>
                          Suggestions for Improvement:
                        </Text>
                        {textFeedback.suggestions.map((suggestion, idx) => (
                          <View key={idx} style={styles.suggestionItem}>
                            <Text style={styles.suggestionBullet}>â€¢</Text>
                            <Text style={styles.suggestionText}>
                              {suggestion}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                  {/* Text Metrics */}
                  {textFeedback.metrics && (
                    <View style={styles.metricsBox}>
                      <Text style={styles.metricsTitle}>
                        Text Metrics Analysis
                      </Text>
                      <View style={styles.metricsGrid}>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>Words</Text>
                          <Text style={styles.metricValue}>
                            {Math.round(textFeedback.metrics.word_count)}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>Sentences</Text>
                          <Text style={styles.metricValue}>
                            {Math.round(textFeedback.metrics.sentence_count)}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            Avg Words/Sentence
                          </Text>
                          <Text style={styles.metricValue}>
                            {textFeedback.metrics.avg_sentence_length.toFixed(
                              1
                            )}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>Characters</Text>
                          <Text style={styles.metricValue}>
                            {Math.round(textFeedback.metrics.char_length)}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            Repetition Ratio
                          </Text>
                          <Text style={styles.metricValue}>
                            {(
                              textFeedback.metrics.repetition_ratio * 100
                            ).toFixed(1)}
                            %
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            Duplicate Words
                          </Text>
                          <Text style={styles.metricValue}>
                            {Math.round(
                              textFeedback.metrics.duplicate_word_count
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.feedbackPlaceholder}>
                  Click refresh to generate AI-powered feedback
                </Text>
              )}
            </View>
          )}

          {/* AUDIO FEEDBACK SECTION */}
          {textFeedback && (
            <View style={styles.audioFeedbackCard}>
              <View style={styles.audioFeedbackHeader}>
                <MaterialIcons name="volume-up" size={20} color="#10B981" />
                <Text style={styles.audioFeedbackTitle}>
                  Sinhala Audio Feedback
                </Text>
                <TouchableOpacity
                  style={[
                    styles.generateAudioButton,
                    audioFeedbackLoading && { opacity: 0.6 },
                  ]}
                  onPress={handleGenerateAudioFeedback}
                  disabled={audioFeedbackLoading}
                >
                  {audioFeedbackLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="music-note" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {audioFeedbackLoading && (
                <View style={styles.audioLoadingBox}>
                  <ActivityIndicator color="#10B981" />
                  <Text style={styles.audioLoadingText}>
                    Generating audio feedback...
                  </Text>
                </View>
              )}

              {audioFeedbackError && (
                <View style={styles.audioErrorBox}>
                  <MaterialIcons
                    name="error-outline"
                    size={16}
                    color="#EF4444"
                  />
                  <Text style={styles.audioErrorText}>
                    {audioFeedbackError}
                  </Text>
                </View>
              )}

              {audioFeedback &&
                (audioFeedback.audio_url || audioFeedback.audio_base64) && (
                  <View style={styles.audioPlayerBox}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={async () => {
                        try {
                          if (isAudioPlaying) {
                            // Pause audio
                            if (audioPlayerRef.current) {
                              await audioPlayerRef.current.pauseAsync();
                              setIsAudioPlaying(false);
                              console.log("â¸ï¸ Audio paused");
                            }
                          } else {
                            // Play audio
                            if (!audioPlayerRef.current) {
                              // First time loading - create new Sound object
                              const sound = new Audio.Sound();
                              const source = audioFeedback.audio_url
                                ? { uri: audioFeedback.audio_url }
                                : { uri: audioFeedback.audio_base64 };

                              await sound.loadAsync(source);
                              audioPlayerRef.current = sound;
                              console.log(
                                audioFeedback.audio_url
                                  ? "ðŸŽµ Playing audio from URL"
                                  : "ðŸŽµ Playing audio from base64"
                              );
                            }

                            if (audioPlayerRef.current) {
                              // Check if already playing
                              const status =
                                await audioPlayerRef.current.getStatusAsync();
                              if (status.isLoaded) {
                                if (status.isPlaying) {
                                  // Already playing, do nothing
                                  return;
                                } else {
                                  // Resume from pause
                                  await audioPlayerRef.current.playAsync();
                                }
                              }
                            }

                            setIsAudioPlaying(true);
                          }
                        } catch (error) {
                          console.error("âŒ Audio playback error:", error);
                          setAudioFeedbackError("Failed to play audio");
                          showToast("Failed to play audio", { type: "error" });
                        }
                      }}
                    >
                      <MaterialIcons
                        name={isAudioPlaying ? "pause" : "play-arrow"}
                        size={24}
                        color="#fff"
                      />
                    </TouchableOpacity>
                    <View style={styles.audioInfoBox}>
                      <Text style={styles.audioPlayingText}>
                        {isAudioPlaying ? "Playing" : "Ready to play"}
                      </Text>
                      {audioFeedback.duration && (
                        <Text style={styles.audioDurationText}>
                          Duration: {audioFeedback.duration}s
                        </Text>
                      )}
                    </View>
                  </View>
                )}

              {!audioFeedback &&
                !audioFeedbackLoading &&
                !audioFeedbackError && (
                  <Text style={styles.audioPlaceholder}>
                    Click the button to generate Sinhala audio from feedback
                  </Text>
                )}
            </View>
          )}
        </View>

        {/* MINDMAP SECTION */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{t("mindmap.title")}</Text>
          {mindmapLoading && (
            <View style={styles.mindmapStatusBox}>
              <ActivityIndicator color="#007AFF" />
              <Text style={styles.loadingText}>{t("mindmap.loading")}</Text>
            </View>
          )}
          {mindmapError && (
            <View style={styles.mindmapStatusBox}>
              <MaterialIcons name="error-outline" size={32} color="#FF3B30" />
              <Text style={styles.errorTitle}>{t("mindmap.error")}</Text>
              <Text style={styles.errorTextSmall}>{mindmapError}</Text>
              <TouchableOpacity
                style={styles.reloadMindmapButton}
                onPress={() => {
                  if (!imageData?.id) return;
                  setMindmapLoading(true);
                  setMindmapError(null);
                  fetchMindmap(imageData.id)
                    .then(setMindmapData)
                    .catch((e) =>
                      setMindmapError(e.message || t("mindmap.failed"))
                    )
                    .finally(() => setMindmapLoading(false));
                }}
              >
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.reloadMindmapText}>
                  {t("common.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {mindmapData && !mindmapLoading && !mindmapError && (
            <View style={styles.mindmapContainer}>
              <MindmapView data={mindmapData} />
              <Text style={styles.mindmapMeta}>
                {t("mindmap.nodes")}: {mindmapData.metadata.total_nodes}
                {t("mindmap.edges")}: {mindmapData.metadata.total_edges}
              </Text>
              <Text style={styles.mindmapHint}>{t("mindmap.hint")}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="download" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>{t("essay.download")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.shareButton]}>
            <MaterialIcons name="share" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>{t("essay.share")}</Text>
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
                <Text style={styles.actionButtonText}>
                  {t("common.delete")}
                </Text>
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
    padding: 16,
  },
  content: { padding: 12 },

  imageContainer: {
    backgroundColor: "#23262F",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  image: { width: "100%", height: 300, borderRadius: 8 },
  imageFallback: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    backgroundColor: "#1f2128",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imageFallbackText: {
    color: "#9CA3AF",
    fontSize: 13,
  },

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
    padding: 28,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  scoreBox: {
    backgroundColor: "#111827",
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2563eb",
    marginBottom: 24,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  scoreMain: {
    fontSize: 36,
    fontWeight: "900",
    color: "#3B82F6",
    marginBottom: 12,
  },

  scoreDetail: {
    color: "#E5E7EB",
    marginBottom: 6,
    fontSize: 16,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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

  backButtonTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
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

  feedbackCard: {
    backgroundColor: "#1f2128",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
    marginBottom: 20,
  },

  feedbackItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  feedbackIcon: {
    marginRight: 12,
    marginTop: 2,
  },

  feedbackText: {
    color: "#E5E7EB",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  feedbackRefreshButton: {
    backgroundColor: "#3B82F6",
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  feedbackStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#111827",
    borderRadius: 8,
    marginBottom: 12,
  },

  feedbackStatusText: {
    color: "#3B82F6",
    fontSize: 13,
  },

  feedbackErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    marginBottom: 12,
  },

  feedbackErrorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },

  feedbackContent: {
    gap: 12,
  },

  feedbackMainBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },

  feedbackLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 4,
  },

  suggestionsBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },

  suggestionsTitle: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },

  suggestionItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },

  suggestionBullet: {
    color: "#10B981",
    fontSize: 16,
    marginRight: 8,
    fontWeight: "bold",
  },

  suggestionText: {
    color: "#D1D5DB",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  feedbackPlaceholder: {
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },

  apiScoreBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
    marginBottom: 12,
    alignItems: "center",
  },

  apiScoreLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 4,
  },

  apiScoreValue: {
    color: "#3B82F6",
    fontSize: 24,
    fontWeight: "bold",
  },

  metricsBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#8B5CF6",
    marginTop: 12,
  },

  metricsTitle: {
    color: "#8B5CF6",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  metricItem: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#1f2128",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
  },

  metricLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 4,
  },

  metricValue: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Audio Feedback Styles
  audioFeedbackCard: {
    backgroundColor: "#1f2128",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
    marginBottom: 20,
  },

  audioFeedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  audioFeedbackTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 8,
  },

  generateAudioButton: {
    backgroundColor: "#10B981",
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  audioLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#111827",
    borderRadius: 8,
    marginBottom: 12,
  },

  audioLoadingText: {
    color: "#10B981",
    fontSize: 13,
  },

  audioErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    marginBottom: 12,
  },

  audioErrorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },

  audioPlayerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },

  playButton: {
    backgroundColor: "#10B981",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  audioInfoBox: {
    flex: 1,
  },

  audioPlayingText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },

  audioDurationText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },

  audioPlaceholder: {
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },

  debugRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#2C2F36",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4B5563",
  },

  debugLabel: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
});