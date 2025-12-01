import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import { UserImageService } from "@/services/userImageService";
import React, { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

export default function HomeScreen() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const { userProfile, profileLoading, isStudent, isTeacher, role } = useRole();
  const { t } = useLanguage();

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
        description: "Essay submission", // Could be made configurable
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
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader />
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/akura-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTitle}>{t("home.welcomeTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("home.welcomeSubtitle")}</Text>
        </View>
        <View style={styles.partnerContainer}>
          <Text style={styles.partnerInfo}>{t("home.developedBy")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBg: {
    flex: 1,
    backgroundColor: "#181A20",
    minHeight: "100%",
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  container: {
    flexGrow: 1,
    padding: 0,
    paddingHorizontal: 16,
    minHeight: "100%",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
    backgroundColor: "transparent",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    paddingHorizontal: 32,
    backgroundColor: "#181A20",
    borderRadius: 20,
    marginVertical: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 20,
    color: "#B0B3C6",
    textAlign: "center",
    maxWidth: 600,
    lineHeight: 32,
  },
  partnerContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  partnerInfo: {
    color: "#B0B3C6",
    fontSize: 13,
    textAlign: "center",
  },
});
