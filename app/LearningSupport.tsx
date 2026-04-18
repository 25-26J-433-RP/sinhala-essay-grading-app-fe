/**
 * ════════════════════════════════════════════════════════════════════════════
 * INTEGRATION GUIDE — StudentEssaysScreen.tsx
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Step 1 — Import the new component at the top of StudentEssaysScreen.tsx
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   import { StudentWritingPatternProfile } from "./WritingPatternProfile";
 *
 *
 * Step 2 — Replace the existing "Special Needs Detection" dashboardCard
 * ────────────────────────────────────────────────────────────────────────────
 * Find this block (around line 750 in the original file):
 *
 *   {/* Special Needs Detection *\/}
 *   <View style={styles.dashboardCard}>
 *     ...
 *   </View>
 *
 * Replace the ENTIRE block with:
 *
 *   {/* Learning Support Indicators — student-level aggregation *\/}
 *   <LearningSupport
 *     scoredEssays={scoredEssays}
 *     totalScored={totalScored}
 *   />
 *
 *
 * Step 3 — Add the Writing Pattern Profile AFTER the Analytics dashboard
 * ────────────────────────────────────────────────────────────────────────────
 * After the closing </View> of the feedbackSection (Analytics Dashboard),
 * add:
 *
 *   {/* Writing Pattern Profile — aggregated *\/}
 *   <StudentWritingPatternProfile
 *     essays={studentInfo.essays}
 *     totalEssays={studentInfo.essays.length}
 *   />
 *
 *
 * Step 4 — Import LearningSupport from this file
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   import { LearningSupport } from "./LearningSupport";
 *
 * ════════════════════════════════════════════════════════════════════════════
 */
import { useLanguage } from "@/contexts/LanguageContext"; // ← ADD
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { EssayWithPatterns } from "./WritingPatternProfile";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  scoredEssays: EssayWithPatterns[];
  totalScored: number;
}

// ─── Animated ring ────────────────────────────────────────────────────────────

const RateDial: React.FC<{
  pct: number;
  color: string;
  size?: number;
}> = ({ pct, color, size = 88 }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 900,
      delay: 300,
      useNativeDriver: false
    }).start();
  }, [pct]);

  const bg = color + "20";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: 4,
        borderColor: color,
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <Animated.Text
        style={{
          color: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [color, color]
          }),
          fontSize: size * 0.28,
          fontWeight: "900"
        }}
      >
        {pct}%
      </Animated.Text>
    </View>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const LearningSupport: React.FC<Props> = ({
  scoredEssays,
  totalScored
}) => {
  const { t } = useLanguage(); // ← ADD

  const dyslexicCount = scoredEssays.filter(
    (e) => e.details?.dyslexic_flag
  ).length;
  const dyslexicRate =
    totalScored > 0 ? Math.round((dyslexicCount / totalScored) * 100) : 0;

  const highRisk = dyslexicRate >= 60;
  const moderate = dyslexicRate >= 30 && dyslexicRate < 60;
  const rateColor = highRisk ? "#EF4444" : moderate ? "#F59E0B" : "#10B981";
  const rateIcon = highRisk ? "warning" : moderate ? "info" : "check-circle";
  const rateLabel = highRisk
    ? t("analytics.highDetectionRate")
    : moderate
      ? t("analytics.moderateDetectionRate")
      : t("analytics.lowDetectionRate");

  return (
    <View style={ls.card}>
      {/* Header */}
      <View style={ls.header}>
        <View
          style={[
            ls.iconWrap,
            { backgroundColor: "#60A5FA22", borderColor: "#60A5FA44" }
          ]}
        >
          <MaterialIcons name="health-and-safety" size={22} color="#60A5FA" />
        </View>
        <Text style={ls.title}>{t("analytics.learningSupport")}</Text>
      </View>

      {/* Stats row */}
      <View style={ls.statsRow}>
        <View style={ls.statBox}>
          <MaterialIcons
            name={dyslexicCount > 0 ? "warning" : "check-circle"}
            size={32}
            color={dyslexicCount > 0 ? "#F59E0B" : "#10B981"}
          />
          <Text style={ls.statBig}>
            {dyslexicCount}
            <Text style={ls.statSmall}>/{totalScored}</Text>
          </Text>
          <Text style={ls.statLabel}>{t("analytics.essaysFlagged")}</Text>
        </View>

        <View style={ls.divider} />

        <View style={ls.statBox}>
          <RateDial pct={dyslexicRate} color={rateColor} />
          <Text style={ls.statLabel}>{t("analytics.dyslexiaRate")}</Text>
        </View>
      </View>

      {/* Risk tier label */}
      <View
        style={[
          ls.tierBadge,
          { backgroundColor: rateColor + "18", borderColor: rateColor + "40" }
        ]}
      >
        <MaterialIcons name={rateIcon as any} size={16} color={rateColor} />
        <Text style={[ls.tierText, { color: rateColor }]}>{rateLabel}</Text>
      </View>

      {/* Recommendation */}
      {dyslexicCount > 0 && (
        <View style={ls.recommendation}>
          <MaterialIcons name="lightbulb-outline" size={18} color="#F59E0B" />
          <Text style={ls.recommendationText}>
            {t("analytics.specializedSupport")}
          </Text>
        </View>
      )}

      {/* Contextual note */}
      <Text style={ls.footnote}>{t("analytics.learningFootnote")}</Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const ls = StyleSheet.create({
  card: {
    backgroundColor: "#0F1117",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2D313E",
    gap: 16
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0
  },
  statBox: {
    flex: 1,
    backgroundColor: "#1C1E26",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  divider: {
    width: 12
  },
  statBig: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900"
  },
  statSmall: {
    color: "#6B7280",
    fontSize: 18,
    fontWeight: "600"
  },
  statLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center"
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  tierText: {
    fontSize: 13,
    fontWeight: "700"
  },
  recommendation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B"
  },
  recommendationText: {
    color: "#F59E0B",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
    fontWeight: "500"
  },
  footnote: {
    color: "#4B5563",
    fontSize: 11,
    lineHeight: 17,
    fontStyle: "italic"
  }
});
