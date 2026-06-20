import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";
import type {
  EChartsOption,
  GeoComponentOption,
  SeriesOption,
  VisualMapComponentOption,
  TooltipComponentFormatterCallbackParams,
  ECElementEvent,
} from "echarts";
import { useChinaMap } from "@/hooks/useChinaMap";
import type { MapBBox } from "@/hooks/useChinaMap";
import type { AnalyzeResponse, LayerMode } from "@/types/analysis";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { formatNumber, formatSigned, clamp } from "@/lib/format";
import { MapPin, Loader2, WifiOff } from "lucide-react";

interface MapVisualizerProps {
  data: AnalyzeResponse;
  mode: LayerMode;
}

const INFLOW_COLOR = "#2DD4BF";
const OUTFLOW_COLOR = "#F59E0B";

interface ScatterDatum {
  name?: string;
  inflow?: number;
  outflow?: number;
  net?: number;
  activity?: number;
}

function buildOption(
  data: AnalyzeResponse,
  mode: LayerMode,
  activeRegion: string | null,
  bbox: MapBBox | null,
): EChartsOption {
  const heatmap = data.heatmap;
  const scatter = data.scatter;
  const maxActivity = Math.max(1, ...scatter.map((s) => s.activity));
  const minActivity = Math.min(0, ...scatter.map((s) => s.activity));
  const span = maxActivity - minActivity || 1;

  const pointColor = (net: number) => (net >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR);
  const pointSize = (activity: number) =>
    8 + 34 * ((activity - minActivity) / span);

  const [cLng, cLat] = data.meta.center;

  const tooltipFormatter = (params: TooltipComponentFormatterCallbackParams) => {
    const p = Array.isArray(params) ? params[0] : params;
    const d = p?.data as ScatterDatum | undefined;
    if (!d) return "";
    const name = d.name ?? "区域";
    const inflow = d.inflow ?? 0;
    const outflow = d.outflow ?? 0;
    const net = d.net ?? 0;
    return `
      <div style="font-weight:600;margin-bottom:4px">${name}</div>
      <div style="display:flex;justify-content:space-between;gap:14px;font-size:12px">
        <span style="color:${INFLOW_COLOR}">流入</span><span style="color:#fff">${formatNumber(inflow)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:14px;font-size:12px">
        <span style="color:${OUTFLOW_COLOR}">流出</span><span style="color:#fff">${formatNumber(outflow)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:14px;font-size:12px;margin-top:4px;border-top:1px solid rgba(255,255,255,.15);padding-top:4px">
        <span style="color:#9aa6b8">净流量</span><span style="color:${net >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR};font-weight:600">${formatSigned(net)}</span>
      </div>`;
  };

  const baseGeo: GeoComponentOption = {
    map: "china",
    roam: true,
    center: [cLng, cLat],
    zoom: 4,
    scaleLimit: { min: 1, max: 1200 },
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    silent: false,
    itemStyle: {
      areaColor: "#0E1424",
      borderColor: "rgba(45,212,191,0.28)",
      borderWidth: 0.6,
    },
    emphasis: {
      disabled: true,
    },
    select: { disabled: true },
  };

  if (bbox && data.meta.bounds) {
    const [minLng, minLat, maxLng, maxLat] = data.meta.bounds;
    const mapLngSpan = Math.max(bbox.maxLng - bbox.minLng, 0.0001);
    const mapLatSpan = Math.max(bbox.maxLat - bbox.minLat, 0.0001);
    const dataLngSpan = Math.max(maxLng - minLng, 0.01);
    const dataLatSpan = Math.max(maxLat - minLat, 0.01);
    const FIT = 0.62;
    baseGeo.zoom = clamp(
      FIT * Math.min(mapLngSpan / dataLngSpan, mapLatSpan / dataLatSpan),
      1,
      2000,
    );
  }

  const series: SeriesOption[] = [];

  if (mode === "heatmap" || mode === "combined") {
    series.push({
      name: "活跃度热力",
      type: "heatmap",
      coordinateSystem: "geo",
      data: heatmap.map((p) => [p.coords[0], p.coords[1], p.value]),
      pointSize: 10,
      blurSize: 22,
      progressive: 2000,
      animation: true,
    });
  }

  if (mode === "scatter" || mode === "combined") {
    series.push({
      name: "高频区域",
      type: "scatter",
      coordinateSystem: "geo",
      data: scatter.map((s) => ({
        name: s.name,
        value: [s.coords[0], s.coords[1], s.activity],
        inflow: s.inflow,
        outflow: s.outflow,
        net: s.net,
        activity: s.activity,
        symbolSize: pointSize(s.activity),
        itemStyle: {
          color: pointColor(s.net),
          opacity: 0.85,
          borderColor: "rgba(255,255,255,0.4)",
          borderWidth: 1,
          shadowBlur: 12,
          shadowColor: pointColor(s.net),
        },
      })),
      zlevel: 2,
      emphasis: {
        scale: 1.25,
        label: {
          show: true,
          position: "top",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          formatter: "{b}",
        },
      },
    });

    if (activeRegion) {
      const active = scatter.find((s) => s.name === activeRegion);
      if (active) {
        const focusPoint = {
          name: active.name,
          value: [active.coords[0], active.coords[1], active.activity],
          inflow: active.inflow,
          outflow: active.outflow,
          net: active.net,
          activity: active.activity,
        };
        series.push({
          name: "聚焦区域",
          type: "effectScatter",
          coordinateSystem: "geo",
          data: [focusPoint],
          symbolSize: pointSize(active.activity) + 6,
          rippleEffect: { brushType: "stroke", scale: 4 },
          showEffectOn: "render",
          itemStyle: {
            color: pointColor(active.net),
            shadowBlur: 20,
            shadowColor: pointColor(active.net),
          },
          label: {
            show: true,
            position: "right",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            formatter: active.name,
            textBorderColor: "#070A14",
            textBorderWidth: 3,
          },
          zlevel: 3,
        });
      }
    }
  }

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(7,10,20,0.92)",
      borderColor: "rgba(45,212,191,0.3)",
      borderWidth: 1,
      textStyle: { color: "#e6edf6", fontSize: 13 },
      padding: 10,
      formatter: tooltipFormatter,
    },
    geo: baseGeo,
    series,
  };

  if (mode === "heatmap" || mode === "combined") {
    option.visualMap = {
      show: mode === "heatmap",
      min: 0,
      max: maxActivity,
      left: 16,
      bottom: 16,
      text: ["高", "低"],
      textStyle: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
      calculable: true,
      itemWidth: 12,
      itemHeight: 120,
      orient: "vertical",
      inRange: {
        color: [
          "rgba(14,20,36,0)",
          "rgba(27,39,64,0.5)",
          "#1B2740",
          "#2DD4BF",
          "#F59E0B",
        ],
      },
    } as VisualMapComponentOption;
  }

  return option;
}

