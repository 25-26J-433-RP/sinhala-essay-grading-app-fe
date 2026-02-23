/**
 * StudentWritingPatternProfile.tsx
 *
 * Drop-in component for the Student Essays dashboard.
 * Aggregates writing_patterns data across ALL essays of a student —
 * never shows single-essay or sentence-level data.
 *
 * Usage:
 *   import { StudentWritingPatternProfile } from "./WritingPatternProfile";
 *   <StudentWritingPatternProfile essays={studentInfo.essays} />
 *
 * Also exports the aggregation hook separately if you need the numbers
 * elsewhere: useAggregatedWritingPatterns(essays)
 */
import { useLanguage } from "@/contexts/LanguageContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WritingPatterns {
  dominant_pattern?: string;
  risk_score?: number;
  risk_level?: string;
  severity?: string;
  pattern_distribution?: {
    Grammar?: number;
    Phonetic?: number;
    Spelling?: number;
    Visual?: number;
  };
  pattern_sentence_count?: {
    Grammar?: number;
    Phonetic?: number;
    Spelling?: number;
    Visual?: number;
  };
}

export interface EssayWithPatterns {
  id: string;
  writing_patterns?: WritingPatterns;
  details?: { dyslexic_flag?: boolean };
  score?: number;
  rubric?: {
    richness_5?: number;
    organization_6?: number;
    technical_3?: number;
    total_14?: number;
  };
  fairness_report?: {
    adjusted_total_14?: number;
    mitigation_applied?: boolean;
  };
}

export interface AggregatedPatterns {
  essayCount: number;
  avgRiskScore: number;
  dominantPattern: string;
  dominantPatternCount: number;
  patternDistribution: {
    Grammar: number;
    Phonetic: number;
    Spelling: number;
    Visual: number;
  };
  riskLevel: string;
  severity: string;
  dyslexicCount: number;
}

// ─── Aggregation hook ─────────────────────────────────────────────────────────

export function useAggregatedWritingPatterns(
  essays: EssayWithPatterns[]
): AggregatedPatterns | null {
  return useMemo(() => {
    const withPatterns = essays.filter((e) => e.writing_patterns);
    if (withPatterns.length === 0) return null;

    const avgRiskScore =
      withPatterns.reduce(
        (s, e) => s + (e.writing_patterns?.risk_score ?? 0),
        0
      ) / withPatterns.length;

    const patternCounts: Record<string, number> = {};
    withPatterns.forEach((e) => {
      const raw = e.writing_patterns?.dominant_pattern ?? "";
      const label = raw.replace(/\s*\(.*\)/, "").trim();
      if (label) patternCounts[label] = (patternCounts[label] ?? 0) + 1;
    });
    const dominantPattern =
      Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Unknown";
    const dominantPatternCount = patternCounts[dominantPattern] ?? 0;

    const keys: (keyof NonNullable<WritingPatterns["pattern_distribution"]>)[] =
      ["Grammar", "Phonetic", "Spelling", "Visual"];
    const distSums = { Grammar: 0, Phonetic: 0, Spelling: 0, Visual: 0 };
    let distCount = 0;
    withPatterns.forEach((e) => {
      const pd = e.writing_patterns?.pattern_distribution;
      if (!pd) return;
      keys.forEach((k) => {
        distSums[k] += pd[k] ?? 0;
      });
      distCount++;
    });
    const patternDistribution =
      distCount > 0
        ? {
            Grammar: distSums.Grammar / distCount,
            Phonetic: distSums.Phonetic / distCount,
            Spelling: distSums.Spelling / distCount,
            Visual: distSums.Visual / distCount
          }
        : { Grammar: 0.25, Phonetic: 0.25, Spelling: 0.25, Visual: 0.25 };

    const total = Object.values(patternDistribution).reduce((s, v) => s + v, 0);
    if (total > 0) {
      keys.forEach((k) => {
        patternDistribution[k] /= total;
      });
    }

    let riskLevel = "Low Pattern Severity";
    if (avgRiskScore >= 75) riskLevel = "High Pattern Severity";
    else if (avgRiskScore >= 40) riskLevel = "Moderate Pattern Severity";

    const severityCounts: Record<string, number> = {};
    withPatterns.forEach((e) => {
      const sv = e.writing_patterns?.severity ?? "Minimal";
      severityCounts[sv] = (severityCounts[sv] ?? 0) + 1;
    });
    const severity =
      Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Minimal";

    const dyslexicCount = essays.filter(
      (e) => e.details?.dyslexic_flag === true
    ).length;

    return {
      essayCount: withPatterns.length,
      avgRiskScore,
      dominantPattern,
      dominantPatternCount,
      patternDistribution,
      riskLevel,
      severity,
      dyslexicCount
    };
  }, [essays]);
}

