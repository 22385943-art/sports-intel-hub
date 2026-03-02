import {
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  GitCompare,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useSport, SPORTS } from "@/contexts/SportContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export function AppSidebar() {
  const { sport, sportConfig, allSports } = useSport();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/${sport}`;

  const navItems = [
    { title: "Dashboard", path: "", icon: LayoutDashboard },
    { title: sportConfig.playerLabel, path: "/players", icon: Users },
    ...(sport !== "ufc" ? [{ title: "Teams", path: "/teams", icon: Shield }] : []),
    { title: "Analytics", path: "/analytics", icon: BarChart3 },
    { title: "Compare", path: "/compare", icon: GitCompare },
  ];

  return (
    <Sidebar className="bg-[#111] border-r border-[#1f1f1f]">
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors text-left border border-transparent hover:border-[#2a2a2a]">
            <span className="text-xl">{sportConfig.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {sportConfig.name}
              </p>
              <p className="text-[10px] text-[#555] font-mono font-bold uppercase tracking-widest">
                Sports Intel
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-[#555]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-[#1a1a1a] border-[#2a2a2a]">
            {allSports.map((s) => (
              <DropdownMenuItem
                key={s.slug}
                disabled={!s.enabled}
                onClick={() => s.enabled && navigate(`/${s.slug}`)}
                className="gap-2 text-white hover:bg-[#222] focus:bg-[#222]"
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
                {!s.enabled && (
                  <span className="ml-auto text-[10px] text-[#555]">Soon</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-[#1f1f1f]" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-[#555] font-black px-4">
            Navigation
          </SidebarGroupLabel>
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
                        className={`gap-3 rounded-xl mx-2 px-3 py-2.5 transition-all duration-200 ${isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]' : 'text-[#888] hover:text-white hover:bg-[#1a1a1a] border border-transparent'}`}
                        activeClassName=""
                      >
                        <item.icon className="h-4 w-4" />
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
        <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-3">
          <p className="text-[10px] font-mono font-bold text-[#555] uppercase tracking-widest">
            Platform v0.2.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
