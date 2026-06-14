export type UserMini = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
};

export type GroupCreateInput = {
  name: string;
  description: string;
};

export type MembershipCreateInput = {
  user: number;
  role: GroupMembershipRole;
  joined_at: string;
  left_at?: string | null;
};

export type MembershipUpdateInput = {
  role?: GroupMembershipRole;
  joined_at?: string;
  left_at?: string | null;
};

export type GroupMembershipRole = "ADMIN" | "MEMBER";

export type GroupMembership = {
  id: number;
  user: number;
  user_detail: UserMini;
  role: GroupMembershipRole;
  joined_at: string;
  left_at: string | null;
};

export type GroupWithMemberships = {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_by_detail?: UserMini;
  memberships: GroupMembership[];
  created_at: string;
  updated_at: string;
};

export type GroupStats = {
  total: number;
  active: number;
  left: number;
  admins: number;
};

export function calculateGroupStats(
  memberships: GroupMembership[],
): GroupStats {
  return {
    total: memberships.length,
    active: memberships.filter((member) => !member.left_at).length,
    left: memberships.filter((member) => member.left_at).length,
    admins: memberships.filter((member) => member.role === "ADMIN").length,
  };
}
