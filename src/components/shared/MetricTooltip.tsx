import { getMetricDefinition } from "@/data/metrics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface MetricTooltipProps {
  sport: string;
  metricKey: string;
  children: React.ReactNode;
  showIcon?: boolean;
}

export function MetricTooltip({ sport, metricKey, children, showIcon = true }: MetricTooltipProps) {
  const def = getMetricDefinition(sport, metricKey);
  if (!def) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          {showIcon && <Info className="h-3 w-3 text-muted-foreground/60" />}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1.5 p-3">
        <p className="font-semibold text-sm">{def.label}</p>
        <p className="text-xs text-muted-foreground">{def.tooltip}</p>
        <p className="text-[10px] text-muted-foreground/80 italic">💡 {def.whyItMatters}</p>
      </TooltipContent>
    </Tooltip>
  );
}
