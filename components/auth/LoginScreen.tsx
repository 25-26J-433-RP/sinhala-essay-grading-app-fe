import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export default function LoginScreen({ onSwitchToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        error.message || "An error occurred during login"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.centerWrapper}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/akura-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue to Essay Grading System
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.email")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.email")}
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.password")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.password")}
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? t("common.loading") : t("auth.login")}
                </Text>
              </TouchableOpacity>

              {/* Divider for future social login */}
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>

              {/* Register prompt */}
              <View style={styles.registerPrompt}>
                <Text style={styles.registerText}>
                  Don&apos;t have an account?{" "}
                </Text>
                <TouchableOpacity onPress={onSwitchToRegister}>
                  <Text style={styles.registerLink}>{t("auth.register")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181A20",
    minHeight: "100vh",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    minHeight: "100vh",
  },
  centerWrapper: {
    width: "100%",
    maxWidth: 440,
    margin: "40px auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#23262F",
    borderRadius: 18,
    boxShadow: "0 4px 32px 0 rgba(0,0,0,0.18)",
    padding: 36,
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "0 auto",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 17,
    color: "#B0B3C6",
    textAlign: "center",
    marginBottom: 8,
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    color: "#fff",
    marginBottom: 7,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#23262F",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333640",
    outlineStyle: "none",
    transition: "border-color 0.2s",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
    transition: "background 0.2s",
  },
  loginButtonDisabled: {
    backgroundColor: "#555",
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    marginBottom: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#333640",
    marginHorizontal: 8,
  },
  dividerText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "500",
  },
  registerPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  registerText: {
    color: "#B0B3C6",
    fontSize: 15,
  },
  registerLink: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 2,
    textDecorationLine: "underline",
  },
});
