import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import type {
  GroupCreateInput,
  GroupMembership,
  GroupWithMemberships,
  MembershipCreateInput,
  MembershipUpdateInput,
  UserMini,
} from "./types";

export async function getGroups() {
  const response = await api.get<GroupWithMemberships[]>(endpoints.groups.list);

  return response.data;
}

export async function getGroup(groupId: number) {
  const response = await api.get<GroupWithMemberships>(
    endpoints.groups.detail(groupId),
  );

  return response.data;
}

export async function getUsers() {
  const response = await api.get<UserMini[]>(endpoints.auth.users);

  return response.data;
}

export async function createGroup(payload: GroupCreateInput) {
  const response = await api.post<GroupWithMemberships>(
    endpoints.groups.list,
    payload,
  );

  return response.data;
}

export async function addGroupMember(
  groupId: number,
  payload: MembershipCreateInput,
) {
  const response = await api.post<GroupMembership>(
    endpoints.groups.members(groupId),
    payload,
  );

  return response.data;
}

export async function updateGroupMembership(
  membershipId: number,
  payload: MembershipUpdateInput,
) {
  const response = await api.patch<GroupMembership>(
    endpoints.groups.membershipDetail(membershipId),
    payload,
  );

  return response.data;
}
