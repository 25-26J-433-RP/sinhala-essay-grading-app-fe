// components/AICorrectionPanel.tsx
/**
 * AI Correction Panel Component
 * 
 * Displays AI-powered dyslexia correction suggestions
 * and allows users to accept/reject/edit corrections.
 * Matches the app's dark theme UI.
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
  type?: "error" | "correct" | string;
}

// ===========================
// Pattern Colors
// ===========================

const PATTERN_COLORS: Record<string, string> = {
  visual_scrambling: "#F59E0B",
  visual_sequencing: "#F59E0B",
  phonetic_confusion: "#8B5CF6",
  visual_reversal: "#EC4899",
  grammar_issue: "#3B82F6",
  grammar: "#3B82F6",
  unknown: "#6B7280",
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
  const [tokens, setTokens] = useState<CorrectionWithStatus[]>([]); // Renamed from corrections
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");
  
  // Teacher editing state
  const [showFinalEditor, setShowFinalEditor] = useState(false);
  const [finalText, setFinalText] = useState("");

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
      console.log("🏥 Health check response:", health);
      // Backend returns status: "healthy" and ollamaConnected: true
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
    // Optionally auto-select next error
    // findNextError(id);
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
      prev.map((c) => ({ ...c, status: "accepted" }))
    );
  };

  const handleRejectAll = () => {
    setTokens((prev) =>
      prev.map((c) => ({ ...c, status: "rejected" }))
    );
  };

  // Generate preview text with accepted corrections applied
  const getPreviewText = (): string => {
    let previewText = manualText.trim() || originalText;
    
    // Only process tokens that are errors AND accepted
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
    // Use teacher's edited text if editor is open, otherwise use preview
    const textToApply = showFinalEditor ? finalText : getPreviewText();
    
    onCorrectedText(textToApply);
    
    // Clear state after applying
    setAnalysisResult(null);
    setTokens([]);
    setShowFinalEditor(false);
    setFinalText("");
  };

  // ===========================
  // Render
  // ===========================

  const errors = tokens.filter(t => t.type === 'error');
  const pendingCount = errors.filter((c) => c.status === "pending").length;
  const acceptedCount = errors.filter((c) => c.status === "accepted").length;
  const rejectedCount = errors.filter((c) => c.status === "rejected").length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <View style={styles.headerLeft}>
          <MaterialIcons name="psychology" size={24} color="#8B5CF6" />
          <Text style={styles.headerTitle}>🧠 {t("aiCorrection.title")}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Health Status */}
          {isHealthy === null ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : isHealthy ? (
            <View style={[styles.statusBadge, styles.statusOnline]}>
              <Text style={styles.statusText}>සබැඳි</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusOffline]}>
              <Text style={styles.statusTextOffline}>නොබැඳි</Text>
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
              {showManualInput ? "පෙළ සඟවන්න" : "අතින් පෙළ ඇතුළත් කරන්න"}
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

          {/* Analysis Results */}
          {analysisResult && errors.length > 0 && (
            <View style={styles.resultsContainer}>
              {/* Summary */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {t("aiCorrection.errorFound")}: {analysisResult.total_errors}
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
                  <MaterialIcons name="done-all" size={16} color="#10B981" />
                  <Text style={styles.bulkButtonTextAccept}>සියල්ල පිළිගන්න</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkButton}
                  onPress={handleRejectAll}
                >
                  <MaterialIcons name="clear-all" size={16} color="#EF4444" />
                  <Text style={styles.bulkButtonTextReject}>සියල්ල ප්‍රතික්ෂේප</Text>
                </TouchableOpacity>
              </View>

              {/* Corrections List */}
              {/* Interactive Text View */}
              <View style={styles.interactiveTextContainer}>
                <View style={styles.textParagraph}>
                  {tokens.map((token, index) => {
                    const isError = token.type === 'error';
                    const isSelected = selectedTokenId === token.id;
                    const isAccepted = token.status === 'accepted';
                    const isRejected = token.status === 'rejected';
                    
                    const color = isError ? getPatternColor(token.pattern) : "#E5E7EB"; // Default text color
                    
                    const displayWord = isAccepted 
                      ? (token.editedSuggestion || token.suggestion)
                      : token.word;

                    // Style for error tokens
                    const errorStyle = isError ? {
                      borderBottomWidth: 2,
                      borderBottomColor: isAccepted ? '#10B981' : isRejected ? '#EF4444' : color,
                    } : {};

                    const tokenStyle = [
                      styles.wordToken,
                      errorStyle,
                      isSelected && { backgroundColor: (isError ? color : '#FFFFFF') + '20' },
                      isError && isAccepted && styles.acceptedToken, // Only dim verified errors
                      isError && isRejected && styles.rejectedToken,
                    ];

                    return (
                      <TouchableOpacity
                        key={token.id || `token-${index}`}
                        style={tokenStyle}
                        onPress={() => setSelectedTokenId(token.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.wordText,
                          { 
                            color: isError 
                              ? (isAccepted ? '#10B981' : isRejected ? '#EF4444' : color) 
                              : (isAccepted ? '#10B981' : '#E5E7EB'), // Green if manual edit accepted
                            fontWeight: isError || isAccepted ? "600" : "400"
                          }
                        ]}>
                          {displayWord}
                        </Text>
                        
                        {/* Status Dots for Errors */}
                        {isError && isAccepted && <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />}
                        {isError && isRejected && <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selected Error Detail Card */}
              {selectedTokenId && (() => {
                const token = tokens.find(t => t.id === selectedTokenId);
                if (!token) return null;
                
                const isError = token.type === 'error';
                
                return (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Text style={[
                        styles.detailOriginalWord,
                        !isError && { textDecorationLine: 'none', color: '#E5E7EB' }
                      ]}>
                        "{token.word}"
                      </Text>
                      {isError && (
                        <>
                          <MaterialIcons name="arrow-forward" size={16} color="#6B7280" />
                          <Text style={styles.detailSuggestedWord}>
                            {token.suggestion}
                          </Text>
                        </>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.closeDetailButton}
                        onPress={() => setSelectedTokenId(null)}
                      >
                        <MaterialIcons name="close" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    {/* Pattern Badge - Only for errors */}
                    {isError && (
                      <View style={styles.detailBadgeRow}>
                        <View style={[styles.patternBadge, { backgroundColor: getPatternColor(token.pattern) + '20' }]}>
                          <Text style={[styles.patternText, { color: getPatternColor(token.pattern) }]}>
                            {token.pattern} ({Math.round(token.confidence * 100)}%)
                          </Text>
                        </View>
                      </View>
                    )}

                    {token.explanation && (
                      <Text style={styles.detailExplanation}>{token.explanation}</Text>
                    )}

                    {/* Quick Actions */}
                    <View style={styles.detailActions}>
                      {isError ? (
                        <>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.acceptButton,
                              token.status === 'accepted' && styles.buttonActive
                            ]}
                            onPress={() => handleAccept(token.id)}
                          >
                             <MaterialIcons name="check" size={18} color="#10B981" />
                             <Text style={styles.acceptButtonText}>{t("aiCorrection.acceptCorrection")}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.rejectButton,
                              token.status === 'rejected' && styles.buttonActive
                            ]}
                            onPress={() => handleReject(token.id)}
                          >
                             <MaterialIcons name="close" size={18} color="#EF4444" />
                             <Text style={styles.rejectButtonText}>{t("aiCorrection.rejectCorrection")}</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={{ color: '#9CA3AF', fontStyle: 'italic', marginBottom: 8 }}>
                          {token.status === 'accepted' ? 'Manual Edit Applied' : 'Tap Edit Icon above to change text'}
                        </Text>
                      )}
                      
                      {/* Edit Button is always available via the Input logic or a button if I add it below. 
                          Wait, previous DetailCard didn't have an Edit BUTTON in the new design?
                          I only saw Accept/Reject.
                          I need to ADD an Edit button or Input field to the Detail Card. 
                          Steps 423 didn't include an Edit button in DetailCard.
                      */}
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => setEditingId(token.id)}
                      >
                        <MaterialIcons name="edit" size={18} color="#9CA3AF" />
                        <Text style={styles.editButtonText}>{t("aiCorrection.editCorrection")}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Inline Editor for Detail Card (if editingId matches) */}
                    {editingId === token.id && (
                       <View style={{ marginTop: 12 }}>
                         <TextInput
                            style={styles.editInput}
                            defaultValue={token.editedSuggestion || token.suggestion || token.word}
                            onSubmitEditing={(e) => handleEdit(token.id, e.nativeEvent.text)}
                            autoFocus
                            placeholder="Type new word..."
                            placeholderTextColor="#6B7280"
                         />
                         <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>Press Enter to save</Text>
                       </View>
                    )}
                  </View>
                );
              })()}

              {/* Teacher Final Editing Section */}
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
                    {showFinalEditor ? "සංස්කාරකය සඟවන්න" : "🧑‍🏫 ගුරු සංස්කරණය"}
                  </Text>
                  <Text style={styles.teacherEditHint}>
                    {showFinalEditor ? "" : "(අවසාන පෙළ සංස්කරණය කරන්න)"}
                  </Text>
                </TouchableOpacity>

                {showFinalEditor && (
                  <View style={styles.finalEditorContainer}>
                    <Text style={styles.finalEditorLabel}>
                      නිවැරදි කළ පෙළ (සංස්කරණය කළ හැක):
                    </Text>
                    <TextInput
                      style={styles.finalEditorInput}
                      value={finalText}
                      onChangeText={setFinalText}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      placeholder="නිවැරදි කළ පෙළ මෙහි පෙන්වයි..."
                      placeholderTextColor="#6B7280"
                    />
                    <View style={styles.finalEditorActions}>
                      <TouchableOpacity
                        style={styles.refreshPreviewButton}
                        onPress={() => setFinalText(getPreviewText())}
                      >
                        <MaterialIcons name="refresh" size={16} color="#8B5CF6" />
                        <Text style={styles.refreshPreviewText}>යළි පූරණය</Text>
                      </TouchableOpacity>
                      <Text style={styles.charCount}>
                        {finalText.length} අක්ෂර
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Apply Button */}
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
                    ? "සංස්කරණය කළ පෙළ යොදන්න" 
                    : `${t("aiCorrection.saveCorrection")} (${acceptedCount})`
                  }
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* No Errors Message */}
          {analysisResult && errors.length === 0 && (
            <View style={styles.noErrorsContainer}>
              <MaterialIcons name="check-circle" size={48} color="#10B981" />
              <Text style={styles.noErrorsText}>දෝෂ හමු නොවීය!</Text>
              <Text style={styles.noErrorsSubtext}>
                පෙළ නිවැරදි ලෙස පෙනේ.
              </Text>
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
    color: "#9CA3AF",
    fontWeight: "500",
  },
  bulkActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#374151",
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
    backgroundColor: "#111827",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cardAccepted: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B20",
  },
  cardRejected: {
    borderColor: "#EF4444",
    backgroundColor: "#7F1D1D20",
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
    color: "#FCA5A5",
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
    color: "#9CA3AF",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
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
    color: "#9CA3AF",
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
    color: "#9CA3AF",
    marginTop: 4,
  },
  
  // Teacher Editing Styles
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
  
  // Interactive Text View Styles
  interactiveTextContainer: {
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 16,
    marginBottom: 16,
    minHeight: 100,
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
  errorToken: {
    borderBottomWidth: 2,
    marginHorizontal: 2,
    paddingHorizontal: 2,
    borderRadius: 4,
    position: 'relative',
  },
  errorTokenText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 28,
  },
  statusDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  acceptedToken: {
    backgroundColor: 'transparent',
  },
  rejectedToken: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  
  // Detail Card Styles
  detailCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1F2937",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 100,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailOriginalWord: {
    fontSize: 18,
    color: "#EF4444",
    textDecorationLine: 'line-through',
  },
  detailSuggestedWord: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "bold",
  },
  closeDetailButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  detailBadgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailExplanation: {
    fontSize: 14,
    color: "#D1D5DB",
    marginBottom: 16,
    lineHeight: 20,
  },
  detailActions: {
    flexDirection: "row",
    gap: 12,
  },
});
