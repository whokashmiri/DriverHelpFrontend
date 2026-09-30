import { Stack } from "expo-router";

import { AuthProvider } from "@/context/AuthContext";
import { AppModeProvider } from "@/context/AppModeContext";
import { LanguageProvider } from "../context/LanguageContext";

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
        </AppModeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}