import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Upload, Activity, Bot, Send, Zap, ChevronRight,
  Image as ImageIcon, X, FileText,
  LayoutDashboard, LogOut, User, History, Settings,
  Shield, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AttachedFile {
  name: string;
  type: "image" | "text";
  content: string;
  dataUrl?: string;
}

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

const navGroups: NavGroup[] = [
  {
    title: "Monitor",
    icon: Activity,
    items: [
      { title: "Live Monitoring", url: "/monitoring", icon: Activity, dot: true },
      { title: "Analyze Logs", url: "/analyze", icon: Upload },
    ],
  },
  {
    title: "Investigate",
    icon: Bot,
    items: [
      { title: "Ask AI", url: "/ask-ai", icon: Bot },
      { title: "History", url: "/history", icon: History },
    ],
  },
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
];

const SUGGESTIONS = [
  "What are the most common attack patterns in my logs?",
  "Explain brute force attacks and how to detect them",
  "How do I identify port scanning activity?",
  "What does a DNS tunneling attack look like?",
];

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Monitor: true, Investigate: true, Overview: true,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAsk = () => {
    const q = query.trim();
    if (!q && attachedFiles.length === 0) return;
    const textFiles = attachedFiles.filter((f) => f.type === "text");
    const imageFiles = attachedFiles.filter((f) => f.type === "image");
    let fullMessage = q;
    if (textFiles.length > 0) {
      const ctx = textFiles.map((f) => `\n\n--- Attached file: ${f.name} ---\n${f.content}`).join("");
      fullMessage = q ? q + ctx : `Analyze the following attached file(s):${ctx}`;
    }
    if (imageFiles.length > 0 && !fullMessage) fullMessage = imageFiles.map((f) => f.content).join(" ");
    navigate("/ask-ai", {
      state: {
        initialMessage: fullMessage,
        initialAttachments: attachedFiles.map((f) => ({ name: f.name, type: f.type, dataUrl: f.dataUrl })),
      },
    });
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif)$/i.test(file.name);
    if (!isImage) {
      toast({ title: "Invalid file", description: "Please select an image file (JPG, PNG, GIF, WebP, etc.).", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedFiles((prev) => [...prev, { name: file.name, type: "image", content: `[Image attached: ${file.name}]`, dataUrl: ev.target?.result as string }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleLogout = () => { logout(); navigate("/", { replace: true }); };

  const toggleGroup = (title: string) => setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const canSend = query.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div className="min-h-screen dark flex relative">

      {/* ── Collapsible Sidebar ── */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarExpanded ? "w-56" : "w-14"
        }`}
        style={{ zIndex: 40 }}
      >
        {/* Brand */}
        <div className="h-14 border-b border-sidebar-border flex items-center px-3 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary shrink-0">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className={`transition-all duration-200 overflow-hidden ${sidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"}`}>
            <p className="text-sm font-bold text-foreground whitespace-nowrap leading-tight">Thread Lens</p>
            <p className="text-[10px] text-primary/80 uppercase tracking-widest whitespace-nowrap">Security</p>
          </div>
        </div>

        {/* Home item */}
        <div className="px-2 pt-3 pb-1">
          <SidebarItem
            item={{ title: "Home", url: "/", icon: Shield }}
            active={true}
            expanded={sidebarExpanded}
            onClick={() => {}}
          />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-2 py-1 space-y-1 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title}>
              {sidebarExpanded ? (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`home-sidebar-group-${group.title.toLowerCase()}`}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{group.title}</span>
                  </div>
                  <ChevronUp className={`w-3 h-3 transition-transform duration-200 ${openGroups[group.title] ? "rotate-0" : "rotate-180"}`} />
                </button>
              ) : (
                <div className="flex items-center justify-center h-8 text-muted-foreground/40">
                  <group.icon className="w-3.5 h-3.5" />
                </div>
              )}
              <div className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                sidebarExpanded
                  ? openGroups[group.title] ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  : "max-h-96 opacity-100"
              }`}>
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.url}
                    item={item}
                    active={false}
                    expanded={sidebarExpanded}
                    onClick={() => navigate(item.url)}
                    indented={sidebarExpanded}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border px-2 py-3 space-y-1">
          {bottomNavItems.map((item) => (
            <SidebarItem
              key={item.url}
              item={item}
              active={false}
              expanded={sidebarExpanded}
              onClick={() => navigate(item.url)}
            />
          ))}

          {sidebarExpanded && (
            <div className="glass-panel rounded-lg px-3 py-2 mt-1">
              <p className="text-[10px] text-muted-foreground">System Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-safe shrink-0" />
                <span className="text-[10px] text-safe font-medium whitespace-nowrap">All Systems Normal</span>
              </div>
            </div>
          )}

          {/* User row */}
          <div className={`flex items-center gap-2 px-1 pt-1 ${!sidebarExpanded && "justify-center"}`}>
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            {sidebarExpanded && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate whitespace-nowrap">{user?.name ?? "Analyst"}</p>
                  <p className="text-[10px] text-muted-foreground truncate whitespace-nowrap">{user?.email ?? ""}</p>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="button-sidebar-logout"
                  title="Sign out"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Right: top bar + content ── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-foreground">Home</span>
          </div>

          {/* Avatar dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              data-testid="button-home-profile-menu"
              title="Account"
              className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-colors"
            >
              <User className="w-4 h-4 text-primary" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-56 glass-panel rounded-xl border border-border shadow-lg z-50 py-1 animate-fade-in">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "Analyst"}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email ?? ""}</p>
                </div>
                <div className="py-1">
                  <DropdownItem icon={User} label="Profile" onClick={() => { setMenuOpen(false); navigate("/profile"); }} testId="menu-item-profile" />
                  <DropdownItem icon={Settings} label="Settings" onClick={() => { setMenuOpen(false); navigate("/settings"); }} testId="menu-item-settings" />
                </div>
                <div className="border-t border-border py-1">
                  <DropdownItem icon={LogOut} label="Sign out" onClick={() => { setMenuOpen(false); handleLogout(); }} testId="menu-item-logout" danger />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-foreground">
                {greeting}, {user?.name ?? "Analyst"}
              </h1>
              <p className="text-muted-foreground">What would you like to investigate today?</p>
            </div>

            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex gap-2">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                  placeholder={attachedFiles.length > 0 ? "Add a message or send as-is..." : "Ask anything about your logs or security threats..."}
                  rows={3}
                  data-testid="input-home-query"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none text-sm leading-relaxed"
                />
                <div className="flex flex-col gap-1.5 self-end">
                  <button onClick={() => imageInputRef.current?.click()} data-testid="button-home-attach-image" title="Attach image" className="cyber-btn !px-2.5 !py-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleAsk} data-testid="button-home-ask" disabled={!canSend} className="cyber-btn !px-2.5 !py-1.5 disabled:opacity-40">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground" data-testid={`home-attachment-preview-${idx}`}>
                      {file.type === "image" && file.dataUrl
                        ? <img src={file.dataUrl} alt={file.name} className="h-5 w-5 rounded object-cover" />
                        : <FileText className="w-3.5 h-3.5 text-primary" />}
                      <span className="max-w-[140px] truncate">{file.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors" data-testid={`button-home-remove-attachment-${idx}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={`flex flex-wrap gap-2 ${attachedFiles.length === 0 ? "border-t border-border pt-3" : ""}`}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQuery(s)} className="text-xs px-3 py-1.5 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageAttach} data-testid="input-home-image-upload" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ActionCard icon={Upload} title="Upload Logs" description="Parse and analyze log files up to 10 GB with threat detection" color="primary" onClick={() => navigate("/analyze")} testId="card-upload-logs" />
              <ActionCard icon={Activity} title="Live Monitoring" description="Stream real-time logs and detect threats as they happen" color="safe" onClick={() => navigate("/monitoring")} testId="card-live-monitoring" />
              <ActionCard icon={Bot} title="Ask AI" description="Chat with your AI security analyst about any threat or log" color="accent" onClick={() => navigate("/ask-ai")} testId="card-ask-ai" />
            </div>

            <div className="text-center">
              <button onClick={() => navigate("/dashboard")} data-testid="button-view-dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Zap className="w-4 h-4 text-primary" />
                View full security dashboard
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

/* ── Sidebar helpers ── */

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
      data-testid={`home-sidebar-item-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      title={!expanded ? item.title : undefined}
      className={`w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${
        expanded ? `px-3 py-2 ${indented ? "pl-6" : ""}` : "justify-center p-2"
      } ${
        active
          ? "bg-primary/15 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {expanded && <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">{item.title}</span>}
      {expanded && item.dot && <span className="w-1.5 h-1.5 rounded-full bg-safe pulse-dot shrink-0" />}
    </button>
  );
}

/* ── Dropdown helper ── */

interface DropdownItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  testId: string;
  danger?: boolean;
}

function DropdownItem({ icon: Icon, label, onClick, testId, danger }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted/60"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}

/* ── Action cards ── */

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: "primary" | "safe" | "accent";
  onClick: () => void;
  testId: string;
}

const colorMap = {
  primary: "bg-primary/10 text-primary group-hover:bg-primary/20",
  safe: "bg-safe/10 text-safe group-hover:bg-safe/20",
  accent: "bg-accent/10 text-accent group-hover:bg-accent/20",
};

function ActionCard({ icon: Icon, title, description, color, onClick, testId }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="group glass-panel rounded-xl p-5 text-left hover:border-primary/40 transition-all duration-200 space-y-3 w-full"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        Get started <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  );
}

export default Home;