// ─── Palette helpers ──────────────────────────────────────────────────────────

const PATTERN_COLORS: Record<string, string> = {
  Grammar: "#60A5FA",
  Phonetic: "#F59E0B",
  Spelling: "#10B981",
  Visual: "#C084FC"
};

const PATTERN_ICONS: Record<string, string> = {
  Grammar: "spellcheck",
  Phonetic: "hearing",
  Spelling: "text-fields",
  Visual: "visibility"
};

function riskColor(score: number): string {
  if (score >= 75) return "#EF4444";
  if (score >= 40) return "#F59E0B";
  return "#10B981";
}

function severityBadgeStyle(severity: string): {
  bg: string;
  text: string;
  border: string;
} {
  if (severity.toLowerCase().includes("severe"))
    return { bg: "rgba(239,68,68,0.12)", text: "#EF4444", border: "#EF4444" };
  if (severity.toLowerCase().includes("moderate"))
    return { bg: "rgba(245,158,11,0.12)", text: "#F59E0B", border: "#F59E0B" };
  if (severity.toLowerCase().includes("mild"))
    return { bg: "rgba(96,165,250,0.12)", text: "#60A5FA", border: "#60A5FA" };
  return { bg: "rgba(16,185,129,0.12)", text: "#10B981", border: "#10B981" };
}

// ─── Animated progress bar ────────────────────────────────────────────────────

const AnimatedBar: React.FC<{
  pct: number;
  color: string;
  delay?: number;
}> = ({ pct, color, delay = 0 }) => {
  const width = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 700,
      delay,
      useNativeDriver: false
    }).start();
  }, [pct]);

  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"]
            }),
            backgroundColor: color
          }
        ]}
      />
    </View>
  );
};

const barStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: "#23262F",
    borderRadius: 6,
    overflow: "hidden",
    flex: 1
  },
  fill: {
    height: "100%",
    borderRadius: 6
  }
});

// ─── Inline SVG pie chart ─────────────────────────────────────────────────────

