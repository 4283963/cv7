import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "inflow" | "outflow" | "neutral";
  delay?: number;
}

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  delay = 0,
}: StatCardProps) {
  const toneColor =
    tone === "inflow"
      ? "text-tide-inflow"
      : tone === "outflow"
        ? "text-tide-outflow"
        : "text-tide-glow";

  return (
    <div
      className="panel relative overflow-hidden p-5 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-30",
          tone === "inflow"
            ? "bg-tide-inflow"
            : tone === "outflow"
              ? "bg-tide-outflow"
              : "bg-tide-glow",
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-white/45">
            {label}
          </p>
          <p className="stat-num mt-2 text-3xl text-white">{value}</p>
          {sub && <p className="mt-1 truncate text-xs text-white/45">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Icon className={cn("h-5 w-5", toneColor)} />
        </div>
      </div>
    </div>
  );
}
