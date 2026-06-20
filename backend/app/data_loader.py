from __future__ import annotations

import io
from typing import Optional

import pandas as pd

FIELD_ALIASES: dict[str, list[str]] = {
    "rent_time": [
        "renttime", "starttime", "rent_time", "start_time", "rent_at",
        "借车时间", "租借时间", "起始时间", "开始时间", "骑行开始时间", "租出时间",
    ],
    "return_time": [
        "returntime", "endtime", "return_time", "end_time", "return_at",
        "还车时间", "结束时间", "骑行结束时间", "归还时间", "还车时间",
    ],
    "rent_lng": [
        "rentlng", "startlng", "rent_lng", "start_lng", "rent_longitude",
        "start_longitude", "借车经度", "租借经度", "起点经度", "起始经度", "租出经度",
    ],
    "rent_lat": [
        "rentlat", "startlat", "rent_lat", "start_lat", "rent_latitude",
        "start_latitude", "借车纬度", "租借纬度", "起点纬度", "起始纬度", "租出纬度",
    ],
    "return_lng": [
        "returnlng", "endlng", "return_lng", "end_lng", "return_longitude",
        "end_longitude", "还车经度", "终点经度", "归还经度", "归还点经度",
    ],
    "return_lat": [
        "returnlat", "endlat", "return_lat", "end_lat", "return_latitude",
        "end_latitude", "还车纬度", "终点纬度", "归还纬度", "归还点纬度",
    ],
}

REQUIRED_FIELDS = ["rent_lng", "rent_lat", "return_lng", "return_lat"]


def _normalize(name: str) -> str:
    return (
        str(name)
        .strip()
        .lower()
        .replace(" ", "")
        .replace("_", "")
        .replace("-", "")
        .replace(".", "")
    )


def _build_alias_index() -> dict[str, str]:
    index: dict[str, str] = {}
    for std, aliases in FIELD_ALIASES.items():
        for a in aliases:
            index[_normalize(a)] = std
    return index


_ALIAS_INDEX = _build_alias_index()


def _map_columns(columns) -> dict[str, str]:
    mapping: dict[str, str] = {}
    normalized_to_orig = {_normalize(c): c for c in columns}
    for norm, orig in normalized_to_orig.items():
        std = _ALIAS_INDEX.get(norm)
        if std and std not in mapping:
            mapping[std] = orig
    return mapping


def _read_csv_bytes(raw: bytes) -> pd.DataFrame:
    last_err: Exception | None = None
    for encoding in ("utf-8-sig", "utf-8", "gbk", "gb18030", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(raw), encoding=encoding)
        except UnicodeDecodeError as e:
            last_err = e
            continue
        except Exception as e:
            last_err = e
            continue
    raise ValueError(f"无法解析 CSV 文件：{last_err}")


def load_from_bytes(raw: bytes) -> tuple[pd.DataFrame, Optional[str]]:
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

    before = len(df)
    df = df.dropna(subset=REQUIRED_FIELDS).copy()
    if df.empty:
        raise ValueError("经纬度字段无法解析为数字，请检查数据格式")

    df = df[
        (df["rent_lng"].between(-180, 180))
        & (df["rent_lat"].between(-90, 90))
        & (df["return_lng"].between(-180, 180))
        & (df["return_lat"].between(-90, 90))
    ].copy()
    if df.empty:
        raise ValueError("经纬度超出有效范围，请检查数据")

    date_str: Optional[str] = None
    if "rent_time" in df.columns:
        df["rent_time"] = pd.to_datetime(df["rent_time"], errors="coerce")
        valid = df["rent_time"].dropna()
        if not valid.empty:
            dates = valid.dt.date
            if dates.nunique() > 1:
                top_date = dates.mode().iloc[0]
                df = df[df["rent_time"].dt.date == top_date].copy()
            date_str = str(dates.mode().iloc[0])
    if "return_time" in df.columns:
        df["return_time"] = pd.to_datetime(df["return_time"], errors="coerce")

    return df, date_str
