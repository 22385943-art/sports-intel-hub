import { Search, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSport } from "@/contexts/SportContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

export function Header() {
  const { sportConfig } = useSport();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/5 bg-background/80 backdrop-blur-xl px-4">
      <SidebarTrigger />
      <div className="flex-1 flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${sportConfig.name} players, teams...`}
            className="pl-9 h-9 bg-white/5 border-white/5"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={toggle}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">LIVE</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </header>
  );
}
