import type {
  VersionPolicy,
} from "./appVersion";

type UpdateRequiredListener = (
  policy: VersionPolicy
) => void;

const listeners = new Set<UpdateRequiredListener>();

let requiredPolicy: VersionPolicy | null = null;

export function getRequiredUpdate() {
  return requiredPolicy;
}

export function notifyUpdateRequired(
  policy: VersionPolicy
) {
  requiredPolicy = policy;

  for (const listener of listeners) {
    listener(policy);
  }
}

export function clearRequiredUpdate() {
  requiredPolicy = null;
}

export function subscribeToRequiredUpdate(
  listener: UpdateRequiredListener
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}