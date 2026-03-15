import { useState, useEffect, useRef } from "react";
import { Search, Bell, Settings, LogOut, User, Activity, Globe, RefreshCw, X, ShieldCheck, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/useSettings";

const CustomToggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button 
    type="button" onClick={(e) => { e.preventDefault(); onChange(); }}
    className={`w-10 h-5 rounded-full relative transition-all duration-300 focus:outline-none ${checked ? 'bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/[0.06] border border-white/[0.08]'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-md ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
      <header className="h-16 border-b border-white/[0.04] bg-[#030712]/80 backdrop-blur-2xl sticky top-0 z-40 px-6 flex items-center justify-between">
        
        {/* SEARCH */}
        <div className="relative w-full max-w-xl" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors duration-300" />
            <input 
              type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => query.length >= 2 && setIsOpen(true)}
              placeholder="Search players, teams, stats..." 
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 focus:bg-white/[0.04] focus:shadow-[0_0_30px_rgba(34,211,238,0.06)] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
            />
          </div>

          {isOpen && (results.players.length > 0 || results.teams.length > 0) && (
            <div className="absolute top-full mt-2 w-full bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden py-2 animate-in fade-in z-50">
              {results.teams.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-600">Franchises</div>
                  {results.teams.map(t => (
                    <div key={t.id} onClick={() => navigate(`/nba/teams/${t.abbreviation}`)} className="px-4 py-2.5 hover:bg-white/[0.03] cursor-pointer flex items-center gap-3 transition-all duration-200 group">
                      <img src={nbaService.getTeamLogoUrl(t.abbreviation)} className="w-6 h-6 object-contain group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{t.name}</p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-bold">{t.conference} Conf</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {results.players.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-600">Athletes</div>
                  {results.players.map(p => (
                    <div key={p.id} onClick={() => navigate(`/nba/players/${p.id}`)} className="px-4 py-2.5 hover:bg-white/[0.03] cursor-pointer flex items-center gap-3 transition-all duration-200 group">
                      <Avatar className="h-8 w-8 border border-white/[0.08] bg-[#0a0f18] shadow-md">
                        <AvatarImage src={p.imageUrl} className="object-cover" />
                        <AvatarFallback className="text-[10px] bg-slate-900 text-slate-500">{p.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors">{p.name}</p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-bold">{p.teamId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          
          {/* NOTIFICATIONS */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2.5 text-slate-600 hover:text-white transition-all duration-300 relative outline-none rounded-xl hover:bg-white/[0.03]">
              <Bell className="h-4.5 w-4.5" />
              {notifSettings.gameStarts && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.6)]"></span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/[0.06] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] p-2 rounded-2xl">
              <DropdownMenuLabel className="font-black text-[9px] uppercase tracking-[0.25em] text-slate-600 px-2 py-1">Push Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.04] mb-2" />
              
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Live Game Starts</span>
                <CustomToggle checked={notifSettings.gameStarts} onChange={() => setNotifSettings(p => ({...p, gameStarts: !p.gameStarts}))} />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Final Scores</span>
                <CustomToggle checked={notifSettings.finalScores} onChange={() => setNotifSettings(p => ({...p, finalScores: !p.finalScores}))} />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Injury Updates</span>
                <CustomToggle checked={notifSettings.injuries} onChange={() => setNotifSettings(p => ({...p, injuries: !p.injuries}))} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* SETTINGS */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2.5 text-slate-600 hover:text-white transition-all duration-300 outline-none rounded-xl hover:bg-white/[0.03]">
              <Settings className="h-4.5 w-4.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/[0.06] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] rounded-2xl p-2">
              <DropdownMenuLabel className="font-black text-[9px] uppercase tracking-[0.25em] text-slate-600">App Settings</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.04]" />
              
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-slate-500" /> 
                  <span className="text-sm font-bold text-white">Auto-Refresh API</span>
                </div>
                <CustomToggle checked={settings.autoRefresh} onChange={toggleAutoRefresh} />
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-slate-500 group-hover:text-rose-400 transition-colors" /> 
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Hide Results</span>
                    <span className="text-[8px] text-slate-600 font-bold">Prevent score spoilers</span>
                  </div>
                </div>
                <CustomToggle checked={settings.hideResults} onChange={toggleHideResults} />
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/[0.04]" />
              
              <div className="px-2 py-2">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Globe className="h-4 w-4" /> <span className="text-sm font-bold text-white">Timezone</span>
                </div>
                <select 
                  value={settings.timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer"
                >
                  <option value="local" className="bg-[#0a0f18]">🌍 Local (Browser)</option>
                  <option value="America/New_York" className="bg-[#0a0f18]">🇺🇸 Eastern (ET)</option>
                  <option value="America/Chicago" className="bg-[#0a0f18]">🇺🇸 Central (CT)</option>
                  <option value="America/Los_Angeles" className="bg-[#0a0f18]">🇺🇸 Pacific (PT)</option>
                  <option value="Europe/Madrid" className="bg-[#0a0f18]">🇪🇺 Central European (CET)</option>
                  <option value="Asia/Tokyo" className="bg-[#0a0f18]">🇯🇵 Japan (JST)</option>
                </select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ACCOUNT */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              {isLoggedIn ? (
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 border-2 border-white/[0.08] ml-1 hover:scale-110 transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)] flex items-center justify-center">
                  <User className="h-4 w-4 text-black" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-full bg-white/[0.03] border border-white/[0.06] ml-1 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.08)] transition-all duration-300 cursor-pointer flex items-center justify-center">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/[0.06] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] rounded-2xl">
              <DropdownMenuLabel className="font-bold text-white flex flex-col">
                <span>{isLoggedIn ? "GM Profile" : "Guest User"}</span>
                <span className="text-[10px] text-slate-600 font-normal">{isLoggedIn ? "Premium Access" : "Sign in to sync"}</span>
              </DropdownMenuLabel>
              
              {!isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-white/[0.04]" />
                  <DropdownMenuItem className="focus:bg-cyan-500/[0.06] cursor-pointer gap-2 text-cyan-400 font-bold" onClick={() => setShowAuth(true)}>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Sign In / Register</span>
                  </DropdownMenuItem>
                </>
              )}
              
              {isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-white/[0.04]" />
                  <DropdownMenuItem className="focus:bg-rose-500/[0.06] cursor-pointer gap-2 text-rose-400 font-bold" onClick={() => setIsLoggedIn(false)}>
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      {/* AUTH MODAL */}
      {showAuth && !isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/[0.06] rounded-[2rem] w-full max-w-md p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] relative animate-in slide-in-from-bottom-8">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            <button onClick={() => setShowAuth(false)} className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-cyan-500/[0.08] rounded-2xl border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <ShieldCheck className="h-7 w-7 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {authMode === 'login' ? 'Access your terminal.' : 'Join the analytics platform.'}
              </p>
            </div>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); setShowAuth(false); }}>
              {authMode === 'register' && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-1.5 block">Full Name</label>
                  <input type="text" required className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/30 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]" placeholder="John Doe" />
                </div>
              )}
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-1.5 block">Email Address</label>
                <input type="email" required className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/30 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]" placeholder="analyst@team.com" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-1.5 block">Password</label>
                <input type="password" required className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/30 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-black py-3.5 rounded-xl transition-all mt-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>
            <p className="text-center text-xs text-slate-600 font-bold mt-6">
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