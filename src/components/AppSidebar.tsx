import { useState, useEffect } from "react";
import {
  Home, LayoutDashboard, Activity, Search, History, Bot,
  Settings, Shield, LogOut, User, ChevronUp, Lock, Unlock, Pin, PinOff,
  Sparkles, CreditCard, Wrench, Rocket,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  dot?: boolean;
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

const topItems: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
];

const navGroups: NavGroup[] = [
  {
    title: "Monitor",
    icon: Activity,
    items: [
      { title: "Live Monitoring", url: "/monitoring", icon: Activity, dot: true },
      { title: "Analyze Logs", url: "/analyze", icon: Search },
    ],
  },
  {
    title: "Investigate",
    icon: Bot,
    items: [
      { title: "Ask AI", url: "/ask-ai", icon: Bot },
      { title: "Tools", url: "/tools", icon: Wrench },
      { title: "History", url: "/history", icon: History },
    ],
  },
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Upcoming Features", url: "/upcoming", icon: Rocket },
    ],
  },
];

const bottomItems: NavItem[] = [
  { title: "Pricing & Plans", url: "/pricing", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLocked, setIsLocked] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_locked");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isHovered, setIsHovered] = useState(false);

  const expanded = isLocked || isHovered;

  const toggleLock = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsLocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_locked", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Monitor: true,
    Investigate: true,
    Overview: true,
  });

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.url));

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none z-40 overflow-hidden ${
        expanded ? "w-56" : "w-14"
      }`}
    >
      {/* ── Brand & Lock Section ── */}
      <div className="border-b border-sidebar-border shrink-0 bg-sidebar/80 backdrop-blur-sm">
        <div className="h-14 flex items-center px-3 gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className={`transition-all duration-200 overflow-hidden ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"}`}>
              <p className="text-sm font-bold text-foreground whitespace-nowrap leading-tight">Thread Lens</p>
              <p className="text-[10px] text-primary/80 uppercase tracking-widest whitespace-nowrap">Security</p>
            </div>
          </div>

          {/* Top Pin/Lock quick toggle icon */}
          {expanded && (
            <button
              onClick={toggleLock}
              title={isLocked ? "Unlock Sidebar (auto-collapse on mouse leave)" : "Lock Sidebar open"}
              className={`p-1.5 rounded-md transition-colors shrink-0 ${
                isLocked
                  ? "text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Lock Option Button right below Thread Lens */}
        {expanded && (
          <div className="px-2.5 pb-2.5 pt-0.5">
            <button
              onClick={toggleLock}
              data-testid="sidebar-lock-toggle"
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all border ${
                isLocked
                  ? "bg-primary/15 border-primary/30 text-primary font-medium shadow-sm"
                  : "bg-sidebar-accent/40 border-sidebar-border/80 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:border-sidebar-border"
              }`}
              title={isLocked ? "Sidebar is locked open. Click to allow auto-sliding." : "Sidebar slides on hover. Click to lock open."}
            >
              <div className="flex items-center gap-2">
                {isLocked ? <Lock className="w-3.5 h-3.5 text-primary" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {isLocked ? "Menu Locked" : "Lock Menu"}
                </span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase tracking-wider ${
                  isLocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {isLocked ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Scrollable middle section for nav items ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-cyber py-2 space-y-1">
        {/* Top standalone items */}
        <div className="px-2 pb-1 space-y-0.5">
          {topItems.map((item) => (
            <SidebarItem
              key={item.url}
              item={item}
              active={isActive(item.url)}
              expanded={expanded}
              onClick={() => navigate(item.url)}
            />
          ))}
        </div>

        {/* Grouped nav */}
        <nav className="px-2 space-y-1">
          {navGroups.map((group) => (
            <div key={group.title}>
              {/* Group header */}
              {expanded ? (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors group ${
                    isGroupActive(group) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`sidebar-group-${group.title.toLowerCase()}`}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                      {group.title}
                    </span>
                  </div>
                  <ChevronUp
                    className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                      openGroups[group.title] ? "rotate-0" : "rotate-180"
                    }`}
                  />
                </button>
              ) : (
                /* Collapsed: show group icon as separator/hint */
                <div className={`flex items-center justify-center h-8 ${isGroupActive(group) ? "text-primary" : "text-muted-foreground/40"}`}>
                  <group.icon className="w-3.5 h-3.5" />
                </div>
              )}

              {/* Group items */}
              <div
                className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                  expanded
                    ? openGroups[group.title]
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                    : "max-h-96 opacity-100"
                }`}
              >
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.url}
                    item={item}
                    active={isActive(item.url)}
                    expanded={expanded}
                    onClick={() => navigate(item.url)}
                    indented={expanded}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* ── Bottom section (Always docked and fixed to bottom of screen) ── */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-1 shrink-0 bg-sidebar">
        {bottomItems.map((item) => (
          <SidebarItem
            key={item.url}
            item={item}
            active={isActive(item.url)}
            expanded={expanded}
            onClick={() => navigate(item.url)}
          />
        ))}

        {/* System status (expanded only) */}
        {expanded && (
          <div className="glass-panel rounded-lg px-3 py-2 mt-2">
            <p className="text-[10px] text-muted-foreground">System Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-safe shrink-0" />
              <span className="text-[10px] text-safe font-medium whitespace-nowrap">All Systems Normal</span>
            </div>
          </div>
        )}

        {/* User row */}
        <div className={`flex items-center gap-2 px-1 pt-1 ${!expanded && "justify-center"}`}>
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          {expanded && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate whitespace-nowrap">{user?.name ?? "Analyst"}</p>
              <p className="text-[10px] text-muted-foreground truncate whitespace-nowrap">{user?.email ?? ""}</p>
            </div>
          )}
          {expanded && (
            <button
              onClick={handleLogout}
              data-testid="button-logout"
              title="Sign out"
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
  indented?: boolean;
}

function SidebarItem({ item, active, expanded, onClick, indented }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      data-testid={`sidebar-item-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      title={!expanded ? item.title : undefined}
      className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${
        expanded ? `px-3 py-2 ${indented ? "pl-5" : ""}` : "justify-center p-2"
      } ${
        active
          ? "bg-primary/15 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {expanded && (
        <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">{item.title}</span>
      )}
      {expanded && item.dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-safe pulse-dot shrink-0" />
      )}
    </button>
  );
}
