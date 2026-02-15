// components/correction/CorrectionHistory.tsx
/**
 * Displays past correction sessions for a student.
 * Shows trend data (errors over time) and a list of past sessions
 * with expandable details and annotations.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  getCorrectionHistory,
  computeTrends,
  type CorrectionHistoryDoc,
  type TrendPoint,
} from "@/services/correctionHistoryService";
import { getPatternColor } from "./types";

interface CorrectionHistoryProps {
  studentId: string;
  /** Called to dismiss / collapse the history panel */
  onClose: () => void;
}

export default function CorrectionHistory({
  studentId,
  onClose,
}: CorrectionHistoryProps) {
  const [history, setHistory] = useState<CorrectionHistoryDoc[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await getCorrectionHistory(studentId);
      setHistory(docs);
      setTrends(computeTrends(docs));
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Trend bar (simple sparkline-style) ───
  const maxErrors = Math.max(...trends.map((t) => t.totalErrors), 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="history" size={20} color="#8B5CF6" />
          <Text style={styles.headerTitle}>Correction History</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{history.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading history…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <MaterialIcons name="error-outline" size={20} color="#FCA5A5" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadHistory}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="inbox" size={40} color="#4B5563" />
          <Text style={styles.emptyText}>
            No correction history for this student yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* ─── Trend Chart ─── */}
          {trends.length >= 2 && (
            <View style={styles.trendSection}>
              <Text style={styles.sectionTitle}>Error Trend</Text>
              <View style={styles.trendChart}>
                {trends.map((point, i) => {
                  const barHeight = Math.max(
                    (point.totalErrors / maxErrors) * 60,
                    4,
                  );
                  const improving =
                    i > 0 && point.totalErrors < trends[i - 1].totalErrors;
                  return (
                    <View key={i} style={styles.trendBarWrap}>
                      <Text style={styles.trendBarValue}>
                        {point.totalErrors}
                      </Text>
                      <View
                        style={[
                          styles.trendBar,
                          {
                            height: barHeight,
                            backgroundColor: improving ? "#10B981" : "#EF4444",
                          },
                        ]}
                      />
                      <Text style={styles.trendBarDate}>
                        {point.date.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {/* Trend summary */}
              {trends.length >= 2 && (
                <View style={styles.trendSummary}>
                  {trends[trends.length - 1].totalErrors <
                  trends[0].totalErrors ? (
                    <>
                      <MaterialIcons
                        name="trending-down"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={[styles.trendSummaryText, { color: "#10B981" }]}>
                        Errors decreased from {trends[0].totalErrors} to{" "}
                        {trends[trends.length - 1].totalErrors}
                      </Text>
                    </>
                  ) : trends[trends.length - 1].totalErrors >
                    trends[0].totalErrors ? (
                    <>
                      <MaterialIcons
                        name="trending-up"
                        size={16}
                        color="#F59E0B"
                      />
                      <Text style={[styles.trendSummaryText, { color: "#F59E0B" }]}>
                        Errors increased from {trends[0].totalErrors} to{" "}
                        {trends[trends.length - 1].totalErrors}
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons
                        name="trending-flat"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.trendSummaryText}>
                        Error count is stable
                      </Text>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ─── Session List ─── */}
          <Text style={styles.sectionTitle}>Past Sessions</Text>
          {history.map((session) => {
            const isExpanded = expandedId === session.id;
            const annotatedCount = session.corrections.filter(
              (c) => c.annotation,
            ).length;

            return (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() =>
                  setExpandedId(isExpanded ? null : session.id || null)
                }
                activeOpacity={0.7}
              >
                {/* Session header row */}
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionMeta}>
                    <Text style={styles.sessionDate}>
                      {formatDate(session.createdAt)}
                    </Text>
                    {session.dyslexiaLabel === "DYSLEXIC ESSAY" && (
                      <View style={styles.dyslexicTag}>
                        <Text style={styles.dyslexicTagText}>Dyslexic</Text>
                      </View>
                    )}
                  </View>
                  <MaterialIcons
                    name={isExpanded ? "expand-less" : "expand-more"}
                    size={20}
                    color="#9CA3AF"
                  />
                </View>

                {/* Stats row */}
                <View style={styles.sessionStats}>
                  <View style={styles.statPill}>
                    <Text style={styles.statValue}>
                      {session.summary.totalErrors}
                    </Text>
                    <Text style={styles.statLabel}>errors</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: "#064E3B" }]}>
                    <Text style={[styles.statValue, { color: "#10B981" }]}>
                      {session.summary.accepted}
                    </Text>
                    <Text style={styles.statLabel}>accepted</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: "#7F1D1D" }]}>
                    <Text style={[styles.statValue, { color: "#EF4444" }]}>
                      {session.summary.rejected}
                    </Text>
                    <Text style={styles.statLabel}>rejected</Text>
                  </View>
                  {session.summary.edited > 0 && (
                    <View style={[styles.statPill, { backgroundColor: "#78350F" }]}>
                      <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                        {session.summary.edited}
                      </Text>
                      <Text style={styles.statLabel}>edited</Text>
                    </View>
                  )}
                  {annotatedCount > 0 && (
                    <View style={[styles.statPill, { backgroundColor: "#312E81" }]}>
                      <Text style={[styles.statValue, { color: "#8B5CF6" }]}>
                        {annotatedCount}
                      </Text>
                      <Text style={styles.statLabel}>notes</Text>
                    </View>
                  )}
                </View>

                {/* Pattern breakdown */}
                <View style={styles.patternRow}>
                  {Object.entries(session.summary.patternBreakdown).map(
                    ([pattern, count]) => (
                      <View
                        key={pattern}
                        style={[
                          styles.patternChip,
                          {
                            backgroundColor: getPatternColor(pattern) + "20",
                            borderColor: getPatternColor(pattern) + "40",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.patternChipText,
                            { color: getPatternColor(pattern) },
                          ]}
                        >
                          {pattern} ({count})
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                {/* ─── Expanded details ─── */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {/* Corrections with annotations */}
                    <Text style={styles.expandedTitle}>Corrections</Text>
                    {session.corrections
                      .filter((c) => c.type === "error")
                      .map((c, idx) => (
                        <View key={idx} style={styles.correctionRow}>
                          <View style={styles.correctionWords}>
                            <Text style={styles.correctionOriginal}>
                              {c.word}
                            </Text>
                            <MaterialIcons
                              name="arrow-forward"
                              size={12}
                              color="#6B7280"
                            />
                            <Text
                              style={[
                                styles.correctionSuggestion,
                                {
                                  color:
                                    c.status === "accepted"
                                      ? "#10B981"
                                      : c.status === "rejected"
                                        ? "#EF4444"
                                        : "#9CA3AF",
                                },
                              ]}
                            >
                              {c.editedSuggestion || c.suggestion}
                            </Text>
                            <Text
                              style={[
                                styles.correctionStatus,
                                {
                                  color:
                                    c.status === "accepted"
                                      ? "#10B981"
                                      : c.status === "rejected"
                                        ? "#EF4444"
                                        : "#6B7280",
                                },
                              ]}
                            >
                              {c.status === "accepted"
                                ? "✓"
                                : c.status === "rejected"
                                  ? "✗"
                                  : "–"}
                            </Text>
                          </View>
                          {c.annotation && (
                            <View style={styles.annotationRow}>
                              <MaterialIcons
                                name="speaker-notes"
                                size={12}
                                color="#8B5CF6"
                              />
                              <Text style={styles.annotationText}>
                                {c.annotation}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}

                    {/* Model & timing info */}
                    <View style={styles.metaInfo}>
                      {session.modelUsed && (
                        <Text style={styles.metaText}>
                          Model: {session.modelUsed}
                        </Text>
                      )}
                      {session.processingTimeMs && (
                        <Text style={styles.metaText}>
                          Time: {(session.processingTimeMs / 1000).toFixed(1)}s
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ===========================
// Styles
// ===========================

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111827",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 16,
    maxHeight: 500,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F3F4F6",
  },
  badge: {
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Loading / Error / Empty
  loadingWrap: {
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  loadingText: { color: "#9CA3AF", fontSize: 13 },
  errorWrap: {
    alignItems: "center",
    padding: 16,
    gap: 6,
  },
  errorText: { color: "#FCA5A5", fontSize: 13 },
  retryText: { color: "#8B5CF6", fontSize: 13, fontWeight: "600" },
  emptyWrap: {
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  emptyText: { color: "#6B7280", fontSize: 14, textAlign: "center" },

  scrollArea: { maxHeight: 420 },

  // Trend
  trendSection: {
    marginBottom: 16,
    backgroundColor: "#1F2937",
    borderRadius: 10,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  trendChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 90,
    gap: 4,
  },
  trendBarWrap: {
    alignItems: "center",
    flex: 1,
  },
  trendBarValue: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  trendBar: {
    width: "70%",
    minWidth: 12,
    borderRadius: 3,
  },
  trendBarDate: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 3,
  },
  trendSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  trendSummaryText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Session cards
  sessionCard: {
    backgroundColor: "#1F2937",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#374151",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionDate: {
    fontSize: 13,
    color: "#D1D5DB",
    fontWeight: "600",
  },
  dyslexicTag: {
    backgroundColor: "#78350F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dyslexicTagText: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "700",
  },
  sessionStats: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  statPill: {
    backgroundColor: "#374151",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E5E7EB",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  patternRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  patternChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  patternChipText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Expanded
  expandedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  correctionRow: {
    marginBottom: 8,
  },
  correctionWords: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  correctionOriginal: {
    fontSize: 13,
    color: "#FCA5A5",
    textDecorationLine: "line-through",
  },
  correctionSuggestion: {
    fontSize: 13,
    fontWeight: "600",
  },
  correctionStatus: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  annotationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 3,
    marginLeft: 8,
  },
  annotationText: {
    fontSize: 12,
    color: "#A78BFA",
    fontStyle: "italic",
    flex: 1,
  },
  metaInfo: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  metaText: {
    fontSize: 11,
    color: "#6B7280",
  },
});
