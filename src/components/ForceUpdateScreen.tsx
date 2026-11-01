//components/ForceUpdateScreen.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ANDROID_VERSION_CODE,
  PLAY_STORE_URL,
  type VersionPolicy,
} from "../services/appVersion";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
};


type Props =
  | {
      type?: "native";
      policy?: VersionPolicy;
      error?: boolean;
      onRetry: () => Promise<void>;
    }
  | {
      type: "ota";
      otaStatus: "downloading" | "restarting" | "error";
      onRetry: () => Promise<void>;
    };



export default function ForceUpdateScreen(props: Props) {

  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const isOTA = props.type === "ota";

  const error = isOTA
    ? props.otaStatus === "error"
    : props.error === true;

  const policy = !isOTA ? props.policy : undefined;

  const downloading =
    isOTA && props.otaStatus === "downloading";

  const restarting =
    isOTA && props.otaStatus === "restarting";

  async function openPlayStore() {
    if (isOTA) return;

    setMessage("");

    try {
      await Linking.openURL(
        policy?.storeUrl || PLAY_STORE_URL
      );
    } catch {
      setMessage(t("forceUpdate.openStoreError"));;
    }
  }

  async function retry() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      await props.onRetry();
    } catch {
     setMessage(t("forceUpdate.checkUpdateError"));
    } finally {
      setBusy(false);
    }
  }

 const title = error
  ? isOTA
    ? t("forceUpdate.updateFailed")
    : t("forceUpdate.connectionRequired")
  : restarting
    ? t("forceUpdate.restartingTitle")
    : downloading
      ? t("forceUpdate.downloadingTitle")
      : t("forceUpdate.updateTitle");

const description = error
  ? isOTA
    ? t("forceUpdate.otaErrorDescription")
    : t("forceUpdate.connectionErrorDescription")
  : restarting
    ? t("forceUpdate.restartingDescription")
    : downloading
      ? t("forceUpdate.downloadingDescription")
      : t("forceUpdate.updateDescription");


  return (
    <View style={styles.container}>
      {/* Decorative background */}
      <View style={styles.backgroundCircleOne} />
      <View style={styles.backgroundCircleTwo} />

      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.brandContainer}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>S</Text>
          </View>

          <Text style={styles.brandName}>SPARK GO</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Hero Icon */}
          <View
            style={[
              styles.heroIconContainer,
              error && styles.errorHeroIcon,
            ]}
          >
            <Text style={styles.heroIcon}>
              {error ? "↻" : "↑"}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              error && styles.errorBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                error && styles.errorDot,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                error && styles.errorStatusText,
              ]}
            >
  {error
  ? isOTA
    ? t("forceUpdate.updateFailedBadge")
    : t("forceUpdate.connectionIssueBadge")
  : isOTA
    ? t("forceUpdate.frontendUpdateBadge")
    : t("forceUpdate.newVersionBadge")}
            </Text>
          </View>

          {/* Heading */}
        <Text style={styles.title}>{title}</Text>

<Text style={styles.description}>
  {description}
</Text>

          {/* Version Information */}
          {!error && policy && (
            <View style={styles.versionContainer}>
              <Text style={styles.versionHeading}>
  {t("forceUpdate.versionRequirement")}
</Text>

<View style={styles.versionRow}>
  <View>
    <Text style={styles.versionLabel}>
      {t("forceUpdate.installedVersion")}
    </Text>

    <Text style={styles.versionValue}>
      {t("forceUpdate.build", {
        version: ANDROID_VERSION_CODE,
      })}
    </Text>
  </View>

  <View style={styles.versionDivider} />

  <View>
    <Text style={styles.versionLabel}>
      {t("forceUpdate.minimumRequired")}
    </Text>

    <Text style={styles.requiredVersion}>
      {t("forceUpdate.build", {
        version: policy.minimumVersionCode,
      })}
    </Text>
  </View>
</View>
            </View>
          )}

          {/* Error Message */}
          {!!message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>
                {message}
              </Text>
            </View>
          )}

          {/* Primary Action */}
         
