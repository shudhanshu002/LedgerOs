import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import type {
  AiImportExplanation,
  ImportBatch,
  ImportCommitResult,
  ImportDecision,
  ImportIssue,
} from "./types";

export async function getImportBatches() {
  const response = await api.get<ImportBatch[]>(endpoints.imports.list);

  return response.data;
}

export async function uploadImportCsv(groupId: number, file: File) {
  const formData = new FormData();
  formData.append("group_id", String(groupId));
  formData.append("file", file);

  const response = await api.post<ImportBatch>(
    endpoints.imports.upload,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function getImportIssues(batchId: number) {
  const response = await api.get<ImportIssue[]>(
    endpoints.imports.issues(batchId),
  );

  return response.data;
}

export async function commitImportBatch(batchId: number) {
  const response = await api.post<ImportCommitResult>(
    endpoints.imports.commit(batchId),
  );

  return response.data;
}

export async function applyImportIssueDecision(params: {
  issueId: number;
  decision: ImportDecision;
  note?: string;
}) {
  const response = await api.post(
    endpoints.imports.issueDecision(params.issueId),
    {
      decision: params.decision,
      note: params.note ?? "",
    },
  );

  return response.data;
}

export async function getImportAiExplanation(batchId: number) {
  const response = await api.get<AiImportExplanation>(
    endpoints.ai.explainImport(batchId),
  );

  return response.data;
}
