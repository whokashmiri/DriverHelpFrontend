import { Redirect } from "expo-router";

import { useAuth } from "../hooks/useAuth";

export default function IndexScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === "driver") {
    return <Redirect href="/(driver)" />;
  }

  if (user.role === "supervisor") {
    return <Redirect href="/(supervisor)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
