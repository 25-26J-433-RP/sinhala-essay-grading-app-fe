import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { scoreSinhala } from "../api/scoreSinhala";
import { toMessage } from "../api/client";

export default function SinhalaScoreScreen() {
  const [text, setText] = useState<string>("");
  const [grade, setGrade] = useState<string>("6");
  const [topic, setTopic] = useState<string>("");

  // FIX: define proper types
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

      <TouchableOpacity style={styles.button} onPress={onScore} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Score</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.score}>Score: {result.score}</Text>
          <Text>Word Count: {result.details.word_count}</Text>
          <Text>Unique Words: {result.details.unique_words}</Text>
          <Text>Avg Word Length: {result.details.avg_word_length}</Text>
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
