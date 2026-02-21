// components/correction/StatsBar.tsx
/**
 * Horizontal badge bar showing error pattern summary and accept/reject counts.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getPatternColor, getPatternIcon } from "./types";

interface StatsBarProps {
  totalErrors: number;
  accepted: number;
  rejected: number;
  pending: number;
  patterns: [string, number][];
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export default function StatsBar({
  totalErrors,
  accepted,
  rejected,
  pending,
  patterns,
  onAcceptAll,
  onRejectAll,
}: StatsBarProps) {
  return (
    <View style={styles.container}>
      {/* ─── Pattern Badges ─── */}
      {patterns.length > 0 && (
        <View style={styles.patternRow}>
          {patterns.map(([pattern, count]) => {
            const color = getPatternColor(pattern);
            return (
              <View
                key={pattern}
                style={[
                  styles.patternBadge,
                  { backgroundColor: color + "20", borderColor: color + "40" },
                ]}
              >
                <MaterialIcons
                  name={getPatternIcon(pattern) as any}
                  size={13}
                  color={color}
                />
                <Text style={[styles.patternText, { color }]}>
                  {pattern} ({count})
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── Counts Row ─── */}
      <View style={styles.countsRow}>
        <Text style={styles.totalText}>Errors: {totalErrors}</Text>

        <View style={styles.badges}>
          <View style={[styles.countBadge, { backgroundColor: "#064E3B" }]}>
            <MaterialIcons name="check" size={12} color="#10B981" />
            <Text style={styles.countAccepted}>{accepted}</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: "#7F1D1D" }]}>
            <MaterialIcons name="close" size={12} color="#EF4444" />
            <Text style={styles.countRejected}>{rejected}</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: "#374151" }]}>
            <MaterialIcons name="help-outline" size={12} color="#9CA3AF" />
            <Text style={styles.countPending}>{pending}</Text>
          </View>
        </View>
      </View>

      {/* ─── Bulk Actions ─── */}
      <View style={styles.bulkActions}>
        <TouchableOpacity style={styles.bulkButton} onPress={onAcceptAll}>
          <MaterialIcons name="done-all" size={16} color="#10B981" />
          <Text style={styles.bulkAcceptText}>Accept All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkButton} onPress={onRejectAll}>
          <MaterialIcons name="clear-all" size={16} color="#EF4444" />
          <Text style={styles.bulkRejectText}>Reject All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  patternRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  patternBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  patternText: {
    fontSize: 11,
    fontWeight: "600",
  },
  countsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F3F4F6",
  },
  badges: {
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
  countAccepted: { fontSize: 12, color: "#10B981", fontWeight: "600" },
  countRejected: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  countPending: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  bulkActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
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
  bulkAcceptText: { fontSize: 13, color: "#10B981", fontWeight: "600" },
  bulkRejectText: { fontSize: 13, color: "#EF4444", fontWeight: "600" },
});
