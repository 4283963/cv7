from __future__ import annotations

import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.analysis_service import analyze_sample, analyze_bytes

logger = logging.getLogger("bike_tidal")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="共享单车潮汐分析 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)) -> JSONResponse:
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="请上传 .csv 格式的文件")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="文件为空")

    try:
        result = analyze_bytes(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("分析失败")
        raise HTTPException(status_code=500, detail=f"分析失败：{e}")

    return JSONResponse(content=result)


@app.post("/api/sample")
def sample() -> JSONResponse:
    try:
        result = analyze_sample()
    except Exception as e:
        logger.exception("示例数据生成失败")
        raise HTTPException(status_code=500, detail=f"示例数据生成失败：{e}")
    return JSONResponse(content=result)
