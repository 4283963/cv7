from __future__ import annotations

from .data_loader import load_from_bytes
from .grid_tidal import compute
from .sample_data import generate_csv_bytes


def analyze_bytes(raw: bytes) -> dict:
    df, date_str = load_from_bytes(raw)
    if df.empty:
        raise ValueError("未解析到有效记录，请检查 CSV 字段与经纬度数据")
    return compute(df, date_str=date_str)


def analyze_sample() -> dict:
    raw = generate_csv_bytes()
    df, date_str = load_from_bytes(raw)
    return compute(df, date_str=date_str)
