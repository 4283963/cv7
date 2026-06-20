from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

GRID_STEP = 0.005
SCATTER_TOP_N = 60
RANKING_TOP_N = 40


def compute(df: pd.DataFrame, step: float = GRID_STEP, date_str: str | None = None) -> dict[str, Any]:
    df = df.copy()
    for col in ("rent_lng", "rent_lat", "return_lng", "return_lat"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=("rent_lng", "rent_lat", "return_lng", "return_lat"))
    if df.empty:
        raise ValueError("无有效坐标记录可分析")

    df["rent_gx"] = np.floor(df["rent_lng"] / step)
    df["rent_gy"] = np.floor(df["rent_lat"] / step)
    df["return_gx"] = np.floor(df["return_lng"] / step)
    df["return_gy"] = np.floor(df["return_lat"] / step)

    outflow = (
        df.groupby(["rent_gx", "rent_gy"]).size().reset_index(name="outflow")
        .rename(columns={"rent_gx": "gx", "rent_gy": "gy"})
    )
    inflow = (
        df.groupby(["return_gx", "return_gy"]).size().reset_index(name="inflow")
        .rename(columns={"return_gx": "gx", "return_gy": "gy"})
    )

    regions = pd.merge(outflow, inflow, on=["gx", "gy"], how="outer").fillna(0)
    for c in ("inflow", "outflow"):
        regions[c] = regions[c].astype(int)
    regions["net"] = regions["inflow"] - regions["outflow"]
    regions["activity"] = regions["inflow"] + regions["outflow"]
    regions["lng"] = (regions["gx"] + 0.5) * step
    regions["lat"] = (regions["gy"] + 0.5) * step
    regions["gx"] = regions["gx"].astype(int)
    regions["gy"] = regions["gy"].astype(int)
    regions["name"] = regions.apply(lambda r: f"grid_{int(r.gx)}_{int(r.gy)}", axis=1)

    all_lng = pd.concat([df["rent_lng"], df["return_lng"]], ignore_index=True)
    all_lat = pd.concat([df["rent_lat"], df["return_lat"]], ignore_index=True)
    bounds = [
        float(all_lng.min()),
        float(all_lat.min()),
        float(all_lng.max()),
        float(all_lat.max()),
    ]
    center = [(bounds[0] + bounds[2]) / 2.0, (bounds[1] + bounds[3]) / 2.0]

    heatmap = [
        {"coords": [float(r.lng), float(r.lat)], "value": int(r.activity)}
        for r in regions.itertuples(index=False)
    ]

    scatter_df = regions.sort_values("activity", ascending=False).head(SCATTER_TOP_N)
    scatter = [
        {
            "name": str(r.name),
            "coords": [float(r.lng), float(r.lat)],
            "inflow": int(r.inflow),
            "outflow": int(r.outflow),
            "net": int(r.net),
            "activity": int(r.activity),
        }
        for r in scatter_df.itertuples(index=False)
    ]

    ranking_df = regions.sort_values("activity", ascending=False).head(RANKING_TOP_N)
    ranking = [
        {
            "name": str(r.name),
            "net": int(r.net),
            "activity": int(r.activity),
            "inflow": int(r.inflow),
            "outflow": int(r.outflow),
        }
        for r in ranking_df.itertuples(index=False)
    ]

    if not regions.empty:
        top_inflow_row = regions.sort_values("net", ascending=False).iloc[0]
        top_outflow_row = regions.sort_values("net", ascending=True).iloc[0]
        top_inflow_region = str(top_inflow_row["name"])
        top_outflow_region = str(top_outflow_row["name"])
    else:
        top_inflow_region = top_outflow_region = ""

    meta = {
        "recordCount": int(len(df)),
        "regionCount": int(len(regions)),
        "bounds": bounds,
        "center": center,
    }
    if date_str:
        meta["date"] = date_str

    stats = {
        "totalRent": int(regions["outflow"].sum()),
        "totalReturn": int(regions["inflow"].sum()),
        "topInflowRegion": top_inflow_region,
        "topOutflowRegion": top_outflow_region,
    }

    return {
        "meta": meta,
        "heatmap": heatmap,
        "scatter": scatter,
        "ranking": ranking,
        "stats": stats,
    }
