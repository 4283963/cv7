## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端 (React + Vite)"
        "A[上传/示例数据交互]" --> "B[ECharts 地图可视化]"
        "B" --> "C[指标卡与区域排行]"
    end
    subgraph "后端 (Python FastAPI)"
        "D[/api/analyze 接收 CSV/]" --> "E[Pandas 读取与清洗]"
        "E" --> "F[网格区域划分]"
        "F" --> "G[潮汐聚合计算]"
        "G" --> "H[JSON 返回]"
    end
    "A" -- "POST multipart/form-data" --> "D"
    "H" -- "JSON 聚合结果" --> "B"
```

## 2. 技术说明

- 前端：React@18 + Vite + TypeScript + TailwindCSS@3 + ECharts（echarts + echarts-for-react）
- 初始化工具：vite-init（react-ts 模板）
- 后端：Python FastAPI + Pandas（独立 Python 服务，非 Node）
- 数据库：无（无状态文件处理，CSV 即时分析，不持久化）
- 包管理：前端使用 npm；后端使用 pip + requirements.txt

> 说明：用户明确指定后端为 Python FastAPI + Pandas，因此后端独立于 Vite 前端项目，部署在 `backend/` 目录，通过 CORS 与 Vite 代理对接。

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 数据上传页（首页） |
| `/dashboard` | 潮汐分析仪表盘（地图可视化） |

## 4. API 定义

### 4.1 POST /api/analyze

上传 CSV 文件，返回区域潮汐聚合结果。

请求：`multipart/form-data`
- `file`: CSV 文件（含租借/还车时间与经纬度字段）

响应：`application/json`

```typescript
interface AnalyzeResponse {
  meta: {
    recordCount: number;        // 总记录数
    regionCount: number;        // 区域数
    bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    center: [number, number];    // [lng, lat]
  };
  heatmap: {
    coords: [number, number];   // [lng, lat]
    value: number;               // 活跃度（流入+流出）
  }[];
  scatter: {
    name: string;                // 区域名
    coords: [number, number];    // [lng, lat]
    inflow: number;              // 流入量
    outflow: number;             // 流出量
    net: number;                 // 净流量 = 流入 - 流出
    activity: number;            // 活跃度 = 流入 + 流出
  }[];
  ranking: {
    name: string;
    net: number;
    activity: number;
    inflow: number;
    outflow: number;
  }[];
  stats: {
    totalRent: number;
    totalReturn: number;
    topInflowRegion: string;
    topOutflowRegion: string;
  };
}
```

### 4.2 CSV 字段约定

支持灵活匹配字段名（中英文别名），核心字段：
- 租借时间：`rent_time` / `start_time` / `租借时间`
- 还车时间：`return_time` / `end_time` / `还车时间`
- 租借经度：`rent_lng` / `start_lng` / `租借经度`
- 租借纬度：`rent_lat` / `start_lat` / `租借纬度`
- 还车经度：`return_lng` / `end_lng` / `还车经度`
- 还车纬度：`return_lat` / `end_lat` / `还车纬度`

## 5. 服务架构图

```mermaid
flowchart LR
    "Controller[/api/analyze]" --> "Service[analysis_service.py]"
    "Service" --> "Loader[data_loader.py 读取/清洗]"
    "Loader" --> "Tidal[grid_tidal.py 网格+潮汐计算]"
    "Tidal" --> "Builder[response_builder.py 组装JSON]"
```

## 6. 数据模型

### 6.1 数据模型定义

本项目为无状态分析工具，CSV 即时处理，无持久化数据库。核心为运行时 Pandas DataFrame 与聚合结果对象（见 4.1）。

### 6.2 区域划分策略

- 经纬度网格化：按固定步长（默认 0.005°≈500m）将坐标量化为网格
- 区域命名：`grid_{lngIdx}_{latIdx}`，并取网格中心点为坐标
- 流入量：该网格作为还车点的记录数
- 流出量：该网格作为租借点的记录数
- 净流量 = 流入 - 流出（>0 为净流入聚集，<0 为净流出消耗）
