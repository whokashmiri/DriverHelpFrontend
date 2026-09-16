import { Redirect, Stack } from "expo-router";

import { useAuth } from "../../hooks/useAuth";

export default function SupervisorLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role !== "supervisor") {
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
      <Stack.Screen name="drivers" />
      <Stack.Screen name="driver-details" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="live-map" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
