export const unstable_settings = {
  headerShown: false,
};

import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Switch,
} from "react-native";
import {
  getFairnessReports,
  FairnessReport,
  runFairnessAnalysis,
} from "../../services/fairnessService";
import { TouchableOpacity, Alert, ActivityIndicator } from "react-native";

// --------------------------------------------------
// Multi-Metric Bias Status Logic (Research-Grade)
// --------------------------------------------------
function getBiasStatus(
  spd: number,
  dir: number,
  meanGap?: number,
  cohensD?: number,
  pValue?: number
) {
  // If we have advanced metrics, use them for better classification
  if (
    meanGap !== undefined &&
    cohensD !== undefined &&
    pValue !== undefined
  ) {
    // Critical: Severe bias with large effect size AND large gap
    if (cohensD > 0.8 && meanGap > 10 && pValue < 0.01) {
      return {
        label: "Severe Bias (Large Effect)",
        color: "#dc2626",
        detail: `Gap: ${meanGap.toFixed(1)}pts, d=${cohensD.toFixed(2)}`,
      };
    }

    // High Priority: DIR threshold violated OR large effect size
    if (dir > 1.25 || (cohensD > 0.8 && pValue < 0.01)) {
      return {
        label: "Bias Against Dyslexic",
        color: "#e74c3c",
        detail: `DIR=${dir.toFixed(2)}, d=${cohensD.toFixed(2)}`,
      };
    }

    if (dir < 0.8) {
      return {
        label: "Bias In Favor of Dyslexic",
        color: "#f59e0b",
        detail: `DIR=${dir.toFixed(2)}`,
      };
    }

    // Hidden bias: DIR looks good but effect size is medium-large
    if (cohensD > 0.5 && pValue < 0.05 && meanGap > 3) {
      return {
        label: "Systematic Bias (Medium Effect)",
        color: "#f97316",
        detail: `Gap: ${meanGap.toFixed(1)}pts, d=${cohensD.toFixed(2)}`,
      };
    }

    // Small but statistically significant bias
    if (pValue < 0.05 && cohensD > 0.2) {
      return {
        label: "Minor Bias (Significant)",
        color: "#fbbf24",
        detail: `d=${cohensD.toFixed(2)}, p=${pValue.toFixed(3)}`,
      };
    }

    // Truly fair
    return {
      label: "No Significant Bias",
      color: "#22c55e",
      detail: `d=${cohensD.toFixed(2)}, p=${pValue.toFixed(3)}`,
    };
  }

  // Fallback: Traditional DIR-only classification
  if (dir < 0.8) {
    return {
      label: "Bias In Favor of Dyslexic",
      color: "#f59e0b",
      detail: "DIR only",
    };
  }
  if (dir > 1.25) {
    return {
      label: "Bias Against Dyslexic",
      color: "#e74c3c",
      detail: "DIR only",
    };
  }
  return {
    label: "No Significant Bias",
    color: "#22c55e",
    detail: "DIR only",
  };
}

// --------------------------------------------------
// Date formatter
// --------------------------------------------------
function formatDate(ts: any) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}

