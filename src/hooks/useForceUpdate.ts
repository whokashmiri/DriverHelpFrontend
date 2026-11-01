
//hooks/useForceUpdate.ts

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AppState,
  Platform,
} from "react-native";

import { api } from "../api/client";

import {
  isUpdateRequired,
  type VersionPolicy,
} from "../services/appVersion";

import {
  getRequiredUpdate,
  clearRequiredUpdate,
  subscribeToRequiredUpdate,
} from "../services/updateRequired";

type UpdateState =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "required"; policy: VersionPolicy }
  | { status: "error" };

const CHECK_INTERVAL_MS = 60 * 1000;

export function useForceUpdate() {
  const [state, setState] = useState<UpdateState>(
    Platform.OS === "android"
      ? { status: "checking" }
      : { status: "allowed" }
  );

  const lastCheckRef = useRef(0);
  const checkingRef = useRef(false);
  const mountedRef = useRef(false);

  const checkVersion = useCallback(
    async (force = false) => {
      if (Platform.OS !== "android") {
        setState({ status: "allowed" });
        return;
      }

      const now = Date.now();

      if (checkingRef.current) {
        return;
      }

      if (
        !force &&
        now - lastCheckRef.current <
          CHECK_INTERVAL_MS
      ) {
        return;
      }

      checkingRef.current = true;

      // Prevent excessive checks.
      lastCheckRef.current = now;

      try {
        const response = await api.get<{
          success: boolean;
          data: {
            android: VersionPolicy;
          };
        }>("/app/version");

        const policy = response.data.data.android;

        if (!mountedRef.current) {
          return;
        }

        if (isUpdateRequired(policy)) {
          setState({
            status: "required",
            policy,
          });

          return;
        }

        const required = getRequiredUpdate();

        if (
          required &&
          isUpdateRequired(required) &&
          policy.forceUpdate
        ) {
          setState({
            status: "required",
            policy: required,
          });

          return;
        }

        clearRequiredUpdate();

        setState({
          status: "allowed",
        });
      } catch (error) {
        console.error(
          "[AppUpdate] Version check failed:",
          error
        );

        if (mountedRef.current) {
          setState((previous) =>
            previous.status === "required"
              ? previous
              : { status: "error" }
          );
        }
      } finally {
        checkingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribe =
      subscribeToRequiredUpdate((policy) => {
        if (mountedRef.current) {
          setState({
            status: "required",
            policy,
          });
        }
      });

    void checkVersion();

    let previousAppState = AppState.currentState;

    const subscription = AppState.addEventListener(
      "change",
      (nextState) => {
        const wasBackground =
          previousAppState === "background" ||
          previousAppState === "inactive";

        previousAppState = nextState;

        if (
          wasBackground &&
          nextState === "active"
        ) {
          void checkVersion();
        }
      }
    );

    return () => {
      mountedRef.current = false;

      unsubscribe();
      subscription.remove();
    };
  }, [checkVersion]);

  return {
    ...state,

    // Manual retry bypasses the 60-second limit.
    checkVersion: () => checkVersion(true),
  };
}