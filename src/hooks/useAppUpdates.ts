
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppState } from "react-native";
import * as Updates from "expo-updates";

type OTAState =
  | "idle"
  | "checking"
  | "downloading"
  | "restarting"
  | "error";

const MIN_CHECK_INTERVAL_MS = 60_000;

export function useAppUpdates() {
  const [status, setStatus] = useState<OTAState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { isUpdatePending } = Updates.useUpdates();

  const pendingRef = useRef(isUpdatePending);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const activeRef = useRef(false);
  const updateDetectedRef = useRef(false);

  useEffect(() => {
    pendingRef.current = isUpdatePending;
  }, [isUpdatePending]);

  const checkForUpdates = useCallback(
    async (force = false) => {
      if (__DEV__ || !Updates.isEnabled) {
        return;
      }

      if (checkingRef.current) {
        return;
      }

      const now = Date.now();

      if (
        !force &&
        now - lastCheckRef.current < MIN_CHECK_INTERVAL_MS
      ) {
        return;
      }

      checkingRef.current = true;
      lastCheckRef.current = now;

      try {
        setErrorMessage("");

        // An update was already downloaded.
        // Restart without downloading it again.
        if (pendingRef.current) {
          updateDetectedRef.current = true;
          setStatus("restarting");

          await Updates.reloadAsync();
          return;
        }

        // Check Expo for an available frontend update.
        const result = await Updates.checkForUpdateAsync();

        if (!activeRef.current) {
          return;
        }

        if (!result.isAvailable) {
          if (!updateDetectedRef.current) {
            setStatus("idle");
          }
          return;
        }

        // A compatible OTA update is available.
        updateDetectedRef.current = true;
        setStatus("downloading");

        // Download the update.
        const downloaded = await Updates.fetchUpdateAsync();

        if (!activeRef.current) {
          return;
        }

        if (
          downloaded.isNew ||
          downloaded.isRollBackToEmbedded ||
          pendingRef.current
        ) {
          setStatus("restarting");

          await Updates.reloadAsync();
          return;
        }

        throw new Error(
          "The update could not be applied."
        );
      } catch (error) {
        console.error("[OTA] Update failed:", error);

        if (!activeRef.current) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to complete the update."
        );

        setStatus(
          updateDetectedRef.current
            ? "error"
            : "idle"
        );
      } finally {
        checkingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    activeRef.current = true;

    void checkForUpdates();

    let previousState = AppState.currentState;

    const subscription = AppState.addEventListener(
      "change",
      (nextState) => {
        const returning =
          (previousState === "background" ||
            previousState === "inactive") &&
          nextState === "active";

        previousState = nextState;

        if (returning) {
          void checkForUpdates();
        }
      }
    );

    return () => {
      activeRef.current = false;
      subscription.remove();
    };
  }, [checkForUpdates]);

  return {
    status,
    errorMessage,
    retry: () => checkForUpdates(true),
  };
}
