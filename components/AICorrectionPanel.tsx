import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export interface AnalyzeResponse {
  corrections: Array<{
    word: string;
    suggestion: string;
    type?: string;
  }>;
  corrected_text?: string;
  model_used?: string;
  processing_time_ms?: number;
}

interface AICorrectionPanelProps {
  originalText: string;
  onCorrectedText: (text: string) => void;
  onAnalysisComplete?: (result: AnalyzeResponse) => void;
  autoAnalyze?: boolean;
  initialCollapsed?: boolean;
  dyslexiaLabel?: string;
  studentId?: string;
  imageId?: string;
  teacherId?: string;
}

export default function AICorrectionPanel({
  originalText,
  onCorrectedText,
  onAnalysisComplete,
  initialCollapsed = false,
  dyslexiaLabel
}: AICorrectionPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [manualText, setManualText] = useState("");

  const normalizedText = useMemo(
    () => (manualText.trim() || originalText)
      .replace(/\r\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim(),
    [manualText, originalText]
  );

  const applyText = () => {
    onCorrectedText(normalizedText);
    onAnalysisComplete?.({
      corrections: [],
      corrected_text: normalizedText,
      model_used: "disabled"
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsCollapsed((prev) => !prev)}
      >
        <Text style={styles.headerTitle}>AI Correction</Text>
        <Text style={styles.headerHint}>{isCollapsed ? "Expand" : "Collapse"}</Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.content}>
          <Text style={styles.notice}>
            Advanced AI correction is temporarily disabled in this minimal patch.
          </Text>

          {dyslexiaLabel ? (
            <Text style={styles.meta}>Detection: {dyslexiaLabel}</Text>
          ) : null}

          <TextInput
            style={styles.input}
            value={manualText}
            onChangeText={setManualText}
            placeholder="Edit text manually before applying"
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.applyButton} onPress={applyText}>
            <Text style={styles.applyButtonText}>Apply Edited Text</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#131A2B",
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#22324D",
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#0F1B33"
  },
  headerTitle: {
    color: "#F3F4F6",
    fontSize: 16,
    fontWeight: "700"
  },
  headerHint: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600"
  },
  content: {
    padding: 14,
    backgroundColor: "#1B273B"
  },
  notice: {
    color: "#FBBF24",
    marginBottom: 10,
    fontSize: 13
  },
  meta: {
    color: "#CBD5E1",
    marginBottom: 10,
    fontSize: 12
  },
  input: {
    backgroundColor: "#0C172A",
    borderWidth: 1,
    borderColor: "#2A3A54",
    borderRadius: 8,
    padding: 12,
    color: "#F3F4F6",
    minHeight: 100,
    marginBottom: 12
  },
  applyButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0EA5E9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700"
  }
});
