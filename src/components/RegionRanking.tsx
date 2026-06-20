import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";
import type { RankingItem } from "@/types/analysis";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "activity" | "net";

interface RegionRankingProps {
  ranking: RankingItem[];
}

export default function RegionRanking({ ranking }: RegionRankingProps) {
  const [sortKey, setSortKey] = useState<SortKey>("activity");
  const activeRegion = useAnalysisStore((s) => s.activeRegion);
  const setActiveRegion = useAnalysisStore((s) => s.setActiveRegion);

  const sorted = useMemo(() => {
    const list = [...ranking];
    if (sortKey === "activity") {
      list.sort((a, b) => b.activity - a.activity);
    } else {
      list.sort((a, b) => b.net - a.net);
    }
    return list.slice(0, 40);
  }, [ranking, sortKey]);

  const maxActivity = Math.max(1, ...ranking.map((r) => r.activity));

  return (
    <div className="panel flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-white/70">
          区域潮汐排行
        </h3>
        <div className="inline-flex rounded-full border border-white/10 bg-ink-900/70 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSortKey("activity")}
            className={cn(
              "rounded-full px-2.5 py-1 transition",
              sortKey === "activity"
                ? "bg-tide-inflow text-ink-950"
                : "text-white/55 hover:text-white",
            )}
          >
            活跃度
          </button>
          <button
            type="button"
            onClick={() => setSortKey("net")}
            className={cn(
              "rounded-full px-2.5 py-1 transition",
              sortKey === "net"
                ? "bg-tide-inflow text-ink-950"
                : "text-white/55 hover:text-white",
            )}
          >
            净流量
          </button>
        </div>
      </div>

      <div className="-mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
        {sorted.map((r) => {
          const positive = r.net >= 0;
          const active = r.name === activeRegion;
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => setActiveRegion(active ? null : r.name)}
              className={cn(
                "group block w-full rounded-xl border px-3 py-2.5 text-left transition",
                active
                  ? "border-tide-inflow/50 bg-tide-inflow/10"
                  : "border-white/5 bg-ink-900/40 hover:border-white/15 hover:bg-ink-800/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-white/70">
                  {r.name}
                </span>
                <span
                  className={cn(
                    "stat-num text-sm font-semibold",
                    positive ? "text-tide-inflow" : "text-tide-outflow",
                  )}
                >
                  {formatSigned(r.net)}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn(
                    "h-full rounded-full",
                    positive ? "bg-tide-inflow" : "bg-tide-outflow",
                  )}
                  style={{ width: `${(r.activity / maxActivity) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-white/45">
                <span className="inline-flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3 text-tide-inflow" />
                  {formatNumber(r.inflow)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ArrowUpFromLine className="h-3 w-3 text-tide-outflow" />
                  {formatNumber(r.outflow)}
                </span>
                <span className="ml-auto inline-flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {formatNumber(r.activity)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
