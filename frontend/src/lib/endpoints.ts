export const endpoints = {
  auth: {
    login: "/api/auth/token/",
    refresh: "/api/auth/token/refresh/",
    me: "/api/auth/me/",
    users: "/api/auth/users/",
    google: "/api/auth/google/",
  },

  groups: {
    list: "/api/groups/",
    detail: (groupId: number) => `/api/groups/${groupId}/`,
    members: (groupId: number) => `/api/groups/${groupId}/members/`,
    memberships: "/api/groups/memberships/",
    membershipDetail: (membershipId: number) =>
      `/api/groups/memberships/${membershipId}/`,
  },

  imports: {
    list: "/api/imports/",
    upload: "/api/imports/upload/",
    detail: (batchId: number) => `/api/imports/${batchId}/`,
    summary: (batchId: number) => `/api/imports/${batchId}/summary/`,
    issues: (batchId: number) => `/api/imports/${batchId}/issues/`,
    commit: (batchId: number) => `/api/imports/${batchId}/commit/`,
    issueDecision: (issueId: number) =>
      `/api/imports/issues/${issueId}/decision/`,
  },

  ai: {
    explainImport: (batchId: number) => `/api/ai/imports/${batchId}/explain/`,
  },

  expenses: {
    list: "/api/expenses/",
    detail: (expenseId: number) => `/api/expenses/${expenseId}/`,
    groupBalances: (groupId: number) =>
      `/api/expenses/groups/${groupId}/balances/`,
  },

  settlements: {
    list: "/api/expenses/settlements/",
    detail: (settlementId: number) =>
      `/api/expenses/settlements/${settlementId}/`,
  },

  audit: {
    list: "/api/audit/",
  },
} as const;
export const DEFAULT_IMPORT_BATCH_ID = 1;
