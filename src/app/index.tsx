import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFocusEffect } from "expo-router";
import { getMe, login, register } from "../api/authApi";
import { getToken, removeToken } from "../api/client";

type AuthMode = "login" | "register";
type SnackbarType = "success" | "error" | "info";

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [iqamaId, setIqamaId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    type: SnackbarType;
  }>({
    visible: false,
    message: "",
    type: "info",
  });

  const isRegister = mode === "register";

  useFocusEffect(
    useCallback(() => {
      checkSavedLogin();
    }, []),
  );

  function showSnackbar(message: string, type: SnackbarType = "info") {
    setSnackbar({
      visible: true,
      message,
      type,
    });

    setTimeout(() => {
      setSnackbar((current) => ({
        ...current,
        visible: false,
      }));
    }, 3000);
  }

  async function checkSavedLogin() {
    try {
      const token = await getToken();

      if (!token) {
        setAlreadyLoggedIn(false);
        setCheckingToken(false);
        return;
      }

      await getMe();

      setAlreadyLoggedIn(true);
      setCheckingToken(false);
    } catch (error) {
      await removeToken();
      setAlreadyLoggedIn(false);
      setCheckingToken(false);
    }
  }

  async function handleSignOut() {
    await removeToken();

    setAlreadyLoggedIn(false);
    setIqamaId("");
    setPassword("");
    setMode("login");

    showSnackbar(t("auth.signedOut"), "success");
  }

  function validateForm() {
    if (!iqamaId.trim()) {
      showSnackbar(t("auth.missingIqamaMessage"), "error");
      return false;
    }

    if (iqamaId.trim().length < 5) {
      showSnackbar(t("auth.invalidIqamaMessage"), "error");
      return false;
    }

    if (!password.trim()) {
      showSnackbar(t("auth.missingPasswordMessage"), "error");
      return false;
    }

    if (password.length < 6) {
      showSnackbar(t("auth.weakPasswordMessage"), "error");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        iqamaId: iqamaId.trim(),
        password,
      };

      if (isRegister) {
        await register(payload);

        await removeToken();

        showSnackbar(t("auth.registerSuccess"), "success");

        setMode("login");
        setPassword("");
        setShowPassword(false);
        setAlreadyLoggedIn(false);

        return;
      }

      await login(payload);

      showSnackbar(t("auth.loginSuccess"), "success");

      setAlreadyLoggedIn(true);

      setTimeout(() => {
        router.replace("/explore");
      }, 600);
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.message || error?.response?.data?.error;

      const message =
        backendMessage ||
        (isRegister ? t("auth.registerFailed") : t("auth.loginFailed"));

      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  }
  function switchMode() {
    if (loading) return;

    setMode((current) => (current === "login" ? "register" : "login"));
    setPassword("");
    setShowPassword(false);
  }

  function Snackbar() {
    if (!snackbar.visible) return null;

    return (
      <View
        style={[
          styles.snackbar,
          snackbar.type === "success" && styles.snackbarSuccess,
          snackbar.type === "error" && styles.snackbarError,
          snackbar.type === "info" && styles.snackbarInfo,
        ]}
      >
        <Text style={styles.snackbarText}>{snackbar.message}</Text>
      </View>
    );
  }

  if (checkingToken) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>{t("auth.checkingLogin")}</Text>
        </View>

        <Snackbar />
      </SafeAreaView>
    );
  }

  if (alreadyLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loggedInContainer}>
          <View style={styles.loggedInCard}>
            <Text style={styles.loggedInTitle}>
              {t("auth.alreadyLoggedIn")}
            </Text>

            <Text style={styles.loggedInSubtitle}>
              {t("auth.alreadyLoggedInSubtitle")}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.replace("/explore")}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>
                {t("auth.continueToOrders")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutButtonText}>{t("auth.signOut")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Snackbar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isRegister ? t("auth.createAccount") : t("auth.welcomeBack")}
            </Text>

            <Text style={styles.subtitle}>
              {isRegister
                ? t("auth.registerSubtitle")
                : t("auth.loginSubtitle")}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t("auth.iqamaId")}</Text>

            <TextInput
              value={iqamaId}
              onChangeText={setIqamaId}
              placeholder={t("auth.enterIqamaId")}
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.inputGap} />

            <Text style={styles.label}>{t("auth.password")}</Text>

            <View style={styles.passwordInputWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.enterPassword")}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowPassword((current) => !current)}
                style={styles.passwordToggle}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword
                    ? t("auth.hidePassword")
                    : t("auth.showPassword")}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={loading}
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
            >
              <Text style={styles.submitButtonText}>
                {loading
                  ? isRegister
                    ? t("auth.creating")
                    : t("auth.checking")
                  : isRegister
                    ? t("auth.register")
                    : t("auth.login")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={switchMode}
              disabled={loading}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isRegister ? t("auth.haveAccount") : t("auth.noAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  loggedInContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loggedInCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  loggedInTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },

  loggedInSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
    textAlign: "center",
  },

  continueButton: {
    marginTop: 22,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },

  signOutButton: {
    marginTop: 12,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },

  signOutButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#dc2626",
  },

  keyboardView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  passwordInputWrap: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0f172a",
  },

  passwordToggle: {
    height: "100%",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  passwordToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  header: {
    marginBottom: 32,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: "#64748b",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0f172a",
  },

  inputGap: {
    height: 16,
  },

  submitButton: {
    marginTop: 22,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },

  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },

  switchButton: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  switchText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
  },

  snackbar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 28,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 8,
  },

  snackbarSuccess: {
    backgroundColor: "#16a34a",
  },

  snackbarError: {
    backgroundColor: "#dc2626",
  },

  snackbarInfo: {
    backgroundColor: "#0f172a",
  },

  snackbarText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
