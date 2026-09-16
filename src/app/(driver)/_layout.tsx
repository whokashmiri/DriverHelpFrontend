
import { Redirect, Stack } from "expo-router";

import { useAuth } from "../../hooks/useAuth";

export default function DriverLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role !== "driver") {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#F8FAFC",
        },
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen name="order-history" />

      <Stack.Screen name="shifts" />

      <Stack.Screen name="stats" />

      <Stack.Screen name="profile" />
    </Stack>
  );
}
