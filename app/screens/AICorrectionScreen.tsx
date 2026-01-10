/**
 * AI Correction Screen
 *
 * Sinhala dyslexia correction tool - Matches Akura AI reference UI design
 */

import aiCorrectionService, {
  EssayListItem,
  WordAnalysis,
} from "@/app/api/aiCorrection";
import { db } from "@/config/firebase";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

interface TokenData extends WordAnalysis {
  id: string;
  displayWord: string;
  originalWord: string;
  correctedWord?: string;
  state: "flagged" | "corrected" | "ignored";
  pattern?: string;
}

// Helper: Strip punctuation from word for comparison
function stripPunctuation(word: string): string {
  return word.replace(/[.,!?;:'"()[\]{}]/g, "");
}

// Helper: Generate unique ID
function generateId(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Tokenize text and merge with API results (matching reference frontend)
function tokenizeWithResults(
  text: string,
  apiErrors: WordAnalysis[]
): TokenData[] {
  // Split by whitespace while preserving them
  const words = text.split(/(\s+)/);
  const errorMap = new Map<string, WordAnalysis>();

  // Build error lookup - use stripped version as key
  apiErrors.forEach((err) => {
    const strippedWord = stripPunctuation(err.word);
    errorMap.set(strippedWord, err);
  });

  return words.map((word) => {
    // Skip whitespace tokens
    if (/^\s+$/.test(word)) {
      return {
        id: generateId(),
        type: "correct" as const,
        word: word,
        displayWord: word,
        originalWord: word,
        state: "ignored" as const,
      };
    }

    // Check if this word has an error (strip punctuation for comparison)
    const strippedWord = stripPunctuation(word);
    const error = errorMap.get(strippedWord);

    if (error) {
      errorMap.delete(strippedWord); // Use each error only once

      return {
        id: generateId(),
        type: "error" as const,
        word: word,
        originalWord: word,
        displayWord: word,
        correctedWord: error.suggestion || word,
        state: "flagged" as const,
        dyslexiaPattern: error.dyslexiaPattern,
        pattern: error.dyslexiaPattern,
        suggestion: error.suggestion,
        explanation: error.explanation,
        confidence: error.confidence || 0.85,
        source: error.source || "ai",
      };
    }

    // Normal word
    return {
      id: generateId(),
      type: "correct" as const,
      word: word,
      originalWord: word,
      displayWord: word,
      state: "ignored" as const,
    };
  });
}

const SAMPLE_TEXTS = [
  { title: "නියැදිය 1", text: "මම ගෙරද යනව" },
  { title: "නියැදිය 2", text: "මං පාලස යනව" },
];

export default function AICorrectionScreen() {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const isDesktop = width >= 1024;
  
  // Get ocrText from URL params (from image-detail navigation)
  const { ocrText } = useLocalSearchParams<{ ocrText?: string }>();

  // State
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [backendStatus, setBackendStatus] = useState<string>("checking");
  const [modelUsed, setModelUsed] = useState<string>("");
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Student Management
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [isSavingToStudent, setIsSavingToStudent] = useState(false);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [studentHistory, setStudentHistory] = useState<EssayListItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Stats
  const totalErrors = tokens.filter((t) => t.type === "error").length;
  const correctedCount = tokens.filter((t) => t.state === "corrected").length;
  const ignoredCount = tokens.filter((t) => t.state === "ignored").length;
  const pendingCount = tokens.filter((t) => t.state === "flagged").length;

  // Check backend health and load students on mount
  useEffect(() => {
    checkBackendHealth();
    loadStudents();
  }, []);

  // Pre-fill input text from ocrText param
  useEffect(() => {
    if (ocrText && typeof ocrText === 'string' && ocrText.trim()) {
      setInputText(ocrText);
      console.log("✅ Pre-filled input with OCR text from image-detail");
    }
  }, [ocrText]);

  // Load students from Firebase
  const loadStudents = async () => {
    try {
      if (!user?.uid || !db) return;
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const studentsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setStudents(studentsList);
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const checkBackendHealth = async () => {
    setBackendStatus("checking");
    try {
      const health = await aiCorrectionService.checkHealth();
      if (health.ollamaConnected) {
        setBackendStatus("online");
        setModelUsed(health.modelStatus);
      } else {
        setBackendStatus("offline");
      }
    } catch (error) {
      setBackendStatus("offline");
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      Alert.alert(t("common.error"), "Please enter text to analyze");
      return;
    }

    if (backendStatus === "offline") {
      Alert.alert(
        "Backend Offline",
        "The AI correction backend is not available. Please ensure it is running."
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisComplete(false);

    try {
      const response = await aiCorrectionService.analyzeText(inputText, false);

      if (response.success) {
        // Tokenize text properly matching reference frontend
        const newTokens = tokenizeWithResults(
          response.originalText || inputText,
          response.data.filter((d) => d.type === "error")
        );

        setTokens(newTokens);
        setProcessingTime(response.processingTimeMs || 0);
        setModelUsed(response.modelUsed || "Akura LLaMA 8B");
        setAnalysisComplete(true);
      } else {
        Alert.alert(t("common.error"), "Analysis failed");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : "Analysis failed"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTokenAction = (
    tokenId: string,
    action: "accept" | "reject" | "edit",
    newWord?: string
  ) => {
    setTokens((prev) =>
      prev.map((token) => {
        if (token.id !== tokenId) return token;

        if (action === "accept") {
          return {
            ...token,
            displayWord: token.correctedWord || token.suggestion || token.word,
            state: "corrected",
          };
        } else if (action === "reject") {
          return {
            ...token,
            displayWord: token.originalWord,
            state: "ignored",
          };
        } else if (action === "edit" && newWord) {
          return {
            ...token,
            displayWord: newWord,
            correctedWord: newWord,
            state: "corrected",
          };
        }

        return token;
      })
    );
  };

  // Handle editing any word (including normal words)
  const handleEditAnyWord = (tokenId: string, newWord: string) => {
    setTokens((prev) =>
      prev.map((token) => {
        if (token.id !== tokenId) return token;

        return {
          ...token,
          displayWord: newWord,
        };
      })
    );
  };

  const handleImageUpload = async () => {
    setIsUploadingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const ocrResult = await aiCorrectionService.extractTextFromImage(
          imageUri
        );

        if (ocrResult.success) {
          setInputText(ocrResult.text);
          Alert.alert(t("common.success"), `Text extracted successfully`);
        } else {
          Alert.alert(
            t("common.error"),
            ocrResult.error || "Failed to extract text"
          );
        }
      }
    } catch (error) {
      console.error("Image upload error:", error);
      Alert.alert(t("common.error"), "Failed to process image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCopyText = async () => {
    const finalText = tokens.map((t) => t.displayWord).join("");
    try {
      // For web, use clipboard API
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(finalText);
      } else {
        // For mobile, use expo-clipboard or react-native Clipboard
        const Clipboard = require("expo-clipboard");
        await Clipboard.setStringAsync(finalText);
      }
      Alert.alert(t("common.success"), "Corrected text copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      Alert.alert(t("common.error"), "Failed to copy text");
    }
  };

  const handleReset = () => {
    setInputText("");
    setTokens([]);
    setAnalysisComplete(false);
    setProcessingTime(0);
  };

  // Save corrected essay to student
  const handleSaveResultsLocally = async () => {
    if (!analysisComplete || tokens.length === 0) {
      Alert.alert("No Analysis", "Please analyze text first");
      return;
    }

    try {
      const originalText = inputText;
      const correctedText = tokens.map((t) => t.displayWord).join("");
      const errorsList = tokens
        .filter((t) => t.type === "error")
        .map((t) => ({
          original: t.originalWord,
          corrected: t.correctedWord || t.suggestion,
          pattern: t.pattern || t.dyslexiaPattern,
        }));

      const results = {
        timestamp: new Date().toISOString(),
        originalText,
        correctedText,
        totalErrors,
        correctedCount,
        ignoredCount,
        modelUsed,
        processingTime,
        errors: errorsList,
      };

      // For web, download as JSON
      if (Platform.OS === "web") {
        const blob = new Blob([JSON.stringify(results, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dyslexia-analysis-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert(t("common.success"), "Results downloaded successfully!");
      } else {
        // For mobile, copy to clipboard
        const Clipboard = require("expo-clipboard");
        await Clipboard.setStringAsync(JSON.stringify(results, null, 2));
        Alert.alert(
          t("common.success"),
          "Results copied to clipboard as JSON!"
        );
      }
    } catch (error) {
      console.error("Save results failed:", error);
      Alert.alert(t("common.error"), "Failed to save results");
    }
  };

  const handleSaveToStudent = async () => {
    if (!selectedStudent) {
      Alert.alert("No Student Selected", "Please select a student first");
      return;
    }

    if (!analysisComplete || tokens.length === 0) {
      Alert.alert("No Analysis", "Please analyze text first");
      return;
    }

    setIsSavingToStudent(true);
    try {
      const originalText = inputText;
      const correctedText = tokens.map((t) => t.displayWord).join(" ");

      // Build corrections array for session tracking
      const corrections = tokens
        .filter((t) => t.type === "error")
        .map((t) => ({
          original_word: t.originalWord,
          suggested_word: t.correctedWord || t.suggestion || "",
          pattern: t.pattern || t.dyslexiaPattern || "",
          confidence: t.confidence || 0.85,
        }));

      // 1. Save to PostgreSQL for student tracking analytics
      await aiCorrectionService.createSession({
        original_text: originalText,
        model_used: modelUsed || "Akura LLaMA 8B",
        corrections: corrections,
        student_id: selectedStudent.studentId || selectedStudent.id,
        student_name: selectedStudent.name || selectedStudent.studentId,
        student_grade: selectedStudent.grade || selectedStudent.studentGrade,
      });

      console.log("✅ Session saved to PostgreSQL for student tracking");

      // 2. Submit essay to child-based backend (existing functionality)
      const result = await aiCorrectionService.submitEssayForChild(
        selectedStudent.studentId,
        {
          original_text: originalText,
          title: `Essay - ${new Date().toLocaleDateString()}`,
        }
      );

      Alert.alert(
        t("common.success"),
        `Essay saved for ${selectedStudent.studentId}\nErrors found: ${result.error_count}`
      );
    } catch (error) {
      console.error("Save to student failed:", error);
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : "Failed to save essay"
      );
    } finally {
      setIsSavingToStudent(false);
    }
  };

  // Load student history
  const handleViewHistory = async () => {
    if (!selectedStudent) {
      Alert.alert("No Student Selected", "Please select a student first");
      return;
    }

    setLoadingHistory(true);
    setShowHistory(true);
    try {
      const history = await aiCorrectionService.getChildEssays(
        selectedStudent.studentId,
        20,
        0
      );
      setStudentHistory(history);
    } catch (error) {
      console.error("Load history failed:", error);
      Alert.alert(t("common.error"), "Failed to load history");
      setStudentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSampleText = (text: string) => {
    setInputText(text);
  };

  const isDark = colorScheme === "dark";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0f172a" : "#f8fafc" },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card || (isDark ? "#1e293b" : "#fff") },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/akura-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Akura AI
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}
            >
              Intelligent Dyslexia Correction Engine
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  backendStatus === "online" ? "#D1FAE5" : "#FEE2E2",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    backendStatus === "online" ? "#10B981" : "#EF4444",
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: backendStatus === "online" ? "#059669" : "#DC2626",
                },
              ]}
            >
              {backendStatus === "online" ? "AI Online" : "AI Offline"}
            </Text>
          </View>

          {modelUsed && (
            <View style={[styles.statusBadge, { backgroundColor: "#EDE9FE" }]}>
              <MaterialCommunityIcons name="brain" size={14} color="#7C3AED" />
              <Text style={[styles.statusText, { color: "#7C3AED" }]}>
                Akura LLaMA 8B
              </Text>
            </View>
          )}

          {/* Save Button - Prominent in Header */}
          {analysisComplete && (
            <TouchableOpacity
              style={[styles.headerSaveButton, { backgroundColor: "#10B981" }]}
              onPress={handleSaveResultsLocally}
            >
              <MaterialIcons name="download" size={18} color="#fff" />
              <Text style={styles.headerSaveButtonText}>Save</Text>
            </TouchableOpacity>
          )}

          {/* Student Selector */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
            ]}
            onPress={() => setShowStudentPicker(true)}
          >
            <MaterialIcons
              name="person"
              size={18}
              color={selectedStudent ? colors.tint : colors.text}
            />
          </TouchableOpacity>

          {/* History Button */}
          {selectedStudent && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
              ]}
              onPress={handleViewHistory}
            >
              <MaterialIcons name="history" size={18} color={colors.text} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
            ]}
            onPress={handleReset}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={
          isDesktop ? styles.contentDesktop : styles.contentMobile
        }
      >
        {isDesktop ? (
          // Desktop: Two-column layout
          <View style={styles.desktopGrid}>
            {/* Left Panel */}
            <View
              style={[
                styles.panel,
                {
                  backgroundColor: colors.card || (isDark ? "#1e293b" : "#fff"),
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleRow}>
                  <MaterialIcons
                    name="description"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.panelTitle, { color: colors.text }]}>
                    ආදාන පෙළ
                  </Text>
                </View>
                <Text
                  style={[
                    styles.panelSubtitle,
                    { color: colors.tabIconDefault },
                  ]}
                >
                  Enter or upload student's essay for analysis
                </Text>
              </View>

              <View style={styles.panelContent}>
                <View style={styles.charCount}>
                  <Text
                    style={[
                      styles.charCountText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {inputText.length} characters
                  </Text>
                  <Text
                    style={[
                      styles.charCountText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {inputText.trim().split(/\s+/).filter(Boolean).length} words
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                    },
                  ]}
                  multiline
                  placeholder="සිසුන්ගේ රචනය මෙහි ඇතුලත් කරන්න..."
                  placeholderTextColor={colors.tabIconDefault}
                  value={inputText}
                  onChangeText={setInputText}
                  editable={!isAnalyzing}
                />

                {/* Image Upload */}
                <TouchableOpacity
                  style={[
                    styles.uploadArea,
                    {
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      backgroundColor: isDark ? "#1e293b" : "#fff",
                    },
                  ]}
                  onPress={handleImageUpload}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <>
                      <ActivityIndicator size="small" color={colors.tint} />
                      <Text
                        style={[
                          styles.uploadText,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        Extracting text from image...
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="camera-outline"
                        size={24}
                        color={colors.tint}
                      />
                      <View>
                        <Text
                          style={[styles.uploadTitle, { color: colors.text }]}
                        >
                          Upload Handwritten Essay
                        </Text>
                        <Text
                          style={[
                            styles.uploadSubtitle,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          Supports JPG, PNG (max 10MB)
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                {/* Analyze Button */}
                <TouchableOpacity
                  style={[
                    styles.analyzeButton,
                    { backgroundColor: colors.tint },
                    (!inputText.trim() || isAnalyzing) && styles.buttonDisabled,
                  ]}
                  onPress={handleAnalyze}
                  disabled={!inputText.trim() || isAnalyzing}
                  activeOpacity={0.7}
                >
                  <View style={styles.analyzeButtonContent}>
                    {isAnalyzing ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={colorScheme === "dark" ? "#000" : "#fff"}
                        />
                        <Text
                          style={[
                            styles.analyzeButtonText,
                            { color: colorScheme === "dark" ? "#000" : "#fff" },
                          ]}
                        >
                          විශ්ලේෂණය වෙමින්...
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons
                          name="send"
                          size={20}
                          color={colorScheme === "dark" ? "#000" : "#fff"}
                        />
                        <Text
                          style={[
                            styles.analyzeButtonText,
                            { color: colorScheme === "dark" ? "#000" : "#fff" },
                          ]}
                        >
                          විශ්ලේෂණය කරන්න
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Sample Texts */}
                <View style={styles.samplesSection}>
                  <Text
                    style={[
                      styles.samplesLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    💡 Quick test samples:
                  </Text>
                  <View style={styles.samplesRow}>
                    {SAMPLE_TEXTS.map((sample, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.sampleButton,
                          {
                            backgroundColor: isDark ? "#334155" : "#f1f5f9",
                          },
                        ]}
                        onPress={() => loadSampleText(sample.text)}
                      >
                        <Text
                          style={[
                            styles.sampleButtonText,
                            { color: colors.text },
                          ]}
                        >
                          {sample.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Tip */}
                <View
                  style={[
                    styles.tipBox,
                    {
                      backgroundColor: isDark ? "#1e293b" : "#EFF6FF",
                      borderColor: isDark ? "#3b82f6" : "#DBEAFE",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={16}
                    color="#3B82F6"
                  />
                  <Text
                    style={[
                      styles.tipText,
                      { color: isDark ? "#93c5fd" : "#1e40af" },
                    ]}
                  >
                    This AI is trained on Sinhala dyslexia patterns. Click on
                    highlighted words in the output to accept or modify
                    corrections.
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Panel */}
            <View
              style={[
                styles.panel,
                {
                  backgroundColor: colors.card || (isDark ? "#1e293b" : "#fff"),
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleRow}>
                  <MaterialCommunityIcons
                    name="auto-fix"
                    size={20}
                    color="#A855F7"
                  />
                  <Text style={[styles.panelTitle, { color: colors.text }]}>
                    විශ්ලේෂණ ප්‍රතිඵල
                  </Text>
                </View>
                <Text
                  style={[
                    styles.panelSubtitle,
                    { color: colors.tabIconDefault },
                  ]}
                >
                  Click on highlighted words to review corrections
                </Text>
              </View>

              {analysisComplete ? (
                <View style={styles.panelContent}>
                  {/* Stats */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <MaterialIcons
                        name="error-outline"
                        size={16}
                        color="#DC2626"
                      />
                      <Text style={[styles.statText, { color: "#DC2626" }]}>
                        {totalErrors} errors
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialIcons
                        name="check-circle-outline"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={[styles.statText, { color: "#10B981" }]}>
                        {correctedCount} corrected
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialIcons
                        name="remove-circle-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={[styles.statText, { color: "#6B7280" }]}>
                        {ignoredCount} ignored
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionsRow}>
                    {selectedStudent && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: colors.tint },
                        ]}
                        onPress={handleSaveToStudent}
                        disabled={isSavingToStudent}
                      >
                        {isSavingToStudent ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <MaterialIcons name="save" size={18} color="#fff" />
                        )}
                        <Text
                          style={[styles.actionButtonText, { color: "#fff" }]}
                        >
                          Save to Student
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
                      ]}
                      onPress={handleCopyText}
                    >
                      <MaterialIcons
                        name="content-copy"
                        size={18}
                        color={colors.text}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          { color: colors.text },
                        ]}
                      >
                        Copy
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tokens Display */}
                  <ScrollView style={styles.tokensScroll}>
                    <Text style={[styles.tokensText, { color: colors.text }]}>
                      {tokens.map((token) => (
                        <TokenDisplay
                          key={token.id}
                          token={token}
                          onAction={handleTokenAction}
                          onEditAnyWord={handleEditAnyWord}
                          colors={colors}
                          isDark={isDark}
                        />
                      ))}
                    </Text>
                  </ScrollView>

                  {/* Footer */}
                  <View
                    style={[
                      styles.footer,
                      {
                        borderTopColor: isDark ? "#334155" : "#e2e8f0",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.footerText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      Model: {modelUsed}
                    </Text>
                    <Text
                      style={[
                        styles.footerText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      Processing time: {processingTime.toFixed(0)}ms
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="brain"
                    size={64}
                    color={colors.tabIconDefault}
                    style={{ opacity: 0.3 }}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.tabIconDefault }]}
                  >
                    Ready to Analyze
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtext,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    Enter text in the left panel and click "Analyze" to see
                    AI-powered dyslexia pattern detection.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // Mobile: Single column layout
          <View style={styles.mobileLayout}>
            {/* Input Section */}
            <View
              style={[
                styles.panel,
                {
                  backgroundColor: colors.card || (isDark ? "#1e293b" : "#fff"),
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleRow}>
                  <MaterialIcons
                    name="description"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.panelTitle, { color: colors.text }]}>
                    ආදාන පෙළ
                  </Text>
                </View>
              </View>

              <View style={styles.panelContent}>
                <TextInput
                  style={[
                    styles.textInputMobile,
                    {
                      color: colors.text,
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                    },
                  ]}
                  multiline
                  placeholder="සිසුන්ගේ රචනය මෙහි ඇතුලත් කරන්න..."
                  placeholderTextColor={colors.tabIconDefault}
                  value={inputText}
                  onChangeText={setInputText}
                  editable={!isAnalyzing}
                />

                <TouchableOpacity
                  style={[
                    styles.uploadAreaMobile,
                    { borderColor: isDark ? "#334155" : "#e2e8f0" },
                  ]}
                  onPress={handleImageUpload}
                  disabled={isUploadingImage}
                >
                  <MaterialCommunityIcons
                    name="camera-outline"
                    size={20}
                    color={colors.tint}
                  />
                  <Text
                    style={[styles.uploadTextMobile, { color: colors.text }]}
                  >
                    Upload Image
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.analyzeButton,
                    { backgroundColor: colors.tint },
                    (!inputText.trim() || isAnalyzing) && styles.buttonDisabled,
                  ]}
                  onPress={handleAnalyze}
                  disabled={!inputText.trim() || isAnalyzing}
                  activeOpacity={0.7}
                >
                  <View style={styles.analyzeButtonContent}>
                    {isAnalyzing ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={colorScheme === "dark" ? "#000" : "#fff"}
                        />
                        <Text
                          style={[
                            styles.analyzeButtonText,
                            { color: colorScheme === "dark" ? "#000" : "#fff" },
                          ]}
                        >
                          විශ්ලේෂණය වෙමින්...
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons
                          name="send"
                          size={20}
                          color={colorScheme === "dark" ? "#000" : "#fff"}
                        />
                        <Text
                          style={[
                            styles.analyzeButtonText,
                            { color: colorScheme === "dark" ? "#000" : "#fff" },
                          ]}
                        >
                          විශ්ලේෂණය කරන්න
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Results Section */}
            {analysisComplete && (
              <View
                style={[
                  styles.panel,
                  {
                    backgroundColor:
                      colors.card || (isDark ? "#1e293b" : "#fff"),
                  },
                ]}
              >
                <View style={styles.panelHeader}>
                  <View style={styles.panelTitleRow}>
                    <MaterialCommunityIcons
                      name="auto-fix"
                      size={20}
                      color="#A855F7"
                    />
                    <Text style={[styles.panelTitle, { color: colors.text }]}>
                      විශ්ලේෂණ ප්‍රතිඵල
                    </Text>
                  </View>
                </View>

                <View style={styles.panelContent}>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <MaterialIcons
                        name="error-outline"
                        size={16}
                        color="#DC2626"
                      />
                      <Text style={[styles.statText, { color: "#DC2626" }]}>
                        {totalErrors}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialIcons
                        name="check-circle-outline"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={[styles.statText, { color: "#10B981" }]}>
                        {correctedCount}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialIcons
                        name="remove-circle-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={[styles.statText, { color: "#6B7280" }]}>
                        {ignoredCount}
                      </Text>
                    </View>
                  </View>

                  {/* Hint Text */}
                  <View
                    style={[
                      styles.hintBox,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        borderColor: isDark ? "#475569" : "#e2e8f0",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="info-outline"
                      size={16}
                      color={colors.tint}
                    />
                    <Text
                      style={[
                        styles.hintText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      💡 Tap any word to edit. Error words show
                      Accept/Edit/Reject options.
                    </Text>
                  </View>

                  <Text style={[styles.tokensText, { color: colors.text }]}>
                    {tokens.map((token) => (
                      <TokenDisplay
                        key={token.id}
                        token={token}
                        onAction={handleTokenAction}
                        onEditAnyWord={handleEditAnyWord}
                        colors={colors}
                        isDark={isDark}
                      />
                    ))}
                  </Text>

                  {/* Save Buttons */}
                  <View style={styles.saveButtonsContainer}>
                    {selectedStudent && (
                      <TouchableOpacity
                        style={[
                          styles.saveButton,
                          { backgroundColor: colors.tint },
                        ]}
                        onPress={handleSaveToStudent}
                        disabled={isSavingToStudent}
                      >
                        {isSavingToStudent ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <MaterialIcons name="save" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>
                              {`Save to ${selectedStudent.studentId}`}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        {
                          borderColor: colors.tint,
                          backgroundColor: isDark ? "#1e293b" : "#fff",
                        },
                      ]}
                      onPress={handleCopyText}
                    >
                      <MaterialIcons
                        name="content-copy"
                        size={20}
                        color={colors.tint}
                      />
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: colors.tint },
                        ]}
                      >
                        Copy Text
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        {
                          borderColor: colors.tabIconDefault,
                          backgroundColor: isDark ? "#1e293b" : "#fff",
                        },
                      ]}
                      onPress={handleReset}
                    >
                      <MaterialIcons
                        name="refresh"
                        size={20}
                        color={colors.tabIconDefault}
                      />
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        Reset
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Student Picker Modal */}
      <Modal
        visible={showStudentPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStudentPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card || (isDark ? "#1e293b" : "#fff") },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Student
              </Text>
              <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {students.length === 0 ? (
                <View style={styles.emptyStudents}>
                  <MaterialIcons
                    name="person-outline"
                    size={48}
                    color={colors.tabIconDefault}
                    style={{ opacity: 0.3 }}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.tabIconDefault }]}
                  >
                    No students found. Add students first.
                  </Text>
                </View>
              ) : (
                students.map((student) => (
                  <TouchableOpacity
                    key={student.studentId}
                    style={[
                      styles.studentItem,
                      { borderColor: isDark ? "#334155" : "#e2e8f0" },
                      selectedStudent?.studentId === student.studentId && {
                        backgroundColor: colors.tint + "15",
                        borderColor: colors.tint,
                      },
                    ]}
                    onPress={() => {
                      setSelectedStudent(student);
                      setShowStudentPicker(false);
                    }}
                  >
                    <View
                      style={[
                        styles.studentAvatar,
                        { backgroundColor: colors.tint },
                      ]}
                    >
                      <Text style={styles.studentAvatarText}>
                        {student.studentId.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentId, { color: colors.text }]}>
                        {student.studentId}
                      </Text>
                      <Text
                        style={[
                          styles.studentMeta,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        Grade {student.grade} • Age {student.age}
                      </Text>
                    </View>
                    {selectedStudent?.studentId === student.studentId && (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={colors.tint}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View
          style={[
            styles.historyContainer,
            { backgroundColor: isDark ? "#0f172a" : "#f8fafc" },
          ]}
        >
          <View
            style={[
              styles.historyHeader,
              { backgroundColor: colors.card || (isDark ? "#1e293b" : "#fff") },
            ]}
          >
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.historyTitle, { color: colors.text }]}>
              Correction History
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedStudent && (
            <View
              style={[
                styles.historyStudentInfo,
                {
                  backgroundColor: colors.card || (isDark ? "#1e293b" : "#fff"),
                },
              ]}
            >
              <MaterialIcons name="person" size={20} color={colors.tint} />
              <Text style={[styles.historyStudentText, { color: colors.text }]}>
                {selectedStudent.studentId}
              </Text>
            </View>
          )}

          <ScrollView style={styles.historyScroll}>
            {loadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text
                  style={[styles.loadingText, { color: colors.tabIconDefault }]}
                >
                  Loading history...
                </Text>
              </View>
            ) : studentHistory.length === 0 ? (
              <View style={styles.emptyHistory}>
                <MaterialCommunityIcons
                  name="history"
                  size={64}
                  color={colors.tabIconDefault}
                  style={{ opacity: 0.3 }}
                />
                <Text
                  style={[styles.emptyText, { color: colors.tabIconDefault }]}
                >
                  No correction history yet
                </Text>
              </View>
            ) : (
              studentHistory.map((essay) => (
                <View
                  key={essay.essay_id}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor:
                        colors.card || (isDark ? "#1e293b" : "#fff"),
                    },
                  ]}
                >
                  <View style={styles.historyCardHeader}>
                    <Text
                      style={[styles.historyCardTitle, { color: colors.text }]}
                    >
                      {essay.title || "Essay"}
                    </Text>
                    <View
                      style={[
                        styles.errorBadge,
                        { backgroundColor: "#FEE2E2" },
                      ]}
                    >
                      <Text
                        style={[styles.errorBadgeText, { color: "#DC2626" }]}
                      >
                        {essay.error_count} errors
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.historyCardText,
                      { color: colors.tabIconDefault },
                    ]}
                    numberOfLines={2}
                  >
                    {essay.original_text}
                  </Text>
                  <Text
                    style={[
                      styles.historyCardDate,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {new Date(essay.created_at).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Token Display Component
interface TokenDisplayProps {
  token: TokenData;
  onAction: (
    tokenId: string,
    action: "accept" | "reject" | "edit",
    newWord?: string
  ) => void;
  onEditAnyWord: (tokenId: string, newWord: string) => void;
  colors: any;
  isDark: boolean;
}

function TokenDisplay({
  token,
  onAction,
  onEditAnyWord,
  colors,
  isDark,
}: TokenDisplayProps) {
  // ALL HOOKS MUST BE AT THE TOP - React rules
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNormal, setIsEditingNormal] = useState(false);
  const [normalEditValue, setNormalEditValue] = useState(token.displayWord);
  const [isEditingError, setIsEditingError] = useState(false);
  const [errorEditValue, setErrorEditValue] = useState(
    token.correctedWord || token.suggestion || token.word
  );

  // Handle normal word editing (double tap or long press)
  if (token.type === "correct" && !/^\s+$/.test(token.word)) {
    if (isEditingNormal) {
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 2,
          }}
        >
          <TextInput
            value={normalEditValue}
            onChangeText={setNormalEditValue}
            style={[
              styles.inlineEditInput,
              {
                color: colors.text,
                borderColor: colors.tint,
                backgroundColor: isDark ? "#1e293b" : "#fff",
              },
            ]}
            autoFocus
            onBlur={() => {
              if (
                normalEditValue.trim() &&
                normalEditValue !== token.displayWord
              ) {
                onEditAnyWord(token.id, normalEditValue.trim());
              }
              setIsEditingNormal(false);
            }}
            onSubmitEditing={() => {
              if (
                normalEditValue.trim() &&
                normalEditValue !== token.displayWord
              ) {
                onEditAnyWord(token.id, normalEditValue.trim());
              }
              setIsEditingNormal(false);
            }}
          />
          <TouchableOpacity
            onPress={() => {
              if (
                normalEditValue.trim() &&
                normalEditValue !== token.displayWord
              ) {
                onEditAnyWord(token.id, normalEditValue.trim());
              }
              setIsEditingNormal(false);
            }}
            style={[styles.inlineEditButton, { backgroundColor: "#10B981" }]}
          >
            <MaterialIcons name="check" size={14} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setNormalEditValue(token.displayWord);
              setIsEditingNormal(false);
            }}
            style={[styles.inlineEditButton, { backgroundColor: "#EF4444" }]}
          >
            <MaterialIcons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }

    // Normal editable word - Tap to edit (not long press)
    return (
      <Text
        style={[
          styles.editableWord,
          {
            color: colors.text,
            backgroundColor: isDark ? "#1e293b20" : "#f8fafc",
            paddingHorizontal: 2,
            borderRadius: 2,
          },
        ]}
        onPress={() => {
          setNormalEditValue(token.displayWord);
          setIsEditingNormal(true);
        }}
      >
        {token.displayWord}
      </Text>
    );
  }

  // Whitespace
  if (/^\s+$/.test(token.word)) {
    return token.displayWord;
  }

  const getHighlightStyle = () => {
    if (token.state === "corrected") {
      return { backgroundColor: "#D1FAE5", color: "#059669" };
    }
    if (token.state === "ignored") {
      return {
        backgroundColor: isDark ? "#374151" : "#F3F4F6",
        color: colors.tabIconDefault,
      };
    }
    return { backgroundColor: "#FEE2E2", color: "#DC2626" };
  };

  const highlightStyle = getHighlightStyle();

  return (
    <>
      <Text
        style={[
          styles.highlightedWord,
          { backgroundColor: highlightStyle.backgroundColor },
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text
          style={[styles.highlightedWordText, { color: highlightStyle.color }]}
        >
          {token.displayWord}
        </Text>
      </Text>

      {isExpanded && (
        <Modal
          visible={isExpanded}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setIsExpanded(false);
            setIsEditingError(false);
          }}
        >
          <TouchableOpacity
            style={styles.popupOverlay}
            activeOpacity={1}
            onPress={() => {
              setIsExpanded(false);
              setIsEditingError(false);
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.tokenPopup,
                {
                  backgroundColor: isDark ? "#1e293b" : "#fff",
                  borderColor: isDark ? "#475569" : "#e2e8f0",
                },
              ]}
            >
              {!isEditingError ? (
                <>
                  {/* Header */}
                  <View style={styles.popupHeader}>
                    <View>
                      <Text style={[styles.popupTitle, { color: colors.text }]}>
                        Suggested Correction
                      </Text>
                      <View
                        style={[
                          styles.patternBadge,
                          { backgroundColor: "#FEF3C7" },
                        ]}
                      >
                        <Text
                          style={[styles.patternText, { color: "#D97706" }]}
                        >
                          {token.pattern || token.dyslexiaPattern || "Unknown"}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setIsExpanded(false);
                        setIsEditingError(false);
                      }}
                      style={styles.closeButton}
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={colors.tabIconDefault}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Correction Display */}
                  <View
                    style={[
                      styles.correctionDisplay,
                      { backgroundColor: isDark ? "#0f172a" : "#F8FAFC" },
                    ]}
                  >
                    <Text
                      style={[styles.originalWordText, { color: "#EF4444" }]}
                    >
                      {token.originalWord}
                    </Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={16}
                      color={colors.tabIconDefault}
                    />
                    <Text
                      style={[styles.correctedWordText, { color: "#10B981" }]}
                    >
                      {token.correctedWord || token.suggestion}
                    </Text>
                  </View>

                  {token.explanation && (
                    <Text
                      style={[
                        styles.explanationText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {token.explanation}
                    </Text>
                  )}

                  {/* Confidence */}
                  {token.confidence && (
                    <View style={styles.confidenceRow}>
                      <MaterialCommunityIcons
                        name="star"
                        size={14}
                        color="#F59E0B"
                      />
                      <Text
                        style={[
                          styles.confidenceText,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        Confidence: {Math.round(token.confidence * 100)}%
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.popupActions}>
                    {token.state === "flagged" && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.popupButton,
                            { backgroundColor: "#10B981", flex: 1 },
                          ]}
                          onPress={() => {
                            onAction(token.id, "accept");
                            setIsExpanded(false);
                          }}
                        >
                          <MaterialIcons name="check" size={18} color="#fff" />
                          <Text style={styles.popupButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.popupButton,
                            { backgroundColor: isDark ? "#475569" : "#E2E8F0" },
                          ]}
                          onPress={() => {
                            setErrorEditValue(
                              token.correctedWord ||
                                token.suggestion ||
                                token.word
                            );
                            setIsEditingError(true);
                          }}
                        >
                          <MaterialIcons
                            name="edit"
                            size={18}
                            color={isDark ? "#fff" : "#475569"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.popupButton,
                            { backgroundColor: isDark ? "#475569" : "#E2E8F0" },
                          ]}
                          onPress={() => {
                            onAction(token.id, "reject");
                            setIsExpanded(false);
                          }}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={isDark ? "#fff" : "#475569"}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                    {token.state === "corrected" && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.popupButton,
                            { backgroundColor: "#6B7280", flex: 1 },
                          ]}
                          onPress={() => {
                            onAction(token.id, "reject");
                            setIsExpanded(false);
                          }}
                        >
                          <MaterialIcons name="undo" size={18} color="#fff" />
                          <Text style={styles.popupButtonText}>Undo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.popupButton,
                            { backgroundColor: isDark ? "#475569" : "#E2E8F0" },
                          ]}
                          onPress={() => {
                            setErrorEditValue(token.displayWord);
                            setIsEditingError(true);
                          }}
                        >
                          <MaterialIcons
                            name="edit"
                            size={18}
                            color={isDark ? "#fff" : "#475569"}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                    {token.state === "ignored" && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.popupButton,
                            { backgroundColor: "#10B981", flex: 1 },
                          ]}
                          onPress={() => {
                            onAction(token.id, "accept");
                            setIsExpanded(false);
                          }}
                        >
                          <MaterialIcons name="check" size={18} color="#fff" />
                          <Text style={styles.popupButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.popupButton,
                            { backgroundColor: isDark ? "#475569" : "#E2E8F0" },
                          ]}
                          onPress={() => {
                            setErrorEditValue(
                              token.correctedWord ||
                                token.suggestion ||
                                token.word
                            );
                            setIsEditingError(true);
                          }}
                        >
                          <MaterialIcons
                            name="edit"
                            size={18}
                            color={isDark ? "#fff" : "#475569"}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              ) : (
                /* Edit Mode */
                <View>
                  <Text style={[styles.editModeTitle, { color: colors.text }]}>
                    Edit Correction
                  </Text>
                  <TextInput
                    value={errorEditValue}
                    onChangeText={setErrorEditValue}
                    style={[
                      styles.editInput,
                      {
                        color: colors.text,
                        borderColor: colors.tint,
                        backgroundColor: isDark ? "#0f172a" : "#fff",
                      },
                    ]}
                    autoFocus
                    placeholder="Enter correction..."
                    placeholderTextColor={colors.tabIconDefault}
                  />
                  <View style={styles.editModeActions}>
                    <TouchableOpacity
                      style={[
                        styles.popupButton,
                        { backgroundColor: colors.tint, flex: 1 },
                      ]}
                      onPress={() => {
                        if (errorEditValue.trim()) {
                          onAction(token.id, "edit", errorEditValue.trim());
                          setIsEditingError(false);
                          setIsExpanded(false);
                        }
                      }}
                    >
                      <MaterialIcons name="check" size={18} color="#fff" />
                      <Text style={styles.popupButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.popupButton,
                        { backgroundColor: "#6B7280", flex: 1 },
                      ]}
                      onPress={() => {
                        setErrorEditValue(
                          token.correctedWord || token.suggestion || token.word
                        );
                        setIsEditingError(false);
                      }}
                    >
                      <Text style={styles.popupButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 4,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  headerSaveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentDesktop: {
    padding: 20,
  },
  contentMobile: {
    padding: 16,
  },
  desktopGrid: {
    flexDirection: "row",
    gap: 20,
  },
  mobileLayout: {
    gap: 16,
  },
  panel: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  panelHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  panelSubtitle: {
    fontSize: 13,
  },
  panelContent: {
    padding: 20,
  },
  charCount: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginBottom: 8,
  },
  charCountText: {
    fontSize: 12,
  },
  textInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  textInputMobile: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  uploadArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    marginBottom: 16,
  },
  uploadAreaMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  uploadSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  uploadText: {
    fontSize: 14,
  },
  uploadTextMobile: {
    fontSize: 14,
    fontWeight: "500",
  },
  analyzeButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  analyzeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  samplesSection: {
    marginBottom: 16,
  },
  samplesLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  samplesRow: {
    flexDirection: "row",
    gap: 8,
  },
  sampleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sampleButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tipBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tokensScroll: {
    maxHeight: 400,
  },
  tokensText: {
    fontSize: 18,
    lineHeight: 32,
    flexWrap: "wrap",
  },
  tokensContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tokenWrapper: {
    position: "relative",
  },
  correctWord: {
    fontSize: 18,
    lineHeight: 32,
  },
  highlightedWord: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  highlightedWordText: {
    fontSize: 18,
    fontWeight: "600",
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  tokenPopup: {
    minWidth: 280,
    maxWidth: "90%",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  popupLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 8,
  },
  popupValue: {
    fontSize: 14,
    marginTop: 2,
  },
  popupExplanation: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  popupActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  popupButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
  },
  popupButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  // Editable word styles
  editableWord: {
    fontSize: 18,
    lineHeight: 32,
  },
  inlineEditInput: {
    fontSize: 18,
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 60,
  },
  inlineEditButton: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  // Enhanced popup styles
  popupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  patternBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  patternText: {
    fontSize: 11,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  correctionDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  originalWordText: {
    fontSize: 18,
    fontWeight: "500",
    textDecorationLine: "line-through",
  },
  correctedWordText: {
    fontSize: 18,
    fontWeight: "600",
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 12,
  },
  // Edit mode styles
  editModeTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  editInput: {
    fontSize: 18,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  editModeActions: {
    flexDirection: "row",
    gap: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 300,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalScroll: {
    maxHeight: 400,
  },
  emptyStudents: {
    padding: 48,
    alignItems: "center",
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  studentInfo: {
    flex: 1,
  },
  studentId: {
    fontSize: 16,
    fontWeight: "500",
  },
  studentMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  // History Modal styles
  historyContainer: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  historyStudentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  historyStudentText: {
    fontSize: 16,
    fontWeight: "500",
  },
  historyScroll: {
    flex: 1,
    padding: 16,
  },
  historyLoading: {
    padding: 48,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyHistory: {
    padding: 48,
    alignItems: "center",
    gap: 16,
  },
  historyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  errorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  errorBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  historyCardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  historyCardDate: {
    fontSize: 12,
  },
  // Hint box
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  hintText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  // Save buttons
  saveButtonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
