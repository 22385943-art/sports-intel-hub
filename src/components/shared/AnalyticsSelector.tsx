import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { METRIC_CATEGORIES, getMetricsForSport, getMetricsByCategory, type MetricCategory, type MetricDefinition } from "@/data/metrics";
import { BarChart2, Radar, TrendingUp } from "lucide-react";

export type ChartType = "bar" | "radar" | "line";

interface AnalyticsSelectorProps {
  sport: string;
  selectedMetrics: string[];
  onMetricsChange: (metrics: string[]) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  selectedCategory: MetricCategory | "all";
  onCategoryChange: (cat: MetricCategory | "all") => void;
}

export function AnalyticsSelector({
  sport,
  selectedMetrics,
  onMetricsChange,
  chartType,
  onChartTypeChange,
  selectedCategory,
  onCategoryChange,
}: AnalyticsSelectorProps) {
  const allMetrics = useMemo(() => getMetricsForSport(sport), [sport]);
  const filteredMetrics = useMemo(() => {
    if (selectedCategory === "all") return allMetrics;
    return getMetricsByCategory(sport, selectedCategory);
  }, [sport, selectedCategory, allMetrics]);

  const toggleMetric = (key: string) => {
    if (selectedMetrics.includes(key)) {
      onMetricsChange(selectedMetrics.filter(m => m !== key));
    } else {
      onMetricsChange([...selectedMetrics, key]);
    }
  };

  const chartTypes: { type: ChartType; icon: typeof BarChart2; label: string }[] = [
    { type: "bar", icon: BarChart2, label: "Bar" },
    { type: "radar", icon: Radar, label: "Radar" },
    { type: "line", icon: TrendingUp, label: "Line" },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Choose Metrics to Compare</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category selector */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === "all" ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => onCategoryChange("all")}
          >
            All
          </Badge>
          {METRIC_CATEGORIES.map(cat => (
            <Badge
              key={cat.key}
              variant={selectedCategory === cat.key ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              onClick={() => onCategoryChange(cat.key)}
            >
              {cat.icon} {cat.label}
            </Badge>
          ))}
        </div>

        {/* Metric chips */}
        <div className="flex flex-wrap gap-1.5">
          {filteredMetrics.map(m => (
            <Badge
              key={m.key}
              variant={selectedMetrics.includes(m.key) ? "default" : "secondary"}
              className="cursor-pointer text-xs transition-all hover:scale-105"
              onClick={() => toggleMetric(m.key)}
            >
              {m.shortLabel}
            </Badge>
          ))}
        </div>

        {/* Chart type */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Chart:</span>
          {chartTypes.map(ct => (
            <Button
              key={ct.type}
              variant={chartType === ct.type ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => onChartTypeChange(ct.type)}
            >
              <ct.icon className="h-3 w-3" />
              {ct.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
