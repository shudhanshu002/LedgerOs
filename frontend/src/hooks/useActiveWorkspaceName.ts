import { useEffect, useState } from "react";
import { resolveActiveGroupId } from "../lib/activeGroup";
import { getGroups } from "../features/groups/groupsApi";

export function useActiveWorkspaceName() {
  const [workspaceName, setWorkspaceName] = useState("Loading workspace...");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const groups = await getGroups();
        const groupId = resolveActiveGroupId(groups);
        const group = groups.find((item) => item.id === groupId);

        if (!cancelled) {
          setWorkspaceName(group?.name ?? "No active group");
        }
      } catch {
        if (!cancelled) {
          setWorkspaceName("Workspace unavailable");
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  return workspaceName;
}