export default function MapVisualizer({ data, mode }: MapVisualizerProps) {
  const { status, bbox } = useChinaMap();
  const activeRegion = useAnalysisStore((s) => s.activeRegion);
  const setActiveRegion = useAnalysisStore((s) => s.setActiveRegion);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReactECharts>(null);

  const option = useMemo(() => {
    if (status !== "ready") return null;
    return buildOption(data, mode, activeRegion, bbox);
  }, [data, mode, activeRegion, status, bbox]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      chartRef.current?.getEchartsInstance().resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onChartClick = (params: ECElementEvent) => {
    if (params.componentType === "series") {
      const d = params.data as ScatterDatum | undefined;
      if (d?.name) setActiveRegion(d.name);
    }
  };

  return (
    <div ref={wrapRef} className="relative h-[540px] w-full">
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/60">
          <Loader2 className="h-6 w-6 animate-spin text-tide-inflow" />
          <span className="text-sm">正在加载地图底图…</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/60">
          <WifiOff className="h-6 w-6 text-tide-outflow" />
          <span className="text-sm">地图底图加载失败，请检查网络后刷新</span>
        </div>
      )}
      {status === "ready" && option && (
        <ReactECharts
          ref={chartRef}
          echarts={echarts}
          option={option}
          notMerge
          lazyUpdate
          style={{ height: "100%", width: "100%" }}
          onEvents={{ click: onChartClick }}
        />
      )}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/70 px-3 py-1.5 text-xs text-white/60 backdrop-blur">
        <MapPin className="h-3.5 w-3.5 text-tide-inflow" />
        中心 {data.meta.center[0].toFixed(3)}, {data.meta.center[1].toFixed(3)}
        {bbox && (
          <span className="ml-1 text-white/30">
            · 底图 {(bbox.maxLng - bbox.minLng).toFixed(0)}°×{(bbox.maxLat - bbox.minLat).toFixed(0)}°
          </span>
        )}
      </div>
    </div>
  );
}
