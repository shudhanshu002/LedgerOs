export type LoginCredentials = {
  username: string;
  password: string;
};

export type TokenResponse = {
  access: string;
  refresh: string;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
};

export type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
};

export const DEMO_CREDENTIALS: LoginCredentials = {
  username: "Aisha",
  password: "Password@123",
};

export function getDisplayName(user: AuthUser | null) {
  if (!user) return "Demo Operator";

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();

  return fullName || user.username;
}