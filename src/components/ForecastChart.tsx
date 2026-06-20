import { useMemo } from "react";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";
import type {
  EChartsOption,
  BarSeriesOption,
  ECElementEvent,
} from "echarts";
import type { Forecast } from "@/types/analysis";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { formatSigned } from "@/lib/format";
import { TrendingUp, Clock } from "lucide-react";

const INFLOW_COLOR = "#2DD4BF";
const OUTFLOW_COLOR = "#F59E0B";

interface ForecastChartProps {
  forecast: Forecast;
}

function buildOption(forecast: Forecast, activeRegion: string | null): EChartsOption {
  const { currentHour, horizonHours, items } = forecast;

  const hourLabel = (offset: number) => {
    const h = (currentHour + offset) % 24;
    return `+${offset}h (${String(h).padStart(2, "0")}:00)`;
  };

  const xAxisData = Array.from({ length: horizonHours }, (_, i) => hourLabel(i + 1));

  const displayItems = items.slice(0, 6);
  if (displayItems.length === 0) {
    return {
      title: {
        text: "暂无充足历史数据进行趋势预测",
        left: "center",
        top: "middle",
        textStyle: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 400 },
      },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
    } as EChartsOption;
  }

  const series: BarSeriesOption[] = displayItems.map((item) => {
    const isActive = item.name === activeRegion;
    const opacity = activeRegion && !isActive ? 0.22 : 0.95;
    return {
      name: item.name.replace("grid_", ""),
      type: "bar",
      data: item.forecast.map((v) => ({
        value: v,
        itemStyle: {
          color: v >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR,
          opacity,
          borderColor: v >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR,
          borderWidth: 2,
          borderType: "dashed",
          borderRadius: [3, 3, 0, 0],
          shadowBlur: isActive ? 14 : 0,
          shadowColor: v >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR,
        },
        label: {
          show: Math.abs(v) >= 0.5,
          position: v >= 0 ? "top" : "bottom",
          formatter: formatSigned(v),
          fontSize: 11,
          fontWeight: 600,
          color: v >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR,
        },
      })),
      barGap: "10%",
      barCategoryGap: "35%",
      barWidth: `${Math.max(8, 40 - displayItems.length * 4)}px`,
      z: isActive ? 10 : 1,
    };
  });

  const yMax = Math.max(
    2,
    ...displayItems.flatMap((it) => it.forecast.map((v) => Math.ceil(Math.abs(v))))
  );

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(45,212,191,0.06)" } },
      backgroundColor: "rgba(7,10,20,0.92)",
      borderColor: "rgba(45,212,191,0.3)",
      borderWidth: 1,
      textStyle: { color: "#e6edf6", fontSize: 12 },
      padding: 10,
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [];
        if (!arr.length) return "";
        const hourTitle = String(arr[0].axisValue);
        const rows = arr
          .filter((p) => typeof p.data === "object" && p.data !== null)
          .map((p) => {
            const val = (p.data as { value: number }).value;
            const col = val >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR;
            return `<div style="display:flex;justify-content:space-between;gap:14px;font-size:12px">
              <span>${p.marker} ${p.seriesName}</span>
              <span style="color:${col};font-weight:600">${formatSigned(val)}</span>
            </div>`;
          })
          .join("");
        return `<div style="font-weight:600;margin-bottom:6px;color:#fff">${hourTitle}</div>${rows}`;
      },
    },
    legend: {
      show: displayItems.length > 1,
      top: 0,
      right: 4,
      orient: "vertical",
      textStyle: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 6,
      icon: "roundRect",
    },
    grid: {
      left: 36,
      right: displayItems.length > 1 ? 80 : 18,
      top: 8,
      bottom: 28,
      containLabel: false,
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
      axisTick: { show: false },
      axisLabel: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 11,
        fontWeight: 500,
      },
    },
    yAxis: {
      type: "value",
      name: "净流入·辆",
      nameTextStyle: { color: "rgba(255,255,255,0.35)", fontSize: 10, padding: [0, 0, 4, 0] },
      min: -yMax,
      max: yMax,
      interval: Math.max(1, Math.ceil(yMax / 4)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)", type: "dashed" } },
    },
    series,
  };
}

export default function ForecastChart({ forecast }: ForecastChartProps) {
  const activeRegion = useAnalysisStore((s) => s.activeRegion);
  const setActiveRegion = useAnalysisStore((s) => s.setActiveRegion);

  const option = useMemo(
    () => buildOption(forecast, activeRegion),
    [forecast, activeRegion]
  );

  const horizonLabel = Array.from({ length: forecast.horizonHours }, (_, i) => {
    const h = (forecast.currentHour + i + 1) % 24;
    return `${String(h).padStart(2, "0")}:00`;
  }).join(" · ");

  return (
    <div className="panel flex h-full flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-tide-inflow" />
            <h2 className="font-display text-base font-semibold text-white">
              潮汐趋势预测
            </h2>
          </div>
          <p className="text-xs text-white/45">
            Pandas 滚动平均（窗口=3日）· 未来 {forecast.horizonHours} 小时 Top
            6 活跃区域预计净流入
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900/60 px-3 py-1.5 text-[11px] text-white/55">
          <Clock className="h-3 w-3 text-tide-inflow" />
          <span className="font-mono">{horizonLabel}</span>
        </div>
      </div>

      <div className="min-h-[260px] flex-1">
        <ReactECharts
          echarts={echarts}
          option={option}
          notMerge
          lazyUpdate
          style={{ height: "100%", width: "100%" }}
          onEvents={{
            legendselectchanged: (p: ECElementEvent) => {
              const selected = Object.entries(p.selected as Record<string, boolean>).find(
                ([, v]) => v
              );
              if (selected) {
                const name = `grid_${selected[0]}`;
                setActiveRegion(name);
              }
            },
          }}
        />
      </div>

      <div className="mt-3 flex items-center gap-5 border-t border-white/5 pt-3 text-[11px]">
        <div className="flex items-center gap-1.5 text-white/50">
          <span
            className="inline-block h-3 w-5 rounded-sm"
            style={{
              border: `2px dashed ${INFLOW_COLOR}`,
              opacity: 0.85,
            }}
          />
          预计车辆聚集
        </div>
        <div className="flex items-center gap-1.5 text-white/50">
          <span
            className="inline-block h-3 w-5 rounded-sm"
            style={{
              border: `2px dashed ${OUTFLOW_COLOR}`,
              opacity: 0.85,
            }}
          />
          预计车辆消耗
        </div>
        <div className="ml-auto text-white/35">
          点击图例 / 地图散点联动聚焦
        </div>
      </div>
    </div>
  );
}
