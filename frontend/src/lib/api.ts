import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("ledgeros_access_token");

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("ledgeros_access_token", access);
  localStorage.setItem("ledgeros_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("ledgeros_access_token");
  localStorage.removeItem("ledgeros_refresh_token");
}

export function getAccessToken() {
  return localStorage.getItem("ledgeros_access_token");
}