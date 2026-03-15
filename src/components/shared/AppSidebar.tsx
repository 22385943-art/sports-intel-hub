import { LayoutDashboard, Users, Shield, BarChart3, GitCompare, ChevronDown, Trophy, Calendar, Star } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSport } from "@/contexts/SportContext";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarSeparator } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const { sport, sportConfig, allSports } = useSport();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/${sport}`;

  const navItems = [
    { title: "Dashboard", path: "", icon: LayoutDashboard },
    { title: "Schedule", path: "/schedule", icon: Calendar },
    { title: sportConfig.playerLabel, path: sport === "ufc" ? "/fighters" : "/players", icon: Users },
    ...(sport !== "ufc" ? [{ title: "Teams", path: "/teams", icon: Shield }] : []),
    ...(sport !== "ufc" ? [{ title: "Standings", path: "/standings", icon: Trophy }] : []),
    { title: "Favorites", path: "/favorites", icon: Star },
    { title: "Analytics", path: "/analytics", icon: BarChart3 },
    { title: "Compare", path: "/compare", icon: GitCompare },
  ];

  return (
    <Sidebar className="bg-[#030712]/95 backdrop-blur-2xl border-r border-white/[0.04]">
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full rounded-2xl px-3 py-3 hover:bg-white/[0.03] transition-all duration-300 text-left border border-transparent hover:border-white/[0.06] group">
            <span className="text-xl">{sportConfig.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate tracking-tight">{sportConfig.name}</p>
              <p className="text-[9px] text-slate-600 font-mono font-bold uppercase tracking-[0.2em]">Sports Intel</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-[#0a0f18] border-white/[0.06] backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]">
            {allSports.map((s) => (
              <DropdownMenuItem key={s.slug} disabled={!s.enabled} onClick={() => s.enabled && navigate(`/${s.slug}`)} className="gap-2 text-white hover:bg-white/[0.04] focus:bg-white/[0.04]">
                <span>{s.icon}</span><span className="font-bold text-sm">{s.name}</span>{!s.enabled && <span className="ml-auto text-[9px] text-slate-600 font-mono">Soon</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-white/[0.04]" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.25em] text-slate-600 font-black px-4">Navigation</SidebarGroupLabel>
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
                      <NavLink to={fullPath} end={item.path === ""} className={`gap-3 rounded-xl mx-2 px-3 py-2.5 transition-all duration-300 ${isActive
                        ? 'bg-cyan-500/[0.08] text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.06),inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : 'text-slate-500 hover:text-white hover:bg-white/[0.03] border border-transparent hover:border-white/[0.04]'}`}>
                        <item.icon className={`h-4 w-4 ${isActive ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]' : ''}`} />
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
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
          <p className="text-[9px] font-mono font-bold text-slate-700 uppercase tracking-[0.2em]">Platform v0.2.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}