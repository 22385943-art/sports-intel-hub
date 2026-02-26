import { useState, useMemo } from "react";
import { NBA_PLAYERS, computeAllAdvanced } from "@/data/nba/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line } from "recharts";
import { Link } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { AnalyticsSelector, type ChartType } from "@/components/shared/AnalyticsSelector";
import type { MetricCategory } from "@/data/metrics";
import { MetricTooltip } from "@/components/shared/MetricTooltip";

const CHART_COLORS = ["hsl(var(--chart-teal))", "hsl(var(--chart-blue))", "hsl(var(--chart-gold))", "hsl(var(--chart-negative))"];

export default function NBAAnalytics() {
  const { sport } = useSport();
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["gir", "uap", "ddi"]);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | "all">("all");

  const metricsData = useMemo(() => NBA_PLAYERS.map(p => ({
    ...p,
    adv: computeAllAdvanced(p),
    name_short: p.name.split(" ").pop()!,
  })).sort((a, b) => b.adv.gir - a.adv.gir), []);

  // Map metric keys to player data values
  const chartData = useMemo(() => metricsData.map(p => ({
    name: p.name_short,
    gir: p.adv.gir,
    pva: p.adv.pva,
    ddi: p.adv.ddi,
    cps: p.adv.cps,
    eoe: p.adv.eoe,
    sqi: p.adv.sqi,
    lsr: p.adv.lsr,
    uap: p.adv.uap,
    // Extended metrics (synthetic)
    onCourtImpact: Math.round((p.adv.gir * 0.8 + p.adv.uap * 0.2) * 10) / 10,
    offBallGravity: Math.round((p.stats.threePct * 0.6 + p.stats.ppg * 0.2) * 10) / 10,
    shotCreation: Math.round((p.adv.sqi * 0.5 + p.adv.pva * 0.5) * 10) / 10,
    rimProtection: Math.round((p.stats.bpg * 8 + p.adv.ddi * 0.3) * 10) / 10,
    transitionValue: Math.round((p.stats.ppg * 0.15 + p.stats.apg * 0.3 + p.stats.spg * 2) * 10) / 10,
  })), [metricsData]);

  const renderChart = () => {
    if (selectedMetrics.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Select metrics above to visualize
        </div>
      );
    }

    if (chartType === "radar") {
      const radarData = selectedMetrics.map(m => {
        const entry: Record<string, any> = { metric: m.toUpperCase() };
        chartData.slice(0, 5).forEach(d => { entry[d.name] = (d as any)[m] || 0; });
        return entry;
      });
      return (
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <PolarRadiusAxis tick={false} axisLine={false} />
          {chartData.slice(0, 5).map((d, i) => (
            <Radar key={d.name} name={d.name} dataKey={d.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.1} />
          ))}
          <Legend />
        </RadarChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart data={chartData}>
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
      <BarChart data={chartData}>
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
        <p className="text-muted-foreground text-sm mt-1">Advanced metrics and performance analysis</p>
      </div>

      <AnalyticsSelector
        sport="nba"
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

      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Full Metrics Table</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="gir">GIR</MetricTooltip>
                </TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="pva">PVA</MetricTooltip>
                </TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="ddi">DDI</MetricTooltip>
                </TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="cps">CPS</MetricTooltip>
                </TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="eoe">EOE</MetricTooltip>
                </TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="sqi">SQI</MetricTooltip>
                </TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="lsr">LSR</MetricTooltip>
                </TableHead>
                <TableHead>
                  <MetricTooltip sport="nba" metricKey="uap">UAP</MetricTooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricsData.map((p, i) => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <Link to={`/${sport}/players/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.teamName}</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">{p.adv.gir}</TableCell>
                  <TableCell className="font-mono">{p.adv.pva}</TableCell>
                  <TableCell className="font-mono">{p.adv.ddi}</TableCell>
                  <TableCell className="font-mono">{p.adv.cps}</TableCell>
                  <TableCell className="font-mono">{p.adv.eoe}</TableCell>
                  <TableCell className="font-mono">{p.adv.sqi}</TableCell>
                  <TableCell className="font-mono">{p.adv.lsr}</TableCell>
                  <TableCell className="font-mono">{p.adv.uap}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
