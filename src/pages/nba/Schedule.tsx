import { useState, useEffect } from "react";
import { nbaService } from "@/services/sportServiceFactory";
import { Loader2, Calendar as CalendarIcon, ChevronRight, Activity, BarChart3, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings"; // 🚀 AÑADIDO HOOK

export default function NBASchedule() {
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { settings } = useSettings(); // 🚀 LEEMOS SETTINGS

  // Fecha seleccionada. Por defecto: HOY
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getWeekDates = (date: Date) => {
    const week = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const currentWeek = getWeekDates(selectedDate);

  useEffect(() => {
    setIsLoading(true);
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    nbaService.fetchLiveGames(dateStr).then(data => {
      setGames(data || []);
      setIsLoading(false);
    });
  }, [selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const d = new Date(e.target.value + 'T12:00:00Z'); 
      setSelectedDate(d);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Schedule</h1>
            <p className="text-slate-400 text-sm font-bold">Official League Calendar & Results</p>
          </div>
        </div>

        <div className="relative bg-[#111] border border-[#333] rounded-xl p-2 flex items-center gap-2 hover:border-cyan-500/50 transition-colors w-fit">
          <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
          <input 
            type="date" 
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            onChange={handleDateChange}
            className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
      </div>

      <div className="bg-[#111] rounded-2xl border border-[#222] p-2 flex overflow-x-auto scrollbar-none gap-2 mb-8">
        {currentWeek.map((d, i) => {
          const isSelected = d.toDateString() === selectedDate.toDateString();
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          const monthName = d.toLocaleDateString('en-US', { month: 'short' });
          
          return (
            <button 
              key={i} 
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center flex-1 min-w-[80px] p-3 rounded-xl transition-all ${isSelected ? 'bg-cyan-500/20 border border-cyan-500/30' : 'hover:bg-[#222] border border-transparent'}`}
            >
              <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>
                {dayName}
              </span>
              <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {monthName} {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Loading Matchups...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-20 bg-[#111] rounded-3xl border border-dashed border-[#333]">
          <CalendarIcon className="h-12 w-12 text-[#444] mx-auto mb-4" />
          <p className="text-[#888] font-bold uppercase tracking-widest text-sm">No games scheduled</p>
          <p className="text-[#555] text-xs mt-2">There are no NBA games on this date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map(g => {
            const isFinal = g.status === 'final';
            const targetUrl = isFinal ? `/nba/games/${g.gameId}/boxscore` : `/nba/games/${g.gameId}`;
            
            return (
              <Link key={g.gameId} to={targetUrl} state={{ game: g }} className="bg-[#111] border border-[#222] rounded-[1.5rem] p-6 hover:border-cyan-500/30 hover:bg-[#151515] transition-all group shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${g.status === 'live' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : (isFinal ? 'bg-[#222] text-[#888] border border-[#333]' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20')}`}>
                    {g.status === 'live' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                    {g.quarter}
                  </span>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">{g.arena}</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={`https://cdn.nba.com/logos/nba/${g.awayId}/global/L/logo.svg`} alt={g.away} className="w-10 h-10 object-contain drop-shadow-lg" />
                      <span className="text-xl font-black text-white">{g.away}</span>
                    </div>
                    {/* 🚀 Ocultar resultado si hideResults está activo */}
                    <span className={`text-2xl font-mono font-black ${g.status === 'upcoming' ? 'text-slate-700' : 'text-white'}`}>
                      {g.status === 'upcoming' ? '-' : (settings.hideResults ? '***' : g.awayScore)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={`https://cdn.nba.com/logos/nba/${g.homeId}/global/L/logo.svg`} alt={g.home} className="w-10 h-10 object-contain drop-shadow-lg" />
                      <span className="text-xl font-black text-white">{g.home}</span>
                    </div>
                    <span className={`text-2xl font-mono font-black ${g.status === 'upcoming' ? 'text-slate-700' : 'text-white'}`}>
                      {g.status === 'upcoming' ? '-' : (settings.hideResults ? '***' : g.homeScore)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-[#222] flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-cyan-500 group-hover:text-cyan-400">
                    {isFinal ? <BarChart3 className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                    {isFinal ? "View Box Score" : "Matchup Preview"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}