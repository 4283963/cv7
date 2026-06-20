import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  MapPinned,
} from "lucide-react";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import type { LayerMode } from "@/types/analysis";
import StatCard from "@/components/StatCard";
import MapVisualizer from "@/components/MapVisualizer";
import RegionRanking from "@/components/RegionRanking";
import LayerToggle from "@/components/LayerToggle";
import { formatNumber } from "@/lib/format";

export default function Dashboard() {
  const { data, source, reset } = useAnalysisStore();
  const [mode, setMode] = useState<LayerMode>("combined");
  const navigate = useNavigate();

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-white/60">
        <p className="text-sm">暂无分析数据</p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigate("/")}
        >
          返回上传
        </button>
      </div>
    );
  }

  const { meta, stats, ranking } = data;

  return (
    <div className="min-h-screen px-6 py-8">
      <header className="mx-auto mb-6 flex max-w-[1400px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Bike className="h-5 w-5 text-tide-inflow" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-white">
              潮汐分析仪表盘
            </h1>
            <p className="text-xs text-white/45">
              数据源：{source ?? "未知"}
              {meta.date ? ` · 分析日期 ${meta.date}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            reset();
            navigate("/");
          }}
        >
          <RefreshCw className="h-4 w-4" />
          重新上传
        </button>
      </header>

      <section className="mx-auto mb-6 grid max-w-[1400px] grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="总租借次数"
          value={formatNumber(stats.totalRent)}
          sub={`${formatNumber(meta.recordCount)} 条记录`}
          icon={ArrowUpFromLine}
          tone="outflow"
          delay={0}
        />
        <StatCard
          label="总还车次数"
          value={formatNumber(stats.totalReturn)}
          sub={`划分 ${formatNumber(meta.regionCount)} 个区域`}
          icon={ArrowDownToLine}
          tone="inflow"
          delay={60}
        />
        <StatCard
          label="净流入峰值区"
          value={stats.topInflowRegion.replace("grid_", "")}
          sub="车辆聚集"
          icon={MapPinned}
          tone="inflow"
          delay={120}
        />
        <StatCard
          label="净流出峰值区"
          value={stats.topOutflowRegion.replace("grid_", "")}
          sub="车辆消耗"
          icon={Activity}
          tone="outflow"
          delay={180}
        />
      </section>

      <section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="panel flex flex-col p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                高频停放区域分布
              </h2>
              <p className="text-xs text-white/45">
                气泡半径 = 活跃度 · 颜色 = 潮汐方向（青色净流入 / 琥珀净流出）
              </p>
            </div>
            <LayerToggle mode={mode} onChange={setMode} />
          </div>
          <div className="flex-1">
            <MapVisualizer data={data} mode={mode} />
          </div>
        </div>

        <div className="h-[620px] lg:h-auto">
          <RegionRanking ranking={ranking} />
        </div>
      </section>
    </div>
  );
}
