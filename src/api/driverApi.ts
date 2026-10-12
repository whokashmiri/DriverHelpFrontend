
import { api } from "./client";

import type {
  CreateDriverPayload,
  CreateDriverResponse,
  DriverResponse,
  DriversResponse,
  UpdateDriverPayload,
  UpdateDriverStatusResponse,
  DriverAccommodation,
} from "../types/driver";

/**
 * Get filename from image URI.
 */
function getImageFileName(uri: string) {
  const cleanUri = uri.split("?")[0];

  const name = cleanUri.split("/").pop();

  return name || `profile-${Date.now()}.jpg`;
}

/**
 * Detect image MIME type.
 */
function getImageMimeType(uri: string) {
  const cleanUri = uri.split("?")[0].toLowerCase();

  if (cleanUri.endsWith(".png")) {
    return "image/png";
  }

  if (cleanUri.endsWith(".webp")) {
    return "image/webp";
  }

  if (cleanUri.endsWith(".heic")) {
    return "image/heic";
  }

  if (cleanUri.endsWith(".heif")) {
    return "image/heif";
  }

  return "image/jpeg";
}

/**
 * Attach driver's profile picture.
 */
function appendProfilePicture(
  formData: FormData,
  uri?: string | null,
) {
  if (!uri) {
    return;
  }

  formData.append(
    "profilePicture",
    {
      uri,
      name: getImageFileName(uri),
      type: getImageMimeType(uri),
    } as any,
  );
}

/**
 * Normalize supported Arabic digits to English.
 * Plate letter conversion should happen in the UI
 * using the Saudi plate mapping.
 */
function normalizePlateNumber(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return value
    .replace(/[٠-٩]/g, (digit) =>
      String(arabicDigits.indexOf(digit)),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(persianDigits.indexOf(digit)),
    )
    .replace(/\s+/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Append vehicle plate number.
 *
 * undefined = leave unchanged during update
 * null / empty = clear plate
 */
function appendVehiclePlateNumber(
  formData: FormData,
  value?: string | null,
) {
  if (value === undefined) {
    return;
  }

  formData.append(
    "vehiclePlateNumber",
    value === null ? "" : normalizePlateNumber(value),
  );
}

/**
 * Attach accommodation to multipart FormData.
 *
 * Backend parseAccommodation() converts
 * the JSON string into an object.
 *
 * undefined = do not update
 * null = clear accommodation
 * object = create/update accommodation
 */
function appendAccommodation(
  formData: FormData,
  accommodation?: DriverAccommodation | null,
) {
  if (accommodation === undefined) {
    return;
  }

  formData.append(
    "accommodation",
    JSON.stringify(accommodation),
  );
}

/**
 * ==========================================
 * CREATE DRIVER
 * ==========================================
 */
export async function createDriver(
  payload: CreateDriverPayload,
) {
  const formData = new FormData();

  formData.append(
    "iqamaId",
    payload.iqamaId,
  );

  formData.append(
    "name",
    payload.name,
  );

  if (payload.shortName) {
    formData.append(
      "shortName",
      payload.shortName,
    );
  }

  if (payload.phone) {
    formData.append(
      "phone",
      payload.phone,
    );
  }

  formData.append(
    "password",
    payload.password,
  );

  formData.append(
    "vehicleType",
    payload.vehicleType,
  );

  /**
   * Vehicle plate number.
   */
  appendVehiclePlateNumber(
    formData,
    payload.vehiclePlateNumber,
  );

  /**
   * Accommodation details.
   */
  appendAccommodation(
    formData,
    payload.accommodation,
  );

  appendProfilePicture(
    formData,
    payload.profilePictureUri,
  );

  const response =
    await api.post<CreateDriverResponse>(
      "/drivers",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

  return response.data;
}

/**
 * ==========================================
 * GET SUPERVISOR DRIVERS
 * ==========================================
 */
export async function getMyDrivers() {
  const response =
    await api.get<DriversResponse>(
      "/drivers",
    );

  return response.data;
}

/**
 * ==========================================
 * GET DRIVER BY ID
 * ==========================================
 */
export async function getDriverById(
  driverId: string,
) {
  const response =
    await api.get<DriverResponse>(
      `/drivers/${driverId}`,
    );

  return response.data;
}

/**
 * ==========================================
 * UPDATE DRIVER
 * ==========================================
 */
export async function updateDriver(
  driverId: string,
  payload: UpdateDriverPayload,
) {
  const formData = new FormData();

  if (payload.name !== undefined) {
    formData.append(
      "name",
      payload.name,
    );
  }

  if (payload.shortName !== undefined) {
    formData.append(
      "shortName",
      payload.shortName ?? "",
    );
  }

  if (payload.iqamaId !== undefined) {
    formData.append(
      "iqamaId",
      payload.iqamaId,
    );
  }

  if (payload.phone !== undefined) {
    formData.append(
      "phone",
      payload.phone ?? "",
    );
  }

  if (payload.password) {
    formData.append(
      "password",
      payload.password,
    );
  }

  if (payload.vehicleType !== undefined) {
    formData.append(
      "vehicleType",
      payload.vehicleType ?? "",
    );
  }

  /**
   * Update or clear vehicle plate number.
   */
  appendVehiclePlateNumber(
    formData,
    payload.vehiclePlateNumber,
  );

  /**
   * Update or clear accommodation.
   */
  appendAccommodation(
    formData,
    payload.accommodation,
  );

  appendProfilePicture(
    formData,
    payload.profilePictureUri,
  );

  const response = await api.patch<{
    success: boolean;
    message: string;
    driver: DriverResponse["driver"];
  }>(
    `/drivers/${driverId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

/**
 * ==========================================
 * ACTIVATE / DEACTIVATE DRIVER
 * ==========================================
 */
export async function updateDriverStatus(
  driverId: string,
  isActive: boolean,
) {
  const response =
    await api.patch<UpdateDriverStatusResponse>(
      `/drivers/${driverId}/status`,
      {
        isActive,
      },
    );

  return response.data;
}
