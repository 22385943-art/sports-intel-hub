import { useState, useMemo } from "react";
import { nbaService } from "@/services/sportServiceFactory";
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

  const metricsData = useMemo(() => nbaService.getAllPlayers().map(p => ({
    ...p,
    adv: nbaService.computeAllAdvanced(p),
    name_short: p.name.split(" ").pop()!,
  })).sort((a, b) => b.adv.gir - a.adv.gir), []);

  const chartData = useMemo(() => metricsData.map(p => ({
    name: p.name_short,
    gir: p.adv.gir, pva: p.adv.pva, ddi: p.adv.ddi, cps: p.adv.cps,
    eoe: p.adv.eoe, sqi: p.adv.sqi, lsr: p.adv.lsr, uap: p.adv.uap,
    onCourtImpact: Math.round((p.adv.gir * 0.8 + p.adv.uap * 0.2) * 10) / 10,
    offBallGravity: Math.round((p.stats.threePct * 0.6 + p.stats.ppg * 0.2) * 10) / 10,
    shotCreation: Math.round((p.adv.sqi * 0.5 + p.adv.pva * 0.5) * 10) / 10,
    rimProtection: Math.round((p.stats.bpg * 8 + p.adv.ddi * 0.3) * 10) / 10,
    transitionValue: Math.round((p.stats.ppg * 0.15 + p.stats.apg * 0.3 + p.stats.spg * 2) * 10) / 10,
  })), [metricsData]);

  const renderChart = () => {
    if (selectedMetrics.length === 0) {
      return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Select metrics above to visualize</div>;
    }
    if (chartType === "radar") {
      const radarData = selectedMetrics.map(m => {
        const entry: Record<string, any> = { metric: m.toUpperCase() };
        chartData.slice(0, 5).forEach(d => { entry[d.name] = (d as any)[m] || 0; });
        return entry;
      });
      return (
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} />
          <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: 'hsl(215 20% 55%)' }} />
          <Tooltip contentStyle={{ background: "hsl(229 84% 4%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
          <Legend />
          {selectedMetrics.map((m, i) => (
            <Line key={m} type="monotone" dataKey={m} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      );
    }
    return (
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} />
        <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: 'hsl(215 20% 55%)' }} />
        <Tooltip contentStyle={{ background: "hsl(229 84% 4%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
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
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Advanced metrics and performance analysis</p>
      </div>
      <AnalyticsSelector sport="nba" selectedMetrics={selectedMetrics} onMetricsChange={setSelectedMetrics} chartType={chartType} onChartTypeChange={setChartType} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
        <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Metric Visualization</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
        <CardHeader className="pb-2 border-b border-white/5"><CardTitle className="text-sm font-medium text-foreground">Full Metrics Table</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-muted-foreground">#</TableHead>
                <TableHead className="text-muted-foreground">Player</TableHead>
                <TableHead className="text-muted-foreground">Team</TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="gir">GIR</MetricTooltip></TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="pva">PVA</MetricTooltip></TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="ddi">DDI</MetricTooltip></TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="cps">CPS</MetricTooltip></TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="eoe">EOE</MetricTooltip></TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="sqi">SQI</MetricTooltip></TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="lsr">LSR</MetricTooltip></TableHead>
                <TableHead><MetricTooltip sport="nba" metricKey="uap">UAP</MetricTooltip></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricsData.map((p, i) => (
                <TableRow key={p.id} className="hover:bg-white/5 transition-colors border-white/5">
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell><Link to={`/${sport}/players/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.teamName}</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">{p.adv.gir}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.adv.pva}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.adv.ddi}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.adv.cps}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.adv.eoe}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.adv.sqi}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.adv.lsr}</TableCell>
                  <TableCell className="font-mono text-foreground/70">{p.adv.uap}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
