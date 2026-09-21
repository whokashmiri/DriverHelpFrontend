import { useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "../../components/AppScreen";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
  white: "#FFFFFF",
  error: "#B91C1C",
  errorBackground: "#FDECEC",
};

export default function LoginScreen() {
  const { t } = useTranslation();

  const { login } = useAuth();

  const { language } = useLanguage();

  const [iqamaId, setIqamaId] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    const cleanIqamaId = iqamaId.trim();

    if (!cleanIqamaId) {
      setError(t("auth.iqamaRequired", "Iqama ID is required"));

      return;
    }

    if (!password) {
      setError(t("auth.passwordRequired", "Password is required"));

      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const user = await login({
        iqamaId: cleanIqamaId,
        password,
      });

      if (user.role === "driver") {
        router.replace("/(driver)");
        return;
      }

      if (user.role === "supervisor") {
        router.replace("/(supervisor)");
        return;
      }

      setError(
        t(
          "auth.unsupportedRole",
          "This account cannot access the mobile application",
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err, t("auth.loginFailed", "Unable to login")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const textAlign = language === "ar" ? "right" : "left";

  return (
    <AppScreen>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={[styles.title, { textAlign }]}>
              {t("auth.loginTitle", "Login")}
            </Text>

            <Text style={[styles.subtitle, { textAlign }]}>
              {t("auth.loginSubtitle", "Enter your Iqama ID and password")}
            </Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { textAlign }]}>
                {t("auth.iqamaId", "Iqama ID")}
              </Text>

              <TextInput
                value={iqamaId}
                onChangeText={setIqamaId}
                placeholder={t("auth.iqamaPlaceholder", "Enter Iqama ID")}
                placeholderTextColor="#7E8585"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!isSubmitting}
                style={[styles.input, { textAlign }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { textAlign }]}>
                {t("auth.password", "Password")}
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.passwordPlaceholder", "Enter password")}
                placeholderTextColor="#7E8585"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                editable={!isSubmitting}
                onSubmitEditing={() => {
                  if (!isSubmitting) {
                    void handleLogin();
                  }
                }}
                style={[styles.input, { textAlign }]}
              />
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.primaryButton,

                pressed && !isSubmitting && styles.buttonPressed,

                isSubmitting && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t("auth.login", "Login")}
                </Text>
              )}
            </Pressable>

            {/* <Pressable
              onPress={() => router.push("/(auth)/register")}
              disabled={isSubmitting}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {t("auth.noAccount", "Don't have an account?")}{" "}
                <Text style={styles.registerText}>
                  {t("auth.register", "Register")}
                </Text>
              </Text>
            </Pressable> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,

    justifyContent: "center",

    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",

    paddingHorizontal: 20,
    paddingVertical: 22,

    borderRadius: 18,

    backgroundColor: COLORS.white,

    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",

    color: COLORS.primary,

    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,

    color: COLORS.secondary,

    marginBottom: 20,
  },

  errorBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,

    borderRadius: 10,

    backgroundColor: COLORS.errorBackground,

    marginBottom: 16,
  },

  errorText: {
    fontSize: 12,
    lineHeight: 18,

    color: COLORS.error,
  },

  inputGroup: {
    marginBottom: 13,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",

    color: COLORS.primary,

    marginBottom: 6,
  },

  input: {
    height: 44,

    borderWidth: 1,
    borderColor: "#BFC7C7",

    borderRadius: 10,

    paddingHorizontal: 12,
    paddingVertical: 0,

    fontSize: 14,

    color: COLORS.black,

    backgroundColor: COLORS.light,
  },

  primaryButton: {
    height: 46,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,

    backgroundColor: COLORS.primary,

    marginTop: 6,
  },

  primaryButtonText: {
    color: COLORS.white,

    fontSize: 14,
    fontWeight: "700",
  },

  buttonPressed: {
    backgroundColor: COLORS.secondary,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  secondaryButton: {
    marginTop: 15,

    alignItems: "center",

    paddingVertical: 8,
  },

  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "500",

    color: COLORS.black,

    textAlign: "center",
  },

  registerText: {
    fontWeight: "800",

    color: COLORS.secondary,
  },
});
