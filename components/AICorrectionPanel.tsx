// components/AICorrectionPanel.tsx
/**
 * AI Correction Panel — Interactive Dashboard
 *
 * Shows AI-powered dyslexia correction suggestions in an interactive
 * dual-pane layout: the original text with tappable highlighted error
 * words on top, and a live corrected preview below.
 *
 * Behaviour is gated by an optional dyslexiaLabel prop:
 *   • "DYSLEXIC ESSAY"  → panel is expanded, banner suggests correction
 *   • "NORMAL ESSAY"    → panel collapsed, user can manually open it
 *   • undefined         → panel shown normally (backward-compat)
 *
 * Dark theme.  Uses sub-components from components/correction/.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLanguage } from "@/contexts/LanguageContext";
import aiCorrectionService, {
  type AnalyzeResponse,
} from "@/app/api/aiCorrection";

import {
  StatsBar,
  CorrectionPopover,
  TokenizedText,
  type CorrectionWithStatus,
} from "@/components/correction";

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
  /**
   * Dyslexia detection label from the detection microservice.
   * "DYSLEXIC ESSAY" | "NORMAL ESSAY" | undefined
   */
  dyslexiaLabel?: string;
}

// ===========================
// Component
// ===========================

export default function AICorrectionPanel({
  originalText,
  onCorrectedText,
  onAnalysisComplete,
  autoAnalyze = false,
  initialCollapsed = false,
  dyslexiaLabel,
}: AICorrectionPanelProps) {
  const { t } = useLanguage();
  const hasAutoAnalyzed = useRef(false);

  // ─── State ───
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(
    null,
  );
  const [tokens, setTokens] = useState<CorrectionWithStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");

  // Popover state
  const [popoverTokenId, setPopoverTokenId] = useState<string | null>(null);

  // Teacher editing
  const [showFinalEditor, setShowFinalEditor] = useState(false);
  const [finalText, setFinalText] = useState("");

  // ─── Health check on mount ───
  useEffect(() => {
    checkHealth();
  }, []);

  // ─── Auto-analyze (only once) ───
  useEffect(() => {
    if (
      autoAnalyze &&
      originalText &&
      originalText.trim().length > 0 &&
      isHealthy &&
      !hasAutoAnalyzed.current &&
      !analysisResult
    ) {
      hasAutoAnalyzed.current = true;
      handleAnalyze();
    }
  }, [originalText, isHealthy, autoAnalyze]);

  // ─── Collapse when dyslexiaLabel says normal ───
  useEffect(() => {
    if (dyslexiaLabel === "NORMAL ESSAY") {
      setIsCollapsed(true);
    } else if (dyslexiaLabel === "DYSLEXIC ESSAY") {
      setIsCollapsed(false);
    }
  }, [dyslexiaLabel]);

  // ===========================
  // Handlers
  // ===========================

  const checkHealth = async () => {
    try {
      const health = await aiCorrectionService.checkHealth();
      const isOnline =
        health.status === "healthy" ||
        health.status === "ok" ||
        health.ollamaConnected === true ||
        health.ollama_connected === true;
      setIsHealthy(isOnline);
    } catch {
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
    setPopoverTokenId(null);

    try {
      const result = await aiCorrectionService.analyzeText(textToAnalyze);
      setAnalysisResult(result);

      const tokensWithStatus: CorrectionWithStatus[] = result.corrections.map(
        (c, idx) => ({
          ...c,
          id: `token-${idx}`,
          status: "pending" as const,
        }),
      );
      setTokens(tokensWithStatus);
      onAnalysisComplete?.(result);
    } catch (err: any) {
      setError(err.message || t("aiCorrection.noResults"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Token actions ───

  const handleAccept = (id: string) => {
    setTokens((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "accepted" } : c)),
    );
  };

  const handleReject = (id: string) => {
    setTokens((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c)),
    );
  };

  const handleEdit = (id: string, newSuggestion: string) => {
    setTokens((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, editedSuggestion: newSuggestion, status: "accepted" }
          : c,
      ),
    );
  };

  const handleAcceptAll = () => {
    setTokens((prev) =>
      prev.map((c) => (c.type === "error" ? { ...c, status: "accepted" } : c)),
    );
  };

  const handleRejectAll = () => {
    setTokens((prev) =>
      prev.map((c) => (c.type === "error" ? { ...c, status: "rejected" } : c)),
    );
  };

  // ─── Preview text with accepted corrections applied ───
  const getPreviewText = (): string => {
    let previewText = manualText.trim() || originalText;
    const accepted = tokens
      .filter((c) => c.type === "error" && c.status === "accepted")
      .map((c) => ({
        word: c.word,
        suggestion: c.editedSuggestion || c.suggestion,
      }));

    for (const correction of accepted) {
      previewText = previewText.replace(correction.word, correction.suggestion);
    }
    return previewText;
  };

  // ─── Teacher editor ───
  const toggleFinalEditor = () => {
    if (!showFinalEditor) setFinalText(getPreviewText());
    setShowFinalEditor(!showFinalEditor);
  };

  const handleApplyCorrections = () => {
    const textToApply = showFinalEditor ? finalText : getPreviewText();
    onCorrectedText(textToApply);

    // Reset
    setAnalysisResult(null);
    setTokens([]);
    setShowFinalEditor(false);
    setFinalText("");
    hasAutoAnalyzed.current = false;
  };

  // ─── Error pattern summary ───
  const getErrorPatternSummary = (): [string, number][] => {
    const patterns: Record<string, number> = {};
    tokens
      .filter((t) => t.type === "error")
      .forEach((token) => {
        const p = token.pattern || "Unknown";
        patterns[p] = (patterns[p] || 0) + 1;
      });
    return Object.entries(patterns);
  };

  // ─── Popover helpers ───
  const popoverToken = popoverTokenId
    ? (tokens.find((t) => t.id === popoverTokenId) ?? null)
    : null;

  // ─── Derived counts ───
  const errors = tokens.filter((t) => t.type === "error");
  const pendingCount = errors.filter((c) => c.status === "pending").length;
  const acceptedCount = errors.filter((c) => c.status === "accepted").length;
  const rejectedCount = errors.filter((c) => c.status === "rejected").length;
  const processingTimeSec = analysisResult?.processing_time_ms
    ? (analysisResult.processing_time_ms / 1000).toFixed(1)
    : null;

  // ===========================
  // Render
  // ===========================

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
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

      {/* ─── CONTENT ─── */}
      {!isCollapsed && (
        <View style={styles.content}>
          {/* ─── Dyslexia Status Banner ─── */}
          {dyslexiaLabel && (
            <View
              style={[
                styles.dyslexiaBanner,
                dyslexiaLabel === "DYSLEXIC ESSAY"
                  ? styles.bannerDyslexic
                  : styles.bannerNormal,
              ]}
            >
              <MaterialIcons
                name={
                  dyslexiaLabel === "DYSLEXIC ESSAY"
                    ? "warning"
                    : "check-circle"
                }
                size={20}
                color={
                  dyslexiaLabel === "DYSLEXIC ESSAY" ? "#F59E0B" : "#10B981"
                }
              />
              <View style={styles.bannerTextWrap}>
                <Text style={styles.bannerTitle}>
                  {dyslexiaLabel === "DYSLEXIC ESSAY"
                    ? "Dyslexic patterns detected"
                    : "No dyslexic patterns detected"}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {dyslexiaLabel === "DYSLEXIC ESSAY"
                    ? "AI correction is recommended for this essay."
                    : "You can still run AI correction manually."}
                </Text>
              </View>
            </View>
          )}

          {/* ─── Manual Input Toggle ─── */}
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

          {/* ─── Analyze Button ─── */}
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

          {/* ─── Error Message ─── */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* =============================== */}
          {/* ANALYSIS RESULTS — DASHBOARD    */}
          {/* =============================== */}
          {analysisResult && errors.length > 0 && (
            <View style={styles.resultsContainer}>
              {/* ─── Stats Bar ─── */}
              <StatsBar
                totalErrors={errors.length}
                accepted={acceptedCount}
                rejected={rejectedCount}
                pending={pendingCount}
                patterns={getErrorPatternSummary()}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
              />

              {/* ─── DUAL-PANE: Original (tappable tokens) + Corrected Preview ─── */}
              <View style={styles.dualPane}>
                {/* ── Top: Original Text with Error Highlights ── */}
                <View style={styles.pane}>
                  <View style={styles.paneLabelRow}>
                    <View
                      style={[styles.paneDot, { backgroundColor: "#EF4444" }]}
                    />
                    <Text style={styles.paneLabel}>Original Text</Text>
                    <Text style={styles.paneHint}>(tap errors to review)</Text>
                  </View>
                  <TokenizedText
                    tokens={tokens}
                    onTokenPress={(id) => setPopoverTokenId(id)}
                    showCorrected={false}
                  />
                </View>

                {/* ── Separator ── */}
                <View style={styles.separator}>
                  <MaterialIcons
                    name="arrow-downward"
                    size={18}
                    color="#8B5CF6"
                  />
                </View>

                {/* ── Bottom: Live Corrected Preview ── */}
                <View style={styles.pane}>
                  <View style={styles.paneLabelRow}>
                    <View
                      style={[styles.paneDot, { backgroundColor: "#10B981" }]}
                    />
                    <Text style={[styles.paneLabel, { color: "#10B981" }]}>
                      Corrected Preview
                    </Text>
                    {acceptedCount > 0 && (
                      <Text style={styles.paneHint}>
                        ({acceptedCount} accepted)
                      </Text>
                    )}
                  </View>
                  <TokenizedText
                    tokens={tokens}
                    onTokenPress={(id) => setPopoverTokenId(id)}
                    showCorrected
                  />
                </View>

                {/* Processing time */}
                {processingTimeSec && (
                  <Text style={styles.processingTime}>
                    Processing: {processingTimeSec}s | Model:{" "}
                    {analysisResult.model_used || "AI"}
                  </Text>
                )}
              </View>

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
                        <MaterialIcons
                          name="refresh"
                          size={16}
                          color="#8B5CF6"
                        />
                        <Text style={styles.refreshPreviewText}>
                          Reload Preview
                        </Text>
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
                  acceptedCount === 0 &&
                    !showFinalEditor &&
                    styles.buttonDisabled,
                ]}
                onPress={handleApplyCorrections}
                disabled={acceptedCount === 0 && !showFinalEditor}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.applyButtonText}>
                  {showFinalEditor
                    ? "Apply Edited Text"
                    : `Apply Corrections (${acceptedCount})`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── No Errors Message ─── */}
          {analysisResult && errors.length === 0 && (
            <View style={styles.noErrorsContainer}>
              <MaterialIcons name="check-circle" size={48} color="#10B981" />
              <Text style={styles.noErrorsText}>No errors found!</Text>
              <Text style={styles.noErrorsSubtext}>
                The text appears to be correct.
              </Text>
              {analysisResult.corrected_text && (
                <View style={styles.noErrorsCorrectedBox}>
                  <Text style={styles.noErrorsCorrectedLabel}>
                    Corrected Text:
                  </Text>
                  <Text style={styles.noErrorsCorrectedText}>
                    {analysisResult.corrected_text}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ─── Correction Popover Modal ─── */}
      <CorrectionPopover
        visible={!!popoverTokenId}
        token={popoverToken}
        onAccept={() => {
          if (popoverTokenId) handleAccept(popoverTokenId);
          setPopoverTokenId(null);
        }}
        onReject={() => {
          if (popoverTokenId) handleReject(popoverTokenId);
          setPopoverTokenId(null);
        }}
        onEdit={(newText) => {
          if (popoverTokenId) handleEdit(popoverTokenId, newText);
          setPopoverTokenId(null);
        }}
        onClose={() => setPopoverTokenId(null)}
      />
    </View>
  );
}

// ===========================
// Styles — Dark Theme
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

  // ─── Header ───
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
  statusOnline: { backgroundColor: "#064E3B" },
  statusOffline: { backgroundColor: "#7F1D1D" },
  statusText: { fontSize: 12, color: "#10B981", fontWeight: "500" },
  statusTextOffline: { fontSize: 12, color: "#FCA5A5", fontWeight: "500" },

  // ─── Content ───
  content: { padding: 16 },

  // ─── Dyslexia Banner ───
  dyslexiaBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  bannerDyslexic: {
    backgroundColor: "#78350F30",
    borderColor: "#F59E0B40",
  },
  bannerNormal: {
    backgroundColor: "#064E3B30",
    borderColor: "#10B98140",
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F3F4F6",
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  // ─── Manual Input ───
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

  // ─── Analyze Button ───
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#8B5CF6",
    padding: 14,
    borderRadius: 8,
  },
  analyzeButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },

  // ─── Error ───
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7F1D1D",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: { color: "#FCA5A5", fontSize: 14, flex: 1 },

  // ─── Results ───
  resultsContainer: { marginTop: 16 },

  // ─── Dual Pane ───
  dualPane: {
    marginBottom: 16,
  },
  pane: {
    marginBottom: 4,
  },
  paneLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  paneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paneLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paneHint: {
    fontSize: 11,
    color: "#6B7280",
    fontStyle: "italic",
  },
  separator: {
    alignItems: "center",
    paddingVertical: 4,
  },
  processingTime: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 6,
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
  refreshPreviewText: { fontSize: 12, color: "#8B5CF6", fontWeight: "500" },
  charCount: { fontSize: 12, color: "#6B7280" },

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
  applyButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // ─── No Errors ───
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
  noErrorsSubtext: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
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
});
