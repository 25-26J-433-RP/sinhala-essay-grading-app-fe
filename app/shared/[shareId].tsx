import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getSharedEssayData } from "@/services/shareService";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useLanguage } from "@/contexts/LanguageContext";
import { Colors } from "@/constants/Colors";

export default function SharedEssayView() {
  const { shareId } = useLocalSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const [essayData, setEssayData] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedEssay();
  }, [shareId]);

  const loadSharedEssay = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!shareId || Array.isArray(shareId)) {
        throw new Error("Invalid share ID");
      }

      const data = await getSharedEssayData(shareId);
      console.log('📄 Loaded shared essay data:', data);
      console.log('📄 Available fields:', Object.keys(data || {}));
      setEssayData(data);

      // Try multiple possible image field names (prioritize imageUrl which is the correct field)
      const possibleImageFields = ['imageUrl', 'image_uri', 'image', 'imageUri', 'imagePath', 'image_url', 'storagePath'];
      let foundImageUrl = null;
      
      for (const field of possibleImageFields) {
        if (data && data[field]) {
          foundImageUrl = data[field];
          console.log(`🖼️ Found image in field "${field}":`, foundImageUrl);
          break;
        }
      }

      if (foundImageUrl) {
        setImageUrl(foundImageUrl);
      } else {
        console.log('⚠️ No image URL found in essay data');
        console.log('⚠️ Available data fields:', data ? Object.keys(data) : 'No data');
      }
    } catch (err) {
      console.error("❌ Error loading shared essay:", err);
      setError(err instanceof Error ? err.message : "Failed to load essay");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>{t("common.loading")}...</Text>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>{t("common.error")}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>{t("essay.loginToContinue")}</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Student Info Header - Displayed at top for quick reference */}
        <View style={styles.studentInfoHeader}>
          <View style={styles.studentInfoBadge}>
            <MaterialIcons name="person" size={16} color={Colors.light.tint} />
            <Text style={styles.studentIdText}>{essayData?.studentId || "Student"}</Text>
          </View>
          {essayData?.studentGrade && (
            <View style={styles.studentInfoBadge}>
              <MaterialIcons name="school" size={16} color={Colors.light.tint} />
              <Text style={styles.studentGradeText}>{essayData.studentGrade}</Text>
            </View>
          )}
          {essayData?.studentAge && (
            <View style={styles.studentInfoBadge}>
              <MaterialIcons name="cake" size={16} color={Colors.light.tint} />
              <Text style={styles.studentAgeText}>{essayData.studentAge} {t("essay.years")}</Text>
            </View>
          )}
        </View>

        {/* Essay Image */}
        {imageUrl ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.essayImage}
              resizeMode="contain"
              onError={(err) => {
                console.error('❌ Image failed to load:', err);
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully');
              }}
            />
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <View style={styles.noImagePlaceholder}>
              <MaterialIcons name="image-not-supported" size={48} color="#999" />
              <Text style={styles.noImageText}>Essay image not available</Text>
            </View>
          </View>
        )}

        {/* Score */}
        {essayData?.score !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("essay.overallScore")}</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreValue}>
                {essayData.score.toFixed(1)}
              </Text>
              <Text style={styles.scoreLabel}>%</Text>
            </View>
          </View>
        )}

        {/* Rubric Breakdown */}
        {essayData?.rubric && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("essay.rubricBreakdown")}</Text>
            <View style={styles.rubricGrid}>
              {essayData.rubric.richness_5 !== undefined && (
                <View style={styles.rubricItem}>
                  <Text style={styles.rubricLabel}>
                    {t("essay.richness")}
                  </Text>
                  <Text style={styles.rubricScore}>
                    {essayData.rubric.richness_5}/5
                  </Text>
                </View>
              )}
              {essayData.rubric.organization_6 !== undefined && (
                <View style={styles.rubricItem}>
                  <Text style={styles.rubricLabel}>
                    {t("essay.organization")}
                  </Text>
                  <Text style={styles.rubricScore}>
                    {essayData.rubric.organization_6}/6
                  </Text>
                </View>
              )}
              {essayData.rubric.technical_3 !== undefined && (
                <View style={styles.rubricItem}>
                  <Text style={styles.rubricLabel}>
                    {t("essay.technical")}
                  </Text>
                  <Text style={styles.rubricScore}>
                    {essayData.rubric.technical_3}/3
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Feedback */}
        {essayData?.text_feedback?.feedback && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("essay.feedback")}</Text>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>
                {essayData.text_feedback.feedback}
              </Text>
            </View>
          </View>
        )}

        {/* Suggestions */}
        {essayData?.text_feedback?.suggestions &&
          essayData.text_feedback.suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("essay.suggestions")}</Text>
              {essayData.text_feedback.suggestions.map(
                (suggestion: string, idx: number) => (
                  <View key={idx} style={styles.suggestionItem}>
                    <Text style={styles.suggestionNumber}>{idx + 1}.</Text>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                )
              )}
            </View>
          )}

        {/* Timestamp */}
        {essayData?.timestamp && (
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              {t("essay.generatedOn")}:{" "}
              {new Date(essayData.timestamp.toDate?.() || essayData.timestamp).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Login prompt */}
        <View style={styles.callToAction}>
          <Text style={styles.ctaText}>{t("essay.wantToGradeFull")}</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push("/login")}
          >
            <MaterialIcons name="login" size={20} color="#fff" />
            <Text style={styles.ctaButtonText}>{t("essay.loginToContinue")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  studentInfoHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: Colors.light.tint + "10",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.tint + "30",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: "center",
  },
  studentInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.tint + "30",
    gap: 6,
  },
  studentIdText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  studentGradeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  studentAgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  loginButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  imageContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  essayImage: {
    width: 350,
    height: 500,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
  },
  noImagePlaceholder: {
    width: 350,
    height: 500,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: Colors.light.tint + "15",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.light.tint,
  },
  scoreLabel: {
    marginLeft: 4,
    fontSize: 18,
    color: Colors.light.textSecondary,
  },
  rubricGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  rubricItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    alignItems: "center",
  },
  rubricLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  rubricScore: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  feedbackBox: {
    padding: 12,
    backgroundColor: Colors.light.tint + "10",
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
    borderRadius: 4,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  suggestionItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  suggestionNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.tint,
    marginRight: 8,
    minWidth: 20,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  footerSection: {
    padding: 20,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  callToAction: {
    margin: 20,
    padding: 16,
    backgroundColor: Colors.light.tint + "10",
    borderRadius: 8,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.tint,
    borderRadius: 6,
    gap: 8,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
