import AppHeader from "@/components/AppHeader";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserImageService, UserImageUpload } from "@/services/userImageService";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function StudentEssaysScreen() {
  const { studentData } = useLocalSearchParams<{ studentData?: string }>();
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { t } = useLanguage();
  const DEBUG = __DEV__ === true;
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    try {
      if (typeof studentData === "string") {
        const parsed = JSON.parse(studentData);
        // Convert date strings back to Date objects
        parsed.lastUploadDate = new Date(parsed.lastUploadDate);
        parsed.essays = parsed.essays.map((essay: any) => ({
          ...essay,
          uploadedAt: new Date(essay.uploadedAt),
        }));
        setStudentInfo(parsed);
      }
    } catch (error) {
      console.error("Error parsing student data:", error);
    } finally {
      setLoading(false);
      initializedRef.current = true;
    }
  }, [studentData]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteEssay = async (essay: UserImageUpload) => {
    if (DEBUG)
      console.log("🗑️ handleDeleteEssay called for:", {
        id: essay.id,
        fileName: essay.fileName,
        storagePath: essay.storagePath,
      });
    const ok = await confirm({
      title: t("studentEssays.deleteEssay"),
      message: t("studentEssays.deleteConfirm", { fileName: essay.fileName }),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
    });
    if (!ok) {
      if (DEBUG) console.log("❌ Delete cancelled");
      return;
    }
    if (DEBUG) console.log("✅ Delete confirmed");
    if (DEBUG) console.log("🔄 Starting deletion for essay:", essay.id);
    setDeletingId(essay.id);
    try {
      if (DEBUG) console.log("📞 Calling UserImageService.deleteUserImage...");
      await UserImageService.deleteUserImage(essay.id, essay.storagePath);
      if (DEBUG) console.log("✅ Deletion successful");
      showToast(t("studentEssays.essayDeleted"), { type: "success" });
      // Remove from local state
      setStudentInfo((prev: any) => ({
        ...prev,
        essays: prev.essays.filter((e: UserImageUpload) => e.id !== essay.id),
        essayCount: prev.essayCount - 1,
      }));
    } catch (error) {
      console.error("❌ Error deleting essay:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      showToast(t("studentEssays.deleteFailed"), { type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {t("studentEssays.loadingEssays")}
          </Text>
        </View>
      </View>
    );
  }

  if (!studentInfo) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>
            {t("studentEssays.studentNotFound")}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>
              {t("studentEssays.goBack")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderEssayItem = ({ item }: { item: UserImageUpload }) => (
    <View style={styles.essayCardWrapper}>
      <TouchableOpacity
        style={styles.essayCard}
        onPress={() => {
          router.push({
            pathname: "/image-detail",
            params: {
              imageData: JSON.stringify({
                ...item,
                uploadedAt: item.uploadedAt.toISOString(),
              }),
            },
          });
        }}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.essayInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={styles.uploadDate}>{formatDate(item.uploadedAt)}</Text>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {/* Mindmap Button */}
          <TouchableOpacity
            style={styles.mindmapButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: "/essay-mindmap",
                params: {
                  essayId: item.id,
                  essayTitle: encodeURIComponent(item.fileName),
                },
              });
            }}
          >
            <MaterialIcons name="account-tree" size={16} color="#007AFF" />
            <Text style={styles.mindmapButtonText}>
              {t("studentEssays.viewMindmap")}
            </Text>
          </TouchableOpacity>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#B0B3C6" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteIconButton}
        onPress={() => handleDeleteEssay(item)}
        disabled={deletingId === item.id}
      >
        {deletingId === item.id ? (
          <ActivityIndicator size="small" color="#FF3B30" />
        ) : (
          <MaterialIcons name="delete" size={24} color="#FF3B30" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonTopText}>
            {t("studentEssays.backToStudents")}
          </Text>
        </TouchableOpacity>

        {/* Student Info Card */}
        <View style={styles.studentInfoCard}>
          <View style={styles.studentHeader}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person" size={40} color="#007AFF" />
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentId}>{studentInfo.studentId}</Text>
              <View style={styles.detailsRow}>
                {[
                  studentInfo.studentAge && {
                    icon: "cake",
                    text: `${studentInfo.studentAge} ${t("essay.years")}`,
                  },
                  studentInfo.studentGrade && {
                    icon: "school",
                    text: studentInfo.studentGrade,
                  },
                  studentInfo.studentGender && {
                    icon: "wc",
                    text: studentInfo.studentGender,
                  },
                ]
                  .filter(Boolean)
                  .map((detail, index) => (
                    <View key={index} style={styles.detailItem}>
                      <MaterialIcons
                        name={detail.icon as any}
                        size={16}
                        color="#B0B3C6"
                      />
                      <Text style={styles.detailText}>{detail.text}</Text>
                    </View>
                  ))}
              </View>
            </View>
          </View>

      
        </View>

        {/* Analytics Dashboard */}
        <View style={styles.feedbackSection}>
          <View style={styles.feedbackHeader}>
            <MaterialIcons name="analytics" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>
              Performance Analytics Dashboard
            </Text>
          </View>

          {(() => {
            // Collect all scored essays
            const scoredEssays = studentInfo.essays.filter(
              (essay: UserImageUpload) => essay.score
            );

            if (scoredEssays.length === 0) {
              return (
                <View style={styles.noFeedbackContainer}>
                  <MaterialIcons name="assessment" size={64} color="#B0B3C6" />
                  <Text style={styles.noFeedbackText}>
                    No analytics available yet. Score essays to unlock detailed
                    performance insights.
                  </Text>
                </View>
              );
            }

            // Calculate comprehensive analytics
            const totalScored = scoredEssays.length;
            const avgScore =
              scoredEssays.reduce(
                (sum: number, e: UserImageUpload) => sum + (e.score || 0),
                0
              ) / totalScored;
            const maxScore = Math.max(
              ...scoredEssays.map((e: UserImageUpload) => e.score || 0)
            );
            const minScore = Math.min(
              ...scoredEssays.map((e: UserImageUpload) => e.score || 0)
            );

            // Rubric averages
            const avgRichness =
              scoredEssays
                .filter((e) => e.rubric?.richness_5)
                .reduce((sum, e) => sum + (e.rubric?.richness_5 || 0), 0) /
              totalScored;
            const avgOrganization =
              scoredEssays
                .filter((e) => e.rubric?.organization_6)
                .reduce((sum, e) => sum + (e.rubric?.organization_6 || 0), 0) /
              totalScored;
            const avgTechnical =
              scoredEssays
                .filter((e) => e.rubric?.technical_3)
                .reduce((sum, e) => sum + (e.rubric?.technical_3 || 0), 0) /
              totalScored;

            // Fairness metrics aggregation
            const fairnessData = scoredEssays.filter((e) => e.fairness_report);
            const avgSPD =
              fairnessData.length > 0
                ? fairnessData.reduce(
                    (sum, e) => sum + (parseFloat(e.fairness_report?.spd) || 0),
                    0
                  ) / fairnessData.length
                : 0;
            const avgDIR =
              fairnessData.length > 0
                ? fairnessData.reduce(
                    (sum, e) => sum + (parseFloat(e.fairness_report?.dir) || 0),
                    0
                  ) / fairnessData.length
                : 0;
            const avgEOD =
              fairnessData.length > 0
                ? fairnessData.reduce(
                    (sum, e) => sum + (parseFloat(e.fairness_report?.eod) || 0),
                    0
                  ) / fairnessData.length
                : 0;

            // Trend analysis (last 3 vs first 3)
            const recentEssays = scoredEssays.slice(
              0,
              Math.min(3, scoredEssays.length)
            );
            const oldEssays = scoredEssays.slice(
              -Math.min(3, scoredEssays.length)
            );
            const recentAvg =
              recentEssays.reduce((sum, e) => sum + (e.score || 0), 0) /
              recentEssays.length;
            const oldAvg =
              oldEssays.reduce((sum, e) => sum + (e.score || 0), 0) /
              oldEssays.length;
            const trend = recentAvg - oldAvg;
            const trendPercentage =
              oldAvg > 0 ? ((trend / oldAvg) * 100).toFixed(1) : "0.0";

            // Dyslexia detection stats
            const dyslexicCount = scoredEssays.filter(
              (e) => e.details?.dyslexic_flag
            ).length;
            const dyslexicRate = ((dyslexicCount / totalScored) * 100).toFixed(
              0
            );

            const latestEssay = scoredEssays[0];

            return (
              <View>
                {/* Overview Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <MaterialIcons
                      name="assessment"
                      size={24}
                      color="#007AFF"
                    />
                    <Text style={styles.statCardValue}>{totalScored}</Text>
                    <Text style={styles.statCardLabel}>Essays Scored</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons
                      name="trending-up"
                      size={24}
                      color="#10B981"
                    />
                    <Text style={styles.statCardValue}>
                      {avgScore.toFixed(1)}
                    </Text>
                    <Text style={styles.statCardLabel}>Avg Score</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons
                      name="arrow-upward"
                      size={24}
                      color="#F59E0B"
                    />
                    <Text style={styles.statCardValue}>{maxScore}</Text>
                    <Text style={styles.statCardLabel}>Best Score</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons
                      name="arrow-downward"
                      size={24}
                      color="#EF4444"
                    />
                    <Text style={styles.statCardValue}>{minScore}</Text>
                    <Text style={styles.statCardLabel}>Lowest Score</Text>
                  </View>
                </View>

                {/* Score Progression Line Chart */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name="timeline" size={20} color="#007AFF" />
                    <Text style={styles.cardTitle}>
                      Score Progression Over Time
                    </Text>
                  </View>
                  <View style={styles.chartContainer}>
                    {/* Y-axis labels */}
                    <View style={styles.yAxisLabels}>
                      <Text style={styles.yAxisLabel}>14</Text>
                      <Text style={styles.yAxisLabel}>10</Text>
                      <Text style={styles.yAxisLabel}>7</Text>
                      <Text style={styles.yAxisLabel}>3</Text>
                      <Text style={styles.yAxisLabel}>0</Text>
                    </View>

                    {/* Chart area */}
                    <View style={styles.chartArea}>
                      {/* Grid lines */}
                      <View style={styles.gridLines}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <View key={i} style={styles.gridLine} />
                        ))}
                      </View>

                      {/* Data points and line */}
                      <View style={styles.chartDataContainer}>
                        {scoredEssays
                          .slice(0, Math.min(10, scoredEssays.length))
                          .reverse()
                          .map((essay, index) => {
                            const heightPercent =
                              ((essay.score || 0) / 14) * 100;
                            return (
                              <View key={index} style={styles.chartColumn}>
                                <View style={styles.chartBarWrapper}>
                                  <View
                                    style={[
                                      styles.chartBar,
                                      {
                                        height: `${heightPercent}%`,
                                        backgroundColor:
                                          index === scoredEssays.length - 1
                                            ? "#007AFF"
                                            : "#60A5FA",
                                      },
                                    ]}
                                  />
                                  <View
                                    style={[
                                      styles.chartDot,
                                      { bottom: `${heightPercent}%` },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.xAxisLabel}>
                                  {index + 1}
                                </Text>
                              </View>
                            );
                          })}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.chartCaption}>
                    Last {Math.min(10, scoredEssays.length)} essays (oldest to
                    newest)
                  </Text>
                </View>

                {/* Performance Trend Comparison */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons
                      name="show-chart"
                      size={20}
                      color="#007AFF"
                    />
                    <Text style={styles.cardTitle}>
                      Performance Trend Analysis
                    </Text>
                  </View>
                  <View style={styles.trendContainer}>
                    <View style={styles.trendItem}>
                      <Text style={styles.trendLabel}>
                        Recent Average (Last 3)
                      </Text>
                      <Text style={styles.trendValue}>
                        {recentAvg.toFixed(2)}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={trend >= 0 ? "arrow-forward" : "arrow-back"}
                      size={32}
                      color={trend >= 0 ? "#10B981" : "#EF4444"}
                    />
                    <View style={styles.trendItem}>
                      <Text style={styles.trendLabel}>Earlier Average</Text>
                      <Text style={styles.trendValue}>{oldAvg.toFixed(2)}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.trendBadge,
                      {
                        backgroundColor:
                          trend >= 0
                            ? "rgba(16, 185, 129, 0.1)"
                            : "rgba(239, 68, 68, 0.1)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={trend >= 0 ? "trending-up" : "trending-down"}
                      size={18}
                      color={trend >= 0 ? "#10B981" : "#EF4444"}
                    />
                    <Text
                      style={[
                        styles.trendBadgeText,
                        { color: trend >= 0 ? "#10B981" : "#EF4444" },
                      ]}
                    >
                      {trend >= 0 ? "+" : ""}
                      {trendPercentage}%{" "}
                      {trend >= 0 ? "Improvement" : "Decline"}
                    </Text>
                  </View>
                </View>

                {/* Skill Breakdown Chart */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name="bar-chart" size={20} color="#8B5CF6" />
                    <Text style={styles.cardTitle}>
                      Skill Breakdown Analysis
                    </Text>
                  </View>

                  {/* Horizontal Bar Chart */}
                  <View style={styles.horizontalBarChart}>
                    {/* Richness */}
                    <View style={styles.skillRow}>
                      <View style={styles.skillHeader}>
                        <MaterialIcons name="star" size={18} color="#10B981" />
                        <Text style={styles.skillLabel}>Richness</Text>
                        <Text style={styles.skillScore}>
                          {avgRichness.toFixed(2)}/5
                        </Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${(avgRichness / 5) * 100}%`,
                              backgroundColor: "#10B981",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.skillPercentage}>
                        {((avgRichness / 5) * 100).toFixed(0)}%
                      </Text>
                    </View>

                    {/* Organization/Creativity */}
                    <View style={styles.skillRow}>
                      <View style={styles.skillHeader}>
                        <MaterialIcons
                          name="auto-awesome"
                          size={18}
                          color="#F59E0B"
                        />
                        <Text style={styles.skillLabel}>
                          Organization/Creativity
                        </Text>
                        <Text style={styles.skillScore}>
                          {avgOrganization.toFixed(2)}/6
                        </Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${(avgOrganization / 6) * 100}%`,
                              backgroundColor: "#F59E0B",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.skillPercentage}>
                        {((avgOrganization / 6) * 100).toFixed(0)}%
                      </Text>
                    </View>

                    {/* Technical Skills */}
                    <View style={styles.skillRow}>
                      <View style={styles.skillHeader}>
                        <MaterialIcons name="build" size={18} color="#8B5CF6" />
                        <Text style={styles.skillLabel}>Technical Skills</Text>
                        <Text style={styles.skillScore}>
                          {avgTechnical.toFixed(2)}/3
                        </Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${(avgTechnical / 3) * 100}%`,
                              backgroundColor: "#8B5CF6",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.skillPercentage}>
                        {((avgTechnical / 3) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  {/* Radar-style visualization */}
                  <View style={styles.radarContainer}>
                    <Text style={styles.radarTitle}>Skill Distribution</Text>
                    <View style={styles.radarChart}>
                      {/* Center point */}
                      <View style={styles.radarCenter}>
                        <Text style={styles.radarCenterText}>
                          {avgScore.toFixed(1)}
                        </Text>
                        <Text style={styles.radarCenterLabel}>Total</Text>
                      </View>

                      {/* Skill segments */}
                      <View style={styles.radarSegments}>
                        <View
                          style={[
                            styles.radarSegment,
                            {
                              width: `${(avgRichness / 5) * 100}%`,
                              backgroundColor: "#10B981",
                            },
                          ]}
                        >
                          <Text style={styles.radarSegmentLabel}>R</Text>
                        </View>
                        <View
                          style={[
                            styles.radarSegment,
                            {
                              width: `${(avgOrganization / 6) * 100}%`,
                              backgroundColor: "#F59E0B",
                            },
                          ]}
                        >
                          <Text style={styles.radarSegmentLabel}>O</Text>
                        </View>
                        <View
                          style={[
                            styles.radarSegment,
                            {
                              width: `${(avgTechnical / 3) * 100}%`,
                              backgroundColor: "#8B5CF6",
                            },
                          ]}
                        >
                          <Text style={styles.radarSegmentLabel}>T</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.radarLegend}>
                      <View style={styles.radarLegendItem}>
                        <View
                          style={[
                            styles.radarLegendDot,
                            { backgroundColor: "#10B981" },
                          ]}
                        />
                        <Text style={styles.radarLegendText}>R = Richness</Text>
                      </View>
                      <View style={styles.radarLegendItem}>
                        <View
                          style={[
                            styles.radarLegendDot,
                            { backgroundColor: "#F59E0B" },
                          ]}
                        />
                        <Text style={styles.radarLegendText}>
                          O = Organization
                        </Text>
                      </View>
                      <View style={styles.radarLegendItem}>
                        <View
                          style={[
                            styles.radarLegendDot,
                            { backgroundColor: "#8B5CF6" },
                          ]}
                        />
                        <Text style={styles.radarLegendText}>
                          T = Technical
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Score Distribution Pie Chart */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name="pie-chart" size={20} color="#EC4899" />
                    <Text style={styles.cardTitle}>Score Distribution</Text>
                  </View>

                  {(() => {
                    // Calculate score ranges
                    const excellent = scoredEssays.filter(
                      (e) => (e.score || 0) >= 12
                    ).length;
                    const good = scoredEssays.filter(
                      (e) => (e.score || 0) >= 9 && (e.score || 0) < 12
                    ).length;
                    const average = scoredEssays.filter(
                      (e) => (e.score || 0) >= 6 && (e.score || 0) < 9
                    ).length;
                    const needsWork = scoredEssays.filter(
                      (e) => (e.score || 0) < 6
                    ).length;

                    const excellentPct = (excellent / totalScored) * 100;
                    const goodPct = (good / totalScored) * 100;
                    const avgPct = (average / totalScored) * 100;
                    const needsWorkPct = (needsWork / totalScored) * 100;

                    return (
                      <View>
                        {/* Stacked bar representation */}
                        <View style={styles.stackedBar}>
                          {excellent > 0 && (
                            <View
                              style={[
                                styles.stackedSegment,
                                {
                                  width: `${excellentPct}%`,
                                  backgroundColor: "#10B981",
                                },
                              ]}
                            />
                          )}
                          {good > 0 && (
                            <View
                              style={[
                                styles.stackedSegment,
                                {
                                  width: `${goodPct}%`,
                                  backgroundColor: "#60A5FA",
                                },
                              ]}
                            />
                          )}
                          {average > 0 && (
                            <View
                              style={[
                                styles.stackedSegment,
                                {
                                  width: `${avgPct}%`,
                                  backgroundColor: "#F59E0B",
                                },
                              ]}
                            />
                          )}
                          {needsWork > 0 && (
                            <View
                              style={[
                                styles.stackedSegment,
                                {
                                  width: `${needsWorkPct}%`,
                                  backgroundColor: "#EF4444",
                                },
                              ]}
                            />
                          )}
                        </View>

                        {/* Legend with stats */}
                        <View style={styles.distributionLegend}>
                          <View style={styles.distributionItem}>
                            <View
                              style={[
                                styles.distributionDot,
                                { backgroundColor: "#10B981" },
                              ]}
                            />
                            <Text style={styles.distributionLabel}>
                              Excellent (12-14)
                            </Text>
                            <Text style={styles.distributionValue}>
                              {excellent} ({excellentPct.toFixed(0)}%)
                            </Text>
                          </View>
                          <View style={styles.distributionItem}>
                            <View
                              style={[
                                styles.distributionDot,
                                { backgroundColor: "#60A5FA" },
                              ]}
                            />
                            <Text style={styles.distributionLabel}>
                              Good (9-11)
                            </Text>
                            <Text style={styles.distributionValue}>
                              {good} ({goodPct.toFixed(0)}%)
                            </Text>
                          </View>
                          <View style={styles.distributionItem}>
                            <View
                              style={[
                                styles.distributionDot,
                                { backgroundColor: "#F59E0B" },
                              ]}
                            />
                            <Text style={styles.distributionLabel}>
                              Average (6-8)
                            </Text>
                            <Text style={styles.distributionValue}>
                              {average} ({avgPct.toFixed(0)}%)
                            </Text>
                          </View>
                          <View style={styles.distributionItem}>
                            <View
                              style={[
                                styles.distributionDot,
                                { backgroundColor: "#EF4444" },
                              ]}
                            />
                            <Text style={styles.distributionLabel}>
                              Needs Work (0-5)
                            </Text>
                            <Text style={styles.distributionValue}>
                              {needsWork} ({needsWorkPct.toFixed(0)}%)
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* Fairness Metrics Dashboard */}
                {fairnessData.length > 0 && (
                  <View style={styles.dashboardCard}>
                    <View style={styles.cardHeader}>
                      <MaterialIcons name="balance" size={20} color="#EC4899" />
                      <Text style={styles.cardTitle}>
                        Fairness & Bias Metrics
                      </Text>
                    </View>
                    <Text style={styles.fairnessDescription}>
                      AI fairness indicators ensure unbiased assessment across
                      all students
                    </Text>

                    <View style={styles.fairnessMetricsGrid}>
                      <View style={styles.fairnessMetric}>
                        <Text style={styles.fairnessMetricLabel}>SPD</Text>
                        <Text style={styles.fairnessMetricValue}>
                          {avgSPD.toFixed(3)}
                        </Text>
                        <Text style={styles.fairnessMetricDesc}>
                          Statistical Parity
                        </Text>
                      </View>
                      <View style={styles.fairnessMetric}>
                        <Text style={styles.fairnessMetricLabel}>DIR</Text>
                        <Text style={styles.fairnessMetricValue}>
                          {avgDIR.toFixed(3)}
                        </Text>
                        <Text style={styles.fairnessMetricDesc}>
                          Disparate Impact
                        </Text>
                      </View>
                      <View style={styles.fairnessMetric}>
                        <Text style={styles.fairnessMetricLabel}>EOD</Text>
                        <Text style={styles.fairnessMetricValue}>
                          {avgEOD.toFixed(3)}
                        </Text>
                        <Text style={styles.fairnessMetricDesc}>
                          Equal Opportunity
                        </Text>
                      </View>
                    </View>

                    {latestEssay.fairness_report?.mitigation_used && (
                      <View style={styles.mitigationBadge}>
                        <MaterialIcons
                          name="verified-user"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.mitigationText}>
                          Bias Mitigation:{" "}
                          {latestEssay.fairness_report.mitigation_used}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Special Needs Detection */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons
                      name="health-and-safety"
                      size={20}
                      color="#60A5FA"
                    />
                    <Text style={styles.cardTitle}>
                      Learning Support Indicators
                    </Text>
                  </View>
                  <View style={styles.dyslexiaStats}>
                    <View style={styles.dyslexiaStatItem}>
                      <MaterialIcons
                        name={dyslexicCount > 0 ? "warning" : "check-circle"}
                        size={32}
                        color={dyslexicCount > 0 ? "#F59E0B" : "#10B981"}
                      />
                      <Text style={styles.dyslexiaCount}>
                        {dyslexicCount}/{totalScored}
                      </Text>
                      <Text style={styles.dyslexiaLabel}>Essays flagged</Text>
                    </View>
                    <View style={styles.dyslexiaStatItem}>
                      <Text style={styles.dyslexiaRate}>{dyslexicRate}%</Text>
                      <Text style={styles.dyslexiaLabel}>Average Dyslexia Rate</Text>
                    </View>
                  </View>
                  {dyslexicCount > 0 && (
                    <View style={styles.recommendationBox}>
                      <MaterialIcons
                        name="lightbulb-outline"
                        size={18}
                        color="#F59E0B"
                      />
                      <Text style={styles.recommendationText}>
                        Consider specialized support or accommodations for this
                        student
                      </Text>
                    </View>
                  )}
                </View>

                {/* Personalized Recommendations */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons
                      name="tips-and-updates"
                      size={20}
                      color="#10B981"
                    />
                    <Text style={styles.cardTitle}>
                      Personalized Recommendations
                    </Text>
                  </View>

                  {/* Generate dynamic recommendations based on performance */}
                  {avgRichness < 3 && (
                    <View style={styles.recommendationItem}>
                      <MaterialIcons name="flag" size={16} color="#EF4444" />
                      <Text style={styles.recommendationItemText}>
                        Focus on vocabulary enrichment - current average{" "}
                        {avgRichness.toFixed(1)}/5
                      </Text>
                    </View>
                  )}
                  {avgOrganization < 3.5 && (
                    <View style={styles.recommendationItem}>
                      <MaterialIcons name="flag" size={16} color="#F59E0B" />
                      <Text style={styles.recommendationItemText}>
                        Work on essay structure and creative expression -
                        current average {avgOrganization.toFixed(1)}/6
                      </Text>
                    </View>
                  )}
                  {avgTechnical < 2 && (
                    <View style={styles.recommendationItem}>
                      <MaterialIcons name="flag" size={16} color="#EF4444" />
                      <Text style={styles.recommendationItemText}>
                        Strengthen grammar and technical writing skills -
                        current average {avgTechnical.toFixed(1)}/3
                      </Text>
                    </View>
                  )}
                  {trend < 0 && (
                    <View style={styles.recommendationItem}>
                      <MaterialIcons
                        name="trending-down"
                        size={16}
                        color="#EF4444"
                      />
                      <Text style={styles.recommendationItemText}>
                        Performance declining - consider one-on-one tutoring
                        session
                      </Text>
                    </View>
                  )}
                  {avgScore >= 12 && (
                    <View style={styles.recommendationItem}>
                      <MaterialIcons
                        name="emoji-events"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={styles.recommendationItemText}>
                        Excellent performance! Encourage advanced writing
                        challenges
                      </Text>
                    </View>
                  )}
                </View>

                {/* Latest Essay Quick View */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons
                      name="description"
                      size={20}
                      color="#EC4899"
                    />
                    <Text style={styles.cardTitle}>Latest Essay Snapshot</Text>
                  </View>
                  <View style={styles.latestEssayInfo}>
                    <Text style={styles.latestEssayScore}>
                      Score: {latestEssay.score}/14
                    </Text>
                    {latestEssay.details?.topic && (
                      <Text style={styles.latestEssayTopic}>
                        Topic: {latestEssay.details.topic}
                      </Text>
                    )}
                    <Text style={styles.latestEssayDate}>
                      {formatDate(latestEssay.uploadedAt)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </View>

        {/* Essays List */}
        <View style={styles.essaysSection}>
          <Text style={styles.sectionTitle}>{t("studentEssays.title")}</Text>
          <FlatList
            data={studentInfo.essays}
            renderItem={renderEssayItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feedbackSection: {
    backgroundColor: "#23262F",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#181A20",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333640",
  },
  statCardValue: {
    color: "#007AFF",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  statCardLabel: {
    color: "#B0B3C6",
    fontSize: 11,
    textAlign: "center",
  },
  // Dashboard Card
  dashboardCard: {
    backgroundColor: "#181A20",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333640",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Trend Analysis
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  trendItem: {
    flex: 1,
    alignItems: "center",
  },
  trendLabel: {
    color: "#B0B3C6",
    fontSize: 11,
    marginBottom: 4,
  },
  trendValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  trendBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Line Chart Styles
  chartContainer: {
    flexDirection: "row",
    height: 180,
    marginBottom: 8,
  },
  yAxisLabels: {
    width: 30,
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  yAxisLabel: {
    color: "#B0B3C6",
    fontSize: 11,
    textAlign: "right",
  },
  chartArea: {
    flex: 1,
    marginLeft: 8,
    position: "relative",
  },
  gridLines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  gridLine: {
    height: 1,
    backgroundColor: "#333640",
  },
  chartDataContainer: {
    flexDirection: "row",
    height: "100%",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  chartColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    maxWidth: 40,
  },
  chartBarWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    alignItems: "center",
  },
  chartBar: {
    width: 8,
    backgroundColor: "#60A5FA",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    position: "absolute",
    bottom: 0,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    borderWidth: 2,
    borderColor: "#fff",
    position: "absolute",
  },
  xAxisLabel: {
    color: "#B0B3C6",
    fontSize: 10,
    marginTop: 4,
  },
  chartCaption: {
    color: "#B0B3C6",
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Horizontal Bar Chart
  horizontalBarChart: {
    marginBottom: 16,
  },
  // Skill Breakdown
  skillRow: {
    marginBottom: 16,
  },
  skillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  skillLabel: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  skillScore: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#23262F",
    borderRadius: 4,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  skillPercentage: {
    color: "#B0B3C6",
    fontSize: 12,
    textAlign: "right",
  },
  // Radar Chart Styles
  radarContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#333640",
  },
  radarTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  radarChart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  radarCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#23262F",
    borderWidth: 2,
    borderColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  radarCenterText: {
    color: "#007AFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  radarCenterLabel: {
    color: "#B0B3C6",
    fontSize: 10,
  },
  radarSegments: {
    flex: 1,
    gap: 8,
  },
  radarSegment: {
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    paddingLeft: 8,
    minWidth: 30,
  },
  radarSegmentLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  radarLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: 8,
  },
  radarLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  radarLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radarLegendText: {
    color: "#B0B3C6",
    fontSize: 11,
  },
  // Score Distribution (Pie/Stacked Bar) Styles
  stackedBar: {
    flexDirection: "row",
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  stackedSegment: {
    justifyContent: "center",
    alignItems: "center",
  },
  distributionLegend: {
    gap: 10,
  },
  distributionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#23262F",
    padding: 10,
    borderRadius: 8,
  },
  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  distributionLabel: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
  },
  distributionValue: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  // Fairness Metrics
  fairnessDescription: {
    color: "#B0B3C6",
    fontSize: 12,
    marginBottom: 12,
    fontStyle: "italic",
  },
  fairnessMetricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  fairnessMetric: {
    flex: 1,
    backgroundColor: "#23262F",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EC4899",
  },
  fairnessMetricLabel: {
    color: "#EC4899",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  fairnessMetricValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  fairnessMetricDesc: {
    color: "#B0B3C6",
    fontSize: 10,
    textAlign: "center",
  },
  mitigationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 10,
    borderRadius: 8,
  },
  mitigationText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  // Dyslexia Stats
  dyslexiaStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  dyslexiaStatItem: {
    flex: 1,
    backgroundColor: "#23262F",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  dyslexiaCount: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  dyslexiaRate: {
    color: "#007AFF",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  dyslexiaLabel: {
    color: "#B0B3C6",
    fontSize: 12,
    textAlign: "center",
  },
  // Recommendations
  recommendationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  recommendationText: {
    color: "#F59E0B",
    fontSize: 13,
    flex: 1,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#23262F",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationItemText: {
    color: "#B0B3C6",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  // Latest Essay
  latestEssayInfo: {
    gap: 8,
  },
  latestEssayScore: {
    color: "#007AFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  latestEssayTopic: {
    color: "#fff",
    fontSize: 14,
  },
  latestEssayDate: {
    color: "#B0B3C6",
    fontSize: 12,
  },
  // No Feedback State
  noFeedbackContainer: {
    alignItems: "center",
    padding: 32,
  },
  noFeedbackText: {
    color: "#B0B3C6",
    fontSize: 15,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  feedbackStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  feedbackStatItem: {
    flex: 1,
    backgroundColor: "#181A20",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  feedbackStatLabel: {
    color: "#B0B3C6",
    fontSize: 12,
    marginBottom: 4,
  },
  feedbackStatValue: {
    color: "#007AFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  feedbackDetails: {
    backgroundColor: "#181A20",
    padding: 16,
    borderRadius: 8,
  },
  feedbackSubtitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  feedbackItemText: {
    color: "#B0B3C6",
    fontSize: 14,
    flex: 1,
  },
  feedbackText: {
    color: "#B0B3C6",
    fontSize: 15,
    marginTop: 8,
    fontStyle: "italic",
  },
  container: {
    flex: 1,
    backgroundColor: "#181A20",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    padding: 20,
  },
  loadingText: {
    color: "#B0B3C6",
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 24,
  },
  backButtonTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButtonTopText: {
    color: "#007AFF",
    fontSize: 16,
    marginLeft: 8,
  },
  studentInfoCard: {
    backgroundColor: "#23262F",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#181A20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  studentDetails: {
    flex: 1,
  },
  studentId: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    color: "#B0B3C6",
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#333640",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#181A20",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  statNumber: {
    color: "#007AFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    color: "#B0B3C6",
    fontSize: 12,
  },
  essaysSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  essayCardWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  essayCard: {
    flexDirection: "row",
    backgroundColor: "#23262F",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  deleteIconButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181A20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  essayInfo: {
    flex: 1,
  },
  fileName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  uploadDate: {
    color: "#B0B3C6",
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    color: "#888",
    fontSize: 13,
    fontStyle: "italic",
  },
  mindmapButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#007AFF",
    alignSelf: "flex-start",
    gap: 4,
  },
  mindmapButtonText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
