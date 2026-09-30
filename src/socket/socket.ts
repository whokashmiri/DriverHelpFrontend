import { io, Socket } from "socket.io-client";

import { getToken } from "../api/client";

// const SOCKET_URL = "https://driverhelp.167.71.231.64.nip.io";

/*
 * Local development:
 */
const SOCKET_URL = "http://192.168.0.138:9000";

const LOCATION_ACK_TIMEOUT_MS = 8000;

let socket: Socket | null = null;

let connectingPromise: Promise<Socket> | null = null;

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

    /*
     * Prefer websocket for
     * live location.
     */
    transports: ["websocket"],

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

  socket.io.on("reconnect", (attempt) => {
    console.log("[Socket] Reconnected:", attempt);
  });

  return socket;
}

/*
 * CONNECT SOCKET
 */
export async function connectSocket() {
  const instance = createSocket();

  if (instance.connected) {
    return instance;
  }

  /*
   * Avoid multiple simultaneous
   * connection attempts.
   */
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    const token = await getToken();

    if (!token) {
      throw new Error("Cannot connect socket without authentication token");
    }

    instance.auth = {
      token,
    };

    return new Promise<Socket>((resolve, reject) => {
      const handleConnect = () => {
        cleanup();

        resolve(instance);
      };

      const handleError = (error: Error) => {
        cleanup();

        reject(error);
      };

      const cleanup = () => {
        instance.off("connect", handleConnect);

        instance.off("connect_error", handleError);
      };

      instance.once("connect", handleConnect);

      instance.once("connect_error", handleError);

      instance.connect();
    });
  })();

  try {
    return await connectingPromise;
  } finally {
    connectingPromise = null;
  }
}

/*
 * LOGOUT
 */
export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();

  socket.io.removeAllListeners();

  socket.disconnect();

  socket = null;

  connectingPromise = null;
}

/*
 * CONNECTION STATUS
 */
export function isSocketConnected() {
  return socket?.connected === true;
}

/*
 * DRIVER:
 * SEND LIVE LOCATION
 */
export async function emitDriverLocation(
  payload: DriverLiveLocationPayload,
): Promise<LocationAcknowledgement> {
  /*
   * Mobile networks can switch between
   * Wi-Fi / cellular while tracking.
   */
  const instance = socket?.connected ? socket : await connectSocket();

  return new Promise((resolve, reject) => {
    let finished = false;

    const timeout = setTimeout(
      () => {
        if (finished) {
          return;
        }

        finished = true;

        reject(new Error("Location acknowledgement timed out"));
      },

      LOCATION_ACK_TIMEOUT_MS,
    );

    instance.emit(
      "driver:location",

      payload,

      (response: LocationAcknowledgement) => {
        if (finished) {
          return;
        }

        finished = true;

        clearTimeout(timeout);

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

//with logs
// export async function emitDriverLocation(
//   payload: DriverLiveLocationPayload,
// ): Promise<LocationAcknowledgement> {
//   /*
//    * Mobile networks can switch between
//    * Wi-Fi / cellular while tracking.
//    */
//   const instance = socket?.connected ? socket : await connectSocket();

//   console.log("[Socket][Location] Emitting:", {
//     socketId: instance.id,

//     event: "driver:location",

//     latitude: payload.latitude,

//     longitude: payload.longitude,

//     accuracy: payload.accuracy ?? null,

//     speed: payload.speed ?? null,

//     heading: payload.heading ?? null,

//     sentAt: new Date().toISOString(),
//   });

//   return new Promise((resolve, reject) => {
//     let finished = false;

//     const timeout = setTimeout(
//       () => {
//         if (finished) {
//           return;
//         }

//         finished = true;

//         console.warn("[Socket][Location] ACK timeout:", {
//           socketId: instance.id,

//           latitude: payload.latitude,

//           longitude: payload.longitude,
//         });

//         reject(new Error("Location acknowledgement timed out"));
//       },

//       LOCATION_ACK_TIMEOUT_MS,
//     );

//     instance.emit(
//       "driver:location",

//       payload,

//       (response: LocationAcknowledgement) => {
//         if (finished) {
//           return;
//         }

//         finished = true;

//         clearTimeout(timeout);

//         console.log("[Socket][Location] ACK received:", {
//           socketId: instance.id,

//           response,
//         });

//         if (!response) {
//           console.warn("[Socket][Location] Empty ACK");

//           reject(new Error("No location acknowledgement received"));

//           return;
//         }

//         if (!response.success) {
//           console.warn("[Socket][Location] Server rejected location:", {
//             message: response.message,

//             latitude: payload.latitude,

//             longitude: payload.longitude,
//           });

//           reject(new Error(response.message || "Unable to update location"));

//           return;
//         }

//         console.log("[Socket][Location] Sent successfully:", {
//           latitude: payload.latitude,

//           longitude: payload.longitude,

//           recordedAt: response.recordedAt,

//           locationId: response.locationId,
//         });

//         resolve(response);
//       },
//     );
//   });
// }


/*
 * SUPERVISOR:
 * LIVE LOCATION LISTENER
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

/*
 * DRIVER:
 * SERVER LOCATION ERROR
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

/*
 * CONNECTION LISTENERS
 */
export function onSocketConnect(callback: () => void) {
  const instance = createSocket();

  instance.on("connect", callback);

  return () => {
    instance.off("connect", callback);
  };
}

export function onSocketDisconnect(callback: (reason: string) => void) {
  const instance = createSocket();

  instance.on("disconnect", callback);

  return () => {
    instance.off("disconnect", callback);
  };
}

export function onSocketConnectError(callback: (error: Error) => void) {
  const instance = createSocket();

  instance.on("connect_error", callback);

  return () => {
    instance.off("connect_error", callback);
  };
}
