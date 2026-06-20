from __future__ import annotations

from typing import Optional

import pandas as pd

from .data_loader import REQUIRED_FIELDS, _map_columns, _read_csv_bytes
from .forecast import compute_forecast
from .grid_tidal import compute
from .sample_data import generate_csv_bytes


def _load_all(raw: bytes) -> tuple[pd.DataFrame, Optional[str]]:
    df = _read_csv_bytes(raw)
    if df is None or df.empty:
        raise ValueError("CSV 文件为空或无数据")
    mapping = _map_columns(df.columns)
    missing = [f for f in REQUIRED_FIELDS if f not in mapping]
    if missing:
        hint = "、".join(sorted({c for c in df.columns})[:8])
        raise ValueError(
            f"缺少必要字段：{missing}。请确认 CSV 含租借/还车经纬度。检测到的列：{hint}"
        )
    df = df.rename(columns={orig: std for std, orig in mapping.items()})
    for col in REQUIRED_FIELDS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=REQUIRED_FIELDS).copy()
    if df.empty:
        raise ValueError("经纬度字段无法解析为数字，请检查数据格式")
    df = df[
        (df["rent_lng"].between(-180, 180))
        & (df["rent_lat"].between(-90, 90))
        & (df["return_lng"].between(-180, 180))
        & (df["return_lat"].between(-90, 90))
    ].copy()
    date_str: Optional[str] = None
    for tc in ("rent_time", "return_time"):
        if tc in df.columns:
            df[tc] = pd.to_datetime(df[tc], errors="coerce")
    if "rent_time" in df.columns:
        valid = df["rent_time"].dropna()
        if not valid.empty:
            date_str = str(valid.dt.date.mode().iloc[0])
    return df, date_str


def _filter_main_day(df: pd.DataFrame) -> pd.DataFrame:
    if "rent_time" not in df.columns:
        return df.copy()
    valid = df["rent_time"].dropna()
    if valid.empty:
        return df.copy()
    dates = valid.dt.date
    if dates.nunique() <= 1:
        return df.copy()
    latest_date = dates.max()
    main_df = df[df["rent_time"].dt.date == latest_date].copy()
    if main_df.empty:
        top_date = dates.mode().iloc[0]
        main_df = df[df["rent_time"].dt.date == top_date].copy()
    return main_df


def analyze_bytes(raw: bytes) -> dict:
    full_df, _ = _load_all(raw)
    if full_df.empty:
        raise ValueError("未解析到有效记录，请检查 CSV 字段与经纬度数据")
    main_df = _filter_main_day(full_df)
    if main_df.empty:
        main_df = full_df
    date_str = None
    if "rent_time" in main_df.columns and not main_df["rent_time"].dropna().empty:
        date_str = str(main_df["rent_time"].dropna().dt.date.mode().iloc[0])
    result = compute(main_df, date_str=date_str)
    result["forecast"] = compute_forecast(full_df)
    return result


def analyze_sample() -> dict:
    raw = generate_csv_bytes()
    full_df, _ = _load_all(raw)
    main_df = _filter_main_day(full_df)
    if main_df.empty:
        main_df = full_df
    date_str = None
    if "rent_time" in main_df.columns and not main_df["rent_time"].dropna().empty:
        date_str = str(main_df["rent_time"].dropna().dt.date.mode().iloc[0])
    result = compute(main_df, date_str=date_str)
    result["forecast"] = compute_forecast(full_df)
    return result
