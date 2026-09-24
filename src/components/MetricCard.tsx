import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status?: "healthy" | "warning" | "danger" | "neutral";
  subtext?: string;
  delta?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  status = "neutral",
  subtext,
  delta,
}: MetricCardProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "healthy":
        return {
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/5",
          text: "text-emerald-400",
          iconBg: "bg-emerald-500/10",
          glow: "group-hover:border-emerald-500/50",
        };
      case "warning":
        return {
          border: "border-amber-500/30",
          bg: "bg-amber-500/5",
          text: "text-amber-400",
          iconBg: "bg-amber-500/10",
          glow: "group-hover:border-amber-500/50",
        };
      case "danger":
        return {
          border: "border-rose-500/40",
          bg: "bg-rose-500/10",
          text: "text-rose-400 animate-pulse",
          iconBg: "bg-rose-500/20",
          glow: "group-hover:border-rose-500/70",
        };
      default:
        return {
          border: "border-slate-800",
          bg: "bg-slate-900/60",
          text: "text-cyan-400",
          iconBg: "bg-cyan-500/10",
          glow: "group-hover:border-slate-700",
        };
    }
  };

  const currentStyles = getStatusStyles();

  return (
    <div
      className={`group relative p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${currentStyles.border} ${currentStyles.bg} ${currentStyles.glow}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <div className={`p-2 rounded-lg ${currentStyles.iconBg}`}>
          <Icon className={`w-4 h-4 ${currentStyles.text}`} />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-black tracking-tight ${currentStyles.text}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
      </div>

      {(subtext || delta) && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>{subtext}</span>
          {delta && (
            <span
              className={`font-semibold ${
                delta.startsWith("-") ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
