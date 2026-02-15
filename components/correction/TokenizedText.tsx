// components/correction/TokenizedText.tsx
/**
 * Renders the full text as a flow of word tokens.
 * Error words are highlighted by pattern colour and tappable;
 * correct words are plain text.
 *
 * This replaces the old stacked-error-cards view with an
 * interactive inline display (similar to the sample web frontend).
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { type CorrectionWithStatus, getPatternColor } from "./types";

interface TokenizedTextProps {
  tokens: CorrectionWithStatus[];
  /** Called when an error word is tapped */
  onTokenPress: (id: string) => void;
  /** When true, show accepted suggestions instead of original words */
  showCorrected?: boolean;
}

export default function TokenizedText({
  tokens,
  onTokenPress,
  showCorrected = false,
}: TokenizedTextProps) {
  return (
    <View style={styles.container}>
      <View style={styles.paragraph}>
        {tokens.map((token, index) => {
          const isError = token.type === "error";
          const isAccepted = token.status === "accepted";
          const isRejected = token.status === "rejected";

          // For corrected preview, use suggestion for accepted errors
          const displayWord =
            showCorrected && isAccepted
              ? token.editedSuggestion || token.suggestion
              : token.word;

          if (!isError) {
            // ─── Normal word ───
            return (
              <Text key={token.id || `t-${index}`} style={styles.normalWord}>
                {displayWord}
              </Text>
            );
          }

          // ─── Error word (tappable) ───
          const color = getPatternColor(token.pattern);
          const bgColor = isAccepted
            ? "#064E3B40"
            : isRejected
              ? "#7F1D1D40"
              : color + "25";
          const borderBottomColor = isAccepted
            ? "#10B981"
            : isRejected
              ? "#EF4444"
              : color;

          return (
            <TouchableOpacity
              key={token.id || `t-${index}`}
              onPress={() => onTokenPress(token.id)}
              activeOpacity={0.7}
              style={[
                styles.errorToken,
                {
                  backgroundColor: bgColor,
                  borderBottomColor,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.errorWord,
                  {
                    color: isAccepted
                      ? "#10B981"
                      : isRejected
                        ? "#EF4444"
                        : color,
                    textDecorationLine:
                      showCorrected && isAccepted
                        ? "none"
                        : isRejected
                          ? "line-through"
                          : "none",
                  },
                ]}
              >
                {displayWord}
              </Text>
              {/* Status icon */}
              {isAccepted && <Text style={styles.statusIcon}>✓</Text>}
              {isRejected && (
                <Text style={[styles.statusIcon, { color: "#EF4444" }]}>✗</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111827",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    padding: 14,
    minHeight: 60,
  },
  paragraph: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  normalWord: {
    fontSize: 16,
    lineHeight: 30,
    color: "#E5E7EB",
    marginHorizontal: 1,
  },
  errorToken: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginHorizontal: 1,
  },
  errorWord: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: "600",
  },
  statusIcon: {
    fontSize: 11,
    color: "#10B981",
    marginLeft: 2,
    fontWeight: "700",
  },
});
