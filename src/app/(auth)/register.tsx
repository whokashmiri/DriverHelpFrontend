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

import { register } from "../../api";
import { AppScreen } from "../../components/AppScreen";
import { useLanguage } from "../../context/LanguageContext";
import { getErrorMessage } from "../../utils";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
  white: "#FFFFFF",

  error: "#B91C1C",
  errorBackground: "#FDECEC",

  success: "#166534",
  successBackground: "#ECFDF3",

  border: "#BFC7C7",
  placeholder: "#7E8585",
};

export default function RegisterScreen() {
  const { t } = useTranslation();

  const { language } = useLanguage();

  const [name, setName] = useState("");

  const [iqamaId, setIqamaId] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const textAlign = language === "ar" ? "right" : "left";

  const handleRegister = async () => {
    const cleanName = name.trim();

    const cleanIqamaId = iqamaId.trim();

    if (!cleanName) {
      setError(t("auth.nameRequired", "Name is required"));

      return;
    }

    if (!cleanIqamaId) {
      setError(t("auth.iqamaRequired", "Iqama ID is required"));

      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordMin", "Password must be at least 6 characters"));

      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch", "Passwords do not match"));

      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      await register({
        name: cleanName,
        iqamaId: cleanIqamaId,
        password,
      });

      setSuccess(
        t(
          "auth.registerSuccess",
          "Account created successfully. Please login.",
        ),
      );

      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 700);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("auth.registerFailed", "Unable to create account"),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {t("auth.registerTitle", "Create Account")}
            </Text>

            <Text style={[styles.subtitle, { textAlign }]}>
              {t("auth.registerSubtitle", "Create your driver account")}
            </Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
              </View>
            )}

            {!!success && (
              <View style={styles.successBox}>
                <Text style={[styles.successText, { textAlign }]}>
                  {success}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { textAlign }]}>
                {t("auth.name", "Name")}
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t("auth.namePlaceholder", "Enter your name")}
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="next"
                style={[styles.input, { textAlign }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { textAlign }]}>
                {t("auth.iqamaId", "Iqama ID")}
              </Text>

              <TextInput
                value={iqamaId}
                onChangeText={setIqamaId}
                placeholder={t("auth.iqamaPlaceholder", "Enter Iqama ID")}
                placeholderTextColor={COLORS.placeholder}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="next"
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
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="next"
                style={[styles.input, { textAlign }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { textAlign }]}>
                {t("auth.confirmPassword", "Confirm Password")}
              </Text>

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t(
                  "auth.confirmPasswordPlaceholder",
                  "Enter password again",
                )}
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (!isSubmitting) {
                    void handleRegister();
                  }
                }}
                style={[styles.input, { textAlign }]}
              />
            </View>

            <Pressable
              onPress={handleRegister}
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
                  {t("auth.register", "Register")}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              disabled={isSubmitting}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {t("auth.haveAccount", "Already have an account?")}{" "}
                <Text style={styles.loginText}>{t("auth.login", "Login")}</Text>
              </Text>
            </Pressable>
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
    paddingVertical: 18,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",

    paddingHorizontal: 20,
    paddingVertical: 20,

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
    fontSize: 26,
    fontWeight: "800",

    color: COLORS.primary,

    marginBottom: 5,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,

    color: COLORS.secondary,

    marginBottom: 18,
  },

  errorBox: {
    paddingHorizontal: 12,
    paddingVertical: 9,

    borderRadius: 10,

    backgroundColor: COLORS.errorBackground,

    marginBottom: 14,
  },

  errorText: {
    fontSize: 12,
    lineHeight: 18,

    color: COLORS.error,
  },

  successBox: {
    paddingHorizontal: 12,
    paddingVertical: 9,

    borderRadius: 10,

    backgroundColor: COLORS.successBackground,

    marginBottom: 14,
  },

  successText: {
    fontSize: 12,
    lineHeight: 18,

    color: COLORS.success,
  },

  inputGroup: {
    marginBottom: 11,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",

    color: COLORS.primary,

    marginBottom: 5,
  },

  input: {
    height: 43,

    borderWidth: 1,

    borderColor: COLORS.border,

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

    marginTop: 5,
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
    marginTop: 14,

    alignItems: "center",

    paddingVertical: 8,
  },

  secondaryButtonText: {
    fontSize: 12,

    color: COLORS.black,

    textAlign: "center",
  },

  loginText: {
    fontWeight: "800",

    color: COLORS.secondary,
  },
});
