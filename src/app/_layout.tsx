
import "../services/backgroundLocation";

import {
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

import { Stack } from "expo-router";

import { useAppUpdates } from "../hooks/useAppUpdates";
import { useForceUpdate } from "../hooks/useForceUpdate";

import ForceUpdateScreen from "../components/ForceUpdateScreen";

import { AuthProvider } from "@/context/AuthContext";
import { AppModeProvider } from "@/context/AppModeContext";
import { LanguageProvider } from "../context/LanguageContext";

function UpdateGate() {
  const nativeUpdate = useForceUpdate();
  const otaUpdate = useAppUpdates();

  // 1. Backend AAB force update has priority.
  if (nativeUpdate.status !== "allowed") {
    return (
      <View style={styles.overlay}>
        {nativeUpdate.status === "checking" ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="large"
              color="#208AEF"
            />
          </View>
        ) : nativeUpdate.status === "required" ? (
          <ForceUpdateScreen
            type="native"
            policy={nativeUpdate.policy}
            onRetry={nativeUpdate.checkVersion}
          />
        ) : (
          <ForceUpdateScreen
            type="native"
            error
            onRetry={nativeUpdate.checkVersion}
          />
        )}
      </View>
    );
  }

  // 2. Expo frontend OTA update.
  if (
    otaUpdate.status === "downloading" ||
    otaUpdate.status === "restarting" ||
    otaUpdate.status === "error"
  ) {
    return (
      <View style={styles.overlay}>
        <ForceUpdateScreen
          type="ota"
          otaStatus={otaUpdate.status}
          onRetry={otaUpdate.retry}
        />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppModeProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />

          <UpdateGate />
        </AppModeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#FFFFFF",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
