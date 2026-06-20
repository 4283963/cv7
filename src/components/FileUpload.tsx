import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACCEPT = ".csv,text/csv";

export default function FileUpload() {
  const { status, error, source, analyzeFile, analyzeSample } = useAnalysisStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);

  const loading = status === "loading";

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setPicked(null);
        return;
      }
      setPicked(file);
    },
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile],
  );

  const submit = useCallback(() => {
    if (!picked) return;
    void analyzeFile(picked);
  }, [picked, analyzeFile]);

  const fields = [
    { key: "rent_time", label: "租借时间", alias: "rent_time / start_time" },
    { key: "return_time", label: "还车时间", alias: "return_time / end_time" },
    { key: "rent_lng", label: "租借经度", alias: "rent_lng / start_lng" },
    { key: "rent_lat", label: "租借纬度", alias: "rent_lat / start_lat" },
    { key: "return_lng", label: "还车经度", alias: "return_lng / end_lng" },
    { key: "return_lat", label: "还车纬度", alias: "return_lat / end_lat" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-up">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "panel group relative cursor-pointer overflow-hidden p-10 transition",
          dragging ? "border-tide-inflow/60 shadow-glow" : "hover:border-white/15",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-0 transition group-hover:opacity-100" />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="relative flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition",
              dragging && "scale-110 border-tide-inflow/50",
            )}
          >
            <UploadCloud className="h-7 w-7 text-tide-inflow" />
          </div>
          <h3 className="font-display text-xl font-semibold text-white">
            上传共享单车租借记录 CSV
          </h3>
          <p className="mt-2 max-w-md text-sm text-white/55">
            将文件拖拽到此处，或点击选择文件。后端将使用 Pandas 完成字段校验、网格区域划分与潮汐聚合分析。
          </p>

          {picked && (
            <div className="mt-6 flex w-full max-w-md items-center gap-3 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-left">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-tide-inflow" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{picked.name}</p>
                <p className="text-xs text-white/45">{formatBytes(picked.size)}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 flex w-full max-w-md items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!picked || loading}
              onClick={(e) => {
                e.stopPropagation();
                submit();
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在分析…
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  开始分析
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                void analyzeSample();
              }}
            >
              <Sparkles className="h-4 w-4 text-tide-outflow" />
              加载示例数据
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-white/70">
            所需字段
          </h4>
          <span className="chip">支持中英文字段别名</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div
              key={f.key}
              className="rounded-xl border border-white/5 bg-ink-900/50 px-4 py-3"
            >
              <p className="text-sm font-medium text-white">{f.label}</p>
              <p className="mt-0.5 font-mono text-xs text-white/40">{f.alias}</p>
            </div>
          ))}
        </div>
      </div>

      {source && status === "success" && (
        <p className="mt-4 text-center text-xs text-white/40">
          已加载数据源：<span className="text-white/70">{source}</span>
        </p>
      )}
    </div>
  );
}
