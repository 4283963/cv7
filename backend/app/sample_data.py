from __future__ import annotations

import io
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

# Beijing hotspots with roles to simulate daily tidal flow:
# residential areas tend to be trip origins (net outflow),
# business districts tend to be destinations (net inflow).
HOTSPOTS: list[dict] = [
    {"name": "回龙观", "lng": 116.341, "lat": 40.073, "role": "residential", "weight": 1.4},
    {"name": "天通苑", "lng": 116.416, "lat": 40.066, "role": "residential", "weight": 1.3},
    {"name": "方庄", "lng": 116.428, "lat": 39.866, "role": "residential", "weight": 1.0},
    {"name": "常营", "lng": 116.608, "lat": 39.925, "role": "residential", "weight": 0.9},
    {"name": "中关村", "lng": 116.316, "lat": 39.984, "role": "business", "weight": 1.3},
    {"name": "国贸", "lng": 116.464, "lat": 39.909, "role": "business", "weight": 1.5},
    {"name": "西二旗", "lng": 116.296, "lat": 40.055, "role": "business", "weight": 1.2},
    {"name": "亦庄", "lng": 116.506, "lat": 39.795, "role": "business", "weight": 0.9},
    {"name": "望京", "lng": 116.481, "lat": 40.001, "role": "mixed", "weight": 1.1},
    {"name": "五道口", "lng": 116.337, "lat": 39.992, "role": "mixed", "weight": 1.0},
    {"name": "三里屯", "lng": 116.454, "lat": 39.936, "role": "mixed", "weight": 1.0},
    {"name": "王府井", "lng": 116.410, "lat": 39.915, "role": "mixed", "weight": 0.9},
]

rng = np.random.default_rng(20260620)


def _weighted_pick(pool: list[dict], size: int) -> np.ndarray:
    weights = np.array([p["weight"] for p in pool], dtype=float)
    weights = weights / weights.sum()
    idx = rng.choice(len(pool), size=size, p=weights)
    return idx


def _jitter(center: float, scale: float, size: int) -> np.ndarray:
    return center + rng.normal(0.0, scale, size=size)


def generate_dataframe(n: int = 3200) -> pd.DataFrame:
    residential = [h for h in HOTSPOTS if h["role"] == "residential"]
    business = [h for h in HOTSPOTS if h["role"] == "business"]
    mixed = [h for h in HOTSPOTS if h["role"] == "mixed"]
    origin_pool = residential + mixed
    dest_pool = business + mixed

    rows: list[dict] = []
    base_date = datetime(2026, 6, 20)

    morning = int(n * 0.55)
    evening = n - morning

    for i in range(n):
        is_morning = i < morning
        if is_morning:
            hour = rng.choice([7, 7, 8, 8, 8, 9])
            o_pool, d_pool = origin_pool, dest_pool
        else:
            hour = rng.choice([17, 17, 18, 18, 19, 20])
            o_pool, d_pool = dest_pool, origin_pool

        o_idx = _weighted_pick(o_pool, 1)[0]
        d_idx = _weighted_pick(d_pool, 1)[0]
        # avoid identical loops occasionally
        if o_idx == d_idx and rng.random() < 0.5:
            d_idx = _weighted_pick(d_pool, 1)[0]

        o = o_pool[o_idx]
        d = d_pool[d_idx]
        if o is d:
            d = d_pool[(d_idx + 1) % len(d_pool)]

        rent_lng = _jitter(o["lng"], 0.006, 1)[0]
        rent_lat = _jitter(o["lat"], 0.006, 1)[0]
        return_lng = _jitter(d["lng"], 0.006, 1)[0]
        return_lat = _jitter(d["lat"], 0.006, 1)[0]

        minute = int(rng.integers(0, 60))
        rent_time = base_date.replace(hour=int(hour), minute=minute, second=0)
        duration = int(rng.integers(5, 45))
        return_time = rent_time + timedelta(minutes=duration)

        rows.append(
            {
                "rent_time": rent_time,
                "return_time": return_time,
                "rent_lng": round(float(rent_lng), 6),
                "rent_lat": round(float(rent_lat), 6),
                "return_lng": round(float(return_lng), 6),
                "return_lat": round(float(return_lat), 6),
            }
        )

    return pd.DataFrame(rows)


def generate_csv_bytes() -> bytes:
    df = generate_dataframe()
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")
