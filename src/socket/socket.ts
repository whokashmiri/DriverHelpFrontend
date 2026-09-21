import { io, Socket } from "socket.io-client";

import { getToken } from "../api/client";

const SOCKET_URL = "https://driverhelp.167.71.231.64.nip.io";

// For local development:
// const SOCKET_URL = "http://192.168.0.138:9000";

let socket: Socket | null = null;

export interface DriverLiveLocationPayload {
  latitude: number;
  longitude: number;

  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export interface DriverLiveLocationUpdate {
  driverId: string;

  latitude: number;
  longitude: number;

  accuracy: number | null;
  speed: number | null;
  heading: number | null;

  recordedAt: string;

  shiftId: string | null;

  isWorking: boolean;
}

export interface LocationAcknowledgement {
  success: boolean;

  recordedAt?: string;
  locationId?: string;

  message?: string;
}

export function getSocket() {
  return socket;
}

function createSocket() {
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("connect_error", (error) => {
    console.log("[Socket] Connect error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  return socket;
}

export async function connectSocket() {
  const token = await getToken();

  if (!token) {
    throw new Error("Cannot connect socket without authentication token");
  }

  const instance = createSocket();

  instance.auth = {
    token,
  };

  if (!instance.connected) {
    instance.connect();
  }

  return instance;
}

/**
 * Disconnect Socket.IO.
 *
 * Call during logout.
 */
export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();

  socket.disconnect();

  socket = null;
}

/**
 * Whether socket currently has an active
 * connection to the backend.
 */
export function isSocketConnected() {
  return socket?.connected === true;
}

/**
 * DRIVER
 *
 * Send driver's current GPS position.
 */
export function emitDriverLocation(
  payload: DriverLiveLocationPayload,
): Promise<LocationAcknowledgement> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket is not connected"));

      return;
    }

    socket.emit(
      "driver:location",
      payload,
      (response: LocationAcknowledgement) => {
        if (!response) {
          reject(new Error("No location acknowledgement received"));

          return;
        }

        if (!response.success) {
          reject(new Error(response.message || "Unable to update location"));

          return;
        }

        resolve(response);
      },
    );
  });
}

/**
 * SUPERVISOR
 *
 * Listen for live driver location updates.
 *
 * Returns cleanup function.
 */
export function onDriverLocationUpdate(
  callback: (location: DriverLiveLocationUpdate) => void,
) {
  const instance = createSocket();

  instance.on("driver:location:update", callback);

  return () => {
    instance.off("driver:location:update", callback);
  };
}

/**
 * DRIVER
 *
 * Listen for server-side location errors.
 */
export function onDriverLocationError(
  callback: (error: { message: string }) => void,
) {
  const instance = createSocket();

  instance.on("driver:location:error", callback);

  return () => {
    instance.off("driver:location:error", callback);
  };
}

/**
 * Listen for socket connection.
 *
 * Returns cleanup function.
 */
export function onSocketConnect(callback: () => void) {
  const instance = createSocket();

  instance.on("connect", callback);

  return () => {
    instance.off("connect", callback);
  };
}

/**
 * Listen for socket disconnect.
 *
 * Returns cleanup function.
 */
export function onSocketDisconnect(callback: (reason: string) => void) {
  const instance = createSocket();

  instance.on("disconnect", callback);

  return () => {
    instance.off("disconnect", callback);
  };
}

/**
 * Authentication / connection errors.
 *
 * Useful when JWT has expired or user was disabled.
 */
export function onSocketConnectError(callback: (error: Error) => void) {
  const instance = createSocket();

  instance.on("connect_error", callback);

  return () => {
    instance.off("connect_error", callback);
  };
}
