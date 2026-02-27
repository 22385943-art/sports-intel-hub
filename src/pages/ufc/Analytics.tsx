import { useState, useMemo } from "react";
import { ufcService } from "@/services/sportServiceFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsSelector, type ChartType } from "@/components/shared/AnalyticsSelector";
import type { MetricCategory } from "@/data/metrics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line } from "recharts";

const CHART_COLORS = ["hsl(var(--chart-teal))", "hsl(var(--chart-blue))", "hsl(var(--chart-gold))", "hsl(var(--chart-negative))"];

export default function UFCAnalytics() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["damageEfficiency", "fightControl", "dominanceScore"]);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | "all">("all");

  const data = useMemo(() => ufcService.getAllPlayers().map(f => {
    const adv = ufcService.computeAdvanced(f);
    return { name: f.name.split(" ").pop()!, ...adv };
  }), []);

  const renderChart = () => {
    if (chartType === "radar") {
      const radarData = selectedMetrics.map(m => {
        const entry: Record<string, any> = { metric: m };
        data.forEach(d => { entry[d.name] = (d as any)[m] || 0; });
        return entry;
      });
      return (
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <PolarRadiusAxis tick={false} axisLine={false} />
          {data.slice(0, 4).map((d, i) => (
            <Radar key={d.name} name={d.name} dataKey={d.name} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.1} />
          ))}
          <Legend />
        </RadarChart>
      );
    }
    if (chartType === "line") {
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
          <Legend />
          {selectedMetrics.map((m, i) => (
            <Line key={m} type="monotone" dataKey={m} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      );
    }
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        <Legend />
        {selectedMetrics.map((m, i) => (
          <Bar key={m} dataKey={m} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Advanced UFC metrics and analysis</p>
      </div>
      <AnalyticsSelector
        sport="ufc"
        selectedMetrics={selectedMetrics}
        onMetricsChange={setSelectedMetrics}
        chartType={chartType}
        onChartTypeChange={setChartType}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Metric Visualization</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
