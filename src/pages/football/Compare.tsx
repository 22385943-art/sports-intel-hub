import { useState, useEffect } from "react";
import { footballService, DOMESTIC_LEAGUES } from "@/services/sports/footballService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import { Loader2, ShieldAlert } from "lucide-react";

export default function FootballCompare() {
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [p1Id, setP1Id] = useState<string>("");
  const [p2Id, setP2Id] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    footballService.fetchRealPlayers(DOMESTIC_LEAGUES[0].id).then(players => {
      if (players && players.length >= 2) {
        setAllPlayers(players);
        setP1Id(players[0].id);
        setP2Id(players[1].id);
      }
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Initializing Scouting Engine...</p>
      </div>
    );
  }

  if (allPlayers.length < 2 || !p1Id || !p2Id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-[#666] space-y-4">
        <ShieldAlert className="h-12 w-12 opacity-50" />
        <p className="font-bold uppercase tracking-widest text-sm">Insufficient Data for Comparison</p>
      </div>
    );
  }

  const p1 = allPlayers.find(p => p.id === p1Id) || allPlayers[0];
  const p2 = allPlayers.find(p => p.id === p2Id) || allPlayers[1];
  
  const adv1 = footballService.computeAdvanced(p1);
  const adv2 = footballService.computeAdvanced(p2);

  const n1 = p1.name.split(" ").pop() || "Player 1";
  const n2 = p2.name.split(" ").pop() || "Player 2";

  const radarData = [
    { metric: "xGC", [n1]: adv1.xgContribution, [n2]: adv2.xgContribution },
    { metric: "PRS", [n1]: adv1.pressingImpact, [n2]: adv2.pressingImpact },
    { metric: "BUV", [n1]: adv1.buildUpValue, [n2]: adv2.buildUpValue },
    { metric: "xT", [n1]: adv1.xT, [n2]: adv2.xT },
    { metric: "ProgPass", [n1]: adv1.progressivePassing, [n2]: adv2.progressivePassing },
    { metric: "Goal Inv", [n1]: adv1.goalInvolvement, [n2]: adv2.goalInvolvement },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">Player Scouting Compare</h1>
        <p className="text-muted-foreground text-sm mt-1">Head-to-head advanced metric analysis</p>
      </div>
      <div className="flex flex-wrap gap-4 items-center bg-[#111] p-4 rounded-2xl border border-[#222]">
        <Select value={p1Id} onValueChange={setP1Id}>
          <SelectTrigger className="w-64 bg-black/50 border-[#333] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#111] text-white border-[#333]">
            {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="self-center text-emerald-500 font-black italic">VS</span>
        <Select value={p2Id} onValueChange={setP2Id}>
          <SelectTrigger className="w-64 bg-black/50 border-[#333] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#111] text-white border-[#333]">
            {allPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0a0f18]/80 border-[#222] shadow-2xl">
          <CardHeader className="pb-2 border-b border-[#222]"><CardTitle className="text-sm font-black uppercase tracking-widest text-white">Metric DNA</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name={n1} dataKey={n1} stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={3} dot={{r: 4, fill: '#111', stroke: '#10b981'}} />
                <Radar name={n2} dataKey={n2} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={3} dot={{r: 4, fill: '#111', stroke: '#3b82f6'}} />
                <Legend wrapperStyle={{paddingTop: '20px'}} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="bg-[#0a0f18]/80 border-[#222] shadow-2xl">
          <CardHeader className="pb-2 border-b border-[#222]"><CardTitle className="text-sm font-black uppercase tracking-widest text-white">Raw Output</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[
                { label: "Goals", v1: p1.stats?.goals || 0, v2: p2.stats?.goals || 0 },
                { label: "Assists", v1: p1.stats?.assists || 0, v2: p2.stats?.assists || 0 },
                { label: "Pass Acc %", v1: p1.stats?.passAccuracy || 0, v2: p2.stats?.passAccuracy || 0 },
                { label: "xG Contrib", v1: adv1.xgContribution, v2: adv2.xgContribution },
                { label: "Expected Threat", v1: adv1.xT, v2: adv2.xT },
              ].map(row => {
                const winner = Number(row.v1) > Number(row.v2) ? 1 : Number(row.v2) > Number(row.v1) ? 2 : 0;
                return (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#222]">
                    <span className={`font-mono text-xl w-16 text-right font-black ${winner === 1 ? "text-emerald-400" : "text-slate-500"}`}>{row.v1}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{row.label}</span>
                    <span className={`font-mono text-xl w-16 text-left font-black ${winner === 2 ? "text-blue-500" : "text-slate-500"}`}>{row.v2}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}