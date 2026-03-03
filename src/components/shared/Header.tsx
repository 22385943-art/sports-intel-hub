import { useState, useEffect, useRef } from "react";
import { Search, Bell, Settings, LogOut, User, Activity, AlertCircle, Globe, RefreshCw, X, ShieldCheck, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/useSettings";

const CustomToggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button 
    type="button" onClick={(e) => { e.preventDefault(); onChange(); }}
    className={`w-10 h-5 rounded-full relative transition-colors duration-300 focus:outline-none ${checked ? 'bg-cyan-500' : 'bg-[#333]'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{players: any[], teams: any[]}>({ players: [], teams: [] });
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifSettings, setNotifSettings] = useState({ gameStarts: true, finalScores: true, injuries: false, news: true });
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  const { settings, setTimeZone, toggleHideResults, toggleAutoRefresh } = useSettings();

  useEffect(() => { setIsOpen(false); setQuery(""); }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults({ players: [], teams: [] }); return; }
    Promise.all([nbaService.fetchAllOfficialPlayers(), nbaService.fetchAllOfficialTeams()]).then(([players, teams]) => {
      const q = query.toLowerCase();
      setResults({ 
        players: players.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5), 
        teams: teams.filter(t => t.name.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q)).slice(0, 3) 
      });
      setIsOpen(true);
    });
  }, [query]);

  return (
    <>
      <header className="h-16 border-b border-[#1f1f1f] bg-[#0a0f18]/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
        
        {/* BUSCADOR */}
        <div className="relative w-full max-w-xl" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555] group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => query.length >= 2 && setIsOpen(true)}
              placeholder="Search players, teams, stats..." 
              className="w-full bg-[#111] border border-[#222] rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
            />
          </div>

          {isOpen && (results.players.length > 0 || results.teams.length > 0) && (
            <div className="absolute top-full mt-2 w-full bg-[#111] border border-[#222] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden py-2 animate-in fade-in z-50">
              {results.teams.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-[9px] font-black uppercase tracking-widest text-[#555]">Franchises</div>
                  {results.teams.map(t => (
                    <div key={t.id} onClick={() => navigate(`/nba/teams/${t.abbreviation}`)} className="px-4 py-2 hover:bg-[#1a1a1a] cursor-pointer flex items-center gap-3 transition-colors">
                      <img src={nbaService.getTeamLogoUrl(t.abbreviation)} className="w-6 h-6 object-contain" />
                      <div>
                        <p className="text-sm font-bold text-white">{t.name}</p>
                        <p className="text-[10px] text-[#666] uppercase tracking-widest">{t.conference} Conf</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {results.players.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-[9px] font-black uppercase tracking-widest text-[#555]">Athletes</div>
                  {results.players.map(p => (
                    <div key={p.id} onClick={() => navigate(`/nba/players/${p.id}`)} className="px-4 py-2 hover:bg-[#1a1a1a] cursor-pointer flex items-center gap-3 transition-colors">
                      <Avatar className="h-8 w-8 border border-[#333] bg-black">
                        <AvatarImage src={p.imageUrl} className="object-cover" />
                        <AvatarFallback className="text-[10px]">{p.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{p.name}</p>
                        <p className="text-[10px] text-[#666] uppercase tracking-widest">{p.teamId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          
          {/* NOTIFICACIONES */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 text-[#555] hover:text-white transition-colors relative outline-none">
              <Bell className="h-5 w-5" />
              {notifSettings.gameStarts && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-500 rounded-full border border-[#0a0f18] animate-pulse"></span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-[#111] border border-[#222] shadow-2xl p-2 rounded-xl">
              <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest text-[#888] px-2 py-1">Push Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#222] mb-2" />
              
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-[#1a1a1a] cursor-default rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Live Game Starts</span>
                <CustomToggle checked={notifSettings.gameStarts} onChange={() => setNotifSettings(p => ({...p, gameStarts: !p.gameStarts}))} />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-[#1a1a1a] cursor-default rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Final Scores</span>
                <CustomToggle checked={notifSettings.finalScores} onChange={() => setNotifSettings(p => ({...p, finalScores: !p.finalScores}))} />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-[#1a1a1a] cursor-default rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Injury Updates</span>
                <CustomToggle checked={notifSettings.injuries} onChange={() => setNotifSettings(p => ({...p, injuries: !p.injuries}))} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* SETTINGS (HIDE RESULTS Y TIMEZONE) */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 text-[#555] hover:text-white transition-colors outline-none">
              <Settings className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-[#111] border border-[#222] shadow-2xl rounded-xl p-2">
              <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest text-[#888]">App Settings</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#222]" />
              
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-[#1a1a1a] cursor-default rounded-lg p-3 flex justify-between items-center group">
                <div className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                  <RefreshCw className="h-4 w-4" /> 
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Auto-Refresh API</span>
                  </div>
                </div>
                <CustomToggle checked={settings.autoRefresh} onChange={toggleAutoRefresh} />
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-[#1a1a1a] cursor-default rounded-lg p-3 flex justify-between items-center group">
                <div className="flex items-center gap-2 text-slate-300 group-hover:text-rose-400 transition-colors">
                  <EyeOff className="h-4 w-4" /> 
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-rose-400">Hide Results</span>
                    <span className="text-[9px] text-[#666]">Prevent final score spoilers</span>
                  </div>
                </div>
                <CustomToggle checked={settings.hideResults} onChange={toggleHideResults} />
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#222]" />
              
              <div className="px-2 py-2">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <Globe className="h-4 w-4" /> <span className="text-sm font-bold text-white">Select Timezone</span>
                </div>
                <select 
                  value={settings.timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                  <option value="local">🌍 Local Time (Browser)</option>
                  <option value="America/New_York">🇺🇸 US Eastern (ET)</option>
                  <option value="America/Chicago">🇺🇸 US Central (CT)</option>
                  <option value="America/Los_Angeles">🇺🇸 US Pacific (PT)</option>
                  <option value="Europe/Madrid">🇪🇺 Central European (CET)</option>
                  <option value="Asia/Tokyo">🇯🇵 Japan Standard (JST)</option>
                </select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ACCOUNT DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              {isLoggedIn ? (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 border-2 border-[#222] ml-2 hover:scale-105 transition-transform cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)] flex items-center justify-center">
                  <User className="h-4 w-4 text-black" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#1a1a1a] border-2 border-[#333] ml-2 hover:border-cyan-500 transition-colors cursor-pointer flex items-center justify-center">
                  <User className="h-4 w-4 text-[#666]" />
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#111] border border-[#222] shadow-2xl rounded-xl">
              <DropdownMenuLabel className="font-bold text-white flex flex-col">
                <span>{isLoggedIn ? "GM Profile" : "Guest User"}</span>
                <span className="text-xs text-[#888] font-normal">{isLoggedIn ? "Premium Access" : "Sign in to sync data"}</span>
              </DropdownMenuLabel>
              
              {!isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-[#222]" />
                  <DropdownMenuItem className="focus:bg-cyan-500/10 cursor-pointer gap-2 text-cyan-400" onClick={() => setShowAuth(true)}>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Sign In / Register</span>
                  </DropdownMenuItem>
                </>
              )}
              
              {isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-[#222]" />
                  <DropdownMenuItem className="focus:bg-rose-500/10 cursor-pointer gap-2 text-rose-400" onClick={() => setIsLoggedIn(false)}>
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      {/* MODAL DE REGISTRO / LOGIN */}
      {showAuth && !isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-[#111] border border-[#222] rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in slide-in-from-bottom-8">
            <button onClick={() => setShowAuth(false)} className="absolute top-6 right-6 text-[#555] hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-6 w-6 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-black text-white">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="text-sm text-[#888] mt-1">
                {authMode === 'login' ? 'Enter your credentials to access your terminal.' : 'Join the elite sports analytics platform.'}
              </p>
            </div>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); setShowAuth(false); }}>
              {authMode === 'register' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#666] mb-1.5 block">Full Name</label>
                  <input type="text" required className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="John Doe" />
                </div>
              )}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#666] mb-1.5 block">Email Address</label>
                <input type="email" required className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="analyst@team.com" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#666] mb-1.5 block">Password</label>
                <input type="password" required className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3.5 rounded-xl transition-all mt-4">
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>
            <p className="text-center text-xs text-[#666] font-bold mt-6">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-cyan-400 hover:text-white transition-colors">
                {authMode === 'login' ? 'Register here' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}