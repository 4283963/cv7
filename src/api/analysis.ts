import type { AnalyzeResponse } from "@/types/analysis";

export class AnalysisError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AnalysisError";
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  const fallback = `请求失败 (${res.status})`;
  try {
    const data = await res.json();
    return data?.detail || data?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function analyzeCsv(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/analyze", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new AnalysisError(await parseError(res), res.status);
  }
  return (await res.json()) as AnalyzeResponse;
}

export async function loadSample(): Promise<AnalyzeResponse> {
  const res = await fetch("/api/sample", { method: "POST" });
  if (!res.ok) {
    throw new AnalysisError(await parseError(res), res.status);
  }
  return (await res.json()) as AnalyzeResponse;
}
