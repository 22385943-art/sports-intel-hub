// 🚀 1. Importa el icono Flame
import { LayoutDashboard, Users, Shield, BarChart3, GitCompare, ChevronDown, Trophy, Calendar, Star, ListOrdered, Flame } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarSeparator } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const { sport, sportConfig, allSports } = useSport();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/${sport}`;

  // 🚀 2. Añade Clutch Kings a los NavItems
  const navItems = [
    { title: "Dashboard", path: "", icon: LayoutDashboard },
    { title: "Schedule", path: "/schedule", icon: Calendar },
    { title: sportConfig.playerLabel, path: sport === "ufc" ? "/fighters" : "/players", icon: Users },
    ...(sport !== "ufc" ? [{ title: "Teams", path: "/teams", icon: Shield }] : []),
    ...(sport !== "ufc" ? [{ title: "Standings", path: "/standings", icon: Trophy }] : []),
    ...(sport !== "ufc" ? [{ title: "Rankings", path: "/rankings", icon: ListOrdered }] : []),
    ...(sport !== "ufc" ? [{ title: "Season Awards Tracker", path: "/awards", icon: Trophy }] : []), // AÑADIDO AQUI
    { title: "Favorites", path: "/favorites", icon: Star },
    { title: "Analytics", path: "/analytics", icon: BarChart3 },
    { title: "Compare", path: "/compare", icon: GitCompare },
  ];

  return (
    <Sidebar className="bg-sidebar-background/80 backdrop-blur-2xl border-r border-border/50">
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 w-full rounded-xl px-3 py-3 hover:bg-white/[0.03] transition-all duration-300 text-left border border-transparent hover:border-white/[0.06] group">
            <span className="text-xl">{sportConfig.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black tracking-tight text-foreground truncate">{sportConfig.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-[0.25em]">Intel Hub</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 bg-popover/90 backdrop-blur-2xl border-border/50 shadow-2xl">
            {allSports.map((s) => (
              <DropdownMenuItem
                key={s.slug}
                disabled={!s.enabled}
                onClick={() => s.enabled && navigate(`/${s.slug}`)}
                className="gap-3 text-foreground hover:bg-white/[0.04] focus:bg-white/[0.04] rounded-lg transition-colors"
              >
                <span>{s.icon}</span>
                <span className="font-semibold text-sm">{s.name}</span>
                {!s.enabled && <span className="ml-auto text-[9px] text-muted-foreground font-mono uppercase tracking-widest">Soon</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-border/30" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-extrabold px-5 mb-1">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const fullPath = `${basePath}${item.path}`;
                const isActive = item.path === ""
                  ? location.pathname === basePath || location.pathname === `${basePath}/`
                  : location.pathname.startsWith(fullPath);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={fullPath}
                        end={item.path === ""}
                        className={`gap-3 rounded-xl mx-2 px-3 py-2.5 transition-all duration-300 ease-out ${
                          isActive
                            ? 'bg-primary/[0.08] text-primary border border-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.08),inset_0_1px_1px_rgba(255,255,255,0.04)]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05]'
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]' : ''}`} />
                        <span className="text-xs font-bold">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/[0.05] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
          <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-[0.25em]">Platform v0.2.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}