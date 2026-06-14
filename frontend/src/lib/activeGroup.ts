const ACTIVE_GROUP_KEY = "ledgeros_active_group_id";

export function getActiveGroupId() {
  const rawValue = window.localStorage.getItem(ACTIVE_GROUP_KEY);
  const parsed = Number(rawValue);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function saveActiveGroupId(groupId: number) {
  window.localStorage.setItem(ACTIVE_GROUP_KEY, String(groupId));
}

export function resolveActiveGroupId(
  groups: { id: number }[],
  preferredGroupId = getActiveGroupId(),
) {
  if (!groups.length) return null;

  const preferred = groups.find((group) => group.id === preferredGroupId);
  const resolved = preferred?.id ?? groups[0].id;

  saveActiveGroupId(resolved);

  return resolved;
}
