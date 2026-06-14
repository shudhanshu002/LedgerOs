import axios from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "./storage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

let refreshAccessTokenPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshAccessTokenPromise) {
        refreshAccessTokenPromise = axios
          .post<{ access: string }>(
            `${API_BASE_URL}/api/auth/token/refresh/`,
            { refresh: refreshToken },
          )
          .then((response) => response.data.access)
          .finally(() => {
            refreshAccessTokenPromise = null;
          });
      }

      const accessToken = await refreshAccessTokenPromise;

      saveAuthTokens(accessToken, refreshToken);

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${accessToken}`,
      };

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();
      return Promise.reject(refreshError);
    }
  },
);

export function saveTokens(access: string, refresh: string) {
  saveAuthTokens(access, refresh);
}

export function clearTokens() {
  clearAuthTokens();
}

export { getAccessToken };
