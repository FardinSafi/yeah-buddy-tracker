import type { ExportPayload } from "@/types/domain";

export function downloadJsonFile(payload: ExportPayload, fileName = "yeah-buddy-tracker-export.json"): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function parseImportPayload(jsonText: string): ExportPayload {
  const payload = JSON.parse(jsonText) as Partial<ExportPayload>;

  if (payload.schemaVersion !== 1 || !payload.data) {
    throw new Error("Unsupported export format.");
  }

  return payload as ExportPayload;
}
