import { Redirect, Stack } from "expo-router";

import { useAppMode } from "../../context/AppModeContext";

import { useAuth } from "../../hooks/useAuth";

export default function DriverLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const { appMode } = useAppMode();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  const isRealDriver = user.role === "driver";

  const isSupervisorInDriverMode =
    user.role === "supervisor" &&
    user.canDeliverOrders === true &&
    appMode === "driver";

  if (!isRealDriver && !isSupervisorInDriverMode) {
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
