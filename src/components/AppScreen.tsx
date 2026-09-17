import type { ReactNode } from "react";

import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "./AppHeader";

type AppScreenProps = {
  children: ReactNode;

  contentStyle?: StyleProp<ViewStyle>;

  showHeader?: boolean;
};

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
};

export function AppScreen({
  children,
  contentStyle,
  showHeader = true,
}: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {showHeader && <AppHeader />}

      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
});
