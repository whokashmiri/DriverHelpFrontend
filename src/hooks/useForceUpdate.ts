
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
  PLAY_STORE_URL,
  type VersionPolicy,
} from "../services/appVersion";

import { checkPlayStoreUpdate } from "../services/playStoreUpdate";

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
        // Backend policy and Play Store check run in parallel.
        // Either one can require an update.
        const [backendResult, storeUpdate] =
          await Promise.all([
            api
              .get<{
                success: boolean;
                data: {
                  android: VersionPolicy;
                };
              }>("/app/version")
              .then(
                (response) => ({
                  ok: true as const,
                  policy: response.data.data.android,
                }),
                (error: unknown) => ({
                  ok: false as const,
                  error,
                })
              ),
            checkPlayStoreUpdate(),
          ]);

        if (!mountedRef.current) {
          return;
        }

        const policy = backendResult.ok
          ? backendResult.policy
          : undefined;

        // 1. Backend minimum version (manual kill switch).
        if (policy && isUpdateRequired(policy)) {
          setState({
            status: "required",
            policy,
          });

          return;
        }

        // 2. A newer build is live on Google Play.
        if (storeUpdate) {
          setState({
            status: "required",
            policy: {
              latestVersionCode:
                storeUpdate.storeVersionCode,
              minimumVersionCode:
                storeUpdate.storeVersionCode,
              forceUpdate: true,
              storeUrl:
                policy?.storeUrl || PLAY_STORE_URL,
            },
          });

          return;
        }

        // 3. An API / socket call was rejected with 426.
        const required = getRequiredUpdate();

        if (
          required &&
          isUpdateRequired(required) &&
          policy?.forceUpdate
        ) {
          setState({
            status: "required",
            policy: required,
          });

          return;
        }

        if (!backendResult.ok) {
          throw backendResult.error;
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