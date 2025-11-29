// app/screens/ScoreScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { scoreEssay, type ScoreResponse } from "../api/score";
import { toMessage } from "../api/client";

import MetricChip from "../../components/MetricChip";
import JsonBlock from "../../components/JsonBlock";

export default function ScoreScreen() {
  const insets = useSafeAreaInsets();

  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [showJson, setShowJson] = useState(false);

  const onScore = async () => {
    setError(null);
    setResult(null);

    if (!text.trim()) {
      setError("Please enter an essay.");
      return;
    }

    setLoading(true);
    try {
      const data = await scoreEssay(text, prompt);
      setResult(data);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const topPad = Math.max(insets.top, StatusBar.currentHeight ?? 0) + 8;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: topPad }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with logo + title */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.title}>Bias-Aware Grader</Text>
            <Text style={styles.subtitle}>
              Paste an essay and optionally a prompt, then score.
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Prompt (optional)</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g., Grade the essay fairly while considering dyslexia-related errors"
            style={styles.input}
          />

          <Text style={styles.label}>Essay *</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Paste your essay here"
            multiline
            numberOfLines={10}
            style={[styles.input, styles.textarea]}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.8 }]}
            onPress={onScore}
            disabled={loading}
          >
            {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Score</Text>}
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Result Card */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Result</Text>
            <Text style={styles.scoreValue}>{result.score.toFixed(2)}</Text>

            <View style={styles.metricsRow}>
              <MetricChip label="SPD" value={Number(result.fairness_report.spd).toFixed(3)} />
              <MetricChip label="DIR" value={Number(result.fairness_report.dir).toFixed(3)} />
              <MetricChip label="EOD" value={Number(result.fairness_report.eod).toFixed(3)} />
            </View>

            <Text style={styles.mitigation}>
              Mitigation: {result.fairness_report.mitigation_used ?? "none"}
            </Text>

            <TouchableOpacity
              style={styles.jsonToggle}
              onPress={() => setShowJson((v) => !v)}
            >
              <Text style={styles.jsonToggleText}>
                {showJson ? "Hide raw response" : "Show raw response"}
              </Text>
            </TouchableOpacity>

            {showJson && <JsonBlock obj={result} />}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MAX_WIDTH = 920;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Platform.select({ web: "#0b0b0b00", default: "#F7F7F9" }),
  },
  page: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: "center",
  },
  header: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  logo: { width: 28, height: 28, borderRadius: 6 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6b7280", marginTop: 2 },

  card: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  label: { fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: { minHeight: 160, textAlignVertical: "top" },

  button: {
    marginTop: 18,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "center",
    minWidth: 220,
  },
  buttonText: { color: "white", fontWeight: "700", textAlign: "center" },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  errorText: { color: "#991b1b" },

  resultCard: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginTop: 16,
  },
  resultTitle: { fontWeight: "700", marginBottom: 6 },
  scoreValue: { fontSize: 36, fontWeight: "900", marginBottom: 8 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  mitigation: { marginTop: 6, color: "#374151" },
  jsonToggle: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  jsonToggleText: { color: "#334155" },
});
