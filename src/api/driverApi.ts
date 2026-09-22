import { api } from "./client";

import type {
  CreateDriverPayload,
  CreateDriverResponse,
  DriverResponse,
  DriversResponse,
  UpdateDriverPayload,
  UpdateDriverStatusResponse,
} from "../types/driver";

function getImageFileName(uri: string) {
  const cleanUri = uri.split("?")[0];

  const name = cleanUri.split("/").pop();

  return name || `profile-${Date.now()}.jpg`;
}

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

function appendProfilePicture(formData: FormData, uri?: string | null) {
  if (!uri) {
    return;
  }

  formData.append("profilePicture", {
    uri,

    name: getImageFileName(uri),

    type: getImageMimeType(uri),
  } as any);
}

export async function createDriver(payload: CreateDriverPayload) {
  const formData = new FormData();

  formData.append("iqamaId", payload.iqamaId);

  formData.append("name", payload.name);

  if (payload.shortName) {
    formData.append("shortName", payload.shortName);
  }

  if (payload.phone) {
    formData.append("phone", payload.phone);
  }

  formData.append("password", payload.password);

  formData.append("vehicleType", payload.vehicleType);

  appendProfilePicture(formData, payload.profilePictureUri);

  const response = await api.post<CreateDriverResponse>("/drivers", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getMyDrivers() {
  const response = await api.get<DriversResponse>("/drivers");

  return response.data;
}

export async function getDriverById(driverId: string) {
  const response = await api.get<DriverResponse>(`/drivers/${driverId}`);

  return response.data;
}

export async function updateDriver(
  driverId: string,
  payload: UpdateDriverPayload,
) {
  const formData = new FormData();

  if (payload.name !== undefined) {
    formData.append("name", payload.name);
  }

  if (payload.shortName !== undefined) {
    formData.append("shortName", payload.shortName ?? "");
  }

  if (payload.iqamaId !== undefined) {
    formData.append("iqamaId", payload.iqamaId);
  }

  if (payload.phone !== undefined) {
    formData.append("phone", payload.phone ?? "");
  }

  if (payload.password) {
    formData.append("password", payload.password);
  }

  if (payload.vehicleType) {
    formData.append("vehicleType", payload.vehicleType);
  }

  appendProfilePicture(formData, payload.profilePictureUri);

  const response = await api.patch<{
    success: boolean;
    message: string;
    driver: DriverResponse["driver"];
  }>(`/drivers/${driverId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function updateDriverStatus(driverId: string, isActive: boolean) {
  const response = await api.patch<UpdateDriverStatusResponse>(
    `/drivers/${driverId}/status`,
    {
      isActive,
    },
  );

  return response.data;
}
