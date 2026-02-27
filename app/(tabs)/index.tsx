import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import { UserImageService } from "@/services/userImageService";
import React, { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View, TouchableOpacity, useWindowDimensions } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const { userProfile, profileLoading, isStudent, isTeacher, role } = useRole();
  const { t, language } = useLanguage();

  const [stats, setStats] = useState<{
    totalImages: number;
    avgScore: number;
    totalStudents: number;
  } | null>(null);
  const [recentImages, setRecentImages] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  React.useEffect(() => {
    async function loadDashboardData() {
      if (user?.uid) {
        try {
          const [uStats, uImages, students] = await Promise.all([
            UserImageService.getUserUploadStats(user.uid),
            UserImageService.getUserImages(user.uid),
            UserImageService.getStudents(user.uid),
          ]);
          const scoredImages = uImages.filter(
            (img) => typeof img.score === "number" && Number.isFinite(img.score)
          );
          const avgScore = scoredImages.length
            ? Math.round(
                scoredImages.reduce((sum, img) => sum + (img.score as number), 0) /
                  scoredImages.length
              )
            : 0;

          setStats({
            totalImages: uStats.totalImages,
            avgScore,
            totalStudents: students.length,
          });
          setRecentImages(uImages.slice(0, 10));
        } catch (error) {
          console.error("Dashboard load error:", error);
        } finally {
          setDataLoading(false);
        }
      }
    }
    loadDashboardData();
  }, [user?.uid]);

  const uploadImage = async (asset: any) => {
    if (!asset.uri) {
      setUploading(false);
      Alert.alert(t("common.error"), "No image selected.");
      return;
    }

    if (!user) {
      Alert.alert(t("common.error"), "You must be logged in to upload images.");
      return;
    }

    try {
      console.log("Uploading image:", asset);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `image_${Date.now()}.jpg`;

      // Use the new UserImageService for user-specific uploads
      const uploadedImage = await UserImageService.uploadUserImage({
        userId: user.uid,
        fileName: filename,
        fileBlob: blob,
        description: "Essay submission",
      });

      setImageUrl(uploadedImage.imageUrl);
      console.log("Image uploaded successfully!", uploadedImage);
      Alert.alert(t("common.success"), "Image uploaded successfully!");
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Upload Error", (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const pickFromLibrary = async () => {
    launchImageLibrary({ mediaType: "photo" }, async (response) => {
      if (
        response.didCancel ||
        !response.assets ||
        response.assets.length === 0
      ) {
        return;
      }
      setUploading(true);
      await uploadImage(response.assets[0]);
    });
  };

  const scanWithCamera = async () => {
    launchCamera({ mediaType: "photo" }, async (response) => {
      if (
        response.didCancel ||
        !response.assets ||
        response.assets.length === 0
      ) {
        return;
      }
      setUploading(true);
      await uploadImage(response.assets[0]);
    });
  };

  return (
    <View style={styles.fullBg}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Header */}
        <View style={styles.userProfileSection}>
          <View>
            <Text style={styles.userNameText}>
              {userProfile?.displayName || user?.email?.split('@')[0] || "User"}
            </Text>
            <View style={styles.roleBadge}>
              <View style={[styles.roleDot, { backgroundColor: isTeacher() ? "#10B981" : "#007AFF" }]} />
              <Text style={styles.roleText}>
                {isTeacher() ? (language === "si" ? "ගුරුතුමා" : "Teacher") : (language === "si" ? "ශිෂ්‍යයා" : "Student")}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={styles.avatarMini}
          >
            <MaterialCommunityIcons name="account-circle" size={32} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Immersive Header Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroOverline}>
              {language === "si" ? "ඔබේ සහායකයා" : "YOUR AI ASSISTANT"}
            </Text>
            <Text style={styles.heroTitle}>
              {language === "si" ? "නිවැරදිව පරීක්ෂා කර ලකුණු දෙන්න" : "Precision Grading \nMade Simple"}
            </Text>
            <Text style={styles.heroDesc}>
              {language === "si" ? "සිංහල නිබන්ධන සඳහා කෘතිම බුද්ධියෙන් බලවත් වූ ඇගයීම් ලබා ගන්න." : "Get AI-powered insights and fair scoring for every Sinhala essay."}
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/scan")}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#0F1117" />
              <Text style={styles.primaryBtnText}>
                {language === "si" ? "දැන්ම ස්කෑන් කරන්න" : "Start Smart Scan"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroIconDecoration}>
            <MaterialCommunityIcons name="brain" size={140} color="#FFFFFF08" />
          </View>
        </View>

        {/* Dashboard Overview Section */}
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionTitle}>
            {language === "si" ? "කටයුතු නිරීක්ෂණය" : "Dashboard Overview"}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalImages || 0}</Text>
              <Text style={styles.statLbl}>{language === "si" ? "නිබන්ධන" : "Essays"}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.avgScore ?? 0}%</Text>
              <Text style={styles.statLbl}>{language === "si" ? "සාමාන්‍යය" : "Avg. Score"}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalStudents ?? 0}</Text>
              <Text style={styles.statLbl}>{language === "si" ? "සිසුන්" : "Students"}</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {language === "si" ? "මෑතකදී එක් කළ දෑ" : "Recent Submissions"}
            </Text>
            <TouchableOpacity onPress={() => router.push("/uploaded-images")}>
              <Text style={styles.seeAllText}>{language === "si" ? "සියල්ලම" : "See All"}</Text>
            </TouchableOpacity>
          </View>

          {recentImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
              {recentImages.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentItem}
                  onPress={() => router.push({
                    pathname: "/image-detail",
                    params: { imageId: item.id }
                  })}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.recentImg} />
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentScore}>{item.score ? `${item.score}%` : "---"}</Text>
                  </View>
                  <Text style={styles.recentName} numberOfLines={1}>{item.fileName}</Text>
                  <Text style={styles.recentDate}>
                    {new Date(item.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="folder-open-outline" size={40} color="#2D313E" />
              <Text style={styles.emptyText}>
                {language === "si" ? "තවමත් නිබන්ධන නොමැත" : "No submissions yet"}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.minimalFooter}>
          <Image
            source={require("../../assets/images/akura-logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerBrand}>AKURA</Text>
          <Text style={styles.footerTagline}>ELEVATING SINHALA EDUCATION</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBg: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  userProfileSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    backgroundColor: "#1C1E26",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  avatarMini: {
    width: 44,
    height: 44,
    backgroundColor: "#1C1E26",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  heroCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: "#1C1E26",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#2D313E",
    overflow: "hidden",
    position: "relative",
    padding: 24,
    minHeight: 320,
    justifyContent: "center",
  },
  heroContent: {
    zIndex: 2,
  },
  heroOverline: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "800",
    lineHeight: 40,
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: 15,
    color: "#9CA3AF",
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: "80%",
  },
  primaryBtn: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
  },
  heroIconDecoration: {
    position: "absolute",
    right: -20,
    bottom: -20,
    zIndex: 1,
  },
  quickAccessSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  dashboardSection: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1C1E26",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2D313E",
    alignItems: "center",
  },
  statVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLbl: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "600",
  },
  activitySection: {
    marginTop: 32,
    paddingLeft: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 24,
    marginBottom: 16,
  },
  seeAllText: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "700",
  },
  recentList: {
    paddingRight: 24,
    gap: 16,
  },
  recentItem: {
    width: 130,
    position: "relative",
  },
  recentImg: {
    width: 130,
    height: 160,
    borderRadius: 20,
    backgroundColor: "#1C1E26",
  },
  recentBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#00000080",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backdropFilter: "blur(10px)",
  },
  recentScore: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  recentName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  recentDate: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    paddingRight: 24,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1C1E2630",
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#2D313E",
  },
  emptyText: {
    color: "#4B5563",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "500",
  },
  accessSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 16,
    paddingLeft: 4,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1E26",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2D313E",
  },
  listIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  listTextContent: {
    flex: 1,
    marginLeft: 16,
  },
  listLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  listSubLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  minimalFooter: {
    marginTop: 60,
    alignItems: "center",
    opacity: 0.5,
  },
  footerLogo: {
    width: 32,
    height: 32,
    marginBottom: 12,
    tintColor: "#4B5563",
  },
  footerBrand: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 4,
  },
  footerTagline: {
    color: "#4B5563",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 1,
  },
});
