import { api, saveTokens } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import type { LoginCredentials, TokenResponse, AuthUser } from "./types";

export async function loginUser(credentials: LoginCredentials) {
  const response = await api.post<TokenResponse>(
    endpoints.auth.login,
    credentials,
  );

  saveTokens(response.data.access, response.data.refresh);

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<AuthUser>(endpoints.auth.me);

  return response.data;
}