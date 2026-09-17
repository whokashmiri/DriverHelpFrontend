import axios from "axios";

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message =
      error.response?.data?.message || error.response?.data?.error;

    if (message) {
      return message;
    }

    if (error.code === "ECONNABORTED") {
      return "Request timed out";
    }

    if (!error.response) {
      return "Unable to connect to the server";
    }

    if (error.response.status === 401) {
      return "Your session has expired";
    }

    if (error.response.status === 403) {
      return "You are not authorized to perform this action";
    }

    if (error.response.status === 404) {
      return "Requested data was not found";
    }

    if (error.response.status >= 500) {
      return "Server error. Please try again.";
    }

    return fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}

export function getErrorStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null;
  }

  return null;
}

export function isUnauthorizedError(error: unknown) {
  return getErrorStatus(error) === 401;
}

export function isForbiddenError(error: unknown) {
  return getErrorStatus(error) === 403;
}

export function isNetworkError(error: unknown) {
  return axios.isAxiosError(error) && !error.response;
}