const PatternPieChart: React.FC<{
  segments: { key: string; value: number; color: string }[];
}> = ({ segments }) => {
  const [SvgLib, setSvgLib] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    import("react-native-svg")
      .then((m) => {
        if (alive) setSvgLib(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const total = segments.reduce((s, v) => s + v.value, 0) || 1;
  const SIZE = 160;
  const R = 58;
  const INNER_R = R * 0.52;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  function arc(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  if (!SvgLib) {
    return (
      <View
        style={{
          flexDirection: "row",
          height: 20,
          borderRadius: 10,
          overflow: "hidden"
        }}
      >
        {segments.map((seg) => (
          <View
            key={seg.key}
            style={{ flex: seg.value / total, backgroundColor: seg.color }}
          />
        ))}
      </View>
    );
  }

  const { Svg, G, Path, Circle } = SvgLib;
  let startAngle = 0;
  const paths: React.ReactElement[] = [];

  segments.forEach((seg, i) => {
    const angle = (seg.value / total) * 360;
    const endAngle = startAngle + angle;
    const large = angle > 180 ? 1 : 0;
    const sv = arc(CX, CY, R, startAngle);
    const e = arc(CX, CY, R, endAngle);
    const d = `M ${CX} ${CY} L ${sv.x} ${sv.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} Z`;
    paths.push(<Path key={i} d={d} fill={seg.color} />);
    startAngle = endAngle;
  });

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <G>{paths}</G>
      <Circle cx={CX} cy={CY} r={INNER_R} fill="#181A20" />
    </Svg>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle
}) => (
  <View style={s.header}>
    <View style={s.headerIconWrap}>
      <MaterialIcons name="psychology" size={22} color="#C084FC" />
    </View>
    <View style={s.headerText}>
      <Text style={s.headerTitle}>{title}</Text>
      <Text style={s.headerSub}>{subtitle}</Text>
    </View>
  </View>
);

// ─── Insight callout ──────────────────────────────────────────────────────────

const PatternInsight: React.FC<{
  dominant: string;
  riskScore: number;
  insightText: string;
  insightIcon: string;
  insightColor: string;
}> = ({ dominant, riskScore, insightText, insightIcon, insightColor }) => {
  if (!insightText || riskScore < 30) return null;

  return (
    <View
      style={[
        s.insightBox,
        {
          backgroundColor: `${insightColor}14`,
          borderLeftColor: insightColor
        }
      ]}
    >
      <MaterialIcons name={insightIcon as any} size={18} color={insightColor} />
      <Text style={[s.insightText, { color: insightColor }]}>
        {insightText}
      </Text>
    </View>
  );
};
// Insight data — icon/color stay code-driven, only text is translated
const INSIGHT_MAP: Record<
  string,
  { icon: string; color: string; textKey: string }
> = {
  Phonetic: {
    icon: "hearing",
    color: "#F59E0B",
    textKey: "writingPattern.insightPhonetic"
  },
  Spelling: {
    icon: "text-fields",
    color: "#10B981",
    textKey: "writingPattern.insightSpelling"
  },
  Visual: {
    icon: "visibility",
    color: "#C084FC",
    textKey: "writingPattern.insightVisual"
  },
  Grammar: {
    icon: "spellcheck",
    color: "#60A5FA",
    textKey: "writingPattern.insightGrammar"
  }
};
// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  essays: EssayWithPatterns[];
  totalEssays: number;
}

export const StudentWritingPatternProfile: React.FC<Props> = ({
  essays,
  totalEssays
}) => {
  const { t } = useLanguage();
  const agg = useAggregatedWritingPatterns(essays);

  if (!agg) {
    return (
      <View style={s.card}>
        <SectionHeader
          title={t("writingPattern.title")}
          subtitle={t("writingPattern.subtitle")}
        />
        <View style={s.emptyState}>
          <MaterialIcons name="insights" size={40} color="#3D4155" />
          <Text style={s.emptyTitle}>{t("writingPattern.noDataTitle")}</Text>
          <Text style={s.emptyBody}>{t("writingPattern.noDataBody")}</Text>
        </View>
      </View>
    );
  }

  const {
    bg: sevBg,
    text: sevText,
    border: sevBorder
  } = severityBadgeStyle(agg.severity);
  const rc = riskColor(agg.avgRiskScore);

  const patternKeys: (keyof typeof agg.patternDistribution)[] = [
    "Phonetic",
    "Spelling",
    "Visual",
    "Grammar"
  ];

  const pieSegments = patternKeys.map((k) => ({
    key: k,
    value: agg.patternDistribution[k],
    color: PATTERN_COLORS[k]
  }));

  const cleanDominant = agg.dominantPattern
    .replace(" Pattern Dominant", "")
    .replace(" Dominant", "")
    .trim();

  const insight = INSIGHT_MAP[cleanDominant];

  return (
    <View style={s.card}>
      <SectionHeader
        title={t("writingPattern.title")}
        subtitle={t("writingPattern.subtitle")}
      />

      {/* ── Meta row ── */}
      <View style={s.metaRow}>
        <View style={s.metaChip}>
          <MaterialIcons name="description" size={14} color="#60A5FA" />
          <Text style={s.metaChipText}>
            {t("writingPattern.essaysAnalyzed", {
              count: agg.essayCount,
              total: totalEssays
            })}
          </Text>
        </View>

        <View
          style={[
            s.severityBadge,
            { backgroundColor: sevBg, borderColor: sevBorder }
          ]}
        >
          <View style={[s.severityDot, { backgroundColor: sevText }]} />
          <Text style={[s.severityText, { color: sevText }]}>
            {agg.severity}
          </Text>
        </View>
      </View>

      {/* ── Risk score ── */}
      <View style={s.riskBlock}>
        <View style={s.riskLabelRow}>
          <View style={s.riskLabelLeft}>
            <MaterialIcons name="monitor-heart" size={18} color={rc} />
            <Text style={s.riskLabel}>{t("writingPattern.riskLabel")}</Text>
          </View>
          <Text style={[s.riskValue, { color: rc }]}>
            {agg.avgRiskScore.toFixed(1)}
            <Text style={s.riskUnit}> / 100</Text>
          </Text>
        </View>
        <AnimatedBar pct={agg.avgRiskScore / 100} color={rc} delay={100} />
        <Text style={s.riskLevelText}>{agg.riskLevel}</Text>
      </View>

      {/* ── Dominant pattern ── */}
      <View style={s.dominantBlock}>
        <Text style={s.dominantLabel}>{t("writingPattern.dominantLabel")}</Text>
        <View style={s.dominantPill}>
          <MaterialIcons
            name={(PATTERN_ICONS[cleanDominant] ?? "analytics") as any}
            size={18}
            color={PATTERN_COLORS[cleanDominant] ?? "#60A5FA"}
          />
          <Text
            style={[
              s.dominantText,
              { color: PATTERN_COLORS[cleanDominant] ?? "#60A5FA" }
            ]}
          >
            {cleanDominant}
          </Text>
          <View style={s.dominantCount}>
            <Text style={s.dominantCountText}>{agg.dominantPatternCount}×</Text>
          </View>
        </View>
        <Text style={s.dominantSub}>
          {t("writingPattern.dominantSub", {
            count: agg.dominantPatternCount,
            total: agg.essayCount
          })}
        </Text>
      </View>

      {/* ── Pattern distribution ── */}
      <View style={s.distributionBlock}>
        <Text style={s.blockTitle}>
          {t("writingPattern.distributionTitle")}
        </Text>

        <View style={s.chartRow}>
          <PatternPieChart segments={pieSegments} />
          <View style={s.legendCol}>
            {patternKeys.map((k) => {
              const pct = (agg.patternDistribution[k] * 100).toFixed(1);
              return (
                <View key={k} style={s.legendItem}>
                  <View
                    style={[
                      s.legendDot,
                      { backgroundColor: PATTERN_COLORS[k] }
                    ]}
                  />
                  <View style={s.legendTextCol}>
                    <Text style={s.legendKey}>{k}</Text>
                    <Text style={[s.legendPct, { color: PATTERN_COLORS[k] }]}>
                      {pct}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.barsBlock}>
          {patternKeys.map((k) => (
            <View key={k} style={s.barRow}>
              <View style={s.barLabelRow}>
                <MaterialIcons
                  name={PATTERN_ICONS[k] as any}
                  size={14}
                  color={PATTERN_COLORS[k]}
                />
                <Text style={s.barLabel}>{k}</Text>
                <Text style={[s.barPct, { color: PATTERN_COLORS[k] }]}>
                  {(agg.patternDistribution[k] * 100).toFixed(1)}%
                </Text>
              </View>
              <View
                style={{
                  width: "100%",
                  height: 8,
                  backgroundColor: "#23262F",
                  borderRadius: 6,
                  overflow: "hidden"
                }}
              >
                <View
                  style={{
                    width: `${agg.patternDistribution[k] * 100}%`,
                    height: "100%",
                    backgroundColor: PATTERN_COLORS[k],
                    borderRadius: 6
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Insight callout ── */}
      {insight && (
        <PatternInsight
          dominant={cleanDominant}
          riskScore={agg.avgRiskScore}
          insightText={t(insight.textKey)}
          insightIcon={insight.icon}
          insightColor={insight.color}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: "#1C1E26",
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#2D313E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    gap: 20
  },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(192,132,252,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.25)"
  },
  headerText: { flex: 1 },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  headerSub: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0F1117",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D313E"
  },
  metaChipText: { color: "#9CA3AF", fontSize: 12, fontWeight: "600" },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  severityDot: { width: 7, height: 7, borderRadius: 3.5 },
  severityText: { fontSize: 12, fontWeight: "700" },
  riskBlock: {
    backgroundColor: "#0F1117",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D313E",
    gap: 10
  },
  riskLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  riskLabelLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  riskLabel: { color: "#E5E7EB", fontSize: 14, fontWeight: "700" },
  riskValue: { fontSize: 26, fontWeight: "900" },
  riskUnit: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  riskLevelText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  dominantBlock: { gap: 10 },
  dominantLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  dominantPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F1117",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2D313E",
    alignSelf: "flex-start"
  },
  dominantText: { fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  dominantCount: {
    backgroundColor: "#23262F",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  dominantCountText: { color: "#9CA3AF", fontSize: 12, fontWeight: "700" },
  dominantSub: { color: "#6B7280", fontSize: 12, fontWeight: "500" },
  distributionBlock: { gap: 16 },
  blockTitle: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  legendCol: { flex: 1, gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendTextCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  legendKey: { color: "#E5E7EB", fontSize: 13, fontWeight: "600" },
  legendPct: { fontSize: 13, fontWeight: "700" },
  barsBlock: { gap: 14, width: "100%" },
  barRow: { gap: 8 },
  barLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barLabel: { color: "#E5E7EB", fontSize: 13, fontWeight: "600", flex: 1 },
  barPct: { fontSize: 13, fontWeight: "700" },
  insightBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3
  },
  insightText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "500" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 12 },
  emptyTitle: { color: "#9CA3AF", fontSize: 16, fontWeight: "700" },
  emptyBody: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20
  }
});
