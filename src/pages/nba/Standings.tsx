import { useState, useEffect } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function NBAStandings() {
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"conference" | "league" | "division">("conference");

  useEffect(() => {
    nbaService.fetchStandings().then((data) => {
      setTeams(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
      <p className="text-[#888] font-bold text-xs uppercase tracking-widest">Compiling Standings...</p>
    </div>
  );

  const eastern = teams.filter(t => t.conference === "East").sort((a, b) => a.rank - b.rank);
  const western = teams.filter(t => t.conference === "West").sort((a, b) => a.rank - b.rank);
  const league = [...teams].sort((a, b) => b.pct - a.pct);
  
  const divisions = ["Atlantic", "Central", "Southeast", "Northwest", "Pacific", "Southwest"];

  const StandingsTable = ({ title, data }: { title: string, data: any[] }) => (
    <div className="bg-[#111] rounded-[2rem] border border-[#222] shadow-2xl overflow-hidden mb-8">
      <div className="bg-[#151515] px-6 py-4 border-b border-[#222]">
        <h2 className="text-lg font-black text-white uppercase tracking-widest">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#1a1a1a] border-b border-[#222] text-[10px] font-black text-[#666] uppercase tracking-widest items-center">
            <div className="col-span-3">Team</div>
            <div className="col-span-1 text-center">W</div>
            <div className="col-span-1 text-center">L</div>
            <div className="col-span-1 text-center">PCT</div>
            <div className="col-span-1 text-center">GB</div>
            <div className="col-span-1 text-center">HOME</div>
            <div className="col-span-1 text-center">AWAY</div>
            <div className="col-span-1 text-center">CONF</div>
            <div className="col-span-1 text-center">L10</div>
            <div className="col-span-1 text-center">STRK</div>
          </div>
          <div className="divide-y divide-[#222]">
            {data.map((t, i) => (
              // 🚀 FIX: Cambiado t.abbreviation por t.teamId para asegurar que cargue la franquicia 100%
              <Link key={t.teamId} to={`/nba/teams/${t.teamId}`} className="grid grid-cols-12 gap-4 px-6 py-3.5 hover:bg-[#161616] transition-colors items-center group">
                <div className="col-span-3 flex items-center gap-4">
                  <span className="text-[10px] font-black text-[#555] w-4">{t.rank || i + 1}</span>
                  <img src={`https://cdn.nba.com/logos/nba/${t.teamId}/global/L/logo.svg`} alt={t.name} className="w-7 h-7 object-contain drop-shadow-md" />
                  <span className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors truncate">{t.name}</span>
                </div>
                <div className="col-span-1 text-center font-mono font-bold text-white">{t.wins}</div>
                <div className="col-span-1 text-center font-mono font-bold text-white">{t.losses}</div>
                <div className="col-span-1 text-center font-mono font-bold text-cyan-400">{(t.pct * 100).toFixed(1)}</div>
                <div className="col-span-1 text-center font-mono font-bold text-[#888]">{t.gb === 0 ? "-" : t.gb}</div>
                <div className="col-span-1 text-center font-mono font-bold text-[#888]">{t.home}</div>
                <div className="col-span-1 text-center font-mono font-bold text-[#888]">{t.away}</div>
                <div className="col-span-1 text-center font-mono font-bold text-[#888]">{t.confRecord}</div>
                <div className="col-span-1 text-center font-mono font-bold text-[#888]">{t.l10}</div>
                <div className="col-span-1 text-center font-mono font-bold">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${t.streak.includes('W') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{t.streak}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1">Standings</h1>
          <p className="text-[#888] text-sm">Official NBA Conference & Division Rankings</p>
        </div>
        <div className="flex bg-[#111] p-1 rounded-xl border border-[#222] w-fit">
          <button onClick={() => setView("conference")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === "conference" ? 'bg-[#222] text-white shadow-md' : 'text-[#666] hover:text-[#aaa]'}`}>Conferences</button>
          <button onClick={() => setView("league")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === "league" ? 'bg-[#222] text-white shadow-md' : 'text-[#666] hover:text-[#aaa]'}`}>League</button>
          <button onClick={() => setView("division")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === "division" ? 'bg-[#222] text-white shadow-md' : 'text-[#666] hover:text-[#aaa]'}`}>Divisions</button>
        </div>
      </div>

      {view === "conference" && (
        <>
          <StandingsTable title="Eastern Conference" data={eastern} />
          <StandingsTable title="Western Conference" data={western} />
        </>
      )}

      {view === "league" && <StandingsTable title="Overall League Standings" data={league} />}

      {view === "division" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {divisions.map(div => {
            const divTeams = teams.filter(t => t.division === div).sort((a, b) => b.pct - a.pct);
            return <StandingsTable key={div} title={`${div} Division`} data={divTeams} />
          })}
        </div>
      )}
    </div>
  );
}