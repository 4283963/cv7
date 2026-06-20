import { create } from "zustand";
import type { AnalyzeResponse } from "@/types/analysis";
import { analyzeCsv, loadSample, AnalysisError } from "@/api/analysis";

export type AnalysisStatus = "idle" | "loading" | "success" | "error";

interface AnalysisState {
  status: AnalysisStatus;
  error: string | null;
  data: AnalyzeResponse | null;
  source: string | null;
  activeRegion: string | null;
  analyzeFile: (file: File) => Promise<boolean>;
  analyzeSample: () => Promise<boolean>;
  setActiveRegion: (name: string | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  status: "idle",
  error: null,
  data: null,
  source: null,
  activeRegion: null,
  analyzeFile: async (file) => {
    set({ status: "loading", error: null, activeRegion: null });
    try {
      const data = await analyzeCsv(file);
      set({
        status: "success",
        data,
        source: file.name,
        activeRegion: null,
      });
      return true;
    } catch (e) {
      const msg =
        e instanceof AnalysisError
          ? e.message
          : e instanceof Error
            ? e.message
            : "未知错误";
      set({ status: "error", error: msg, data: null });
      return false;
    }
  },
  analyzeSample: async () => {
    set({ status: "loading", error: null, activeRegion: null });
    try {
      const data = await loadSample();
      set({
        status: "success",
        data,
        source: "示例数据 · 北京",
        activeRegion: null,
      });
      return true;
    } catch (e) {
      const msg =
        e instanceof AnalysisError
          ? e.message
          : e instanceof Error
            ? e.message
            : "未知错误";
      set({ status: "error", error: msg, data: null });
      return false;
    }
  },
  setActiveRegion: (name) => set({ activeRegion: name }),
  reset: () =>
    set({
      status: "idle",
      error: null,
      data: null,
      source: null,
      activeRegion: null,
    }),
}));
