import { useState, useEffect, useRef } from "react";
import { Search, Bell, Settings, LogOut, User, Globe, RefreshCw, X, ShieldCheck, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/useSettings";
import { motion, AnimatePresence } from "framer-motion";

const CustomToggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); onChange(); }}
    className={`w-11 h-6 rounded-full relative transition-all duration-400 focus:outline-none ${checked ? 'bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50' : 'bg-white/[0.04] border border-white/[0.1] shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]'}`}
  >
    <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-400 shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ players: any[]; teams: any[] }>({ players: [], teams: [] });
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
        teams: teams.filter(t => t.name.toLowerCase().includes(q) || t.abbreviation.toLowerCase().includes(q)).slice(0, 3),
      });
      setIsOpen(true);
    });
  }, [query]);

  return (
    <>
      <header className="h-20 border-b border-white/[0.04] bg-background/50 backdrop-blur-3xl sticky top-0 z-40 px-6 lg:px-10 flex items-center justify-between shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
        
        {/* 🚀 ELITE SEARCH BAR */}
        <div className="relative w-full max-w-2xl" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => query.length >= 2 && setIsOpen(true)}
              placeholder="Search databases, players, franchises..."
              className="w-full bg-[#000000]/40 border border-white/[0.05] rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-primary/[0.02] focus:shadow-[0_0_30px_hsl(var(--primary)/0.15)] transition-all duration-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            />
          </div>

          <AnimatePresence>
            {isOpen && (results.players.length > 0 || results.teams.length > 0) && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }}
                className="absolute top-full mt-3 w-full bg-popover/95 backdrop-blur-3xl border border-white/[0.08] rounded-[1.5rem] shadow-2xl overflow-hidden py-3 z-50 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)]"
              >
                {results.teams.length > 0 && (
                  <div className="mb-3">
                    <div className="px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Franchises</div>
                    {results.teams.map(t => (
                      <div key={t.id} onClick={() => navigate(`/nba/teams/${t.abbreviation}`)} className="px-5 py-3 hover:bg-white/[0.04] cursor-pointer flex items-center gap-4 transition-all duration-300 group border-l-2 border-transparent hover:border-primary">
                        <img src={nbaService.getTeamLogoUrl(t.abbreviation)} className="w-8 h-8 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
                        <div>
                          <p className="text-sm font-black tracking-tight text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono font-bold">{t.conference} Conf</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {results.players.length > 0 && (
                  <div>
                    <div className="px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground border-t border-white/[0.04] pt-4">Athletes</div>
                    {results.players.map(p => (
                      <div key={p.id} onClick={() => navigate(`/nba/players/${p.id}`)} className="px-5 py-3 hover:bg-white/[0.04] cursor-pointer flex items-center gap-4 transition-all duration-300 group border-l-2 border-transparent hover:border-emerald-400">
                        <Avatar className="h-10 w-10 border border-white/[0.1] bg-card shadow-lg ring-1 ring-offset-1 ring-offset-background ring-white/5 group-hover:ring-emerald-400/50 transition-all duration-500">
                          <AvatarImage src={p.imageUrl} className="object-cover" />
                          <AvatarFallback className="text-xs font-mono font-black bg-card text-muted-foreground">{p.name.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-black tracking-tight text-foreground leading-tight group-hover:text-emerald-400 transition-colors">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono font-bold">{p.teamId}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🚀 PREMIUM CONTROLS */}
        <div className="flex items-center gap-2 lg:gap-4">
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-3 text-muted-foreground hover:text-primary transition-all duration-300 relative outline-none rounded-xl hover:bg-primary/[0.05] hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
              <Bell className="h-5 w-5" />
              {notifSettings.gameStarts && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.8)] animate-pulse" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-popover/95 backdrop-blur-3xl border border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] p-3 rounded-[1.5rem]">
              <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground px-3 py-2">System Alerts</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.04] mb-2" />
              {([
                { key: "gameStarts", label: "Live Game Starts" },
                { key: "finalScores", label: "Final Scores" },
                { key: "injuries", label: "Injury Updates" },
              ] as const).map(({ key, label }) => (
                <DropdownMenuItem key={key} onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center transition-colors">
                  <span className="text-sm font-bold text-foreground">{label}</span>
                  <CustomToggle checked={notifSettings[key]} onChange={() => setNotifSettings(p => ({ ...p, [key]: !p[key] }))} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-3 text-muted-foreground hover:text-white transition-all duration-300 outline-none rounded-xl hover:bg-white/[0.04]">
              <Settings className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-popover/95 backdrop-blur-3xl border border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] p-3 rounded-[1.5rem]">
              <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground px-3 py-2">Terminal Configuration</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.04] mb-2" />

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center group transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${settings.autoRefresh ? 'text-primary animate-spin-slow' : ''}`} />
                  <span className="text-sm font-bold text-foreground">Auto-Refresh Feed</span>
                </div>
                <CustomToggle checked={settings.autoRefresh} onChange={toggleAutoRefresh} />
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-xl p-3 flex justify-between items-center group transition-colors">
                <div className="flex items-center gap-3">
                  <EyeOff className={`h-4 w-4 text-muted-foreground ${settings.hideResults ? 'text-destructive' : 'group-hover:text-destructive'} transition-colors`} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">Hide Results</span>
                    <span className="text-[9px] text-muted-foreground font-mono tracking-widest font-bold">Prevent Spoilers</span>
                  </div>
                </div>
                <CustomToggle checked={settings.hideResults} onChange={toggleHideResults} />
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/[0.04] my-2" />

              <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Globe className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Timezone Override</span>
                </div>
                <div className="relative">
                  <select
                    value={settings.timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl px-4 py-3 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] appearance-none"
                  >
                    <option value="local" className="bg-[#030712]">🌍 Local Time (Browser)</option>
                    <option value="America/New_York" className="bg-[#030712]">🇺🇸 US Eastern (ET)</option>
                    <option value="America/Chicago" className="bg-[#030712]">🇺🇸 US Central (CT)</option>
                    <option value="America/Los_Angeles" className="bg-[#030712]">🇺🇸 US Pacific (PT)</option>
                    <option value="Europe/Madrid" className="bg-[#030712]">🇪🇺 Central European (CET)</option>
                    <option value="Asia/Tokyo" className="bg-[#030712]">🇯🇵 Japan Standard (JST)</option>
                  </select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none ml-2">
              {isLoggedIn ? (
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-chart-positive p-[2px] hover:scale-105 transition-transform duration-500 shadow-[0_0_25px_hsl(var(--primary)/0.3)]">
                  <div className="h-full w-full rounded-full bg-[#030712] flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/[0.02] border border-white/[0.1] hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:bg-primary/[0.05] transition-all duration-500 cursor-pointer flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover/95 backdrop-blur-3xl border border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] rounded-[1.5rem] p-2">
              <DropdownMenuLabel className="flex flex-col px-3 py-2">
                <span className="font-black tracking-tight text-foreground text-sm">{isLoggedIn ? "GM Profile" : "Guest Access"}</span>
                <span className="text-[9px] text-primary font-black uppercase tracking-[0.25em] mt-1 font-mono">{isLoggedIn ? "Premium Terminal" : "Local Sandbox"}</span>
              </DropdownMenuLabel>

              {!isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-white/[0.04] mb-2" />
                  <DropdownMenuItem className="focus:bg-primary/[0.08] rounded-xl cursor-pointer p-3 flex items-center gap-3 transition-colors" onClick={() => setShowAuth(true)}>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm text-primary tracking-wide">Sign In / Register</span>
                  </DropdownMenuItem>
                </>
              )}

              {isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-white/[0.04] mb-2" />
                  <DropdownMenuItem className="focus:bg-destructive/[0.08] rounded-xl cursor-pointer p-3 flex items-center gap-3 transition-colors" onClick={() => setIsLoggedIn(false)}>
                    <LogOut className="h-4 w-4 text-destructive" />
                    <span className="font-bold text-sm text-destructive tracking-wide">Secure Disconnect</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 🚀 ELITE AUTH MODAL */}
      <AnimatePresence>
        {showAuth && !isLoggedIn && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#050914]/95 backdrop-blur-3xl border border-white/[0.1] rounded-[2.5rem] w-full max-w-md p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
              
              <button onClick={() => setShowAuth(false)} className="absolute top-6 right-6 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors z-10">
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-10 relative z-10">
                <div className="w-16 h-16 bg-primary/[0.08] rounded-2xl border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">{authMode === 'login' ? 'Terminal Login' : 'Initialize GM'}</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mt-3 font-mono">
                  {authMode === 'login' ? 'Secure Authentication' : 'Create Access Credentials'}
                </p>
              </div>

              <form className="space-y-5 relative z-10" onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); setShowAuth(false); }}>
                {authMode === 'register' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2 block">Full Name</label>
                    <input type="text" required className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" placeholder="John Doe" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2 block">Email Address</label>
                  <input type="email" required className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" placeholder="analyst@team.com" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2 block">Password</label>
                  <input type="password" required className="w-full bg-[#000000]/40 border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" placeholder="••••••••" />
                </div>
                
                <button type="submit" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:brightness-110 text-primary-foreground font-black uppercase tracking-[0.2em] text-[11px] py-4 rounded-xl transition-all duration-300 mt-8 shadow-[0_0_30px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
                  {authMode === 'login' ? 'Authenticate' : 'Initialize Account'}
                </button>
              </form>

              <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-8 relative z-10 font-mono">
                {authMode === 'login' ? "No credentials? " : "Existing access? "}
                <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-primary hover:text-primary/80 transition-colors ml-1 border-b border-primary/30">
                  {authMode === 'login' ? 'Request here' : 'Sign in here'}
                </button>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}