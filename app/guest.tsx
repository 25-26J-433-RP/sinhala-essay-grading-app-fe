import { useLanguage } from "@/contexts/LanguageContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function GuestScreen() {
  const { language, changeLanguage, t } = useLanguage();
  const router = useRouter();

  const features = [
    {
      icon: "assessment",
      title: t("guest.aiScoring"),
      description: t("guest.aiScoringDesc"),
      color: "#3B82F6",
    },
    {
      icon: "chat-bubble-outline",
      title: t("guest.smartFeedback"),
      description: t("guest.smartFeedbackDesc"),
      color: "#10B981",
    },
    {
      icon: "volume-up",
      title: t("guest.sinhalaAudio"),
      description: t("guest.sinhalaAudioDesc"),
      color: "#8B5CF6",
    },
    {
      icon: "show-chart",
      title: t("guest.analytics"),
      description: t("guest.analyticsDesc"),
      color: "#F59E0B",
    },
    {
      icon: "hub",
      title: t("guest.mindMaps"),
      description: t("guest.mindMapsDesc"),
      color: "#EC4899",
    },
    {
      icon: "translate",
      title: t("guest.multiLanguage"),
      description: t("guest.multiLanguageDesc"),
      color: "#06B6D4",
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appName}>{t("guest.appName")}</Text>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => changeLanguage(language === "en" ? "si" : "en")}
          >
            <MaterialIcons name="language" size={20} color="#fff" />
            <Text style={styles.languageText}>
              {language === "en" ? "සිංහල" : "English"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>{t("guest.subtitle")}</Text>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <MaterialIcons name="school" size={80} color="#3B82F6" />
        </View>
        <Text style={styles.heroTitle}>{t("guest.welcome")}</Text>
        <Text style={styles.heroDescription}>
          {t("guest.welcomeDescription")}
        </Text>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>{t("guest.keyFeatures")}</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: `${feature.color}20` },
                ]}
              >
                <MaterialIcons
                  name={feature.icon as any}
                  size={32}
                  color={feature.color}
                />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.howItWorksSection}>
        <Text style={styles.sectionTitle}>{t("guest.howItWorks")}</Text>

        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("guest.step1Title")}</Text>
            <Text style={styles.stepDescription}>{t("guest.step1Desc")}</Text>
          </View>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("guest.step2Title")}</Text>
            <Text style={styles.stepDescription}>{t("guest.step2Desc")}</Text>
          </View>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("guest.step3Title")}</Text>
            <Text style={styles.stepDescription}>{t("guest.step3Desc")}</Text>
          </View>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("guest.step4Title")}</Text>
            <Text style={styles.stepDescription}>{t("guest.step4Desc")}</Text>
          </View>
        </View>
      </View>

      {/* Benefits Section */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>{t("guest.whyUse")}</Text>

        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={24} color="#10B981" />
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>{t("guest.saveTime")}</Text>
            <Text style={styles.benefitText}>{t("guest.saveTimeDesc")}</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={24} color="#10B981" />
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>{t("guest.improveQuality")}</Text>
            <Text style={styles.benefitText}>
              {t("guest.improveQualityDesc")}
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={24} color="#10B981" />
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>
              {t("guest.enhanceLearning")}
            </Text>
            <Text style={styles.benefitText}>
              {t("guest.enhanceLearningDesc")}
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={24} color="#10B981" />
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>{t("guest.sinhalSupport")}</Text>
            <Text style={styles.benefitText}>
              {t("guest.sinhalSupportDesc")}
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <MaterialIcons name="check-circle" size={24} color="#10B981" />
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>
              {t("guest.fairTransparent")}
            </Text>
            <Text style={styles.benefitText}>
              {t("guest.fairTransparentDesc")}
            </Text>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>{t("guest.ctaTitle")}</Text>
        <Text style={styles.ctaDescription}>{t("guest.ctaDescription")}</Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/login")}
        >
          <MaterialIcons name="login" size={20} color="#fff" />
          <Text style={styles.loginButtonText}>{t("guest.signIn")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => {
            Linking.openURL(
              "https://github.com/25-26J-433-RP/sinhala-essay-grading-app-fe"
            );
          }}
        >
          <MaterialIcons name="info-outline" size={20} color="#007AFF" />
          <Text style={styles.demoButtonText}>{t("guest.learnMore")}</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("guest.footerText")}</Text>
        <Text style={styles.footerSubtext}>{t("guest.footerDescription")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181A20",
    maxWidth: 1400,
    marginHorizontal: "auto",
    width: "100%",
  },

  header: {
    backgroundColor: "#23262F",
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },

  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1f2128",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },

  languageText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 800,
    marginHorizontal: "auto",
  },

  heroSection: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
  },

  heroIcon: {
    marginBottom: 24,
  },

  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },

  heroDescription: {
    color: "#D1D5DB",
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 700,
  },

  featuresContainer: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
  },

  sectionTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 28,
    textAlign: "center",
  },

  featuresGrid: {
    gap: 20,
  },

  featureCard: {
    backgroundColor: "#23262F",
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333640",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 6,
  },

  featureDescription: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
  },

  howItWorksSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: "#1f2128",
    marginHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },

  stepContainer: {
    flexDirection: "row",
    marginBottom: 24,
    alignItems: "flex-start",
  },

  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    marginTop: 2,
  },

  stepNumberText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },

  stepDescription: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
  },

  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: "#374151",
    marginLeft: 19,
    marginBottom: 4,
  },

  benefitsSection: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    backgroundColor: "#23262F",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
  },

  benefitItem: {
    flexDirection: "row",
    marginBottom: 28,
    alignItems: "flex-start",
    gap: 16,
  },

  benefitContent: {
    flex: 1,
  },

  benefitTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },

  benefitText: {
    fontSize: 15,
    color: "#9CA3AF",
    lineHeight: 24,
  },

  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    alignItems: "center",
    backgroundColor: "#1A1D24",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
  },

  ctaTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },

  ctaDescription: {
    fontSize: 16,
    color: "#D1D5DB",
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 600,
  },

  loginButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 16,
    maxWidth: 400,
    width: "100%",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  demoButton: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    maxWidth: 400,
    width: "100%",
  },

  demoButtonText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "700",
  },

  footer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: "#333640",
    alignItems: "center",
    backgroundColor: "#1A1D24",
    maxWidth: 1200,
    marginHorizontal: "auto",
    width: "100%",
  },

  footerText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "500",
  },

  footerSubtext: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
