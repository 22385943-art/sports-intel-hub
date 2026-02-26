import { cn } from "@/lib/utils";

interface PercentileBarProps {
  value: number;
  max: number;
  label: string;
  displayValue: string | number;
  colorClass?: string;
}

export function PercentileBar({ value, max, label, displayValue, colorClass }: PercentileBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const tier = pct >= 90 ? "Elite" : pct >= 75 ? "Great" : pct >= 50 ? "Good" : pct >= 25 ? "Average" : "Below Avg";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/70">{tier}</span>
          <span className="font-mono font-semibold">{displayValue}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass || "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
