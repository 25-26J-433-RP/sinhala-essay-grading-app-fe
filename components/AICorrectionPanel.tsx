// components/AICorrectionPanel.tsx
/**
 * AI Correction Panel Component
 * 
 * Displays AI-powered dyslexia correction suggestions
 * and allows users to accept/reject/edit corrections.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLanguage } from "@/contexts/LanguageContext";
import aiCorrectionService, {
  type CorrectionItem,
  type AnalyzeResponse,
} from "@/app/api/aiCorrection";

// ===========================
// Props Interface
// ===========================

interface AICorrectionPanelProps {
  /** The original text from OCR or manual input */
  originalText: string;
  /** Callback when user applies corrected text */
  onCorrectedText: (text: string) => void;
  /** Callback when analysis is complete */
  onAnalysisComplete?: (result: AnalyzeResponse) => void;
  /** Whether to auto-analyze when text changes */
  autoAnalyze?: boolean;
  /** Initial collapsed state */
  initialCollapsed?: boolean;
}

// ===========================
// Correction Item with UI state
// ===========================

interface CorrectionWithStatus extends CorrectionItem {
  id: string;
  status: "pending" | "accepted" | "rejected";
  editedSuggestion?: string;
}

// ===========================
// Pattern Colors
// ===========================

const PATTERN_COLORS: Record<string, string> = {
  visual_scrambling: "#F59E0B", // Orange
  phonetic_confusion: "#8B5CF6", // Purple
  visual_reversal: "#EC4899", // Pink
  grammar_issue: "#3B82F6", // Blue
  unknown: "#6B7280", // Gray
};

const getPatternColor = (pattern: string): string => {
  const normalizedPattern = pattern.toLowerCase().replace(/\s+/g, "_");
  return PATTERN_COLORS[normalizedPattern] || PATTERN_COLORS.unknown;
};

// ===========================
// Component
// ===========================

