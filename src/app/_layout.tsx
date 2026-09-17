import { Stack } from "expo-router";

import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";

export default function RootLayout() {
  console.log("ROOT LAYOUT RUNNING");

  return (
    <LanguageProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </AuthProvider>
    </LanguageProvider>
  );
}
