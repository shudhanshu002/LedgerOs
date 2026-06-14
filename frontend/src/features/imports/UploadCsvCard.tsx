import { type ChangeEvent, useState } from "react";
import {
  DatabaseZap,
  FileSpreadsheet,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { uploadImportCsv } from "./importsApi";
import { type ImportBatch } from "./types";

function humanizeFilename(filename: string) {
  const extensionIndex = filename.lastIndexOf(".");
  const name =
    extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
  const extension = extensionIndex > 0 ? filename.slice(extensionIndex) : "";
  const label = name
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `${label || "Uploaded File"}${extension.toLowerCase()}`;
}

type UploadCsvCardProps = {
  groupId: number | null;
  onUploaded: (batch: ImportBatch, message: string) => void;
};

export function UploadCsvCard({
  groupId,
  onUploaded,
}: UploadCsvCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localMessage, setLocalMessage] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setLocalMessage("");
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!groupId) {
      setLocalMessage("Create or select a group before uploading CSV.");
      return;
    }

    if (!selectedFile) {
      setLocalMessage("Select expenses_export.csv first.");
      return;
    }

    setUploading(true);
    setLocalMessage("");

    try {
      const batch = await uploadImportCsv(groupId, selectedFile);

      const displayFilename =
        batch.display_filename ?? humanizeFilename(batch.original_filename);
      const message = `Uploaded ${displayFilename}. Backend parsed ${batch.total_rows} rows and generated review status.`;

      setLocalMessage(message);
      onUploaded(batch, message);
    } catch {
      setLocalMessage("CSV upload failed. Check backend server and token.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="glass-panel ring-gradient rounded-3xl p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-ledger-green/20 bg-ledger-green/10 p-3 text-ledger-green">
          <UploadCloud className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold">Upload CSV</h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Analyze the file first. Do not directly mutate ledger balances.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-5 transition hover:border-ledger-green/25 hover:bg-white/[0.05]">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="hidden rounded-2xl border border-white/10 bg-black/20 p-3 text-ledger-blue sm:block">
              <FileSpreadsheet className="h-5 w-5" />
            </div>

            <div>
              <p className="font-display text-lg font-semibold">
                expenses_export.csv
              </p>
              <p className="mt-2 text-sm leading-6 text-ledger-muted">
                Expected headers: date, description, paid_by, amount, currency,
                split_type, split_with, split_details, notes.
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-ledger-muted file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ledger-bg"
          />

          {selectedFile ? (
            <div className="rounded-2xl border border-ledger-blue/20 bg-ledger-blue/10 px-4 py-3 text-sm text-ledger-blue">
              Selected: {humanizeFilename(selectedFile.name)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-ledger-green">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm font-medium">Safety first</p>
          </div>

          <p className="mt-2 text-xs leading-5 text-ledger-muted">
            Upload only creates an import batch. Safe rows are committed later.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-ledger-violet">
            <DatabaseZap className="h-4 w-4" />
            <p className="text-sm font-medium">Relational ledger</p>
          </div>

          <p className="mt-2 text-xs leading-5 text-ledger-muted">
            Django validates group members, dates, splits, duplicates, and money.
          </p>
        </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-ledger-bg transition hover:scale-[1.01] disabled:opacity-60"
      >
        <UploadCloud className="h-4 w-4" />
        {uploading ? "Analyzing CSV..." : "Upload and analyze"}
      </button>

      {localMessage ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-ledger-muted">
          {localMessage}
        </div>
      ) : null}
    </div>
  );
}
