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
    <Sidebar>
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full rounded-md px-2 py-2 hover:bg-white/5 transition-colors text-left">
            <span className="text-xl">{sportConfig.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {sportConfig.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Sports Intel
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {allSports.map((s) => (
              <DropdownMenuItem
                key={s.slug}
                disabled={!s.enabled}
                onClick={() => s.enabled && navigate(`/${s.slug}`)}
                className="gap-2"
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
                {!s.enabled && (
                  <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-white/5" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
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
                        className="gap-3"
                        activeClassName="bg-white/5 text-primary border-l-2 border-primary"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
        <div className="rounded-md bg-white/5 p-3">
          <p className="text-xs font-mono text-muted-foreground">
            Platform v0.2.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