{isOTA && !error ? (
  <View style={[styles.primaryButton, { gap: 12 }]}>
    <ActivityIndicator color="#FFFFFF" />

    <Text style={styles.primaryButtonText}>
     {restarting
  ? t("forceUpdate.restartingApplication")
  : t("forceUpdate.downloadingUpdate")}
    </Text>
  </View>
) : !isOTA && !error ? (
  <TouchableOpacity
    style={styles.primaryButton}
    onPress={() => void openPlayStore()}
    activeOpacity={0.85}
    accessibilityRole="button"
  >
    <Text style={styles.primaryButtonText}>
     {t("forceUpdate.updateApplication")}
    </Text>

    <Text style={styles.buttonArrow}>→</Text>
  </TouchableOpacity>
) : null}


      
{(!isOTA || error) && (
  <TouchableOpacity
    style={[
      styles.retryButton,
      error && styles.errorRetryButton,
      busy && styles.disabledButton,
    ]}
    onPress={() => void retry()}
    disabled={busy}
    activeOpacity={0.7}
    accessibilityRole="button"
  >
    {busy ? (
      <ActivityIndicator color={COLORS.secondary} />
    ) : (
      <Text style={styles.retryText}>
       {isOTA
  ? t("forceUpdate.retryUpdate")
  : error
    ? t("forceUpdate.tryAgain")
    : t("forceUpdate.alreadyUpdated")}
      </Text>
    )}
  </TouchableOpacity>
)}


          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
             {t("forceUpdate.footer")}
            </Text>
          </View>
        </View>

        {/* Bottom Branding */}
        <Text style={styles.bottomText}>
         {t("forceUpdate.bottomBranding")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
    justifyContent: "center",
    overflow: "hidden",
  },

  content: {
    paddingHorizontal: 22,
    alignItems: "center",
    zIndex: 1,
  },

  backgroundCircleOne: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#DCE7E6",
    top: -150,
    right: -130,
  },

  backgroundCircleTwo: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#E4EBEA",
    bottom: -120,
    left: -120,
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 10,
  },

  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  brandIconText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.light,
  },

  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: COLORS.primary,
  },

  card: {
    width: "100%",
    maxWidth: 440,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",

    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 8,
  },

  heroIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#E5EFEE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },

  errorHeroIcon: {
    backgroundColor: "#F0EDEE",
  },

  heroIcon: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.primary,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5EFEE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 7,
    marginBottom: 18,
  },

  errorBadge: {
    backgroundColor: COLORS.light,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },

  errorDot: {
    backgroundColor: COLORS.black,
  },

  statusText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  errorStatusText: {
    color: COLORS.black,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.black,
    textAlign: "center",
    letterSpacing: -0.6,
  },

  description: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 24,
  },

  versionContainer: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F7F9F8",
    borderWidth: 1,
    borderColor: "#E5EFEE",
    marginBottom: 22,
  },

  versionHeading: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.secondary,
    marginBottom: 16,
  },

  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  versionLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    marginBottom: 6,
  },

  versionValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.black,
  },

  requiredVersion: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },

  versionDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#D5E1DF",
    marginHorizontal: 10,
  },

  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonArrow: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
    marginLeft: 10,
  },

  retryButton: {
    paddingVertical: 17,
    paddingHorizontal: 12,
    alignItems: "center",
    width: "100%",
  },

  errorRetryButton: {
    marginTop: 4,
  },

  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  messageContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 12,
    width: "100%",
    marginBottom: 12,
  },

  messageText: {
    color: COLORS.black,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5EFEE",
    width: "100%",
    paddingTop: 18,
    marginTop: 4,
  },

  footerText: {
    color: COLORS.secondary,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
  },

  bottomText: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 24,
  },
});
