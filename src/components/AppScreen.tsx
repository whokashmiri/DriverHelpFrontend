import { SafeAreaView, StyleSheet, View, ViewStyle } from "react-native";

import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

type AppScreenProps = {
  children: ReactNode;

  language: "en" | "ar";

  onLanguageChange: (language: "en" | "ar") => void;

  user?: {
    id: string;
    name?: string;
    iqamaId?: string;
    role?: "driver" | "supervisor" | "admin";
  } | null;

  onProfilePress?: () => void;
  onTermsPress?: () => void;

  contentStyle?: ViewStyle;
};

export function AppScreen({
  children,
  language,
  onLanguageChange,
  user,
  onProfilePress,
  onTermsPress,
  contentStyle,
}: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        language={language}
        onLanguageChange={onLanguageChange}
        user={user}
        onProfilePress={onProfilePress}
        onTermsPress={onTermsPress}
      />

      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    flex: 1,
  },
});