export default function AICorrectionPanel({
  originalText,
  onCorrectedText,
  onAnalysisComplete,
  autoAnalyze = false,
  initialCollapsed = false,
}: AICorrectionPanelProps) {
  const { t } = useLanguage();
  
  // State
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [corrections, setCorrections] = useState<CorrectionWithStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  // Auto-analyze if enabled
  useEffect(() => {
    if (autoAnalyze && originalText && originalText.trim().length > 0 && isHealthy) {
      handleAnalyze();
    }
  }, [originalText, isHealthy, autoAnalyze]);

  // ===========================
  // Handlers
  // ===========================

  const checkHealth = async () => {
    try {
      const health = await aiCorrectionService.checkHealth();
      setIsHealthy(health.status === "ok" || health.ollama_connected === true);
    } catch (err) {
      console.error("AI Correction service not available:", err);
      setIsHealthy(false);
    }
  };

  const handleAnalyze = async () => {
    const textToAnalyze = manualText.trim() || originalText.trim();
    
    if (!textToAnalyze) {
      Alert.alert("Error", "No text to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCorrections([]);

    try {
      const result = await aiCorrectionService.analyzeText(textToAnalyze);
      setAnalysisResult(result);

      // Convert corrections to UI format
      const correctionsWithStatus: CorrectionWithStatus[] = result.corrections.map(
        (c, idx) => ({
          ...c,
          id: `correction-${idx}`,
          status: "pending" as const,
        })
      );
      setCorrections(correctionsWithStatus);

      onAnalysisComplete?.(result);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAccept = (id: string) => {
    setCorrections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "accepted" } : c))
    );
  };

  const handleReject = (id: string) => {
    setCorrections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
    );
  };

  const handleEdit = (id: string, newSuggestion: string) => {
    setCorrections((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, editedSuggestion: newSuggestion, status: "accepted" }
          : c
      )
    );
    setEditingId(null);
  };

  const handleAcceptAll = () => {
    setCorrections((prev) =>
      prev.map((c) => ({ ...c, status: "accepted" }))
    );
  };

  const handleRejectAll = () => {
    setCorrections((prev) =>
      prev.map((c) => ({ ...c, status: "rejected" }))
    );
  };

  const handleApplyCorrections = () => {
    if (!analysisResult) return;

    // Build corrected text from accepted corrections
    let correctedText = originalText;
    
    // Get accepted corrections
    const acceptedCorrections = corrections
      .filter((c) => c.status === "accepted")
      .map((c) => ({
        word: c.word,
        suggestion: c.editedSuggestion || c.suggestion,
      }));

    // Apply corrections (simple replacement)
    for (const correction of acceptedCorrections) {
      correctedText = correctedText.replace(correction.word, correction.suggestion);
    }

    onCorrectedText(correctedText);
    
    // Clear state after applying
    setAnalysisResult(null);
    setCorrections([]);
  };

  // ===========================
  // Render
  // ===========================

  const pendingCount = corrections.filter((c) => c.status === "pending").length;
  const acceptedCount = corrections.filter((c) => c.status === "accepted").length;
  const rejectedCount = corrections.filter((c) => c.status === "rejected").length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <View style={styles.headerLeft}>
          <MaterialIcons name="psychology" size={24} color="#6D28D9" />
          <Text style={styles.headerTitle}>🧠 AI Dyslexia Correction</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Health Status */}
          {isHealthy === null ? (
            <ActivityIndicator size="small" color="#6D28D9" />
          ) : isHealthy ? (
            <View style={[styles.statusBadge, styles.statusOnline]}>
              <Text style={styles.statusText}>Online</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusOffline]}>
              <Text style={styles.statusTextOffline}>Offline</Text>
            </View>
          )}
          <MaterialIcons
            name={isCollapsed ? "expand-more" : "expand-less"}
            size={24}
            color="#6B7280"
          />
        </View>
      </TouchableOpacity>

      {/* Content */}
      {!isCollapsed && (
        <View style={styles.content}>
          {/* Manual Input Toggle */}
          <TouchableOpacity
            style={styles.manualInputToggle}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <MaterialIcons
              name={showManualInput ? "keyboard-hide" : "keyboard"}
              size={20}
              color="#6D28D9"
            />
            <Text style={styles.manualInputToggleText}>
              {showManualInput ? "Hide Manual Input" : "Manual Input"}
            </Text>
          </TouchableOpacity>

          {/* Manual Input Field */}
          {showManualInput && (
            <TextInput
              style={styles.manualInput}
              value={manualText}
              onChangeText={setManualText}
              placeholder="Type or paste Sinhala text here..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}

          {/* Analyze Button */}
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              (!isHealthy || isAnalyzing) && styles.buttonDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={!isHealthy || isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="auto-fix-high" size={20} color="#fff" />
                <Text style={styles.analyzeButtonText}>
                  විශ්ලේෂණය කරන්න (Analyze)
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Analysis Results */}
          {analysisResult && corrections.length > 0 && (
            <View style={styles.resultsContainer}>
              {/* Summary */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  Found {analysisResult.total_errors} error(s)
                </Text>
                <View style={styles.countsRow}>
                  <Text style={styles.countBadgeAccepted}>✓ {acceptedCount}</Text>
                  <Text style={styles.countBadgeRejected}>✗ {rejectedCount}</Text>
                  <Text style={styles.countBadgePending}>? {pendingCount}</Text>
                </View>
              </View>

              {/* Bulk Actions */}
              <View style={styles.bulkActions}>
                <TouchableOpacity
                  style={styles.bulkButton}
                  onPress={handleAcceptAll}
                >
                  <Text style={styles.bulkButtonTextAccept}>Accept All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkButton}
                  onPress={handleRejectAll}
                >
                  <Text style={styles.bulkButtonTextReject}>Reject All</Text>
                </TouchableOpacity>
              </View>

              {/* Corrections List */}
              <ScrollView style={styles.correctionsList} nestedScrollEnabled>
                {corrections.map((correction) => (
                  <View
                    key={correction.id}
                    style={[
                      styles.correctionCard,
                      correction.status === "accepted" && styles.cardAccepted,
                      correction.status === "rejected" && styles.cardRejected,
                    ]}
                  >
                    {/* Word Change */}
                    <View style={styles.wordChangeRow}>
                      <Text style={styles.originalWord}>{correction.word}</Text>
                      <MaterialIcons name="arrow-forward" size={16} color="#6B7280" />
                      {editingId === correction.id ? (
                        <TextInput
                          style={styles.editInput}
                          defaultValue={correction.editedSuggestion || correction.suggestion}
                          onBlur={(e) => handleEdit(correction.id, e.nativeEvent.text)}
                          onSubmitEditing={(e) => handleEdit(correction.id, e.nativeEvent.text)}
                          autoFocus
                        />
                      ) : (
                        <Text style={styles.suggestedWord}>
                          {correction.editedSuggestion || correction.suggestion}
                        </Text>
                      )}
                    </View>

                    {/* Pattern Badge */}
                    <View
                      style={[
                        styles.patternBadge,
                        { backgroundColor: getPatternColor(correction.pattern) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.patternText,
                          { color: getPatternColor(correction.pattern) },
                        ]}
                      >
                        {correction.pattern} ({Math.round(correction.confidence * 100)}%)
                      </Text>
                    </View>

                    {/* Explanation */}
                    {correction.explanation && (
                      <Text style={styles.explanation}>{correction.explanation}</Text>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.acceptButton,
                          correction.status === "accepted" && styles.buttonActive,
                        ]}
                        onPress={() => handleAccept(correction.id)}
                      >
                        <MaterialIcons name="check" size={18} color="#10B981" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.rejectButton,
                          correction.status === "rejected" && styles.buttonActive,
                        ]}
                        onPress={() => handleReject(correction.id)}
                      >
                        <MaterialIcons name="close" size={18} color="#EF4444" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => setEditingId(correction.id)}
                      >
                        <MaterialIcons name="edit" size={18} color="#6B7280" />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Apply Button */}
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  acceptedCount === 0 && styles.buttonDisabled,
                ]}
                onPress={handleApplyCorrections}
                disabled={acceptedCount === 0}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.applyButtonText}>
                  Apply {acceptedCount} Correction(s)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* No Errors Message */}
          {analysisResult && corrections.length === 0 && (
            <View style={styles.noErrorsContainer}>
              <MaterialIcons name="check-circle" size={48} color="#10B981" />
              <Text style={styles.noErrorsText}>No errors detected!</Text>
              <Text style={styles.noErrorsSubtext}>
                The text appears to be correct.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ===========================
// Styles
// ===========================

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOnline: {
    backgroundColor: "#D1FAE5",
  },
  statusOffline: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  statusTextOffline: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  content: {
    padding: 16,
  },
  manualInputToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  manualInputToggleText: {
    fontSize: 14,
    color: "#6D28D9",
    fontWeight: "500",
  },
  manualInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 12,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6D28D9",
    padding: 14,
    borderRadius: 8,
  },
  analyzeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    flex: 1,
  },
  resultsContainer: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  countsRow: {
    flexDirection: "row",
    gap: 8,
  },
  countBadgeAccepted: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  countBadgeRejected: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  countBadgePending: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  bulkActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  bulkButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  bulkButtonTextAccept: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "500",
  },
  bulkButtonTextReject: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
  correctionsList: {
    maxHeight: 300,
  },
  correctionCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardAccepted: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  cardRejected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
    opacity: 0.6,
  },
  wordChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  originalWord: {
    fontSize: 16,
    color: "#DC2626",
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  suggestedWord: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
  },
  editInput: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: "#10B981",
    paddingVertical: 2,
    minWidth: 80,
  },
  patternBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  patternText: {
    fontSize: 12,
    fontWeight: "500",
  },
  explanation: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  acceptButton: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  rejectButton: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  editButton: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  buttonActive: {
    opacity: 1,
  },
  acceptButtonText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  rejectButtonText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  editButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noErrorsContainer: {
    alignItems: "center",
    padding: 24,
  },
  noErrorsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 12,
  },
  noErrorsSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
});
