import { useState, useEffect } from "react";
import { ufcService } from "@/services/sports/ufcService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

export default function UFCCompare() {
  const allFighters = ufcService.getAllPlayers();
  const [f1Id, setF1Id] = useState(allFighters[0]?.id || "");
  const [f2Id, setF2Id] = useState(allFighters[1]?.id || "");

  if (allFighters.length < 2) return <div className="text-white text-center py-20 font-bold">Please check your connection. Matchup engine requires data.</div>;

  const f1 = ufcService.getPlayerById(f1Id)!;
  const f2 = ufcService.getPlayerById(f2Id)!;
  const adv1 = ufcService.computeAdvanced(f1);
  const adv2 = ufcService.computeAdvanced(f2);

  const n1 = f1.name.split(" ").pop()!;
  const n2 = f2.name.split(" ").pop()!;

  const radarData = [
    { metric: "DMG", [n1]: adv1.damageEfficiency, [n2]: adv2.damageEfficiency },
    { metric: "FCI", [n1]: adv1.fightControl, [n2]: adv2.fightControl },
    { metric: "GRP", [n1]: adv1.grapplingEfficiency, [n2]: adv2.grapplingEfficiency },
    { metric: "DOM", [n1]: adv1.dominanceScore, [n2]: adv2.dominanceScore },
    { metric: "PAC", [n1]: adv1.paceControl, [n2]: adv2.paceControl },
    { metric: "MOM", [n1]: adv1.momentumShifts, [n2]: adv2.momentumShifts },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white italic">Fighter Comparison</h1>
        <p className="text-slate-400 text-sm font-bold">Head-to-head metric simulation</p>
      </div>
      <div className="flex flex-wrap gap-4 items-center bg-[#111] p-4 rounded-2xl border border-white/5">
        <Select value={f1Id} onValueChange={setF1Id}>
          <SelectTrigger className="w-64 bg-black/50 border-white/10 text-white font-bold h-12"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#111] border-white/10 text-white">{allFighters.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
        <span className="self-center text-red-500 font-black text-xl italic px-4">VS</span>
        <Select value={f2Id} onValueChange={setF2Id}>
          <SelectTrigger className="w-64 bg-black/50 border-white/10 text-white font-bold h-12"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#111] border-white/10 text-white">{allFighters.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-[#0a0f18]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Advanced Metrics</h3>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={n1} dataKey={n1} stroke="#22d3ee" strokeWidth={3} fill="#22d3ee" fillOpacity={0.2} dot={{ r: 4, fill: '#111', stroke: '#22d3ee' }} />
                <Radar name={n2} dataKey={n2} stroke="#ef4444" strokeWidth={3} fill="#ef4444" fillOpacity={0.2} dot={{ r: 4, fill: '#111', stroke: '#ef4444' }} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#0a0f18]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Stat Comparison</h3>
          <div className="space-y-4">
            {[
              { label: "Strikes Landed / Min", v1: f1.stats.slpm, v2: f2.stats.slpm },
              { label: "Striking Accuracy %", v1: f1.stats.strAcc, v2: f2.stats.strAcc },
              { label: "Takedowns / 15m", v1: f1.stats.tdAvg, v2: f2.stats.tdAvg },
              { label: "Takedown Defense %", v1: f1.stats.tdDef, v2: f2.stats.tdDef },
              { label: "Dominance Score", v1: adv1.dominanceScore, v2: adv2.dominanceScore },
            ].map(row => {
              const winner = Number(row.v1) > Number(row.v2) ? 1 : Number(row.v2) > Number(row.v1) ? 2 : 0;
              return (
                <div key={row.label} className="flex items-center gap-4 py-3 border-b border-white/5">
                  <span className={`font-mono text-lg md:text-xl w-20 text-right font-black ${winner === 1 ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "text-slate-500"}`}>{row.v1}</span>
                  <div className="flex-1 text-center">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{row.label}</span>
                  </div>
                  <span className={`font-mono text-lg md:text-xl w-20 font-black ${winner === 2 ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-slate-500"}`}>{row.v2}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}