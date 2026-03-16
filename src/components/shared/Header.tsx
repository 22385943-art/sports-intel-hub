import { useState, useEffect, useRef } from "react";
import { Search, Bell, Settings, LogOut, User, Globe, RefreshCw, X, ShieldCheck, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { nbaService } from "@/services/sportServiceFactory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/useSettings";

const CustomToggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); onChange(); }}
    className={`w-10 h-5 rounded-full relative transition-all duration-300 focus:outline-none ${checked ? 'bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]' : 'bg-muted'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground transition-transform duration-300 shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
      <header className="h-16 border-b border-border/30 bg-background/60 backdrop-blur-2xl sticky top-0 z-40 px-6 flex items-center justify-between shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
        {/* Search */}
        <div className="relative w-full max-w-xl" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setIsOpen(true)}
              placeholder="Search players, teams, stats..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] focus:shadow-[0_0_25px_hsl(var(--primary)/0.08)] transition-all duration-300 backdrop-blur-sm"
            />
          </div>

          {isOpen && (results.players.length > 0 || results.teams.length > 0) && (
            <div className="absolute top-full mt-2 w-full bg-popover/90 backdrop-blur-2xl border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 z-50">
              {results.teams.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1 text-[9px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Franchises</div>
                  {results.teams.map(t => (
                    <div key={t.id} onClick={() => navigate(`/nba/teams/${t.abbreviation}`)} className="px-4 py-2.5 hover:bg-white/[0.04] cursor-pointer flex items-center gap-3 transition-all duration-200 rounded-lg mx-1">
                      <img src={nbaService.getTeamLogoUrl(t.abbreviation)} className="w-6 h-6 object-contain" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono">{t.conference} Conf</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {results.players.length > 0 && (
                <div>
                  <div className="px-4 py-1 text-[9px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Athletes</div>
                  {results.players.map(p => (
                    <div key={p.id} onClick={() => navigate(`/nba/players/${p.id}`)} className="px-4 py-2.5 hover:bg-white/[0.04] cursor-pointer flex items-center gap-3 transition-all duration-200 rounded-lg mx-1">
                      <Avatar className="h-8 w-8 border border-white/[0.08] bg-card">
                        <AvatarImage src={p.imageUrl} className="object-cover" />
                        <AvatarFallback className="text-[10px] font-mono font-bold">{p.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-tight">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono">{p.teamId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 text-muted-foreground hover:text-primary transition-colors duration-300 relative outline-none">
              <Bell className="h-5 w-5" />
              {notifSettings.gameStarts && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border border-background animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-popover/90 backdrop-blur-2xl border border-white/[0.06] shadow-2xl p-2 rounded-xl">
              <DropdownMenuLabel className="font-extrabold text-[10px] uppercase tracking-[0.25em] text-muted-foreground px-2 py-1">Push Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30 mb-1" />
              {([
                { key: "gameStarts", label: "Live Game Starts" },
                { key: "finalScores", label: "Final Scores" },
                { key: "injuries", label: "Injury Updates" },
              ] as const).map(({ key, label }) => (
                <DropdownMenuItem key={key} onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">{label}</span>
                  <CustomToggle checked={notifSettings[key]} onChange={() => setNotifSettings(p => ({ ...p, [key]: !p[key] }))} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 text-muted-foreground hover:text-primary transition-colors duration-300 outline-none">
              <Settings className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-popover/90 backdrop-blur-2xl border border-white/[0.06] shadow-2xl rounded-xl p-2">
              <DropdownMenuLabel className="font-extrabold text-[10px] uppercase tracking-[0.25em] text-muted-foreground">App Settings</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30" />

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-lg p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">Auto-Refresh API</span>
                </div>
                <CustomToggle checked={settings.autoRefresh} onChange={toggleAutoRefresh} />
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/[0.03] cursor-default rounded-lg p-3 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">Hide Results</span>
                    <span className="text-[9px] text-muted-foreground font-mono">Prevent spoilers</span>
                  </div>
                </div>
                <CustomToggle checked={settings.hideResults} onChange={toggleHideResults} />
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border/30" />

              <div className="px-2 py-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-bold text-foreground">Timezone</span>
                </div>
                <select
                  value={settings.timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
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

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              {isLoggedIn ? (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-chart-positive border-2 border-white/[0.08] ml-1 hover:scale-110 transition-all duration-300 cursor-pointer shadow-[0_0_15px_hsl(var(--primary)/0.25)] flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/[0.03] border-2 border-white/[0.08] ml-1 hover:border-primary/40 hover:shadow-[0_0_12px_hsl(var(--primary)/0.1)] transition-all duration-300 cursor-pointer flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover/90 backdrop-blur-2xl border border-white/[0.06] shadow-2xl rounded-xl">
              <DropdownMenuLabel className="font-bold text-foreground flex flex-col">
                <span>{isLoggedIn ? "GM Profile" : "Guest User"}</span>
                <span className="text-xs text-muted-foreground font-normal">{isLoggedIn ? "Premium Access" : "Sign in to sync data"}</span>
              </DropdownMenuLabel>

              {!isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem className="focus:bg-primary/[0.06] cursor-pointer gap-2 text-primary" onClick={() => setShowAuth(true)}>
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-bold text-sm">Sign In / Register</span>
                  </DropdownMenuItem>
                </>
              )}

              {isLoggedIn && (
                <>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem className="focus:bg-destructive/[0.06] cursor-pointer gap-2 text-destructive" onClick={() => setIsLoggedIn(false)}>
                    <LogOut className="h-4 w-4" />
                    <span className="font-bold text-sm">Log out</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuth && !isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-xl animate-in fade-in duration-300 p-4">
          <div className="bg-card/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl w-full max-w-md p-8 shadow-2xl relative animate-in slide-in-from-bottom-8 shadow-[0_0_60px_hsl(var(--primary)/0.05)]">
            <button onClick={() => setShowAuth(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary/[0.08] rounded-2xl border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {authMode === 'login' ? 'Enter your credentials to access your terminal.' : 'Join the elite sports analytics platform.'}
              </p>
            </div>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); setShowAuth(false); }}>
              {authMode === 'register' && (
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground mb-1.5 block">Full Name</label>
                  <input type="text" required className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:shadow-[0_0_15px_hsl(var(--primary)/0.08)] transition-all" placeholder="John Doe" />
                </div>
              )}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground mb-1.5 block">Email Address</label>
                <input type="email" required className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:shadow-[0_0_15px_hsl(var(--primary)/0.08)] transition-all" placeholder="analyst@team.com" />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground mb-1.5 block">Password</label>
                <input type="password" required className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:shadow-[0_0_15px_hsl(var(--primary)/0.08)] transition-all" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3.5 rounded-xl transition-all mt-4 shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>
            <p className="text-center text-xs text-muted-foreground font-bold mt-6">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-primary hover:text-foreground transition-colors">
                {authMode === 'login' ? 'Register here' : 'Sign in here'}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
