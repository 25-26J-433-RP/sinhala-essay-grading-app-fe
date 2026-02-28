import AppHeader from "@/components/AppHeader";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

import { UserImageService, UserImageUpload } from "@/services/userImageService";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

// Resolve Firebase Storage download URLs when a gs:// path or storagePath is provided
import { storage } from "@/config/firebase";
import { getDownloadURL, ref as storageRef } from "firebase/storage";

import { generateAudioFeedback } from "@/app/api/audioFeedback";
import { predictBinary, predictPatterns } from "@/app/api/dyslexia";
import { fetchMindmap, generateMindmap, MindmapData } from "@/app/api/mindmap";
import { scoreSinhala, SinhalaScoreResponse } from "@/app/api/scoreSinhala"; // âœ… FIXED IMPORT

import {
  fetchTextFeedback,
  TextFeedbackResponse
} from "@/app/api/textFeedback";

import {
  generateSimpleReport,
  SimpleReportData
} from "@/app/utils/simplePdfGenerator";
import AICorrectionPanel from "@/components/AICorrectionPanel";
import { MindmapView } from "@/components/MindmapView";
import {
  PatternTooltip,
  TooltipKey,
  useTooltipState
} from "@/components/PatternTooltip";
import { generateShareLink } from "@/services/shareService";
import { Audio } from "expo-av";

const PATTERN_COLORS: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  Phonetic: { border: "#F59E0B", bg: "#78350F", text: "#FDE68A" },
  Spelling: { border: "#EF4444", bg: "#7F1D1D", text: "#FCA5A5" },
  Visual: { border: "#8B5CF6", bg: "#4C1D95", text: "#DDD6FE" },
  Grammar: { border: "#3B82F6", bg: "#1E3A5F", text: "#BFDBFE" }
};
// ðŸ”¥ Prevent Firestore from rejecting undefined/null fields
function cleanFirestore(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => (value === undefined ? null : value))
  );
}

