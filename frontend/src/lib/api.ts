import axios from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  saveAuthTokens,
} from "./storage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export function saveTokens(access: string, refresh: string) {
  saveAuthTokens(access, refresh);
}

export function clearTokens() {
  clearAuthTokens();
}

export { getAccessToken };