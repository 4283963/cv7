from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

GRID_STEP = 0.005
FORECAST_HOURS = 3
ROLLING_WINDOW = 3
TOP_N_GRIDS = 10


def compute_forecast(df: pd.DataFrame, step: float = GRID_STEP) -> dict[str, Any]:
    if df.empty:
        return {"currentHour": 0, "horizonHours": FORECAST_HOURS, "items": []}

    work = df.copy()
    for col in ("rent_lng", "rent_lat", "return_lng", "return_lat"):
        work[col] = pd.to_numeric(work[col], errors="coerce")
    work = work.dropna(subset=("rent_lng", "rent_lat", "return_lng", "return_lat"))
    if work.empty:
        return {"currentHour": 0, "horizonHours": FORECAST_HOURS, "items": []}

    work["rent_time"] = pd.to_datetime(work["rent_time"], errors="coerce")
    work["return_time"] = pd.to_datetime(work["return_time"], errors="coerce")
    work = work.dropna(subset=("rent_time", "return_time"))
    if work.empty:
        return {"currentHour": 0, "horizonHours": FORECAST_HOURS, "items": []}

    work["rent_gx"] = np.floor(work["rent_lng"] / step).astype(int)
    work["rent_gy"] = np.floor(work["rent_lat"] / step).astype(int)
    work["return_gx"] = np.floor(work["return_lng"] / step).astype(int)
    work["return_gy"] = np.floor(work["return_lat"] / step).astype(int)
    work["rent_date"] = work["rent_time"].dt.date
    work["rent_hour"] = work["rent_time"].dt.hour
    work["return_date"] = work["return_time"].dt.date
    work["return_hour"] = work["return_time"].dt.hour

    outflow = (
        work.groupby(["rent_date", "rent_hour", "rent_gx", "rent_gy"])
        .size()
        .reset_index(name="outflow")
        .rename(
            columns={
                "rent_date": "date",
                "rent_hour": "hour",
                "rent_gx": "gx",
                "rent_gy": "gy",
            }
        )
    )
    inflow = (
        work.groupby(["return_date", "return_hour", "return_gx", "return_gy"])
        .size()
        .reset_index(name="inflow")
        .rename(
            columns={
                "return_date": "date",
                "return_hour": "hour",
                "return_gx": "gx",
                "return_gy": "gy",
            }
        )
    )

    ts = pd.merge(outflow, inflow, on=["date", "hour", "gx", "gy"], how="outer").fillna(0)
    for c in ("inflow", "outflow"):
        ts[c] = ts[c].astype(int)
    ts["net"] = ts["inflow"] - ts["outflow"]

    latest_ts = max(work["rent_time"].max(), work["return_time"].max())
    current_hour = int(latest_ts.hour)

    grid_activity = (
        ts.groupby(["gx", "gy"])[["inflow", "outflow"]]
        .sum()
        .sum(axis=1)
        .reset_index(name="activity")
        .sort_values("activity", ascending=False)
        .head(TOP_N_GRIDS)
    )
    if grid_activity.empty:
        return {"currentHour": current_hour, "horizonHours": FORECAST_HOURS, "items": []}

    gxs = set(grid_activity["gx"].astype(int).tolist())
    gys = set(grid_activity["gy"].astype(int).tolist())
    ts_top = ts[ts["gx"].astype(int).isin(gxs) & ts["gy"].astype(int).isin(gys)]

    items: list[dict[str, Any]] = []
    for (gx, gy), grp in ts_top.groupby(["gx", "gy"]):
        pivot = (
            grp.pivot_table(index="date", columns="hour", values="net", aggfunc="sum")
            .reindex(columns=range(24), fill_value=0)
            .sort_index()
            .fillna(0)
        )
        smoothed = pivot.rolling(window=ROLLING_WINDOW, min_periods=1).mean().iloc[-1]

        forecast_values: list[float] = []
        for i in range(1, FORECAST_HOURS + 1):
            h = (current_hour + i) % 24
            forecast_values.append(round(float(smoothed.get(h, 0.0)), 2))

        history_24: list[float] = [
            round(float(smoothed.get((current_hour + h) % 24, 0.0)), 2)
            for h in range(24)
        ]

        lng = (int(gx) + 0.5) * step
        lat = (int(gy) + 0.5) * step
        items.append(
            {
                "name": f"grid_{int(gx)}_{int(gy)}",
                "coords": [float(lng), float(lat)],
                "history": history_24,
                "forecast": forecast_values,
            }
        )

    items.sort(key=lambda x: -sum(abs(v) for v in x["forecast"]))

    return {
        "currentHour": current_hour,
        "horizonHours": FORECAST_HOURS,
        "items": items,
    }
