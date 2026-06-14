const ACCESS_TOKEN_KEY = "ledgeros_access_token";
const REFRESH_TOKEN_KEY = "ledgeros_refresh_token";
const ACTIVE_GROUP_ID_KEY = "ledgeros_active_group_id";
const ACTIVE_BATCH_ID_KEY = "ledgeros_active_batch_id";

export function saveAuthTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function saveActiveGroupId(groupId: number) {
  localStorage.setItem(ACTIVE_GROUP_ID_KEY, String(groupId));
}

export function getActiveGroupId(defaultGroupId = 1) {
  const value = localStorage.getItem(ACTIVE_GROUP_ID_KEY);

  if (!value) return defaultGroupId;

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : defaultGroupId;
}

export function saveActiveBatchId(batchId: number) {
  localStorage.setItem(ACTIVE_BATCH_ID_KEY, String(batchId));
}

export function getActiveBatchId(defaultBatchId = 1) {
  const value = localStorage.getItem(ACTIVE_BATCH_ID_KEY);

  if (!value) return defaultBatchId;

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : defaultBatchId;
}

export function clearWorkspaceStorage() {
  localStorage.removeItem(ACTIVE_GROUP_ID_KEY);
  localStorage.removeItem(ACTIVE_BATCH_ID_KEY);
}

export function clearAllLedgerStorage() {
  clearAuthTokens();
  clearWorkspaceStorage();
}