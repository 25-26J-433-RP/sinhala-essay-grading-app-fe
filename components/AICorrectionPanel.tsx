// components/AICorrectionPanel.tsx
/**
 * AI Correction Panel Component
 * 
 * Displays AI-powered dyslexia correction suggestions
 * and allows users to accept/reject/edit corrections.
 * Shows original vs corrected text comparison.
 * Matches the app's dark theme UI.
 */

import React, { useState, useEffect, useRef } from "react";
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
  type?: "error" | "correct" | string;
}

// ===========================
// Pattern Colors & Labels
// ===========================

const PATTERN_COLORS: Record<string, string> = {
  visual_scrambling: "#F59E0B",
  visual_sequencing: "#F59E0B",
  phonetic_confusion: "#8B5CF6",
  visual_reversal: "#EC4899",
  grammar_issue: "#007AFF",
  grammar: "#007AFF",
  unknown: "#6B7280",
};

const PATTERN_ICONS: Record<string, string> = {
  visual_scrambling: "shuffle",
  visual_sequencing: "swap-horiz",
  phonetic_confusion: "hearing",
  visual_reversal: "flip",
  grammar_issue: "spellcheck",
  grammar: "spellcheck",
  unknown: "help-outline",
};

const getPatternColor = (pattern: string): string => {
  const normalizedPattern = pattern.toLowerCase().replace(/[\s()]/g, "_");
  for (const key of Object.keys(PATTERN_COLORS)) {
    if (normalizedPattern.includes(key)) {
      return PATTERN_COLORS[key];
    }
  }
  return PATTERN_COLORS.unknown;
};

const getPatternIcon = (pattern: string): string => {
  const normalizedPattern = pattern.toLowerCase().replace(/[\s()]/g, "_");
  for (const key of Object.keys(PATTERN_ICONS)) {
    if (normalizedPattern.includes(key)) {
      return PATTERN_ICONS[key];
    }
  }
  return PATTERN_ICONS.unknown;
};

