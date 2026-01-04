import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { toMessage } from "../api/client";
import { scoreSinhala } from "../api/scoreSinhala";

export default function SinhalaScoreScreen() {
  // 🔹 READ OCR TEXT FROM ROUTE (NEW)
  const { ocrText } = useLocalSearchParams<{ ocrText?: string }>();

  const [text, setText] = useState<string>("");
  const [grade, setGrade] = useState<string>("6");
  const [topic, setTopic] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔥 AUTO-FILL ESSAY WHEN OCR TEXT EXISTS (NEW)
  useEffect(() => {
    if (ocrText && typeof ocrText === "string") {
      setText(ocrText);
    }
  }, [ocrText]);

  const onScore = async () => {
    setResult(null);
    setError(null);

    if (!text.trim()) {
      setError("Please enter your Sinhala essay.");
      return;
    }

    setLoading(true);
    try {
      const res = await scoreSinhala({
        text,
        grade: Number(grade),
        topic,
      });
      setResult(res);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sinhala Essay Scorer</Text>

      <Text style={styles.label}>Grade *</Text>
      <TextInput
        value={grade}
        onChangeText={setGrade}
        placeholder="Enter Grade 3–8"
        style={styles.input}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Topic (optional)</Text>
      <TextInput
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. මගේ පාසල"
        style={styles.input}
      />

      <Text style={styles.label}>Essay *</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Paste Sinhala essay here"
        multiline
        numberOfLines={10}
        style={[styles.input, styles.textArea]}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={onScore}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Score</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.resultBox}>
          <Text>Model: {result.details.model}</Text>
          <Text>
            Dyslexic: {result.details.dyslexic_flag ? "Yes" : "No"}
          </Text>
          <Text>Topic: {result.details.topic || "—"}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  label: { marginTop: 12, marginBottom: 6, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  textArea: { minHeight: 140, textAlignVertical: "top" },
  button: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  error: { marginTop: 10, color: "red", fontWeight: "600" },
  resultBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  score: { fontSize: 28, fontWeight: "bold" },
});
