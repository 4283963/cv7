import { Flame, MapPin, Layers } from "lucide-react";
import type { LayerMode } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface LayerToggleProps {
  mode: LayerMode;
  onChange: (mode: LayerMode) => void;
}

const ITEMS: { key: LayerMode; label: string; icon: typeof Flame }[] = [
  { key: "heatmap", label: "热力图", icon: Flame },
  { key: "scatter", label: "散点图", icon: MapPin },
  { key: "combined", label: "合并视图", icon: Layers },
];

export default function LayerToggle({ mode, onChange }: LayerToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/70 p-1 backdrop-blur">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = mode === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              active
                ? "bg-tide-inflow text-ink-950 shadow-glow"
                : "text-white/55 hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