export default function AICorrectionPanel({
  originalText,
  onCorrectedText,
  onAnalysisComplete,
  autoAnalyze = false,
  initialCollapsed = false,
}: AICorrectionPanelProps) {
  const { t } = useLanguage();
  const hasAutoAnalyzed = useRef(false);

  // State
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [tokens, setTokens] = useState<CorrectionWithStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");

  // Teacher editing state
  const [showFinalEditor, setShowFinalEditor] = useState(false);
  const [finalText, setFinalText] = useState("");

  // Comparison view state
  const [showComparison, setShowComparison] = useState(true);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  // Auto-analyze if enabled (only once until user applies corrections)
  useEffect(() => {
    if (autoAnalyze && originalText && originalText.trim().length > 0 && isHealthy && !hasAutoAnalyzed.current && !analysisResult) {
      hasAutoAnalyzed.current = true;
      handleAnalyze();
    }
  }, [originalText, isHealthy, autoAnalyze]);

  // ===========================
  // Handlers
  // ===========================

  const checkHealth = async () => {
    try {
      const health = await aiCorrectionService.checkHealth();
      console.log("Health check response:", health);
      const isOnline = health.status === "healthy" ||
        health.status === "ok" ||
        health.ollamaConnected === true ||
        health.ollama_connected === true;
      setIsHealthy(isOnline);
    } catch (err) {
      console.error("AI Correction service not available:", err);
      setIsHealthy(false);
    }
  };

  const handleAnalyze = async () => {
    const textToAnalyze = manualText.trim() || originalText.trim();

    if (!textToAnalyze) {
      Alert.alert(t("common.error"), t("aiCorrection.noResults"));
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setTokens([]);
    setSelectedTokenId(null);
    setEditingId(null);

    try {
      const result = await aiCorrectionService.analyzeText(textToAnalyze);
      setAnalysisResult(result);

      // Convert tokens to UI format
      const tokensWithStatus: CorrectionWithStatus[] = result.corrections.map(
        (c, idx) => ({
          ...c,
          id: `token-${idx}`,
          status: "pending" as const,
        })
      );
      setTokens(tokensWithStatus);

      onAnalysisComplete?.(result);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || t("aiCorrection.noResults"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAccept = (id: string) => {
    setTokens((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "accepted" } : c))
    );
  };

  const handleReject = (id: string) => {
    setTokens((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
    );
  };

  const handleEdit = (id: string, newSuggestion: string) => {
    setTokens((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, editedSuggestion: newSuggestion, status: "accepted" }
          : c
      )
    );
    setEditingId(null);
  };

  const handleAcceptAll = () => {
    setTokens((prev) =>
      prev.map((c) => (c.type === 'error' ? { ...c, status: "accepted" } : c))
    );
  };

  const handleRejectAll = () => {
    setTokens((prev) =>
      prev.map((c) => (c.type === 'error' ? { ...c, status: "rejected" } : c))
    );
  };

  // Generate preview text with accepted corrections applied
  const getPreviewText = (): string => {
    let previewText = manualText.trim() || originalText;

    const acceptedCorrections = tokens
      .filter((c) => c.type === 'error' && c.status === "accepted")
      .map((c) => ({
        word: c.word,
        suggestion: c.editedSuggestion || c.suggestion,
      }));

    for (const correction of acceptedCorrections) {
      previewText = previewText.replace(correction.word, correction.suggestion);
    }

    return previewText;
  };

  // Toggle final editor and initialize with preview text
  const toggleFinalEditor = () => {
    if (!showFinalEditor) {
      setFinalText(getPreviewText());
    }
    setShowFinalEditor(!showFinalEditor);
  };

  const handleApplyCorrections = () => {
    const textToApply = showFinalEditor ? finalText : getPreviewText();

    onCorrectedText(textToApply);

    // Clear state after applying
    setAnalysisResult(null);
    setTokens([]);
    setShowFinalEditor(false);
    setFinalText("");
    hasAutoAnalyzed.current = false;
  };

  // Get unique error patterns for summary
  const getErrorPatternSummary = () => {
    const patterns: Record<string, number> = {};
    tokens.filter(t => t.type === 'error').forEach(token => {
      const p = token.pattern || 'Unknown';
      patterns[p] = (patterns[p] || 0) + 1;
    });
    return Object.entries(patterns);
  };

  // ===========================
  // Render
  // ===========================

  const errors = tokens.filter(t => t.type === 'error');
  const pendingCount = errors.filter((c) => c.status === "pending").length;
  const acceptedCount = errors.filter((c) => c.status === "accepted").length;
  const rejectedCount = errors.filter((c) => c.status === "rejected").length;
  const processingTimeSec = analysisResult?.processing_time_ms
    ? (analysisResult.processing_time_ms / 1000).toFixed(1)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <View style={styles.headerLeft}>
          <MaterialIcons name="psychology" size={24} color="#8B5CF6" />
          <Text style={styles.headerTitle}>{t("aiCorrection.title")}</Text>
          {analysisResult && errors.length > 0 && (
            <View style={styles.headerErrorCount}>
              <Text style={styles.headerErrorCountText}>{errors.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isHealthy === null ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
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
            color="#9CA3AF"
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
              color="#8B5CF6"
            />
            <Text style={styles.manualInputToggleText}>
              {showManualInput ? "Hide Input" : "Manual Text Input"}
            </Text>
          </TouchableOpacity>

          {/* Manual Input Field */}
          {showManualInput && (
            <TextInput
              style={styles.manualInput}
              value={manualText}
              onChangeText={setManualText}
              placeholder={t("aiCorrection.placeholder")}
              placeholderTextColor="#6B7280"
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
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzeButtonText}>
                  {t("aiCorrection.analyzing")}
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="auto-fix-high" size={20} color="#fff" />
                <Text style={styles.analyzeButtonText}>
                  {t("aiCorrection.analyzeButton")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ===================== */}
          {/* ANALYSIS RESULTS      */}
          {/* ===================== */}
          {analysisResult && errors.length > 0 && (
            <View style={styles.resultsContainer}>

              {/* ─── COMPARISON VIEW: Original vs Corrected ─── */}
              <View style={styles.comparisonContainer}>
                <TouchableOpacity
                  style={styles.comparisonHeader}
                  onPress={() => setShowComparison(!showComparison)}
                >
                  <MaterialIcons name="compare-arrows" size={20} color="#8B5CF6" />
                  <Text style={styles.comparisonHeaderText}>
                    Original vs Corrected
                  </Text>
                  <MaterialIcons
                    name={showComparison ? "expand-less" : "expand-more"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {showComparison && (
                  <View style={styles.comparisonBody}>
                    {/* Original Text */}
                    <View style={styles.comparisonSection}>
                      <View style={styles.comparisonLabelRow}>
                        <View style={[styles.comparisonDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={styles.comparisonLabel}>Original Text</Text>
                      </View>
                      <View style={styles.comparisonTextBox}>
                        <Text style={styles.comparisonOriginalText}>
                          {analysisResult.original_text}
                        </Text>
                      </View>
                    </View>

                    {/* Arrow */}
                    <View style={styles.comparisonArrow}>
                      <MaterialIcons name="arrow-downward" size={20} color="#8B5CF6" />
                    </View>

                    {/* Corrected Text (live preview based on accepted corrections) */}
                    <View style={styles.comparisonSection}>
                      <View style={styles.comparisonLabelRow}>
                        <View style={[styles.comparisonDot, { backgroundColor: '#10B981' }]} />
                        <Text style={[styles.comparisonLabel, { color: '#10B981' }]}>
                          Corrected Text
                          {acceptedCount > 0 && (
                            <Text style={styles.comparisonAcceptedHint}>
                              {` (${acceptedCount} accepted)`}
                            </Text>
                          )}
                        </Text>
                      </View>
                      <View style={[styles.comparisonTextBox, styles.comparisonCorrectedBox]}>
                        <Text style={styles.comparisonCorrectedText}>
                          {getPreviewText()}
                        </Text>
                      </View>
                    </View>

                    {/* Processing Time */}
                    {processingTimeSec && (
                      <Text style={styles.processingTime}>
                        Processing: {processingTimeSec}s | Model: {analysisResult.model_used || 'AI'}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* ─── ERROR PATTERN SUMMARY ─── */}
              <View style={styles.patternSummaryContainer}>
                <Text style={styles.patternSummaryTitle}>Error Types Found</Text>
                <View style={styles.patternSummaryRow}>
                  {getErrorPatternSummary().map(([pattern, count]) => (
                    <View
                      key={pattern}
                      style={[
                        styles.patternSummaryBadge,
                        { backgroundColor: getPatternColor(pattern) + '20', borderColor: getPatternColor(pattern) + '40' }
                      ]}
                    >
                      <MaterialIcons
                        name={getPatternIcon(pattern) as any}
                        size={14}
                        color={getPatternColor(pattern)}
                      />
                      <Text style={[styles.patternSummaryText, { color: getPatternColor(pattern) }]}>
                        {pattern} ({count})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ─── STATUS SUMMARY & BULK ACTIONS ─── */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {t("aiCorrection.errorFound")}: {errors.length}
                </Text>
                <View style={styles.countsRow}>
                  <View style={[styles.countBadge, { backgroundColor: '#064E3B' }]}>
                    <MaterialIcons name="check" size={12} color="#10B981" />
                    <Text style={styles.countBadgeAccepted}>{acceptedCount}</Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: '#7F1D1D' }]}>
                    <MaterialIcons name="close" size={12} color="#EF4444" />
                    <Text style={styles.countBadgeRejected}>{rejectedCount}</Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: '#374151' }]}>
                    <MaterialIcons name="help-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.countBadgePending}>{pendingCount}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.bulkActions}>
                <TouchableOpacity
                  style={styles.bulkButton}
                  onPress={handleAcceptAll}
                >
                  <MaterialIcons name="done-all" size={16} color="#10B981" />
                  <Text style={styles.bulkButtonTextAccept}>Accept All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkButton}
                  onPress={handleRejectAll}
                >
                  <MaterialIcons name="clear-all" size={16} color="#EF4444" />
                  <Text style={styles.bulkButtonTextReject}>Reject All</Text>
                </TouchableOpacity>
              </View>

              {/* ─── ERROR CARDS LIST ─── */}
              <View style={styles.errorCardsContainer}>
                <Text style={styles.errorCardsTitle}>Corrections</Text>
                {errors.map((token) => {
                  const patternColor = getPatternColor(token.pattern);
                  const isAccepted = token.status === 'accepted';
                  const isRejected = token.status === 'rejected';
                  const isPending = token.status === 'pending';

                  return (
                    <View
                      key={token.id}
                      style={[
                        styles.errorCard,
                        isAccepted && { borderColor: '#10B981', borderLeftWidth: 4 },
                        isRejected && { borderColor: '#EF4444', borderLeftWidth: 4, opacity: 0.5 },
                        isPending && { borderColor: patternColor, borderLeftWidth: 4 },
                      ]}
                    >
                      {/* Word Change: original -> suggestion */}
                      <View style={styles.errorCardWordRow}>
                        <Text style={styles.errorCardOriginal}>{token.word}</Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#6B7280" />
                        <Text style={styles.errorCardSuggestion}>
                          {token.editedSuggestion || token.suggestion}
                        </Text>
                        {isAccepted && (
                          <MaterialIcons name="check-circle" size={16} color="#10B981" style={{ marginLeft: 4 }} />
                        )}
                        {isRejected && (
                          <MaterialIcons name="cancel" size={16} color="#EF4444" style={{ marginLeft: 4 }} />
                        )}
                      </View>

                      {/* Pattern Badge */}
                      <View style={styles.errorCardPatternRow}>
                        <View style={[styles.errorCardPatternBadge, { backgroundColor: patternColor + '20' }]}>
                          <MaterialIcons name={getPatternIcon(token.pattern) as any} size={12} color={patternColor} />
                          <Text style={[styles.errorCardPatternText, { color: patternColor }]}>
                            {token.pattern}
                          </Text>
                        </View>
                        <Text style={styles.errorCardConfidence}>
                          {Math.round(token.confidence * 100)}% confidence
                        </Text>
                      </View>

                      {/* Explanation */}
                      {token.explanation && (
                        <Text style={styles.errorCardExplanation}>{token.explanation}</Text>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.errorCardActions}>
                        <TouchableOpacity
                          style={[
                            styles.errorCardActionBtn,
                            styles.acceptButton,
                            isAccepted && styles.buttonActiveAccept,
                          ]}
                          onPress={() => handleAccept(token.id)}
                        >
                          <MaterialIcons name="check" size={16} color="#10B981" />
                          <Text style={styles.acceptButtonText}>
                            {isAccepted ? 'Accepted' : 'Accept'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.errorCardActionBtn,
                            styles.rejectButton,
                            isRejected && styles.buttonActiveReject,
                          ]}
                          onPress={() => handleReject(token.id)}
                        >
                          <MaterialIcons name="close" size={16} color="#EF4444" />
                          <Text style={styles.rejectButtonText}>
                            {isRejected ? 'Rejected' : 'Reject'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.errorCardActionBtn, styles.editButton]}
                          onPress={() => setEditingId(editingId === token.id ? null : token.id)}
                        >
                          <MaterialIcons name="edit" size={16} color="#9CA3AF" />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Inline Editor */}
                      {editingId === token.id && (
                        <View style={styles.inlineEditor}>
                          <TextInput
                            style={styles.editInput}
                            defaultValue={token.editedSuggestion || token.suggestion || token.word}
                            onSubmitEditing={(e) => handleEdit(token.id, e.nativeEvent.text)}
                            autoFocus
                            placeholder="Type corrected word..."
                            placeholderTextColor="#6B7280"
                          />
                          <Text style={styles.editHint}>Press Enter to save</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* ─── INTERACTIVE TOKEN VIEW (collapsed by default) ─── */}
              <TouchableOpacity
                style={styles.tokenViewToggle}
                onPress={() => setSelectedTokenId(selectedTokenId ? null : 'show')}
              >
                <MaterialIcons name="text-fields" size={18} color="#6B7280" />
                <Text style={styles.tokenViewToggleText}>
                  {selectedTokenId === 'show' ? 'Hide' : 'Show'} Interactive Text View
                </Text>
              </TouchableOpacity>

              {selectedTokenId === 'show' && (
                <View style={styles.interactiveTextContainer}>
                  <View style={styles.textParagraph}>
                    {tokens.map((token, index) => {
                      const isError = token.type === 'error';
                      const isAccepted = token.status === 'accepted';
                      const isRejected = token.status === 'rejected';

                      const color = isError ? getPatternColor(token.pattern) : "#E5E7EB";

                      const displayWord = isAccepted
                        ? (token.editedSuggestion || token.suggestion)
                        : token.word;

                      const errorStyle = isError ? {
                        borderBottomWidth: 2,
                        borderBottomColor: isAccepted ? '#10B981' : isRejected ? '#EF4444' : color,
                      } : {};

                      return (
                        <View
                          key={token.id || `token-${index}`}
                          style={[styles.wordToken, errorStyle]}
                        >
                          <Text style={[
                            styles.wordText,
                            {
                              color: isError
                                ? (isAccepted ? '#10B981' : isRejected ? '#EF4444' : color)
                                : '#E5E7EB',
                              fontWeight: isError ? "600" : "400",
                              textDecorationLine: isError && isRejected ? 'line-through' : 'none',
                            }
                          ]}>
                            {displayWord}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ─── TEACHER FINAL EDITING ─── */}
              <View style={styles.teacherEditSection}>
                <TouchableOpacity
                  style={styles.teacherEditToggle}
                  onPress={toggleFinalEditor}
                >
                  <MaterialIcons
                    name={showFinalEditor ? "visibility-off" : "edit-note"}
                    size={20}
                    color="#F59E0B"
                  />
                  <Text style={styles.teacherEditToggleText}>
                    {showFinalEditor ? "Hide Editor" : "Teacher Edit"}
                  </Text>
                  <Text style={styles.teacherEditHint}>
                    {showFinalEditor ? "" : "(Edit final text manually)"}
                  </Text>
                </TouchableOpacity>

                {showFinalEditor && (
                  <View style={styles.finalEditorContainer}>
                    <Text style={styles.finalEditorLabel}>
                      Corrected Text (editable):
                    </Text>
                    <TextInput
                      style={styles.finalEditorInput}
                      value={finalText}
                      onChangeText={setFinalText}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      placeholder="Corrected text will appear here..."
                      placeholderTextColor="#6B7280"
                    />
                    <View style={styles.finalEditorActions}>
                      <TouchableOpacity
                        style={styles.refreshPreviewButton}
                        onPress={() => setFinalText(getPreviewText())}
                      >
                        <MaterialIcons name="refresh" size={16} color="#8B5CF6" />
                        <Text style={styles.refreshPreviewText}>Reload Preview</Text>
                      </TouchableOpacity>
                      <Text style={styles.charCount}>
                        {finalText.length} chars
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* ─── APPLY BUTTON ─── */}
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  (acceptedCount === 0 && !showFinalEditor) && styles.buttonDisabled,
                ]}
                onPress={handleApplyCorrections}
                disabled={acceptedCount === 0 && !showFinalEditor}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.applyButtonText}>
                  {showFinalEditor
                    ? "Apply Edited Text"
                    : `Apply Corrections (${acceptedCount})`
                  }
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* No Errors Message */}
          {analysisResult && errors.length === 0 && (
            <View style={styles.noErrorsContainer}>
              <MaterialIcons name="check-circle" size={48} color="#10B981" />
              <Text style={styles.noErrorsText}>No errors found!</Text>
              <Text style={styles.noErrorsSubtext}>
                The text appears to be correct.
              </Text>
              {analysisResult.corrected_text && (
                <View style={styles.noErrorsCorrectedBox}>
                  <Text style={styles.noErrorsCorrectedLabel}>Corrected Text:</Text>
                  <Text style={styles.noErrorsCorrectedText}>
                    {analysisResult.corrected_text}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ===========================
// Styles - Dark Theme
// ===========================

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#374151",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#111827",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F3F4F6",
  },
  headerErrorCount: {
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerErrorCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
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
    backgroundColor: "#064E3B",
  },
  statusOffline: {
    backgroundColor: "#7F1D1D",
  },
  statusText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  statusTextOffline: {
    fontSize: 12,
    color: "#FCA5A5",
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
    color: "#8B5CF6",
    fontWeight: "500",
  },
  manualInput: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#F3F4F6",
    minHeight: 100,
    marginBottom: 12,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#8B5CF6",
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
    backgroundColor: "#7F1D1D",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    flex: 1,
  },
  resultsContainer: {
    marginTop: 16,
  },

  // ─── Comparison View ───
  comparisonContainer: {
    backgroundColor: "#111827",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: 16,
    overflow: "hidden",
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#0D1117",
  },
  comparisonHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#D1D5DB",
  },
  comparisonBody: {
    padding: 12,
  },
  comparisonSection: {
    marginBottom: 8,
  },
  comparisonLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  comparisonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  comparisonAcceptedHint: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
    textTransform: "none",
  },
  comparisonTextBox: {
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF444430",
  },
  comparisonCorrectedBox: {
    borderColor: "#10B98130",
  },
  comparisonOriginalText: {
    fontSize: 15,
    color: "#F9FAFB",
    lineHeight: 24,
  },
  comparisonCorrectedText: {
    fontSize: 15,
    color: "#A7F3D0",
    lineHeight: 24,
    fontWeight: "500",
  },
  comparisonArrow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  processingTime: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 8,
  },

  // ─── Pattern Summary ───
  patternSummaryContainer: {
    marginBottom: 16,
  },
  patternSummaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  patternSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  patternSummaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  patternSummaryText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ─── Summary Row ───
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F3F4F6",
  },
  countsRow: {
    flexDirection: "row",
    gap: 6,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeAccepted: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  countBadgeRejected: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  countBadgePending: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  bulkActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#374151",
  },
  bulkButtonTextAccept: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
  bulkButtonTextReject: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
  },

  // ─── Error Cards ───
  errorCardsContainer: {
    marginBottom: 16,
  },
  errorCardsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorCard: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#374151",
  },
  errorCardWordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  errorCardOriginal: {
    fontSize: 17,
    color: "#FCA5A5",
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  errorCardSuggestion: {
    fontSize: 17,
    color: "#10B981",
    fontWeight: "700",
  },
  errorCardPatternRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  errorCardPatternBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  errorCardPatternText: {
    fontSize: 11,
    fontWeight: "600",
  },
  errorCardConfidence: {
    fontSize: 11,
    color: "#6B7280",
  },
  errorCardExplanation: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 10,
    lineHeight: 18,
  },
  errorCardActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  errorCardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  acceptButton: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B30",
  },
  rejectButton: {
    borderColor: "#EF4444",
    backgroundColor: "#7F1D1D30",
  },
  editButton: {
    borderColor: "#6B7280",
    backgroundColor: "#37415130",
  },
  buttonActiveAccept: {
    backgroundColor: "#064E3B",
    borderColor: "#10B981",
  },
  buttonActiveReject: {
    backgroundColor: "#7F1D1D",
    borderColor: "#EF4444",
  },
  acceptButtonText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  rejectButtonText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  editButtonText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  inlineEditor: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  editInput: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: "#10B981",
    paddingVertical: 4,
    minWidth: 80,
    backgroundColor: "#1F2937",
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  editHint: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },

  // ─── Interactive Token View ───
  tokenViewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  tokenViewToggleText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  interactiveTextContainer: {
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 16,
    marginBottom: 16,
    minHeight: 80,
  },
  textParagraph: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  wordToken: {
    marginHorizontal: 1,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  wordText: {
    fontSize: 16,
    lineHeight: 28,
  },

  // ─── Apply Button ───
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  noErrorsContainer: {
    alignItems: "center",
    padding: 24,
    marginTop: 16,
  },
  noErrorsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 12,
  },
  noErrorsSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  noErrorsCorrectedBox: {
    marginTop: 16,
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B98130",
    width: "100%",
  },
  noErrorsCorrectedLabel: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginBottom: 4,
  },
  noErrorsCorrectedText: {
    fontSize: 15,
    color: "#A7F3D0",
    lineHeight: 22,
  },

  // ─── Teacher Editing ───
  teacherEditSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 16,
  },
  teacherEditToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  teacherEditToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F59E0B",
  },
  teacherEditHint: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  finalEditorContainer: {
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
    padding: 12,
    marginBottom: 12,
  },
  finalEditorLabel: {
    fontSize: 13,
    color: "#D1D5DB",
    marginBottom: 8,
    fontWeight: "500",
  },
  finalEditorInput: {
    backgroundColor: "#1F2937",
    color: "#F3F4F6",
    fontSize: 16,
    padding: 12,
    borderRadius: 6,
    minHeight: 120,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  finalEditorActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  refreshPreviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
  },
  refreshPreviewText: {
    fontSize: 12,
    color: "#8B5CF6",
    fontWeight: "500",
  },
  charCount: {
    fontSize: 12,
    color: "#6B7280",
  },

  // ─── Legacy / Compatibility ───
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
});
