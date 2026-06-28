import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { getMe, login, register } from "../api/authApi";
import { getToken, removeToken } from "../api/client";

type AuthMode = "login" | "register";

export default function HomeScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [iqamaId, setIqamaId] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);

  const isRegister = mode === "register";

  useEffect(() => {
    checkSavedLogin();
  }, []);

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
  }

  function validateForm() {
    if (!iqamaId.trim()) {
      Alert.alert("Missing Iqama ID", "Please enter your Iqama ID.");
      return false;
    }

    if (iqamaId.trim().length < 5) {
      Alert.alert("Invalid Iqama ID", "Please enter a valid Iqama ID.");
      return false;
    }

    if (!password.trim()) {
      Alert.alert("Missing Password", "Please enter your password.");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
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
      } else {
        await login(payload);
      }

      router.replace("/explore");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Something went wrong. Please try again.";

      Alert.alert(isRegister ? "Register Failed" : "Login Failed", message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    if (loading) return;

    setMode((current) => (current === "login" ? "register" : "login"));
    setPassword("");
  }

  if (checkingToken) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Checking login...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (alreadyLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loggedInContainer}>
          <View style={styles.loggedInCard}>
            <Text style={styles.loggedInTitle}>You are already logged in</Text>

            <Text style={styles.loggedInSubtitle}>
              You can continue to your orders or sign out and use another
              account.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.replace("/explore")}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>Continue to Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
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
              {isRegister ? "Create Account" : "Welcome Back"}
            </Text>

            <Text style={styles.subtitle}>
              {isRegister
                ? "Register using your Iqama ID and password"
                : "Login with your Iqama ID and password"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Iqama ID</Text>

            <TextInput
              value={iqamaId}
              onChangeText={setIqamaId}
              placeholder="Enter Iqama ID"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.inputGap} />

            <Text style={styles.label}>Password</Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

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
                    ? "Creating..."
                    : "Checking..."
                  : isRegister
                    ? "Register"
                    : "Login"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={switchMode}
              disabled={loading}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isRegister
                  ? "Already have an account? Login"
                  : "Don't have an account? Register"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.apiText}>API: http://192.168.0.198:5000/api</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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

  apiText: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
  },
});