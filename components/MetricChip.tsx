import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MetricChip({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    gap: 6,
  },
  label: { fontWeight: "600", color: "#3730a3" },
  value: { color: "#1f2937" },
});
