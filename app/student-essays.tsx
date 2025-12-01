import AppHeader from "@/components/AppHeader";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { storage } from "@/config/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserImageService, UserImageUpload } from "@/services/userImageService";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  BatchFeedbackRequest,
  BatchFeedbackResponse,
  fetchBatchTextFeedback,
} from "@/app/api/batchTextFeedback";

// Component to display essay thumbnail with fresh URL resolution (CORS bypass on web)
interface EssayThumbnailProps {
  essay: UserImageUpload;
  style?: any;
}

const EssayThumbnail: React.FC<EssayThumbnailProps> = ({ essay, style }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const resolveUrl = async () => {
      setLoading(true);
      setError(false);
      try {
        const storagePath = essay.storagePath;
        if (!storagePath) {
          // Fallback to imageUrl if storagePath not available
          setImageUrl(essay.imageUrl || null);
          setLoading(false);
          return;
        }

        // Extract plain path from gs:// URL if needed
        let normalizedPath = storagePath;
        if (storagePath.startsWith("gs://")) {
          const parts = storagePath.replace("gs://", "").split("/");
          normalizedPath = parts.slice(1).join("/");
        }

        // Get fresh download URL
        const ref = storageRef(storage, normalizedPath);
        const freshUrl = await getDownloadURL(ref);

        // On web, convert to data URI to bypass CORS
        if (Platform.OS === "web") {
          try {
            const response = await fetch(freshUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              setImageUrl(reader.result as string);
              setLoading(false);
            };
            reader.onerror = () => {
              setError(true);
              setLoading(false);
            };
            reader.readAsDataURL(blob);
          } catch {
            // Fallback to fresh URL on fetch error
            setImageUrl(freshUrl);
            setLoading(false);
          }
        } else {
          // Native: use URL directly
          setImageUrl(freshUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to resolve essay image URL:", err);
        setError(true);
        setLoading(false);
      }
    };

    resolveUrl();
  }, [essay.storagePath, essay.imageUrl]);

  if (loading) {
    return (
      <View
        style={[
          styles.thumbnail,
          style,
          {
            backgroundColor: "#23262F",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (error || !imageUrl) {
    return (
      <View
        style={[
          styles.thumbnail,
          style,
          {
            backgroundColor: "#333640",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <MaterialIcons name="image-not-supported" size={24} color="#B0B3C6" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={[styles.thumbnail, style]}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
};

export default function StudentEssaysScreen() {
  const { studentData } = useLocalSearchParams<{ studentData?: string }>();
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Batch feedback state
  const [batchFeedback, setBatchFeedback] =
    useState<BatchFeedbackResponse | null>(null);
  const [batchFeedbackLoading, setBatchFeedbackLoading] = useState(false);
  const [batchFeedbackError, setBatchFeedbackError] = useState<string | null>(
    null
  );

  const { showToast } = useToast();
  const confirm = useConfirm();
  const { t } = useLanguage();
  const DEBUG = __DEV__ === true;
  const initializedRef = useRef(false);
  const PAGE_SIZE = 3;

  // SVG Pie chart (uses dynamic import for react-native-svg with graceful fallback)
  const PieChart: React.FC<{
    segments: { label: string; short: string; color: string; value: number }[];
  }> = ({ segments }) => {
    const [SvgLib, setSvgLib] = useState<any | null>(null);
    useEffect(() => {
      let mounted = true;
      import("react-native-svg")
        .then((mod) => {
          if (mounted) setSvgLib(mod as any);
        })
        .catch(() => setSvgLib(null));
      return () => {
        mounted = false;
      };
    }, []);

    const total = segments.reduce((s, v) => s + v.value, 0) || 1;
    if (!SvgLib) {
      return (
        <View style={styles.pieFallback}>
          <Text style={styles.pieFallbackText}>
            Install react-native-svg to enable the pie chart
          </Text>
        </View>
      );
    }

    const { Svg, G, Path, Circle } = SvgLib;
    const size = 180;
    const r = 70;
    const cx = size / 2;
    const cy = size / 2;

    function polarToCartesian(
      cx: number,
      cy: number,
      radius: number,
      angleDeg: number
    ) {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      return {
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad),
      };
    }

    let startAngle = 0;
    const arcsWithLabels: React.ReactElement[] = [];
    segments.forEach((seg, idx) => {
      const angle = (seg.value / total) * 360;
      const endAngle = startAngle + angle;
      const largeArc = angle > 180 ? 1 : 0;
      const start = polarToCartesian(cx, cy, r, endAngle);
      const end = polarToCartesian(cx, cy, r, startAngle);
      const d = [
        `M ${cx} ${cy}`,
        `L ${end.x} ${end.y}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${start.x} ${start.y}`,
        "Z",
      ].join(" ");
      const path = <Path key={`arc-${idx}`} d={d} fill={seg.color} />;
      arcsWithLabels.push(path);

      // Add percentage label at midpoint of arc
      const midAngle = startAngle + angle / 2;
      const labelRadius = r * 0.75;
      const labelPos = polarToCartesian(cx, cy, labelRadius, midAngle);
      const percentage = ((seg.value / total) * 100).toFixed(0);
      if (Number(percentage) > 5) {
        // Only show label if segment is big enough
        arcsWithLabels.push(
          <View
            key={`label-${idx}`}
            style={{
              position: "absolute",
              left: labelPos.x - 15,
              top: labelPos.y - 10,
            }}
          >
            <Text style={styles.pieLabel}>{percentage}%</Text>
          </View>
        );
      }
      startAngle = endAngle;
    });

    return (
      <View style={styles.pieChartWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G>{arcsWithLabels.filter((el) => el.type !== View)}</G>
          <Circle cx={cx} cy={cy} r={r * 0.55} fill="#181A20" />
        </Svg>
        {arcsWithLabels.filter((el) => el.type === View)}
      </View>
    );
  };

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

  // Clamp current page when essays length changes (e.g., after deletion)
  useEffect(() => {
    if (!studentInfo?.essays) return;
    const totalPages = Math.max(
      1,
      Math.ceil(studentInfo.essays.length / PAGE_SIZE)
    );
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [studentInfo]);

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

  const handleFetchBatchFeedback = async () => {
    if (!studentInfo?.essays || studentInfo.essays.length === 0) {
      showToast("No essays to analyze", { type: "error" });
      return;
    }

    setBatchFeedbackLoading(true);
    setBatchFeedbackError(null);

    try {
      console.log(
        `🔄 Fetching batch feedback for ${studentInfo.essays.length} essays...`
      );

      // Construct the batch request with essay_id and text
      const requests: BatchFeedbackRequest[] = studentInfo.essays
        .filter((essay: UserImageUpload) => essay.essay_text) // Only include essays with text
        .map((essay: UserImageUpload) => ({
          essay_id: essay.id,
          text: essay.essay_text || essay.description || "",
        }));

      if (requests.length === 0) {
        throw new Error("No essays with text content found");
      }

      console.log(`📤 Sending ${requests.length} essays for batch analysis`);

      const response = await fetchBatchTextFeedback(requests);
      setBatchFeedback(response);
      console.log("✅ Batch feedback received:", response);
      showToast(`Analysis complete for ${response.total} essays`, {
        type: "success",
      });
    } catch (error: any) {
      console.error("❌ Failed to fetch batch feedback:", error);
      setBatchFeedbackError(error.message || "Failed to get batch feedback");
      showToast("Failed to analyze essays", { type: "error" });
    } finally {
      setBatchFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader hideRightSection />
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
        <AppHeader hideRightSection />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>
            {t("studentEssays.studentNotFound")}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)");
              }
            }}
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
      <View style={styles.essayCardContainer}>
        {/* Main Essay Card */}
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
          <EssayThumbnail essay={item} />
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
            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
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
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#B0B3C6" />
        </TouchableOpacity>

        {/* Delete Button on Right */}
        <TouchableOpacity
          style={styles.deleteIconButton}
          onPress={() => handleDeleteEssay(item)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <AppHeader hideRightSection />

      <View style={styles.content}>
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

        {/* Submitted Essays (Top with Pagination) */}
        {(() => {
          const totalEssays = studentInfo.essays.length;
          const totalPages = Math.max(1, Math.ceil(totalEssays / PAGE_SIZE));
          const startIndex = (currentPage - 1) * PAGE_SIZE;
          const endIndex = Math.min(startIndex + PAGE_SIZE, totalEssays);
          const pagedEssays = studentInfo.essays.slice(startIndex, endIndex);
          return (
            <View style={styles.essaysSection}>
              <View style={styles.essaysHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {t("studentEssays.title")}
                </Text>
                {totalPages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        currentPage === 1 && styles.pageButtonDisabled,
                      ]}
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <MaterialIcons
                        name="chevron-left"
                        size={20}
                        color={currentPage === 1 ? "#555" : "#fff"}
                      />
                    </TouchableOpacity>
                    <Text style={styles.pageInfo}>
                      {currentPage}/{totalPages}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        currentPage === totalPages && styles.pageButtonDisabled,
                      ]}
                      disabled={currentPage === totalPages}
                      onPress={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={currentPage === totalPages ? "#555" : "#fff"}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <FlatList
                data={pagedEssays}
                renderItem={renderEssayItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />

              {totalPages > 1 && (
                <Text style={styles.rangeInfo}>
                  Showing {startIndex + 1}-{endIndex} of {totalEssays}
                </Text>
              )}
            </View>
          );
        })()}

        {/* Batch Feedback Section */}
        <View style={styles.batchFeedbackSection}>
          <View style={styles.batchFeedbackHeader}>
            <MaterialIcons name="summarize" size={24} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Student Performance Summary</Text>
            <TouchableOpacity
              style={[
                styles.batchFeedbackButton,
                batchFeedbackLoading && { opacity: 0.6 },
              ]}
              onPress={handleFetchBatchFeedback}
              disabled={batchFeedbackLoading}
            >
              {batchFeedbackLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="refresh" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {batchFeedbackLoading && (
            <View style={styles.batchFeedbackStatusBox}>
              <ActivityIndicator color="#8B5CF6" />
              <Text style={styles.batchFeedbackStatusText}>
                Analyzing all essays...
              </Text>
            </View>
          )}

          {batchFeedbackError && (
            <View style={styles.batchFeedbackErrorBox}>
              <MaterialIcons name="error-outline" size={20} color="#EF4444" />
              <Text style={styles.batchFeedbackErrorText}>
                {batchFeedbackError}
              </Text>
            </View>
          )}

          {batchFeedback && (
            <View style={styles.batchFeedbackContent}>
              <View style={styles.batchFeedbackStats}>
                <Text style={styles.batchFeedbackStatLabel}>
                  Essays Analyzed
                </Text>
                <Text style={styles.batchFeedbackStatValue}>
                  {batchFeedback.total}
                </Text>
              </View>

              {batchFeedback.summary?.common_suggestions &&
                batchFeedback.summary.common_suggestions.length > 0 && (
                  <View style={styles.commonSuggestionsBox}>
                    <View style={styles.suggestionsHeader}>
                      <MaterialIcons
                        name="lightbulb"
                        size={20}
                        color="#F59E0B"
                      />
                      <Text style={styles.suggestionsBoxTitle}>
                        Common Suggestions Across All Essays
                      </Text>
                    </View>
                    {batchFeedback.summary.common_suggestions.map(
                      (suggestion, idx) => (
                        <View key={idx} style={styles.commonSuggestionItem}>
                          <Text style={styles.suggestionBullet}>•</Text>
                          <Text style={styles.commonSuggestionText}>
                            {suggestion}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                )}
            </View>
          )}

          {!batchFeedback && !batchFeedbackLoading && !batchFeedbackError && (
            <Text style={styles.batchFeedbackPlaceholder}>
              Click refresh to analyze all student essays
            </Text>
          )}
        </View>

        {/* Analytics Dashboard */}
        <View style={styles.feedbackSection}>
          <View style={styles.feedbackHeader}>
            <MaterialIcons name="analytics" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>{t("analytics.dashboard")}</Text>
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
                    {t("analytics.noAnalyticsYet")}
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
            const richnessEssays = scoredEssays.filter(
              (e: UserImageUpload) => e.rubric?.richness_5 !== undefined
            );
            let avgRichness =
              richnessEssays.length > 0
                ? richnessEssays.reduce(
                    (sum: number, e: UserImageUpload) =>
                      sum + (e.rubric?.richness_5 || 0),
                    0
                  ) / richnessEssays.length
                : 0;
            const organizationEssays = scoredEssays.filter(
              (e: UserImageUpload) => e.rubric?.organization_6 !== undefined
            );
            let avgOrganization =
              organizationEssays.length > 0
                ? organizationEssays.reduce(
                    (sum: number, e: UserImageUpload) =>
                      sum + (e.rubric?.organization_6 || 0),
                    0
                  ) / organizationEssays.length
                : 0;
            const technicalEssays = scoredEssays.filter(
              (e: UserImageUpload) => e.rubric?.technical_3 !== undefined
            );
            let avgTechnical =
              technicalEssays.length > 0
                ? technicalEssays.reduce(
                    (sum: number, e: UserImageUpload) =>
                      sum + (e.rubric?.technical_3 || 0),
                    0
                  ) / technicalEssays.length
                : 0;

            // Demo mode: Use sample data if no rubric data exists
            if (
              avgRichness === 0 &&
              avgOrganization === 0 &&
              avgTechnical === 0
            ) {
              avgRichness = 3.8;
              avgOrganization = 4.5;
              avgTechnical = 2.2;
            }

            // Fairness metrics removed as per request

            // Trend analysis (last 3 vs first 3)
            const recentEssays = scoredEssays.slice(
              0,
              Math.min(3, scoredEssays.length)
            );
            const oldEssays = scoredEssays.slice(
              -Math.min(3, scoredEssays.length)
            );
            const recentAvg =
              recentEssays.reduce(
                (sum: number, e: UserImageUpload) => sum + (e.score || 0),
                0
              ) / recentEssays.length;
            const oldAvg =
              oldEssays.reduce(
                (sum: number, e: UserImageUpload) => sum + (e.score || 0),
                0
              ) / oldEssays.length;
            const trend = recentAvg - oldAvg;
            const trendPercentage =
              oldAvg > 0 ? ((trend / oldAvg) * 100).toFixed(1) : "0.0";

            // Dyslexia detection stats
            const dyslexicCount = scoredEssays.filter(
              (e: UserImageUpload) => e.details?.dyslexic_flag
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
                    <Text style={styles.statCardLabel}>
                      {t("analytics.essaysScored")}
                    </Text>
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
                    <Text style={styles.statCardLabel}>
                      {t("analytics.avgScore")}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons
                      name="arrow-upward"
                      size={24}
                      color="#F59E0B"
                    />
                    <Text style={styles.statCardValue}>{maxScore}</Text>
                    <Text style={styles.statCardLabel}>
                      {t("analytics.bestScore")}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons
                      name="arrow-downward"
                      size={24}
                      color="#EF4444"
                    />
                    <Text style={styles.statCardValue}>{minScore}</Text>
                    <Text style={styles.statCardLabel}>
                      {t("analytics.lowestScore")}
                    </Text>
                  </View>
                </View>

                {/* Score Progression Line Chart */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name="timeline" size={20} color="#007AFF" />
                    <Text style={styles.cardTitle}>
                      {t("analytics.scoreProgression")}
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
                        {(scoredEssays as UserImageUpload[])
                          .slice(0, Math.min(10, scoredEssays.length))
                          .reverse()
                          .map((essay: UserImageUpload, index: number) => {
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
                    {t("analytics.lastEssays", {
                      count: Math.min(10, scoredEssays.length),
                    })}
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
                      {t("analytics.performanceTrend")}
                    </Text>
                  </View>
                  <View style={styles.trendContainer}>
                    <View style={styles.trendItem}>
                      <Text style={styles.trendLabel}>
                        {t("analytics.recentAverage")}
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
                      <Text style={styles.trendLabel}>
                        {t("analytics.earlierAverage")}
                      </Text>
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
                      {trend >= 0
                        ? t("analytics.improvement")
                        : t("analytics.decline")}
                    </Text>
                  </View>
                </View>

                {/* Skill Breakdown Chart */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name="bar-chart" size={20} color="#8B5CF6" />
                    <Text style={styles.cardTitle}>
                      {t("analytics.skillBreakdown")}
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

                  {/* Pie chart visualization */}
                  <View style={styles.radarContainer}>
                    <Text style={styles.radarTitle}>
                      {t("analytics.skillDistribution")}
                    </Text>
                    {(() => {
                      // Use actual scores (not normalized) for proper pie chart proportions
                      const segments = [
                        {
                          short: "R",
                          label: "Richness",
                          color: "#10B981",
                          value: Math.max(0.1, avgRichness), // minimum 0.1 to show segment
                        },
                        {
                          short: "O",
                          label: "Organization",
                          color: "#F59E0B",
                          value: Math.max(0.1, avgOrganization),
                        },
                        {
                          short: "T",
                          label: "Technical",
                          color: "#8B5CF6",
                          value: Math.max(0.1, avgTechnical),
                        },
                      ];
                      return <PieChart segments={segments} />;
                    })()}

                    <View style={styles.radarLegend}>
                      <View style={styles.radarLegendItem}>
                        <View
                          style={[
                            styles.radarLegendDot,
                            { backgroundColor: "#10B981" },
                          ]}
                        />
                        <Text style={styles.radarLegendText}>
                          Richness: {avgRichness.toFixed(1)}/5 (
                          {((avgRichness / 5) * 100).toFixed(0)}%)
                        </Text>
                      </View>
                      <View style={styles.radarLegendItem}>
                        <View
                          style={[
                            styles.radarLegendDot,
                            { backgroundColor: "#F59E0B" },
                          ]}
                        />
                        <Text style={styles.radarLegendText}>
                          Organization: {avgOrganization.toFixed(1)}/6 (
                          {((avgOrganization / 6) * 100).toFixed(0)}%)
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
                          Technical: {avgTechnical.toFixed(1)}/3 (
                          {((avgTechnical / 3) * 100).toFixed(0)}%)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Fairness Metrics Dashboard removed as requested */}

                {/* Special Needs Detection */}
                <View style={styles.dashboardCard}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons
                      name="health-and-safety"
                      size={20}
                      color="#60A5FA"
                    />
                    <Text style={styles.cardTitle}>
                      {t("analytics.learningSupport")}
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
                      <Text style={styles.dyslexiaLabel}>
                        {t("analytics.essaysFlagged")}
                      </Text>
                    </View>
                    <View style={styles.dyslexiaStatItem}>
                      <Text style={styles.dyslexiaRate}>{dyslexicRate}%</Text>
                      <Text style={styles.dyslexiaLabel}>
                        {t("analytics.dyslexiaRate")}
                      </Text>
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
                        {t("analytics.specializedSupport")}
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
                    <Text style={styles.cardTitle}>
                      {t("analytics.latestEssaySnapshot")}
                    </Text>
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

        {/* Essays List moved to top with pagination */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  batchFeedbackSection: {
    backgroundColor: "#23262F",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
  },

  batchFeedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  batchFeedbackButton: {
    backgroundColor: "#8B5CF6",
    padding: 8,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  batchFeedbackStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },

  batchFeedbackStatusText: {
    color: "#9CA3AF",
    fontSize: 13,
  },

  batchFeedbackErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7F1D1D",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },

  batchFeedbackErrorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },

  batchFeedbackContent: {
    gap: 16,
  },

  batchFeedbackStats: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#8B5CF6",
  },

  batchFeedbackStatLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 4,
  },

  batchFeedbackStatValue: {
    color: "#8B5CF6",
    fontSize: 24,
    fontWeight: "bold",
  },

  commonSuggestionsBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    gap: 8,
  },

  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  suggestionsBoxTitle: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  commonSuggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  suggestionBullet: {
    color: "#F59E0B",
    fontSize: 16,
    fontWeight: "bold",
  },

  commonSuggestionText: {
    color: "#E5E7EB",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  processedEssaysBox: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },

  processedEssaysLabel: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },

  essayIdsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  essayIdTag: {
    backgroundColor: "#1f2128",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B981",
  },

  essayIdTagText: {
    color: "#E5E7EB",
    fontSize: 11,
  },

  batchFeedbackPlaceholder: {
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },

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
  pieChartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },
  pieLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pieFallback: {
    backgroundColor: "#23262F",
    borderWidth: 1,
    borderColor: "#333640",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pieFallbackText: {
    color: "#B0B3C6",
    fontSize: 12,
    textAlign: "center",
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
  essaysHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#23262F",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333640",
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    color: "#B0B3C6",
    fontSize: 12,
  },
  rangeInfo: {
    color: "#B0B3C6",
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  essayCardWrapper: {
    marginBottom: 12,
  },
  essayCardContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  essayCard: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#23262F",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333640",
  },
  deleteIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FF3B30",
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#333640",
  },
  essayInfo: {
    flex: 1,
    paddingRight: 8,
  },
  fileName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  uploadDate: {
    color: "#B0B3C6",
    fontSize: 12,
    marginBottom: 6,
  },
  description: {
    color: "#888",
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 4,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  mindmapButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0, 122, 255, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    gap: 6,
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
