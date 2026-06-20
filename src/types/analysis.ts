export type Coord = [number, number];

export interface HeatmapPoint {
  coords: Coord;
  value: number;
}

export interface ScatterPoint {
  name: string;
  coords: Coord;
  inflow: number;
  outflow: number;
  net: number;
  activity: number;
}

export interface RankingItem {
  name: string;
  net: number;
  activity: number;
  inflow: number;
  outflow: number;
}

export interface AnalyzeMeta {
  recordCount: number;
  regionCount: number;
  bounds: [number, number, number, number];
  center: Coord;
  date?: string;
}

export interface AnalyzeStats {
  totalRent: number;
  totalReturn: number;
  topInflowRegion: string;
  topOutflowRegion: string;
}

export interface ForecastItem {
  name: string;
  coords: Coord;
  history: number[];
  forecast: number[];
}

export interface Forecast {
  currentHour: number;
  horizonHours: number;
  items: ForecastItem[];
}

export interface AnalyzeResponse {
  meta: AnalyzeMeta;
  heatmap: HeatmapPoint[];
  scatter: ScatterPoint[];
  ranking: RankingItem[];
  stats: AnalyzeStats;
  forecast: Forecast;
}

export type LayerMode = "heatmap" | "scatter" | "combined";
