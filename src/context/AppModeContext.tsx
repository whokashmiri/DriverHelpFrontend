import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

import { useAuth } from "../hooks/useAuth";

export type AppMode = "supervisor" | "driver";

interface AppModeContextValue {
  appMode: AppMode;

  isDriverMode: boolean;

  canSwitchMode: boolean;

  setAppMode: (mode: AppMode) => void;

  toggleAppMode: () => void;
}

const AppModeContext = createContext<AppModeContextValue | undefined>(
  undefined,
);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  /*
   * This state is only used for
   * supervisors who can switch modes.
   */
  const [supervisorMode, setSupervisorMode] = useState<AppMode>("supervisor");

  const canSwitchMode =
    user?.role === "supervisor" && user?.canDeliverOrders === true;

  /*
   * A real driver is always
   * in driver mode.
   *
   * A supervisor uses the
   * locally selected mode.
   */
  const appMode: AppMode =
    user?.role === "driver"
      ? "driver"
      : canSwitchMode
        ? supervisorMode
        : "supervisor";

  const setAppMode = useCallback(
    (mode: AppMode) => {
      /*
       * Actual drivers cannot
       * switch to supervisor mode.
       */
      if (user?.role === "driver") {
        return;
      }

      /*
       * Only delivery-capable
       * supervisors may switch.
       */
      if (!canSwitchMode) {
        return;
      }

      setSupervisorMode((current) => (current === mode ? current : mode));
    },
    [user?.role, canSwitchMode],
  );

  const toggleAppMode = useCallback(() => {
    if (!canSwitchMode) {
      return;
    }

    setSupervisorMode((current) =>
      current === "supervisor" ? "driver" : "supervisor",
    );
  }, [canSwitchMode]);

  const value = useMemo(
    () => ({
      appMode,

      isDriverMode: appMode === "driver",

      canSwitchMode,

      setAppMode,

      toggleAppMode,
    }),
    [appMode, canSwitchMode, setAppMode, toggleAppMode],
  );

  return (
    <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);

  if (!context) {
    throw new Error("useAppMode must be used inside AppModeProvider");
  }

  return context;
}
