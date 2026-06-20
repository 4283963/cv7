import { useEffect, useState } from "react";
import * as echarts from "echarts";

export interface MapBBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type MapStatus = "loading" | "ready" | "error";

const MAP_URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";

let cached: Promise<MapBBox | null> | null = null;

interface GeoGeometry {
  type?: string;
  coordinates?: unknown;
  geometries?: GeoGeometry[];
}
interface GeoFeature {
  geometry?: GeoGeometry;
}
interface GeoJson {
  features?: GeoFeature[];
}

function computeBBox(geo: GeoJson): MapBBox {
  let minLng = 180,
    minLat = 90,
    maxLng = -180,
    maxLat = -90;

  const walk = (coords: unknown) => {
    if (!Array.isArray(coords)) return;
    if (coords.length > 0 && typeof coords[0] === "number") {
      const lng = coords[0] as number;
      const lat = coords[1] as number;
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
      return;
    }
    for (const c of coords) walk(c);
  };

  for (const f of geo.features ?? []) {
    const geom = f.geometry;
    if (!geom) continue;
    if (geom.type === "GeometryCollection") {
      for (const g of geom.geometries ?? []) {
        if (g?.coordinates) walk(g.coordinates);
      }
    } else if (geom.coordinates) {
      walk(geom.coordinates);
    }
  }
  return { minLng, minLat, maxLng, maxLat };
}

function loadChinaMap(): Promise<MapBBox | null> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const res = await fetch(MAP_URL);
      if (!res.ok) throw new Error("map fetch failed");
      const geoRaw = await res.json();
      const bbox = computeBBox(geoRaw as GeoJson);
      echarts.registerMap("china", geoRaw);
      return bbox;
    } catch {
      cached = null;
      return null;
    }
  })();
  return cached;
}

export function useChinaMap() {
  const [status, setStatus] = useState<MapStatus>("loading");
  const [bbox, setBbox] = useState<MapBBox | null>(null);

  useEffect(() => {
    let mounted = true;
    loadChinaMap().then((b) => {
      if (!mounted) return;
      if (b) {
        setBbox(b);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { status, bbox };
}