function isSafeUrl(url: string, allowMailto = false) {
  if (!url) return false;
  const normalized = url.trim();
  if (/^https?:\/\//i.test(normalized)) return true;
  if (allowMailto && /^mailto:/i.test(normalized)) return true;
  return false;
}

export default function ImageDetailScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const isCompactLayout = viewportWidth <= 480;

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
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPatternDetails, setShowPatternDetails] = useState(false);
  const [showFairnessReport, setShowFairnessReport] = useState(true);
  const { activeTooltip, setActiveTooltip } = useTooltipState();
  const [dyslexiaLabel, setDyslexiaLabel] = useState<string | undefined>(
    undefined
  );

  const [selectedGrade, setSelectedGrade] = useState<number>(6);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreData, setScoreData] = useState<SinhalaScoreResponse | null>(null);
  const [patternData, setPatternData] = useState<any>(null);
  const [mindmapData, setMindmapData] = useState<MindmapData | null>(null);
  const [mindmapLoading, setMindmapLoading] = useState(false);
  const [mindmapError, setMindmapError] = useState<string | null>(null);

  const { imageId, imageData: imageDataParam } = useLocalSearchParams<{
    imageId?: string;
    imageData?: string;
  }>();

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
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1.0);
  const audioPlayerRef = useRef<Audio.Sound | null>(null);

  // const [isSaving, setIsSaving] = useState(false); // not used currently
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [correctionHighlight, setCorrectionHighlight] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const scoringCardRef = useRef<View>(null);

  const { showToast } = useToast();
  const confirm = useConfirm();
  const { t } = useLanguage();
  const topicLabel = t("essay.topic").replace(/\s*\(.*?\)\s*/g, "").trim();
  // const DEBUG = __DEV__ === true; // not used currently

  // Monitor scoreData changes
  useEffect(() => {
    console.log("📊 scoreData updated:", {
      exists: !!scoreData,
      score: scoreData?.score,
      timestamp: new Date().toISOString()
    });
  }, [scoreData]);

  const handlePasteTopic = async () => {
    const pastedText = await Clipboard.getStringAsync();
    if (pastedText) {
      setEssayTopic(pastedText);
    }
  };

  const handlePasteEssay = async () => {
    const pastedText = await Clipboard.getStringAsync();
    if (pastedText) {
      setInputText(pastedText);
    }
  };

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
    if (imageData?.studentGrade) {
      const g = String(imageData.studentGrade);
      const numericGrade = parseInt(g.replace(/[^0-9]/g, ""));
      if (!isNaN(numericGrade)) {
        setSelectedGrade(numericGrade);
      }
    }
  }, [imageData?.studentGrade]);

  // useEffect(() => {
  //   if (!imageData?.id) return;

  //   console.log("📝 Setting inputText from Firestore:", imageData.essay_text);

  //   setInputText(imageData.essay_text ?? "");
  // }, [imageData?.id]);

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
    if (!imageId) return;

    (async () => {
      setLoading(true);
      const freshImage = await UserImageService.getUserImage(imageId);
      setImageData(freshImage);
      if (freshImage.writing_patterns) {
        setPatternData(freshImage.writing_patterns);
      }
      if (freshImage.text_feedback) {
        setTextFeedback(freshImage.text_feedback);
      }
      setEssayTopic(freshImage.essay_topic || "");
      setLoading(false);
    })();
  }, [imageId]);

  // ─── Run dyslexia detection when OCR text arrives ───
  const dyslexiaDetectedRef = useRef(false);

  useEffect(() => {
    if (
      !inputText ||
      inputText.trim().length < 10 ||
      dyslexiaDetectedRef.current
    )
      return;

    dyslexiaDetectedRef.current = true;

    (async () => {
      try {
        setIsDetecting(true);

        const result = await predictBinary(inputText.trim());

        const detectedDyslexic = result.essay_label === "DYSLEXIC ESSAY";

        setIsDyslexic(detectedDyslexic);
        setDyslexiaLabel(result.essay_label);

        console.log(
          "🧠 Early dyslexia detection:",
          result.essay_label,
          "confidence:",
          result.confidence
        );
      } catch (err) {
        console.warn("Early dyslexia detection failed:", err);
      } finally {
        setIsDetecting(false);
      }
    })();
  }, [inputText]);

  const handleDeleteImage = async () => {
    const ok = await confirm({
      title: t("essay.deleteEssay"),
      message: t("essay.deleteConfirm"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel")
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
          fairness_report: freshImage.fairness_report || {}
        });
      }

      if (freshImage.text_feedback) {
        setTextFeedback(freshImage.text_feedback);
      }

      if (freshImage.audio_feedback) {
        setAudioFeedback(freshImage.audio_feedback);
      }
      if (freshImage.writing_patterns) {
        setPatternData(freshImage.writing_patterns);
      }

      // 🔥 THIS WAS MISSING
      if (freshImage.essay_text && (!inputText || inputText.trim() === "")) {
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
        type: "error"
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

  const handleDownloadPDF = async () => {
    console.log("🔴 Download button clicked!");
    console.log("📊 imageData from Firebase:", {
      studentId: imageData?.studentId,
      score: imageData?.score,
      hasRubric: !!imageData?.rubric,
      hasFairnessReport: !!imageData?.fairness_report,
      hasWritingPatterns: !!imageData?.writing_patterns,
      hasTextFeedback: !!imageData?.text_feedback
    });
    console.log(
      "📊 Current textFeedback state:",
      JSON.stringify(textFeedback, null, 2)
    );
    console.log(
      "📊 imageData text_feedback:",
      JSON.stringify(imageData?.text_feedback, null, 2)
    );

    try {
      console.log("📊 Creating report with Firebase data...");

      // Always refresh data from Firebase to ensure we have latest text_feedback
      let freshData = imageData;
      if (imageData?.id) {
        console.log("🔄 Refreshing from Firebase to fetch text_feedback...");
        const refreshed = await UserImageService.getUserImage(imageData.id);
        freshData = refreshed;
        console.log(
          "✅ Fresh data from Firebase:",
          JSON.stringify(
            {
              studentId: refreshed.studentId,
              hasScore: !!refreshed.score,
              hasRubric: !!refreshed.rubric,
              hasWritingPatterns: !!refreshed.writing_patterns,
              hasTextFeedback: !!refreshed.text_feedback,
              textFeedbackContent: refreshed.text_feedback
            },
            null,
            2
          )
        );

        if (refreshed.text_feedback) {
          setTextFeedback(refreshed.text_feedback);
          console.log(
            "✅ Text feedback fetched from Firebase:",
            JSON.stringify(refreshed.text_feedback, null, 2)
          );
        } else {
          console.log("❌ No text_feedback in refreshed data");
        }
      }

      const reportData: SimpleReportData = {
        studentId: freshData?.studentId,
        studentGrade: selectedGrade,
        essayTopic: freshData?.essay_topic || essayTopic || "Not specified",
        essayImageUri: imageUrlResolved || undefined,
        score: freshData?.score,
        scoreDetails: freshData?.scoreDetails || freshData?.details,
        rubric: freshData?.rubric
          ? {
              richness_5: freshData.rubric.richness_5 ?? undefined,
              organization_6: freshData.rubric.organization_6 ?? undefined,
              technical_3: freshData.rubric.technical_3 ?? undefined,
              total_14: freshData.rubric.total_14 ?? undefined
            }
          : undefined,
        fairnessReport: freshData?.fairness_report,
        patternData: freshData?.writing_patterns || patternData,
        textFeedback: freshData?.text_feedback || textFeedback || undefined,
        timestamp: new Date().toLocaleString()
      };

      console.log(
        "📋 Complete report data from Firebase:",
        JSON.stringify(reportData, null, 2)
      );
      console.log(
        "📋 textFeedback in report:",
        JSON.stringify(reportData.textFeedback, null, 2)
      );
      console.log(
        "📋 textFeedback.feedback content:",
        reportData.textFeedback?.feedback
      );
      setIsDownloadingPDF(true);

      await generateSimpleReport(reportData);

      console.log("✅ Report generated successfully");
      showToast("Report downloaded! Check your files.", { type: "success" });
    } catch (error: any) {
      console.error("❌ Download failed:", error?.message);
      showToast(`Error: ${error?.message || "Failed to generate report"}`, {
        type: "error"
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      console.log("🔗 Share button clicked!");

      if (!imageData?.id) {
        showToast("Essay ID not found", { type: "error" });
        return;
      }

      // Generate a unique share link
      console.log("📤 Generating share link for essay:", imageData.id);
      const shareId = await generateShareLink(imageData.id);
      console.log("✅ Share ID generated:", shareId);

      // Create the shareable URL
      // For web, use current origin; for native, use your app's domain
      let shareUrl = "";
      if (Platform.OS === "web") {
        shareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://your-app-domain.com"}/shared/${shareId}`;
      } else {
        shareUrl = `https://your-app-domain.com/shared/${shareId}`;
      }

      console.log("🔗 Share URL:", shareUrl);

      // Copy to clipboard
      await Clipboard.setStringAsync(shareUrl);
      console.log("📋 Link copied to clipboard");

      // Show native share dialog if available (especially for mobile)
      if (Platform.OS !== "web") {
        // On native, open mail with the share URL
        const subject = encodeURIComponent(
          t("essay.shareSubject") || "Essay Feedback"
        );
        const body = encodeURIComponent(
          `Check out this essay feedback:\n\n${shareUrl}`
        );
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

        try {
          if (isSafeUrl(mailtoLink, true)) {
            await Linking.openURL(mailtoLink);
          } else {
            throw new Error("Blocked unsafe URL scheme");
          }
        } catch (err) {
          console.log("Mail app not available, link is in clipboard");
        }
      } else {
        // On web, try to use native share or show copy confirmation
        try {
          const navigator = (global as any).navigator;
          if (navigator && navigator.share) {
            await navigator.share({
              title: t("essay.shareTitle") || "Essay Feedback",
              text: t("essay.shareMessage") || "Check out this essay feedback",
              url: shareUrl
            });
          }
        } catch (err: any) {
          // User cancelled or share not available
          console.log("Native share not available, using clipboard instead");
        }
      }

      showToast("Share link created! Link copied to clipboard.", {
        type: "success"
      });
    } catch (error: any) {
      console.error("❌ Share failed:", error?.message);
      showToast(`Error: ${error?.message || "Failed to create share link"}`, {
        type: "error"
      });
    } finally {
      setIsSharing(false);
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

  const getBarWidth = (value: number | undefined, max: number) =>
    `${Math.max(0, Math.min(100, ((Number(value) || 0) / max) * 100))}%`;

  const renderFairnessComparisonRow = ({
    keyId,
    label,
    original,
    adjusted,
    max
  }: {
    keyId: string;
    label: string;
    original: number | undefined;
    adjusted: number | undefined;
    max: number;
  }) => {
    const delta = (Number(adjusted) || 0) - (Number(original) || 0);

    return (
      <React.Fragment key={keyId}>
        <View
          style={[styles.tableRow, isCompactLayout && styles.tableRowMobile]}
        >
          <Text
            style={[
              styles.tableLabel,
              { flex: 2 },
              isCompactLayout && styles.tableLabelMobile
            ]}
          >
            {label}
          </Text>
          <Text style={[styles.tableValue, { flex: 1.2 }]}>
            {isCompactLayout ? "Before: " : ""}
            {original?.toFixed(2)}
          </Text>
          <Text style={[styles.tableValueAdjusted, { flex: 1.2 }]}>
            {isCompactLayout ? "After: " : ""}
            {adjusted?.toFixed(2)}
          </Text>
          <Text style={[styles.tableDelta, { flex: 1 }]}>+{delta.toFixed(2)}</Text>
        </View>
        <View style={styles.rowBarWrap}>
          <View
            style={[styles.rowBarBefore, { width: getBarWidth(original, max) }]}
          />
          <View
            style={[styles.rowBarAfter, { width: getBarWidth(adjusted, max) }]}
          />
        </View>
      </React.Fragment>
    );
  };

  const renderPenaltyCheckBlock = (
    label: string,
    issues: string[] | undefined,
    keyPrefix: string
  ) => {
    const safeIssues = Array.isArray(issues) ? issues : [];
    const hasIssues = safeIssues.length > 0;

    return (
      <View style={styles.penaltyCheckBlock} key={keyPrefix}>
        <Text style={styles.penaltyCheckLabel}>{label}</Text>
        {hasIssues ? (
          <View style={styles.issueBox}>
            <View style={styles.issueStatusBadge}>
              <MaterialIcons name="error-outline" size={14} color="#F59E0B" />
              <Text style={styles.issueStatusText}>Needs attention</Text>
            </View>
            <View style={styles.issueListContainer}>
              {safeIssues.map((item, idx) => (
                <View key={`${keyPrefix}-${idx}`} style={styles.issueItemRow}>
                  <View style={styles.issueBullet} />
                  <Text style={styles.issueListText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.goodStatusBadge}>
            <MaterialIcons name="check-circle" size={14} color="#10B981" />
            <Text style={styles.goodStatusText}>No issues found</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} ref={scrollViewRef}>
      <View>
        <AppHeader showBackButton title={t("screenTitles.imageDetail")} />
      </View>

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
                src={isSafeUrl(imageUrlResolved) ? imageUrlResolved : ""}
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 8,
                  objectFit: "contain"
                }}
                onError={(e) => {
                  console.error("Web img failed to load", {
                    resolvedUrl: imageUrlResolved,
                    errorEvent: e
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
                    storagePath: imageData?.storagePath
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
                    storagePath: imageData?.storagePath
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

        {/* AI CORRECTION PANEL - After OCR, Before Scoring */}
        {inputText && inputText.trim().length > 0 && (
          <AICorrectionPanel
            originalText={inputText}
            onCorrectedText={(correctedText) => {
              setInputText(correctedText);
              showToast("Corrected text applied to scoring field ✓", {
                type: "success"
              });
              // Highlight the scoring field briefly & scroll to it
              setCorrectionHighlight(true);
              setTimeout(() => setCorrectionHighlight(false), 2000);
              setTimeout(() => {
                scoringCardRef.current?.measureLayout?.(
                  scrollViewRef.current as any,
                  (_x: number, y: number) => {
                    scrollViewRef.current?.scrollTo({
                      y: y - 20,
                      animated: true
                    });
                  },
                  () => {}
                );
              }, 300);
            }}
            onAnalysisComplete={(result) => {
              console.log("🧠 AI Correction analysis complete:", result);
            }}
            autoAnalyze={false}
            initialCollapsed={dyslexiaLabel !== "DYSLEXIC ESSAY"}
            dyslexiaLabel={dyslexiaLabel}
            studentId={imageData?.studentId}
            imageId={imageId}
            teacherId={imageData?.userId}
          />
        )}

        {/* SCORING INPUT CARD */}
        <View
          ref={scoringCardRef}
          style={[
            styles.inputCard,
            correctionHighlight && {
              borderColor: "#10B981",
              borderWidth: 2,
              shadowColor: "#10B981",
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
              {t("essay.enterSinhalaEssay")}
            </Text>
            <View style={styles.headerBadges}>
              {selectedGrade && (
                <View style={styles.gradeBadge}>
                  <MaterialIcons name="school" size={14} color="#3B82F6" />
                  <Text style={styles.badgeLabel}>{t("student.grade")}</Text>
                  <Text style={styles.gradeBadgeText}>{selectedGrade}</Text>
                </View>
              )}
              {imageData?.studentId && (
                <View style={styles.idBadge}>
                  <MaterialIcons name="person" size={14} color="#10B981" />
                  <Text style={styles.badgeLabel}>Student</Text>
                  <Text style={styles.idBadgeText}>{imageData.studentId}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Topic */}
          <Text style={styles.detailLabel}>{topicLabel}</Text>
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
          {/* <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>
              Simulate Dyslexic Student (Debug)
            </Text>
            <Switch
              value={isDyslexic}
              onValueChange={setIsDyslexic}
              trackColor={{ false: "#374151", true: "#6D28D9" }}
              thumbColor={isDyslexic ? "#fff" : "#9CA3AF"}
            />
          </View> */}

          {isDetecting && (
            <Text style={{ color: "#9CA3AF", marginBottom: 8 }}>
              🧠 Detecting dyslexic patterns...
            </Text>
          )}

          {/* Score Button */}
          <TouchableOpacity
            style={[styles.scoreButton, isScoring && { opacity: 0.6 }]}
            disabled={isScoring}
            activeOpacity={0.92}
            onPress={async () => {
              if (!inputText.trim()) {
                Alert.alert(t("essay.validation"), t("essay.pleaseEnterEssay"));
                return;
              }

              setIsScoring(true);

              try {
                const trimmedEssay = inputText.trim();
                const trimmedTopic = essayTopic.trim();

                // ─── DYSLEXIC STATUS PRESERVATION ───
                // If the student was ALREADY detected as dyslexic from the original
                // (uncorrected) text, we KEEP that flag. The dyslexic status is a
                // STUDENT attribute — correcting their essay text does not change
                // whether they are dyslexic. Re-running detection on corrected text
                // would falsely flip the flag to false.
                let detectedDyslexic = isDyslexic;
                let currentLabel = dyslexiaLabel;

                if (!isDyslexic) {
                  // Only run binary detection if NOT already flagged as dyslexic
                  // (e.g., fresh essay with no prior detection)
                  setIsDetecting(true);
                  const binaryResult = await predictBinary(trimmedEssay);
                  setIsDetecting(false);

                  detectedDyslexic = binaryResult.essay_label === "DYSLEXIC ESSAY";
                  currentLabel = binaryResult.essay_label;

                  setIsDyslexic(detectedDyslexic);
                  setDyslexiaLabel(currentLabel);

                  // Save binary result
                  await UserImageService.updateImageDyslexiaResult(imageData.id, {
                    ...binaryResult,
                    model_version: "v2"
                  });
                } else {
                  console.log("🛡️ Dyslexic status preserved from initial detection — skipping re-analysis on corrected text");
                }

                // STEP 2: ONLY if dyslexic → run patterns
                if (detectedDyslexic) {
                  const patternResult = await predictPatterns(trimmedEssay);

                  const normalizedPatterns = {
                    dominant_pattern: patternResult.dominant,
                    risk_level: patternResult.risk_level,
                    severity: patternResult.severity,
                    explanation: patternResult.explanation,
                    pattern_distribution: patternResult.distribution,
                    risk_score: patternResult.risk_score,
                    pattern_density: patternResult.pattern_density,
                    pattern_sentence_count:
                      patternResult.pattern_sentence_count,
                    pattern_sentence_examples:
                      patternResult.pattern_sentence_examples,
                    total_sentences: patternResult.total_sentences
                  };

                  await UserImageService.updateImagePatterns(
                    imageData.id,
                    normalizedPatterns
                  );
                }
                // STEP 3: Extract dyslexic sentence-level error tags
                // const errorTags = dyslexiaResult.sentences
                //   .filter((s) => s.label === "DYSLEXIC")
                //   .map((s) => ({
                //     text: s.text,
                //     probability: s.probability
                //   }));

                // STEP 4: Now call scoring engine with REAL dyslexic flag
                // Fix: Extract number from string like "Grade 4" if necessary
                const gradeStr = String(imageData.studentGrade || "6");
                const numericGrade =
                  parseInt(gradeStr.replace(/[^0-9]/g, "")) || 6;

                const result = await scoreSinhala({
                  text: trimmedEssay,
                  grade: numericGrade,
                  topic: trimmedTopic || undefined,
                  // ML-based dyslexia detection result
                  dyslexic_flag: detectedDyslexic,
                  // Structured error_tags temporarily disabled
                  // Backend scoring service currently expects flat input.
                  // Sentence-level dyslexia tags are stored in Firestore but not yet consumed by scorer.
                  error_tags: []
                });

                // UI update
                setScoreData(result);
                showToast(t("essay.scoreCalculated"), { type: "success" });

                // Persist scoring results to Firestore
                // Cleaned to prevent undefined values from breaking Firestore writes
                const firestoreScorePayload = cleanFirestore({
                  score: result.score,

                  details: {
                    // grade: result.details.grade,
                    // topic: result.details.topic ?? null,
                    dyslexic_flag: result.details.dyslexic_flag,
                    error_tags: result.details.error_tags ?? []
                    // model: result.details.model,
                  },

                  rubric: {
                    richness_5: result.rubric.richness_5,
                    organization_6: result.rubric.organization_6,
                    technical_3: result.rubric.technical_3,
                    total_14: result.rubric.total_14
                  },

                  // Firestore-safe (can be null)
                  fairness_report: result.fairness_report ?? null,

                  essay_text: trimmedEssay,
                  essay_topic: trimmedTopic || null,

                  scored_at: new Date().toISOString()
                });

                await UserImageService.updateImageScore(
                  imageData.id,
                  firestoreScorePayload
                );

                showToast(t("essay.scoreSaved"), { type: "success" });

                // ✅ REFRESH DATA FROM FIRESTORE - This ensures everything is in sync
                await refreshImageData();

                // End "Score Essay" loading as soon as scoring + save are complete.
                // Mindmap/text feedback are optional follow-up tasks and should not block this button.
                setIsScoring(false);

                // ✅ GENERATE MINDMAP
                try {
                  console.log("🧠 Generating mindmap for essay:", imageData.id);
                  await generateMindmap(imageData.id, inputText);
                  console.log("✅ Mindmap generation triggered");

                  // Fetch the generated mindmap
                  setMindmapLoading(true);
                  setMindmapError(null);
                  const mindmap = await fetchMindmap(imageData.id);
                  setMindmapData(mindmap);
                  setMindmapLoading(false);
                  showToast(t("essay.mindmapGenerated"), { type: "success" });
                } catch (mindmapErr: any) {
                  console.error("❌ Mindmap generation failed:", mindmapErr);
                  setMindmapError(
                    mindmapErr?.message || t("mindmap.generationFailed")
                  );
                  setMindmapLoading(false);
                  // Don't block the main flow - mindmap is optional
                }

                // ✅ FETCH TEXT FEEDBACK
                try {
                  console.log(
                    "📝 Fetching text feedback for essay:",
                    imageData.id
                  );
                  const feedback = await fetchTextFeedback(
                    imageData.id,
                    inputText
                  );
                  setTextFeedback(feedback);
                  console.log("✅ Text feedback received:", feedback);
                  showToast("Text feedback generated!", { type: "success" });
                  // Refresh to get the saved feedback from Firestore
                  await refreshImageData();
                } catch (feedbackErr: any) {
                  console.error(
                    "❌ Text feedback generation failed:",
                    feedbackErr
                  );
                  setTextFeedbackError(
                    feedbackErr?.message || "Failed to generate text feedback"
                  );
                  // Don't block the main flow - text feedback is optional
                }
              } catch (err: any) {
                console.log(
                  "🔥 FIREBASE ERROR (full):",
                  JSON.stringify(err, null, 2)
                );
                console.log("🔥 FIREBASE ERROR MESSAGE:", err?.message);
                console.log("🔥 FIREBASE ERROR CODE:", err?.code);

                if (
                  err?.message?.includes("Missing or insufficient permissions")
                ) {
                  showToast("❌ Firestore rules blocked the write", {
                    type: "error"
                  });
                }

                showToast(t("essay.failedToScore"), { type: "error" });
              } finally {
                setIsScoring(false);
              }
            }}
          >
            <View style={styles.scoreButtonGradient}>
              {isScoring ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.scoreButtonIconWrap}>
                    <MaterialIcons
                      name="analytics"
                      size={16}
                      color="#DBEAFE"
                    />
                  </View>
                  <Text style={styles.scoreButtonText}>
                    {t("essay.scoreEssay")}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* SCORE DISPLAY */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{t("essay.essayDetails")}</Text>

          {scoreData && (
            <View style={styles.scoreBox}>
              <Text style={styles.scoreMain}>
                {t("essay.score")}:{" "}
                {typeof scoreData.score === "number"
                  ? scoreData.score.toFixed(2)
                  : scoreData.score}
              </Text>

              {/* <Text style={styles.scoreDetail}>
                Model: {scoreData.details.model}
              </Text> */}

              <View style={styles.scoreMetaRow}>
                {scoreData.details.dyslexic_flag && (
                  <View style={styles.scoreMetaChip}>
                    <MaterialIcons name="verified" size={13} color="#22D3EE" />
                    <Text style={styles.scoreMetaText}>Fairness On</Text>
                  </View>
                )}
              </View>

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
                <Text style={styles.rubricLabel}>
                  {t("essay.richness")} (5)
                </Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.richness_5 ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricBarTrack}>
                <View
                  style={[
                    styles.rubricBarFill,
                    {
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          ((Number(scoreData.rubric?.richness_5) || 0) / 5) * 100
                        )
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>
                  {t("essay.organization")} (6)
                </Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.organization_6 ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricBarTrack}>
                <View
                  style={[
                    styles.rubricBarFill,
                    {
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          ((Number(scoreData.rubric?.organization_6) || 0) / 6) * 100
                        )
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.rubricRow}>
                <Text style={styles.rubricLabel}>
                  {t("essay.technicalSkills")} (3)
                </Text>
                <Text style={styles.rubricValue}>
                  {scoreData.rubric?.technical_3 ?? "—"}
                </Text>
              </View>

              <View style={styles.rubricBarTrack}>
                <View
                  style={[
                    styles.rubricBarFill,
                    {
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          ((Number(scoreData.rubric?.technical_3) || 0) / 3) * 100
                        )
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.rubricTotalRow}>
                <Text style={[styles.rubricLabel, { fontSize: 16 }]}>
                  {t("essay.total")} (14)
                </Text>
                <Text style={styles.rubricTotalValue}>
                  {scoreData.rubric?.total_14 ?? "—"}
                </Text>
              </View>
            </View>
          )}

          {/* ==================== FAIRNESS SECTION ==================== */}
          {scoreData?.fairness_report && (
            <View style={styles.fairnessCard}>
              <TouchableOpacity
                style={styles.fairnessToggleHeader}
                onPress={() => setShowFairnessReport(!showFairnessReport)}
              >
                <MaterialIcons
                  name={showFairnessReport ? "expand-less" : "expand-more"}
                  size={24}
                  color="#10B981"
                />
                <Text style={styles.fairnessToggleText}>
                  {scoreData.details.dyslexic_flag
                    ? showFairnessReport
                      ? t("essay.hideFairnessReport")
                      : t("essay.showFairnessReport")
                    : showFairnessReport
                      ? t("essay.hideRubricDetails")
                      : t("essay.showRubricDetails")}
                </Text>
              </TouchableOpacity>

              {showFairnessReport && (
                <View style={styles.fairnessContent}>
                  {scoreData.details.dyslexic_flag && (
                    <>
                        <View
                          style={[
                            styles.fairnessSummaryGrid,
                            isCompactLayout && styles.fairnessSummaryGridCompact
                          ]}
                        >
                        <View
                          style={[
                            styles.fairnessSummaryCard,
                            isCompactLayout && styles.fairnessSummaryCardCompact
                          ]}
                        >
                          <Text style={styles.fairnessSummaryLabel}>Before</Text>
                          <Text style={styles.fairnessSummaryValue}>
                            {(
                              (Number(
                                scoreData.fairness_report.original_richness_5
                              ) || 0) +
                              (Number(
                                scoreData.fairness_report.original_organization_6
                              ) || 0) +
                              (Number(
                                scoreData.fairness_report.original_technical_3
                              ) || 0)
                            ).toFixed(2)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.fairnessSummaryCard,
                            isCompactLayout && styles.fairnessSummaryCardCompact
                          ]}
                        >
                          <Text style={styles.fairnessSummaryLabel}>After</Text>
                          <Text style={styles.fairnessSummaryValue}>
                            {(
                              (Number(
                                scoreData.fairness_report.adjusted_richness_5
                              ) || 0) +
                              (Number(
                                scoreData.fairness_report.adjusted_organization_6
                              ) || 0) +
                              (Number(
                                scoreData.fairness_report.adjusted_technical_3
                              ) || 0)
                            ).toFixed(2)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.fairnessSummaryCard,
                            isCompactLayout && styles.fairnessSummaryCardCompact
                          ]}
                        >
                          <Text style={styles.fairnessSummaryLabel}>Added</Text>
                          <Text style={styles.fairnessSummaryValueBoost}>
                            +{Number(scoreData.fairness_report.total_boost || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.fairnessSectionTitle}>
                        {t("fairness.comparisonTitle")}
                      </Text>

                      {/* Comparison Table */}
                      <View style={styles.comparisonTable}>
                        {!isCompactLayout && (
                          <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                              {t("fairness.component")}
                            </Text>
                            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>
                              Before
                            </Text>
                            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>
                              After
                            </Text>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                              Added
                            </Text>
                          </View>
                        )}

                        {[
                          {
                            keyId: "richness",
                            label: t("essay.richness"),
                            original: scoreData.fairness_report.original_richness_5,
                            adjusted: scoreData.fairness_report.adjusted_richness_5,
                            max: 5
                          },
                          {
                            keyId: "organization",
                            label: t("essay.organization"),
                            original:
                              scoreData.fairness_report.original_organization_6,
                            adjusted:
                              scoreData.fairness_report.adjusted_organization_6,
                            max: 6
                          },
                          {
                            keyId: "technical",
                            label: t("essay.technicalSkills"),
                            original: scoreData.fairness_report.original_technical_3,
                            adjusted: scoreData.fairness_report.adjusted_technical_3,
                            max: 3
                          }
                        ].map(renderFairnessComparisonRow)}
                      </View>
                    </>
                  )}

                  {/* Rubric Notes Sub-section */}
                  <View style={styles.rubricNotesContainerSection}>
                    <Text style={styles.rubricNotesTitle}>
                      Rubric Notes & Penalties
                    </Text>

                    <View
                      style={[
                        styles.notesGrid,
                        isCompactLayout && styles.notesGridCompact
                      ]}
                    >
                      <View
                        style={[
                          styles.noteGridItem,
                          styles.noteGridItemScore,
                          isCompactLayout && styles.noteGridItemCompact
                        ]}
                      >
                        <View style={styles.noteGridHeaderRow}>
                          <Text style={styles.noteGridLabel}>
                            {t("fairness.themeRelevance")}
                          </Text>
                          <Text style={[styles.noteTypePill, styles.noteTypePillScore]}>
                            Score
                          </Text>
                        </View>
                        <Text style={styles.noteGridValue}>
                          {scoreData.fairness_report.rubric_notes?.theme_relevance?.toFixed(
                            2
                          )}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.noteGridItem,
                          styles.noteGridItemPenalty,
                          isCompactLayout && styles.noteGridItemCompact
                        ]}
                      >
                        <View style={styles.noteGridHeaderRow}>
                          <Text style={styles.noteGridLabel}>
                            {t("fairness.themePenalty")}
                          </Text>
                          <Text style={[styles.noteTypePill, styles.noteTypePillPenalty]}>
                            Penalty
                          </Text>
                        </View>
                        <Text style={[styles.noteGridValue, styles.noteGridValuePenalty]}>
                          {scoreData.fairness_report.rubric_notes?.theme_penalty?.toFixed(
                            2
                          )}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.noteGridItem,
                          styles.noteGridItemInfo,
                          isCompactLayout && styles.noteGridItemCompact
                        ]}
                      >
                        <View style={styles.noteGridHeaderRow}>
                          <Text style={styles.noteGridLabel}>
                            {t("fairness.wordCount")}
                          </Text>
                          <Text style={[styles.noteTypePill, styles.noteTypePillInfo]}>
                            Count
                          </Text>
                        </View>
                        <Text style={styles.noteGridValue}>
                          {scoreData.fairness_report.rubric_notes?.word_count}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.noteGridItem,
                          styles.noteGridItemPenalty,
                          isCompactLayout && styles.noteGridItemCompact
                        ]}
                      >
                        <View style={styles.noteGridHeaderRow}>
                          <Text style={styles.noteGridLabel}>
                            {t("fairness.wordCountPenalty")}
                          </Text>
                          <Text style={[styles.noteTypePill, styles.noteTypePillPenalty]}>
                            Penalty
                          </Text>
                        </View>
                        <Text style={[styles.noteGridValue, styles.noteGridValuePenalty]}>
                          {scoreData.fairness_report.rubric_notes?.word_count_penalty?.toFixed(
                            2
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.longNoteItem, styles.noteGridItemPenalty]}>
                      <View style={styles.noteGridHeaderRow}>
                        <Text style={styles.noteGridLabel}>
                          Technical Penalty
                        </Text>
                        <Text style={[styles.noteTypePill, styles.noteTypePillPenalty]}>
                          Penalty
                        </Text>
                      </View>
                      <Text style={[styles.noteGridValue, styles.noteGridValuePenalty]}>
                        {scoreData.fairness_report.rubric_notes?.technical_penalty?.toFixed(
                          2
                        )}
                      </Text>
                      <View style={styles.penaltyChecksGroup}>
                        {renderPenaltyCheckBlock(
                          "Punctuation Checks",
                          scoreData.fairness_report.rubric_notes
                            ?.technical_violations,
                          "technical-violations"
                        )}
                        {renderPenaltyCheckBlock(
                          "Grammar Check",
                          scoreData.fairness_report.rubric_notes?.grammar_issues,
                          "grammar-issues"
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
          {/* ==================== Pattern SECTION ==================== */}

          {patternData && (
            <View style={styles.patternCard}>
              {/* ── HEADER ROW ── */}
              <View style={styles.patternHeaderRow}>
                <View style={styles.patternHeaderLeft}>
                  <Text style={styles.patternTitle}>
                    {t("imageDetail.patternTitle")}
                  </Text>
                  <View
                    style={[
                      styles.patternRiskBadge,
                      {
                        backgroundColor: patternData.risk_level?.includes(
                          "High"
                        )
                          ? "#7F1D1D"
                          : patternData.risk_level?.includes("Moderate")
                            ? "#78350F"
                            : "#064E3B",
                        borderColor: patternData.risk_level?.includes("High")
                          ? "#EF4444"
                          : patternData.risk_level?.includes("Moderate")
                            ? "#F59E0B"
                            : "#10B981"
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.patternRiskBadgeText,
                        {
                          color: patternData.risk_level?.includes("High")
                            ? "#FCA5A5"
                            : patternData.risk_level?.includes("Moderate")
                              ? "#FDE68A"
                              : "#D1FAE5"
                        }
                      ]}
                    >
                      {patternData.severity || patternData.risk_level || "—"}
                    </Text>
                  </View>
                </View>
                <PatternTooltip
                  id="risk_score"
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                >
                  <View style={styles.patternRiskScoreBox}>
                    <Text style={styles.patternRiskScoreLabel}>Risk ⓘ</Text>
                    <Text
                      style={[
                        styles.patternRiskScoreValue,
                        {
                          color:
                            (patternData.risk_score ?? 0) >= 70
                              ? "#EF4444"
                              : (patternData.risk_score ?? 0) >= 40
                                ? "#F59E0B"
                                : "#10B981"
                        }
                      ]}
                    >
                      {patternData.risk_score !== undefined
                        ? `${patternData.risk_score.toFixed(0)}%`
                        : "—"}
                    </Text>
                  </View>
                </PatternTooltip>
              </View>

              {/* ── PATTERN DISTRIBUTION PILLS ── */}
              {patternData.pattern_distribution && (
                <View style={styles.patternPillRow}>
                  {Object.entries(patternData.pattern_distribution)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([key, value]: any) => {
                      const colors = PATTERN_COLORS[key] || {
                        border: "#6B7280",
                        bg: "#1F2937",
                        text: "#9CA3AF"
                      };
                      const isDominant =
                        patternData.dominant_pattern?.startsWith(key);
                      return (
                        <PatternTooltip
                          key={key}
                          id={key as TooltipKey}
                          activeTooltip={activeTooltip}
                          setActiveTooltip={setActiveTooltip}
                        >
                          <View
                            key={key}
                            style={[
                              styles.patternPill,
                              {
                                borderColor: colors.border,
                                backgroundColor: colors.bg,
                                opacity: 1
                              },
                              isDominant && styles.patternPillDominant
                            ]}
                          >
                            {isDominant && (
                              <View
                                style={[
                                  styles.patternPillDot,
                                  { backgroundColor: colors.border }
                                ]}
                              />
                            )}
                            <Text
                              style={[
                                styles.patternPillLabel,
                                { color: colors.text }
                              ]}
                            >
                              {key}
                            </Text>
                            <Text
                              style={[
                                styles.patternPillValue,
                                { color: colors.border }
                              ]}
                            >
                              {(value * 100).toFixed(0)}%
                            </Text>
                            {isDominant && (
                              <Text
                                style={[
                                  styles.patternPillDominantTag,
                                  { color: colors.border }
                                ]}
                              >
                                DOM
                              </Text>
                            )}
                          </View>
                        </PatternTooltip>
                      );
                    })}
                </View>
              )}

              {/* ── DISTRIBUTION BARS (visual) ── */}
              {patternData.pattern_distribution && (
                <View style={styles.patternBarsBox}>
                  {Object.entries(patternData.pattern_distribution)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([key, value]: any) => {
                      const colors = PATTERN_COLORS[key] || {
                        border: "#6B7280",
                        bg: "#1F2937",
                        text: "#9CA3AF"
                      };
                      const count =
                        patternData.pattern_sentence_count?.[key] ?? 0;
                      return (
                        <View key={key} style={styles.patternBarRow}>
                          <Text
                            style={[
                              styles.patternBarLabel,
                              { color: colors.text }
                            ]}
                          >
                            {key}
                          </Text>
                          <View style={styles.patternBarTrack}>
                            <View
                              style={[
                                styles.patternBarFill,
                                {
                                  width: `${(value as number) * 100}%` as any,
                                  backgroundColor: colors.border
                                }
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.patternBarCount,
                              { color: colors.text }
                            ]}
                          >
                            {count}s
                          </Text>
                        </View>
                      );
                    })}
                </View>
              )}

              {/* ── EXPLANATION ── */}
              <View style={styles.patternExplanationBox}>
                <MaterialIcons
                  name="info-outline"
                  size={14}
                  color="#9CA3AF"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.patternExplanation}>
                  {patternData.explanation}
                </Text>
              </View>

              {/* ── TOGGLE: DETAILED ANALYSIS ── */}
              <TouchableOpacity
                style={styles.patternToggleButton}
                onPress={() => setShowPatternDetails((prev) => !prev)}
              >
                <MaterialIcons
                  name={showPatternDetails ? "expand-less" : "expand-more"}
                  size={20}
                  color="#F59E0B"
                />
                <Text style={styles.patternToggleText}>
                  {showPatternDetails
                    ? t("imageDetail.hideDetailedAnalysis")
                    : t("imageDetail.viewDetailedAnalysis")}
                </Text>
              </TouchableOpacity>

              {/* ── EXPANDED: SENTENCE EXAMPLES PER PATTERN ── */}
              {showPatternDetails && (
                <View style={styles.patternAdvancedBox}>
                  {/* Pattern Density (from your Firebase data) */}
                  {patternData.pattern_density && (
                    <View style={styles.patternDensitySection}>
                      <Text style={styles.patternSectionTitle}>
                        {t("imageDetail.patternDensity")}
                      </Text>
                      <View style={styles.patternDensityGrid}>
                        {Object.entries(patternData.pattern_density).map(
                          ([key, value]: any) => {
                            const colors = PATTERN_COLORS[key] || {
                              border: "#6B7280",
                              bg: "#1F2937",
                              text: "#9CA3AF"
                            };
                            return (
                              <View
                                key={key}
                                style={[
                                  styles.patternDensityItem,
                                  { borderColor: colors.border }
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.patternDensityKey,
                                    { color: colors.text }
                                  ]}
                                >
                                  {key}
                                </Text>
                                <Text
                                  style={[
                                    styles.patternDensityVal,
                                    { color: colors.border }
                                  ]}
                                >
                                  {value.toFixed(1)}%
                                </Text>
                              </View>
                            );
                          }
                        )}
                      </View>
                    </View>
                  )}

                  {/* Sentence Examples per Pattern Type */}
                  {patternData.pattern_sentence_examples && (
                    <View style={styles.patternExamplesSection}>
                      <Text style={styles.patternSectionTitle}>
                        {t("imageDetail.patternExampleSentences")}
                      </Text>
                      {Object.entries(
                        patternData.pattern_sentence_examples
                      ).map(([type, arr]: any) => {
                        if (!arr || arr.length === 0) return null;
                        const colors = PATTERN_COLORS[type] || {
                          border: "#6B7280",
                          bg: "#1F2937",
                          text: "#9CA3AF"
                        };
                        const count =
                          patternData.pattern_sentence_count?.[type] ??
                          arr.length;
                        return (
                          <View
                            key={type}
                            style={[
                              styles.patternExampleGroup,
                              { borderLeftColor: colors.border }
                            ]}
                          >
                            <View style={styles.patternExampleGroupHeader}>
                              <View
                                style={[
                                  styles.patternExampleDot,
                                  { backgroundColor: colors.border }
                                ]}
                              />
                              <Text
                                style={[
                                  styles.patternExampleTitle,
                                  { color: colors.border }
                                ]}
                              >
                                {type}
                              </Text>
                              <View
                                style={[
                                  styles.patternExampleCountBadge,
                                  { backgroundColor: colors.bg }
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.patternExampleCountText,
                                    { color: colors.text }
                                  ]}
                                >
                                  {count} sentence{count !== 1 ? "s" : ""}
                                </Text>
                              </View>
                            </View>
                            {arr.map((sentence: string, i: number) => (
                              <View
                                key={i}
                                style={styles.patternExampleSentenceRow}
                              >
                                <Text
                                  style={[
                                    styles.patternExampleBullet,
                                    { color: colors.border }
                                  ]}
                                >
                                  ›
                                </Text>
                                <Text style={styles.patternExampleText}>
                                  {sentence}
                                </Text>
                              </View>
                            ))}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

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
                    textFeedbackLoading && { opacity: 0.6 }
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
                  <ActivityIndicator color="#007AFF" />
                  <Text style={styles.feedbackStatusText}>
                    {t("essay.generatingFeedback")}
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
                      <Text style={styles.feedbackLabel}>
                        {t("essay.generalFeedback")}
                      </Text>
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
                          {t("essay.suggestionsForImprovement")}
                        </Text>
                        {textFeedback.suggestions.map((suggestion, idx) => (
                          <View key={idx} style={styles.suggestionItem}>
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
                        {t("essay.textMetricsAnalysis")}
                      </Text>
                      <View style={styles.metricsGrid}>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            {t("essay.words")}
                          </Text>
                          <Text style={styles.metricValue}>
                            {Math.round(textFeedback.metrics.word_count)}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            {t("essay.sentences")}
                          </Text>
                          <Text style={styles.metricValue}>
                            {Math.round(textFeedback.metrics.sentence_count)}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            {t("essay.avgWordsSentence")}
                          </Text>
                          <Text style={styles.metricValue}>
                            {textFeedback.metrics.avg_sentence_length.toFixed(
                              1
                            )}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            {t("essay.characters")}
                          </Text>
                          <Text style={styles.metricValue}>
                            {Math.round(textFeedback.metrics.char_length)}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            {t("essay.repetitionRatio")}
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
                            {t("essay.duplicateWords")}
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
                  {t("essay.clickRefreshFeedback")}
                </Text>
              )}
            </View>
          )}

          {/* AUDIO FEEDBACK SECTION */}
          {textFeedback && (
            <View style={styles.audioFeedbackCard}>
              <View style={styles.audioFeedbackHeader}>
                <View style={styles.audioFeedbackTitleContainer}>
                  <MaterialIcons
                    name="volume-up"
                    size={22}
                    color="#10B981"
                    style={styles.audioHeaderIcon}
                  />
                  <Text style={styles.audioFeedbackTitle}>
                    {t("essay.sinhalaAudioFeedback")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.generateAudioButton,
                    audioFeedbackLoading && { opacity: 0.6 }
                  ]}
                  onPress={handleGenerateAudioFeedback}
                  disabled={audioFeedbackLoading}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.generateAudioGradient}
                  >
                    {audioFeedbackLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="music-note"
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.generateAudioButtonText}>
                          {t("essay.generateAudio")}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {audioFeedbackLoading && (
                <View style={styles.audioLoadingBox}>
                  <ActivityIndicator color="#10B981" />
                  <Text style={styles.audioLoadingText}>
                    {t("essay.audioGenerating")}
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
                              await sound.setRateAsync(audioPlaybackRate, true);
                              audioPlayerRef.current = sound;
                              console.log(
                                audioFeedback.audio_url
                                  ? "ðŸŽµ Playing audio from URL"
                                  : "ðŸŽµ Playing audio from base64"
                              );
                            } else {
                              await audioPlayerRef.current.setRateAsync(
                                audioPlaybackRate,
                                true
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
                        {isAudioPlaying
                          ? t("essay.audioPlayingNow")
                          : t("essay.audioReadyToPlay")}
                      </Text>
                      <View style={styles.audioMetaRow}>
                        <View
                          style={[
                            styles.audioStatusBadge,
                            isAudioPlaying && styles.audioStatusBadgeActive
                          ]}
                        >
                          <Text
                            style={[
                              styles.audioStatusText,
                              isAudioPlaying && styles.audioStatusTextActive
                            ]}
                          >
                            {isAudioPlaying
                              ? t("essay.audioLive")
                              : t("essay.audioReady")}
                          </Text>
                        </View>
                        {audioFeedback.duration && (
                          <View style={styles.audioDurationBadge}>
                            <Text style={styles.audioDurationText}>
                              {t("essay.audioDuration", {
                                duration: audioFeedback.duration
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 8,
                          flexWrap: "wrap"
                        }}
                      >
                        <Text style={{ color: "#fff", marginRight: 8 }}>
                          Speed:
                        </Text>
                        <TouchableOpacity
                          style={{
                            backgroundColor:
                              audioPlaybackRate === 0.75
                                ? "#10B981"
                                : "#23262F",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginRight: 4,
                            marginBottom: 4
                          }}
                          onPress={async () => {
                            setAudioPlaybackRate(0.75);
                            if (audioPlayerRef.current) {
                              await audioPlayerRef.current.setRateAsync(
                                0.75,
                                true
                              );
                            }
                          }}
                        >
                          <Text style={{ color: "#fff" }}>0.75x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            backgroundColor:
                              audioPlaybackRate === 1.0 ? "#10B981" : "#23262F",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginRight: 4,
                            marginBottom: 4
                          }}
                          onPress={async () => {
                            setAudioPlaybackRate(1.0);
                            if (audioPlayerRef.current) {
                              await audioPlayerRef.current.setRateAsync(
                                1.0,
                                true
                              );
                            }
                          }}
                        >
                          <Text style={{ color: "#fff" }}>1x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            backgroundColor:
                              audioPlaybackRate === 1.25
                                ? "#10B981"
                                : "#23262F",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginRight: 4,
                            marginBottom: 4
                          }}
                          onPress={async () => {
                            setAudioPlaybackRate(1.25);
                            if (audioPlayerRef.current) {
                              await audioPlayerRef.current.setRateAsync(
                                1.25,
                                true
                              );
                            }
                          }}
                        >
                          <Text style={{ color: "#fff" }}>1.25x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            backgroundColor:
                              audioPlaybackRate === 1.5 ? "#10B981" : "#23262F",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            marginBottom: 4
                          }}
                          onPress={async () => {
                            setAudioPlaybackRate(1.5);
                            if (audioPlayerRef.current) {
                              await audioPlayerRef.current.setRateAsync(
                                1.5,
                                true
                              );
                            }
                          }}
                        >
                          <Text style={{ color: "#fff" }}>1.5x</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

              {!audioFeedback &&
                !audioFeedbackLoading &&
                !audioFeedbackError && (
                  <Text style={styles.audioPlaceholder}>
                    {t("essay.clickToGenerateAudio")}
                  </Text>
                )}
            </View>
          )}
        </View>

        {/* MINDMAP SECTION - ENHANCED WITH AI INTELLIGENCE */}
        <View style={styles.mindmapCard}>
          <View style={styles.mindmapHeaderRow}>
            <View style={styles.mindmapHeaderLeft}>
              <Text style={styles.mindmapTitle}>{t("mindmap.title")}</Text>
              {mindmapData?.metadata?.intelligence_level && (
                <View style={styles.intelligenceBadge}>
                  <MaterialIcons
                    name="psychology"
                    size={12}
                    color="#10B981"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.intelligenceBadgeText}>
                    {mindmapData.metadata.intelligence_level.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.mindmapRefreshButton,
                mindmapLoading && { opacity: 0.6 }
              ]}
              onPress={() => {
                if (!imageData?.id || !inputText.trim()) return;
                setMindmapLoading(true);
                setMindmapError(null);
                generateMindmap(imageData.id, inputText)
                  .then(() => fetchMindmap(imageData.id))
                  .then(setMindmapData)
                  .catch((e) =>
                    setMindmapError(e.message || t("mindmap.failed"))
                  )
                  .finally(() => setMindmapLoading(false));
              }}
              disabled={mindmapLoading}
            >
              {mindmapLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="refresh" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {mindmapLoading && (
            <View style={styles.mindmapStatusBox}>
              <ActivityIndicator color="#4ECDC4" size="large" />
              <Text style={styles.mindmapLoadingText}>
                {t("mindmap.loading")}
              </Text>
              <Text style={styles.mindmapLoadingSubtext}>
                Analyzing essay structure with AI...
              </Text>
            </View>
          )}

          {mindmapError && (
            <View style={styles.mindmapErrorBox}>
              {/* Hide error message - only show retry button */}
              <TouchableOpacity
                style={styles.mindmapRetryButton}
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
                <Text style={styles.mindmapRetryText}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {mindmapData && !mindmapLoading && !mindmapError && (
            <>
              {/* AI Metadata Pills */}
              <View style={styles.mindmapMetaPillsRow}>
                {mindmapData.metadata.entities_found !== undefined && (
                  <View style={styles.mindmapMetaPill}>
                    <MaterialIcons name="lightbulb" size={14} color="#FFD93D" />
                    <Text style={styles.mindmapMetaPillLabel}>Entities</Text>
                    <Text style={styles.mindmapMetaPillValue}>
                      {mindmapData.metadata.entities_found}
                    </Text>
                  </View>
                )}
                {mindmapData.metadata.relationships_found !== undefined && (
                  <View style={styles.mindmapMetaPill}>
                    <MaterialIcons name="hub" size={14} color="#6C5CE7" />
                    <Text style={styles.mindmapMetaPillLabel}>Relations</Text>
                    <Text style={styles.mindmapMetaPillValue}>
                      {mindmapData.metadata.relationships_found}
                    </Text>
                  </View>
                )}
                {mindmapData.metadata.clusters !== undefined && (
                  <View style={styles.mindmapMetaPill}>
                    <MaterialIcons
                      name="bubble-chart"
                      size={14}
                      color="#00B894"
                    />
                    <Text style={styles.mindmapMetaPillLabel}>Clusters</Text>
                    <Text style={styles.mindmapMetaPillValue}>
                      {mindmapData.metadata.clusters}
                    </Text>
                  </View>
                )}
              </View>

              {/* Mindmap Visualization */}
              <View style={styles.mindmapVisualizationBox}>
                <MindmapView data={mindmapData} />
              </View>

              {/* Enhanced Info Box */}
              <View style={styles.mindmapInfoBox}>
                <MaterialIcons
                  name="info-outline"
                  size={14}
                  color="#6C5CE7"
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mindmapInfoText}>
                    {t("mindmap.hint")}
                  </Text>
                  {mindmapData.metadata.text_length && (
                    <Text style={styles.mindmapInfoSubtext}>
                      Analyzed {mindmapData.metadata.text_length} characters
                      with AI-powered semantic extraction
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Proper Nice Button Arrangement */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.primaryActionButton,
              isDownloadingPDF && { opacity: 0.6 }
            ]}
            onPress={() => {
              console.log("🔴 Download button touched!");
              handleDownloadPDF();
            }}
            disabled={isDownloadingPDF}
          >
            {isDownloadingPDF ? (
              <ActivityIndicator size="large" color="#0F1117" />
            ) : (
              <>
                <MaterialIcons name="download" size={24} color="#0F1117" />
                <Text style={styles.actionButtonTextPrimary}>
                  {t("essay.download")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="share" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {t("essay.share")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionButton, styles.deleteActionButton]}
              onPress={handleDeleteImage}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="delete-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {t("common.delete")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  content: {
    padding: Platform.OS === "web" ? 24 : 16,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 1320 : 9999,
    alignSelf: "center"
  },

  imageContainer: {
    backgroundColor: "#1C1E26",
    padding: 12,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2D313E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },

  image: { width: "100%", height: 320, borderRadius: 16 },
  imageFallback: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    backgroundColor: "#16181F",
    borderWidth: 1,
    borderColor: "#2D313E",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  imageFallbackText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500"
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: 0.5
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 8
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  gradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.10)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
    gap: 6
  },
  badgeLabel: {
    color: "#91A9CF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  gradeBadgeText: {
    color: "#7DB8FF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.10)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.28)",
    gap: 6
  },
  idBadgeText: {
    color: "#4ADEB1",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3
  },

  inputCard: {
    backgroundColor: "#1A2233",
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2A3750"
  },

  textInput: {
    backgroundColor: "#0B1220",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 18,
    borderColor: "#24344D",
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24 // Better for Sinhala
  },

  detailLabel: {
    color: "#B2C1DA",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3
  },

  scoreButton: {
    padding: 0, // Handled by gradient
    borderRadius: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "rgba(91, 139, 255, 0.45)",
    shadowColor: "#2E5BDE",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    overflow: "hidden"
  },

  scoreButtonGradient: {
    backgroundColor: "#2E5BDE",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12
  },
  scoreButtonIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(219, 234, 254, 0.30)"
  },

  scoreButtonText: {
    color: "#F8FAFF",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.4
  },

  detailsCard: {
    backgroundColor: "#1C1E26",
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2D313E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8
  },

  scoreBox: {
    backgroundColor: "#0F1117",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#007AFF",
    marginBottom: 24,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    alignItems: "center"
  },

  scoreMain: {
    fontSize: 42,
    fontWeight: "900",
    color: "#007AFF",
    marginBottom: 8,
    textAlign: "center"
  },

  scoreDetail: {
    color: "#9CA3AF",
    marginBottom: 4,
    fontSize: 15,
    fontWeight: "500"
  },
  scoreMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  scoreMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2A3A54",
    backgroundColor: "#111B2D"
  },
  scoreMetaText: {
    color: "#B8C9E6",
    fontSize: 12,
    fontWeight: "700"
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#22252F",
    padding: 16,
    borderRadius: 12
  },

  detailContent: { marginLeft: 12, flex: 1 },

  detailValue: { color: "#fff", fontSize: 16, fontWeight: "600" },

  actionContainer: {
    gap: 12,
    marginBottom: 60,
    marginTop: 20
  },

  actionGrid: {
    flexDirection: "row",
    gap: 12
  },

  flexRowItem: {
    flex: 1
  },

  primaryActionButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 64
  },

  secondaryActionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flex: 1,
    minHeight: 58,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },

  deleteActionButton: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.2
  },

  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3
  },

  actionButtonTextPrimary: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500"
  },

  errorTitle: {
    color: "#FF3B30",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10
  },

  backButtonTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  backButtonTopText: { color: "#007AFF", marginLeft: 8 },
  backButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: { color: "#fff", fontWeight: "bold" },
  // Mindmap styles
  errorTextSmall: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12
  },
  reloadMindmapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "center"
  },
  reloadMindmapText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },
  mindmapContainer: {
    height: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden"
  },
  mindmapMeta: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center"
  },
  mindmapHint: {
    color: "#666",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4
  },
  rubricCard: {
    backgroundColor: "#16181F",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2D313E",
    marginBottom: 24
  },

  rubricTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: 0.5
  },

  rubricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Fix alignment for Sinhala
    marginBottom: 8,
    paddingVertical: 2
  },
  rubricBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#222F46",
    marginBottom: 14,
    overflow: "hidden"
  },
  rubricBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#3B82F6"
  },

  rubricLabel: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 8
  },

  rubricValue: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "800"
  },

  rubricTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#2D313E"
  },

  rubricTotalValue: {
    color: "#10B981",
    fontSize: 22,
    fontWeight: "900"
  },

  fairnessCard: {
    backgroundColor: "#16181F",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#10B981", // Teal border for fairness
    marginBottom: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4
  },
  fairnessToggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  fairnessToggleText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700"
  },
  fairnessContent: {
    marginTop: 20
  },
  fairnessSectionTitle: {
    color: "#10B981",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20
  },
  fairnessSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12
  },
  fairnessSummaryGridCompact: {
    flexDirection: "row",
    flexWrap: "nowrap"
  },
  fairnessSummaryCardCompact: {
    flex: 1,
    width: "auto",
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  fairnessSummaryCard: {
    flex: 1,
    backgroundColor: "#0F1117",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D313E",
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  fairnessSummaryLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4
  },
  fairnessSummaryValue: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "800"
  },
  fairnessSummaryValueBoost: {
    color: "#10B981",
    fontSize: 18,
    fontWeight: "900"
  },
  fairnessSimpleHint: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 14
  },
  comparisonTable: {
    backgroundColor: "#0F1117",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D313E",
    overflow: "hidden",
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1C1E26",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2D313E"
  },
  tableHeaderText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "700"
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2D313E",
    alignItems: "center"
  },
  tableRowMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    borderBottomWidth: 0,
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 0,
    borderRadius: 10,
    backgroundColor: "#141A26",
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  tableLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  tableLabelMobile: {
    marginBottom: 2
  },
  tableValue: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "600"
  },
  tableValueAdjusted: {
    color: "#00BAFF", // Highlight adjusted values
    fontSize: 17,
    fontWeight: "900"
  },
  tableDelta: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "900"
  },
  rowBarWrap: {
    marginTop: 6,
    marginBottom: 10,
    marginHorizontal: 16
  },
  rowBarBefore: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#64748B",
    marginBottom: 4
  },
  rowBarAfter: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#00BAFF"
  },
  rubricNotesContainerSection: {
    backgroundColor: "#0F1117",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  rubricNotesTitle: {
    color: "#67E8F9",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 16
  },
  rubricNotesHint: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 10
  },
  notesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8
  },
  notesGridCompact: {
    gap: 10
  },
  noteGridItem: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#1A2130",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D3950"
  },
  noteGridItemCompact: {
    minWidth: "100%"
  },
  noteGridItemScore: {
    borderColor: "#234A84",
    backgroundColor: "#16243B"
  },
  noteGridItemPenalty: {
    borderColor: "#35506F",
    backgroundColor: "#172437"
  },
  noteGridItemInfo: {
    borderColor: "#35506F",
    backgroundColor: "#182534"
  },
  noteGridHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4
  },
  noteTypePill: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1
  },
  noteTypePillScore: {
    color: "#93C5FD",
    borderColor: "rgba(59, 130, 246, 0.35)",
    backgroundColor: "rgba(59, 130, 246, 0.14)"
  },
  noteTypePillPenalty: {
    color: "#FCD34D",
    borderColor: "rgba(245, 158, 11, 0.45)",
    backgroundColor: "rgba(245, 158, 11, 0.16)"
  },
  noteTypePillInfo: {
    color: "#7DD3FC",
    borderColor: "rgba(14, 165, 233, 0.35)",
    backgroundColor: "rgba(14, 165, 233, 0.14)"
  },
  longNoteItem: {
    width: "100%",
    backgroundColor: "#1C1E26",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D313E",
    marginBottom: 12
  },
  noteGridLabel: {
    color: "#9FB3C8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    flexShrink: 1,
    paddingRight: 8
  },
  noteGridValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  noteGridValuePenalty: {
    color: "#FDE68A"
  },
  penaltyChecksGroup: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(96, 165, 250, 0.28)",
    gap: 12
  },
  penaltyCheckBlock: {
    gap: 8
  },
  penaltyCheckLabel: {
    color: "#B7D6FF",
    fontSize: 12,
    fontWeight: "700"
  },
  textListSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2D313E"
  },
  textListLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4
  },
  textListContent: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  issueBox: {
    gap: 10
  },
  issueStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  issueStatusText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "800"
  },
  issueListText: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  },
  issueListContainer: {
    gap: 8
  },
  issueItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  issueBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#F59E0B",
    marginTop: 7
  },
  goodStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  goodStatusText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "800"
  },

  fairnessNote: {
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 20
  },

  feedbackCard: {
    backgroundColor: "#16181F",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#10B981",
    marginBottom: 24
  },

  feedbackItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 4
  },

  feedbackIcon: {
    marginRight: 12,
    marginTop: 2
  },

  feedbackText: {
    color: "#E5E7EB",
    fontSize: 14,
    flex: 1,
    lineHeight: 20
  },

  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },

  feedbackRefreshButton: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center"
  },

  feedbackStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#111827",
    borderRadius: 8,
    marginBottom: 12
  },

  feedbackStatusText: {
    color: "#007AFF",
    fontSize: 13
  },

  feedbackErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    marginBottom: 12
  },

  feedbackErrorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1
  },

  feedbackContent: {
    gap: 12
  },

  feedbackMainBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B"
  },

  feedbackLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 4
  },

  suggestionsBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981"
  },

  suggestionsTitle: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10
  },

  suggestionItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start"
  },

  suggestionBullet: {
    color: "#10B981",
    fontSize: 16,
    marginRight: 8,
    fontWeight: "bold"
  },

  suggestionText: {
    color: "#D1D5DB",
    fontSize: 13,
    flex: 1,
    lineHeight: 18
  },

  feedbackPlaceholder: {
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12
  },

  apiScoreBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
    marginBottom: 12,
    alignItems: "center"
  },

  apiScoreLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 4
  },

  apiScoreValue: {
    color: "#007AFF",
    fontSize: 24,
    fontWeight: "bold"
  },

  metricsBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#8B5CF6",
    marginTop: 12
  },

  metricsTitle: {
    color: "#8B5CF6",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },

  metricItem: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#1f2128",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center"
  },

  metricLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 4
  },

  metricValue: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "bold"
  },

  // Audio Feedback Styles
  audioFeedbackCard: {
    backgroundColor: "#1f2128",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
    marginBottom: 20
  },

  audioFeedbackHeader: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
    gap: 12
  },

  audioFeedbackTitleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%"
  },

  audioHeaderIcon: {
    marginTop: 2,
    marginRight: 10
  },

  audioFeedbackTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    lineHeight: 28
  },

  generateAudioButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 160
  },

  generateAudioGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center"
  },

  generateAudioButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4
  },

  audioLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#111827",
    borderRadius: 8,
    marginBottom: 12
  },

  audioLoadingText: {
    color: "#10B981",
    fontSize: 13
  },

  audioErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    marginBottom: 12
  },

  audioErrorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1
  },

  audioPlayerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 8,

    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 12
  },

  playButton: {
    backgroundColor: "#10B981",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",

    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },

  audioInfoBox: {
    flex: 1
  },

  audioPlayingText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600"
  },
  audioMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap"
  },
  audioStatusBadge: {
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#0B1220"
  },
  audioStatusBadgeActive: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B"
  },
  audioStatusText: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6
  },
  audioStatusTextActive: {
    color: "#D1FAE5"
  },
  audioDurationBadge: {
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#111827"
  },

  audioDurationText: {
    color: "#9CA3AF",

    fontSize: 11
  },

  audioPlaceholder: {
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12
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
    borderColor: "#4B5563"
  },

  debugLabel: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600"
  },
  patternCard: {
    backgroundColor: "#16181F",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F59E0B",
    marginBottom: 24
  },
  patternHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  patternHeaderLeft: {
    flex: 1,
    gap: 8
  },
  patternTitle: {
    color: "#F59E0B",
    fontSize: 18,
    fontWeight: "800"
  },
  patternRiskBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  patternRiskBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4
  },
  patternRiskScoreBox: {
    alignItems: "center",
    backgroundColor: "#0F1117",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D313E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 60
  },
  patternRiskScoreLabel: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5
  },
  patternRiskScoreValue: {
    fontSize: 22,
    fontWeight: "900"
  },
  patternPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  patternPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999
  },
  patternPillDominant: {
    borderWidth: 1.5
  },
  patternPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  patternPillLabel: {
    fontSize: 12,
    fontWeight: "600"
  },
  patternPillValue: {
    fontSize: 13,
    fontWeight: "900"
  },
  patternPillDominantTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginLeft: 2
  },
  patternBarsBox: {
    gap: 10,
    marginBottom: 14
  },
  patternBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  patternBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    width: 64
  },
  patternBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#2D313E",
    borderRadius: 3,
    overflow: "hidden"
  },
  patternBarFill: {
    height: 6,
    borderRadius: 3
  },
  patternBarCount: {
    fontSize: 11,
    fontWeight: "600",
    width: 24,
    textAlign: "right"
  },
  patternExplanationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#0F1117",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D313E",
    marginBottom: 14
  },
  patternExplanation: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 20,
    flex: 1
  },
  patternToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  patternToggleText: {
    color: "#F59E0B",
    fontWeight: "600",
    fontSize: 14
  },
  patternAdvancedBox: {
    marginTop: 16,
    backgroundColor: "#0F1117",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D313E",
    gap: 16
  },
  patternSectionTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10
  },
  patternDensitySection: {
    gap: 4
  },
  patternDensityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  patternDensityItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#16181F",
    alignItems: "center",
    minWidth: 80
  },
  patternDensityKey: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2
  },
  patternDensityVal: {
    fontSize: 16,
    fontWeight: "900"
  },

  // ── ENHANCED MINDMAP STYLES ──
  mindmapCard: {
    backgroundColor: "#16181F",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#4ECDC4",
    marginBottom: 24
  },
  mindmapHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  mindmapHeaderLeft: {
    flex: 1,
    gap: 8
  },
  mindmapTitle: {
    color: "#4ECDC4",
    fontSize: 18,
    fontWeight: "800"
  },
  intelligenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#064E3B",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  intelligenceBadgeText: {
    color: "#D1FAE5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  mindmapRefreshButton: {
    backgroundColor: "#4ECDC4",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  mindmapStatusBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12
  },
  mindmapLoadingText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600"
  },
  mindmapLoadingSubtext: {
    color: "#6B7280",
    fontSize: 12,
    fontStyle: "italic"
  },
  mindmapErrorBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 10
  },
  mindmapErrorTitle: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700"
  },
  mindmapErrorText: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20
  },
  mindmapRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8
  },
  mindmapRetryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600"
  },
  mindmapMetaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16
  },
  mindmapMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0F1117",
    borderWidth: 1,
    borderColor: "#2D313E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  mindmapMetaPillLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600"
  },
  mindmapMetaPillValue: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "900"
  },
  mindmapVisualizationBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 400,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  mindmapInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#0F1117",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  mindmapInfoText: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4
  },
  mindmapInfoSubtext: {
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic"
  },

  patternExamplesSection: {
    gap: 10
  },
  patternExampleGroup: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    gap: 6
  },
  patternExampleGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  patternExampleDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  patternExampleTitle: {
    fontSize: 13,
    fontWeight: "700"
  },
  patternExampleCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  patternExampleCountText: {
    fontSize: 10,
    fontWeight: "600"
  },
  patternExampleSentenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6
  },
  patternExampleBullet: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20
  },
  patternExampleText: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 20,
    flex: 1
  }
});

