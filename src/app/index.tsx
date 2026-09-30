import { Redirect } from "expo-router";

import { useAppMode } from "../context/AppModeContext";
import { useAuth } from "../hooks/useAuth";

export default function IndexScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const { appMode } = useAppMode();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  /*
   * Real driver.
   */
  if (user.role === "driver") {
    return <Redirect href="/(driver)" />;
  }

  /*
   * Supervisor can enter
   * either supervisor mode
   * or driver mode.
   */
  if (user.role === "supervisor") {
    if (appMode === "driver") {
      return <Redirect href="/(driver)" />;
    }

    return <Redirect href="/(supervisor)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