// --------------------------------------------------
// Screen Component
// --------------------------------------------------
export default function FairnessDashboard() {
  const [allReports, setAllReports] = useState<FairnessReport[]>([]);
  const [reports, setReports] = useState<FairnessReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number | "ALL">("ALL");
  const [showHistory, setShowHistory] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getFairnessReports();
      setAllReports(data);

      // ---- latest per grade (default view)
      const latestByGrade = new Map<number, FairnessReport>();

      data.forEach((r) => {
        const existing = latestByGrade.get(r.grade);

        if (!existing) {
          latestByGrade.set(r.grade, r);
          return;
        }

        const eDate = existing.evaluated_at?.toDate
          ? existing.evaluated_at.toDate()
          : new Date(existing.evaluated_at);

        const cDate = r.evaluated_at?.toDate
          ? r.evaluated_at.toDate()
          : new Date(r.evaluated_at);

        if (cDate > eDate) {
          latestByGrade.set(r.grade, r);
        }
      });

      setReports(Array.from(latestByGrade.values()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRunAnalysis() {
    setAnalyzing(true);
    try {
      await runFairnessAnalysis();
      Alert.alert("Success", "Fairness analysis complete. Refreshing data...");
      await loadData();
    } catch (err) {
      Alert.alert("Error", String(err));
    } finally {
      setAnalyzing(false);
    }
  }

  const visibleReports = showHistory ? allReports : reports;

  const filteredReports = visibleReports
    .filter((r) =>
      selectedGrade === "ALL" ? true : r.grade === selectedGrade
    )
    .sort((a, b) => {
      const da = a.evaluated_at?.toDate
        ? a.evaluated_at.toDate()
        : new Date(a.evaluated_at);
      const db = b.evaluated_at?.toDate
        ? b.evaluated_at.toDate()
        : new Date(b.evaluated_at);
      return db.getTime() - da.getTime(); // newest first
    });

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.brandRow}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.brandName}>Akura</Text>
      </View>

      <Text style={styles.title}>Fairness Evaluation Dashboard</Text>
      <Text style={styles.subtitle}>
        Internal • Batch-level Bias Analysis
      </Text>

      {/* Manual Run Button */}
      <TouchableOpacity
        style={[styles.runButton, analyzing && styles.runButtonDisabled]}
        onPress={handleRunAnalysis}
        disabled={analyzing}
      >
        {analyzing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.runButtonText}>Run Analysis Now</Text>
        )}
      </TouchableOpacity>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {showHistory ? "Showing history" : "Showing latest only"}
        </Text>
        <Switch
          value={showHistory}
          onValueChange={setShowHistory}
        />
      </View>

      {/* Grade Filter */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Grade:</Text>
        {["ALL", 3, 4, 5, 6, 7, 8].map((g) => (
          <Text
            key={g}
            style={[
              styles.filterOption,
              selectedGrade === g && styles.filterActive,
            ]}
            onPress={() => setSelectedGrade(g as any)}
          >
            {g}
          </Text>
        ))}
      </View>

      {/* Table */}
      {!loading && filteredReports.length > 0 && (
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={styles.cell}>Grade</Text>
            <Text style={styles.cell}>SPD</Text>
            <Text style={styles.cell}>DIR</Text>
            <Text style={styles.cell}>Mean Gap</Text>
            <Text style={styles.cell}>Cohen's d</Text>
            <Text style={styles.cell}>Samples</Text>
            <Text style={styles.cell}>Date</Text>
            <Text style={styles.cell}>Status</Text>
          </View>

          {filteredReports.map((r, idx) => {
            // Calculate mean gap from existing data (with safety checks)
            const meanGap =
              r.mean_non_dyslexic !== undefined &&
                r.mean_dyslexic !== undefined
                ? r.mean_non_dyslexic - r.mean_dyslexic
                : undefined;

            // Pass all available metrics to getBiasStatus
            const status = getBiasStatus(
              r.spd,
              r.dir,
              meanGap,
              r.cohens_d,
              r.p_value
            );

            return (
              <View key={`${r.grade}-${idx}`} style={styles.row}>
                <Text style={styles.cell}>{r.grade}</Text>
                <Text style={styles.cell}>{r.spd.toFixed(3)}</Text>
                <Text style={styles.cell}>{r.dir.toFixed(3)}</Text>
                <Text style={styles.cell}>
                  {meanGap ? meanGap.toFixed(1) : "—"}
                </Text>
                <Text style={styles.cell}>
                  {r.cohens_d !== undefined ? r.cohens_d.toFixed(2) : "—"}
                </Text>
                <Text style={styles.cell}>{r.sample_size}</Text>
                <Text style={styles.cell}>{formatDate(r.evaluated_at)}</Text>
                <View style={styles.cell}>
                  <Text style={{ color: status.color, fontWeight: "600" }}>
                    {status.label}
                  </Text>
                  {status.detail && (
                    <Text
                      style={{
                        color: "#9ca3af",
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      {status.detail}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!loading && filteredReports.length === 0 && (
        <Text style={styles.info}>No data for selected filter.</Text>
      )}
    </ScrollView>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------
const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#0f172a" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36 },
  brandName: { color: "#fff", fontSize: 20, fontWeight: "700" },
  title: { color: "#fff", fontSize: 26, fontWeight: "700", marginTop: 10 },
  subtitle: { color: "#94a3b8", marginBottom: 10 },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  toggleLabel: { color: "#e5e7eb", fontSize: 13 },

  filterRow: { flexDirection: "row", marginBottom: 12, flexWrap: "wrap" },
  filterLabel: { color: "#e5e7eb", marginRight: 8 },
  filterOption: {
    marginRight: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#020617",
    color: "#cbd5f5",
    borderRadius: 4,
  },
  filterActive: { backgroundColor: "#334155", color: "#fff" },

  table: { borderWidth: 1, borderColor: "#334155", borderRadius: 6 },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  headerRow: { backgroundColor: "#020617" },
  cell: { flex: 1, color: "#e5e7eb", textAlign: "center", fontSize: 12 },

  info: { color: "#cbd5f5", marginTop: 20 },

  runButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  runButtonDisabled: {
    backgroundColor: "#1e293b",
  },
  runButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
