import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Loader2, Activity, AlertTriangle } from 'lucide-react';

// 🎨 Diccionario de colores hexadecimales oficiales de la NBA
const getTeamColor = (teamName?: string, isHome: boolean = true) => {
  // 🚀 BLINDAJE: Si el nombre aún no ha cargado, devolvemos el fallback sin crashear
  if (!teamName) return isHome ? '#0ea5e9' : '#f59e0b'; 
  
  const name = teamName.toLowerCase();
  if (name.includes('hawks')) return '#e03a3e';
  if (name.includes('celtics')) return '#007A33';
  if (name.includes('nets')) return '#ffffff'; 
  if (name.includes('hornets')) return '#00788C';
  if (name.includes('bulls')) return '#ce1141';
  if (name.includes('cavaliers') || name.includes('cavs')) return '#860038';
  if (name.includes('mavericks') || name.includes('mavs')) return '#00538c';
  if (name.includes('nuggets')) return '#fdb927';
  if (name.includes('pistons')) return '#c8102e';
  if (name.includes('warriors')) return '#1d428a';
  if (name.includes('rockets')) return '#ce1141';
  if (name.includes('pacers')) return '#fdbb30';
  if (name.includes('clippers')) return '#c8102e';
  if (name.includes('lakers')) return '#552583';
  if (name.includes('grizzlies')) return '#5d76a9';
  if (name.includes('heat')) return '#98002E';
  if (name.includes('bucks')) return '#00471B';
  if (name.includes('timberwolves') || name.includes('wolves')) return '#0c2340';
  if (name.includes('pelicans')) return '#85714D';
  if (name.includes('knicks')) return '#f58426';
  if (name.includes('thunder') || name.includes('okc')) return '#007ac1';
  if (name.includes('magic')) return '#0077c0';
  if (name.includes('sixers') || name.includes('76ers')) return '#006bb6';
  if (name.includes('suns')) return '#e56020';
  if (name.includes('blazers')) return '#E03A3E';
  if (name.includes('kings')) return '#5a2d81';
  if (name.includes('spurs')) return '#c4ced4';
  if (name.includes('raptors')) return '#ce1141';
  if (name.includes('jazz')) return '#f9a01b';
  if (name.includes('wizards')) return '#002B5C';

  return isHome ? '#0ea5e9' : '#f59e0b'; 
};

interface MomentumChartProps {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
}

export default function MomentumChart({ gameId, homeTeam, awayTeam, homeLogo, awayLogo }: MomentumChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obtenemos los colores para los equipos
  const homeColor = getTeamColor(homeTeam, true);
  const awayColor = getTeamColor(awayTeam, false);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await fetch(`/nba-cdn/static/json/liveData/playbyplay/playbyplay_${gameId}.json`);
        if (!res.ok) throw new Error("API HTTP Error");
        
        const json = await res.json();
        const actions = json?.game?.actions || [];

        if (actions.length === 0) {
          throw new Error("No Play-by-Play data available yet");
        }

        let processedData: any[] = [];
        let lastHome = 0;
        let lastAway = 0;

        actions.forEach((action: any) => {
          const hScore = parseInt(action.scoreHome || lastHome);
          const aScore = parseInt(action.scoreAway || lastAway);

          if (hScore !== lastHome || aScore !== lastAway) {
            let timeStr = action.clock;
            const match = timeStr?.match(/PT(\d+)M(\d+)?/);
            if (match) {
              timeStr = `${match[1]}:${match[2] ? match[2].padStart(2, '0') : '00'}`;
            }

            processedData.push({
              index: processedData.length,
              time: timeStr || "00:00",
              period: action.period,
              scoreStr: `${hScore} - ${aScore}`,
              differential: hScore - aScore, // Positivo = Home, Negativo = Away
              text: action.description || "Scoring play"
            });
            
            lastHome = hScore;
            lastAway = aScore;
          }
        });

        if (processedData.length === 0) {
          processedData.push({ index: 0, time: "12:00", period: 1, scoreStr: "0 - 0", differential: 0, text: "Tip-off" });
        }

        setData(processedData);
        setLoading(false);
      } catch (err: any) {
        console.warn("Momentum Chart Error:", err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLiveData();
  }, [gameId]);

  const maxDiff = useMemo(() => Math.max(0, ...data.map(d => d.differential)), [data]);
  const minDiff = useMemo(() => Math.min(0, ...data.map(d => d.differential)), [data]);
  
  const gradientOffset = () => {
    if (maxDiff <= 0) return 0;
    if (minDiff >= 0) return 1;
    return maxDiff / (maxDiff - minDiff);
  };
  const off = gradientOffset();

  if (loading) {
    return (
      <div className="w-full bg-[#111] p-6 rounded-[2rem] border border-[#222] shadow-xl h-[300px] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500 mb-4" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Calculating Momentum...</span>
      </div>
    );
  }

  if (error || data.length <= 1) {
    return (
      <div className="w-full bg-[#111] p-6 rounded-[2rem] border border-[#222] shadow-xl h-[300px] flex flex-col items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-rose-900 mb-4" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">
          {error === "No Play-by-Play data available yet" ? "Data not yet available for this game" : "Momentum tracking unavailable"}
        </span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      const isHomeLeading = pData.differential > 0;
      const isAwayLeading = pData.differential < 0;
      
      return (
        <div className="bg-[#0a0f18] border border-white/10 p-3 rounded-xl shadow-2xl max-w-xs">
          <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase mr-4">Q{pData.period} - {pData.time}</span>
            <span 
              className="text-xs font-black" 
              style={{ color: isHomeLeading ? homeColor : isAwayLeading ? awayColor : '#cbd5e1' }}
            >
              Score: {pData.scoreStr}
            </span>
          </div>
          <p className="text-xs text-white/80 font-medium">{pData.text}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#111] p-6 md:p-8 rounded-[2rem] border border-[#222] shadow-xl relative overflow-hidden">
      <div className="flex justify-between items-center mb-8 relative z-10">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" /> Game Momentum
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={awayLogo} className="w-5 h-5 object-contain drop-shadow-md" alt={awayTeam} />
            <span className="text-xs font-bold" style={{ color: awayColor }}>{awayTeam}</span>
          </div>
          <div className="flex items-center gap-2">
            <img src={homeLogo} className="w-5 h-5 object-contain drop-shadow-md" alt={homeTeam} />
            <span className="text-xs font-bold" style={{ color: homeColor }}>{homeTeam}</span>
          </div>
        </div>
      </div>

      <div className="h-[250px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                {/* Equipo Local (Arriba) */}
                <stop offset={0} stopColor={homeColor} stopOpacity={0.8} /> 
                <stop offset={off} stopColor={homeColor} stopOpacity={0.1} />
                {/* Equipo Visitante (Abajo) */}
                <stop offset={off} stopColor={awayColor} stopOpacity={0.1} />
                <stop offset={1} stopColor={awayColor} stopOpacity={0.8} /> 
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis dataKey="index" hide />
            <YAxis 
              tick={{ fill: '#ffffff50', fontSize: 10, fontWeight: 800 }} 
              axisLine={false} 
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(val) => Math.abs(val).toString()} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 }} />
            <ReferenceLine y={0} stroke="#ffffff30" strokeWidth={2} strokeDasharray="5 5" />
            <Area type="step" dataKey="differential" stroke="none" fill="url(#momentumGradient)" animationDuration={1500} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}