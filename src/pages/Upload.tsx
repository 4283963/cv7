import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, Radio } from "lucide-react";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import FileUpload from "@/components/FileUpload";

export default function Upload() {
  const status = useAnalysisStore((s) => s.status);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "success") {
      navigate("/dashboard");
    }
  }, [status, navigate]);

  return (
    <div className="relative min-h-screen px-6 py-12">
      <header className="mx-auto mb-12 flex max-w-3xl flex-col items-center text-center">
        <span className="chip mb-6 animate-fade-up">
          <Radio className="h-3 w-3 animate-pulse-soft text-tide-inflow" />
          实时潮汐分析引擎
        </span>
        <div className="mb-5 flex items-center justify-center animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Bike className="h-7 w-7 text-tide-inflow" />
          </div>
        </div>
        <h1
          className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          城市共享单车流动分析平台
        </h1>
        <p
          className="mt-4 max-w-xl text-base text-white/55 animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          上传租借与还车记录，Pandas 自动完成区域网格化与潮汐聚合，
          ECharts 在地图上以热力图与散点图呈现高频停放区域。
        </p>
      </header>

      <FileUpload />
    </div>
  );
}
