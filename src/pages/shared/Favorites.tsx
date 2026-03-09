import { Link } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { Star, Users, Shield } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSport } from "@/contexts/SportContext";

export default function Favorites() {
  const { favorites, toggleFavorite } = useFavorites();
  const { sport, sportConfig } = useSport();

  // 🚀 Lógica a prueba de fallos: Soporta favoritos antiguos sin URL
  const currentSportFavorites = favorites.filter(f => {
    if (!f) return false;
    if (f.url) return f.url.startsWith(`/${sport}/`);
    
    // Si no tiene URL (favorito antiguo), asumimos NBA si estamos en NBA
    if (sport === 'nba') return true;
    return false; 
  });

  const players = currentSportFavorites.filter(f => f.type === 'player');
  const teams = currentSportFavorites.filter(f => f.type === 'team');

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500 max-w-6xl mx-auto px-4">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 mb-2">
          <Star className="h-8 w-8 text-amber-400 fill-amber-400" /> {sportConfig.name} Favorites
        </h1>
        <p className="text-[#888] text-sm font-bold">Your saved athletes and franchises for this sport.</p>
      </div>

      {currentSportFavorites.length === 0 ? (
        <div className="text-center py-32 bg-[#111] rounded-[2rem] border border-dashed border-[#333]">
          <Star className="h-12 w-12 text-[#444] mx-auto mb-4" />
          <p className="text-[#888] font-bold uppercase tracking-widest text-sm">No favorites yet</p>
          <p className="text-[#555] text-xs mt-2">Go to a {sportConfig.playerLabel.toLowerCase()} or team profile and click the star to save them here.</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* PLAYERS / FIGHTERS */}
          {players.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-[#555] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Favorite {sportConfig.playerLabel}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {players.map(p => (
                  <div key={p.id} className="bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center gap-4 relative group hover:border-[#444] transition-all">
                    <button onClick={(e) => { e.preventDefault(); toggleFavorite(p); }} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 hover:scale-110 transition-transform" />
                    </button>
                    {/* Fallback de URL por si no la tenía */}
                    <Link to={p.url || `/${sport}/players/${p.id}`} className="flex items-center gap-4 w-full">
                      <Avatar className="h-12 w-12 border border-[#333] bg-black">
                        <AvatarImage src={p.imageUrl} className="object-cover object-top" />
                        <AvatarFallback className="bg-[#111] font-bold text-white">{p.name.substring(0,2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{p.name}</p>
                        <p className="text-[10px] font-black text-[#666] uppercase tracking-widest mt-0.5 truncate">{p.subtitle}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEAMS / WEIGHT CLASSES */}
          {teams.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-[#555] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Favorite Teams
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {teams.map(t => (
                  <div key={t.id} className="bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center gap-4 relative group hover:border-[#444] transition-all">
                    <button onClick={(e) => { e.preventDefault(); toggleFavorite(t); }} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 hover:scale-110 transition-transform" />
                    </button>
                    <Link to={t.url || `/${sport}/teams/${t.id}`} className="flex items-center gap-4 w-full">
                      <img src={t.imageUrl} alt={t.name} className="h-10 w-10 object-contain drop-shadow-md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{t.name}</p>
                        <p className="text-[10px] font-black text-[#666] uppercase tracking-widest mt-0.5 truncate">{t.subtitle}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}