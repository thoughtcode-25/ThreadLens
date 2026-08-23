import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Search, ArrowRight, CheckCircle2, ChevronDown, ChevronRight,
  Terminal, Activity, Lock, Cpu, Database, Zap, FileText, Globe,
  Server, BarChart3, AlertTriangle, Play, Sparkles, Layers,
  ExternalLink, HelpCircle, Users, Check, X, ShieldAlert,
  Sliders, Eye, Network, FileSearch, ArrowUpRight, Compass,
  FolderGit2, Clock, GitCommit, GitBranch, RefreshCw, Key,
  CheckCircle, Workflow, AlertCircle, Menu, Flame
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Announcement bar state
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  // Scroll listener for sticky compact navbar
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mega-menu & Search states
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard shortcut for search (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setActiveMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Interactive Workflow state (Section 11)
  const workflowStages = [
    {
      id: "detect",
      label: "DETECT",
      title: "Identify Suspicious Events",
      description: "Continuously scan ingested security telemetry for anomalies, brute force attempts, unauthorized token usage, and MITRE-aligned adversary techniques.",
      icon: Activity,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/30",
    },
    {
      id: "connect",
      label: "CONNECT",
      title: "Correlate Related Evidence",
      description: "Automatically link authentication events, IP telemetry, endpoint commands, and privilege changes into a unified multi-stage attack sequence.",
      icon: Network,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
    {
      id: "explain",
      label: "EXPLAIN",
      title: "AI Forensic Reasoning",
      description: "Groq-accelerated LLM reasoning analyzes raw evidence, cuts through noisy logs, and generates a plain-English explanation of attacker intent.",
      icon: Cpu,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    },
    {
      id: "decide",
      label: "DECIDE",
      title: "Evaluate Risk & Next Steps",
      description: "Assess blast radius, determine true vs false positives, and formulate surgical containment strategies with human-reviewed confidence scores.",
      icon: Sliders,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/30",
    },
    {
      id: "respond",
      label: "RESPOND",
      title: "Take Controlled Action",
      description: "Move directly from forensic evidence to action — block malicious IPs, revoke compromised tokens, and export tamper-proof audit reports.",
      icon: Shield,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    },
  ];
  const [activeWorkflowIndex, setActiveWorkflowIndex] = useState(0);

  // Search Results Filtering
  const searchResults = [
    { title: "Pricing & Plans (Free, Monthly, Yearly)", category: "Pricing", link: "/pricing", desc: "Compare telemetry quotas, AI credits, storage buffers and SLA details." },
    { title: "AI Forensic Investigation Engine", category: "Platform", link: "#platform-features", desc: "Automated attack sequence reconstruction with contextual AI reasoning." },
    { title: "Threat Detection & Alert Correlation", category: "Platform", link: "#platform-features", desc: "Real-time log parsing and rule-based anomaly detection." },
    { title: "Application Log Analysis", category: "Solutions", link: "#solutions", desc: "Deep log forensic analytics for backend services and web applications." },
    { title: "Incident Response Playbooks", category: "Solutions", link: "#workflow", desc: "Human-approved response actions and containment workflows." },
    { title: "MITRE ATT&CK Mapping (Roadmap)", category: "Roadmap", link: "#future-tech", desc: "Tactics & Techniques alignment for structured threat hunting." },
    { title: "Multi-Agent Security Architecture", category: "Roadmap", link: "#future-tech", desc: "Autonomous multi-agent correlation and risk triage." },
    { title: "Log Ingestion Documentation", category: "Documentation", link: "#resources", desc: "Guide on streaming Syslog, JSON, Apache, and EVTX formats." },
  ].filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-primary/30 selection:text-primary relative z-10">
      
      {/* ── 1. TOP ANNOUNCEMENT BAR ── */}
      {showAnnouncement && (
        <aside aria-label="Announcement" className="bg-[#131c2e] border-b border-slate-700/80 px-4 py-2 text-xs flex items-center justify-between gap-3 text-slate-300 relative z-50">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="text-primary font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              Introducing ThreadLens AI
            </span>
            <span className="hidden md:inline text-slate-400">—</span>
            <span className="text-slate-300">From raw logs to actionable security intelligence.</span>
            <a
              href="#platform-features"
              className="text-primary hover:text-primary/90 font-medium inline-flex items-center gap-0.5 ml-1 transition-colors hover:underline"
            >
              Learn more <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          <button
            onClick={() => setShowAnnouncement(false)}
            aria-label="Dismiss announcement"
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* ── 2. MAIN STICKY NAVIGATION ── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled
            ? "bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-700/90 shadow-xl shadow-black/30 py-2.5"
            : "bg-[#0f172a]/85 backdrop-blur-sm border-b border-slate-700/50 py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-cyan-500 p-[1.5px] shadow-lg shadow-primary/20 flex items-center justify-center">
                  <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary group-hover:scale-105 transition-transform" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white tracking-tight leading-none">THREADLENS</span>
                  <span className="text-[9px] uppercase font-semibold tracking-widest text-primary/90 mt-0.5">AI Security Forensics</span>
                </div>
              </Link>

              {/* Desktop Center Navigation with Elastic Security Style Mega-Menus */}
              <nav className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-slate-300">
                
                {/* ── 1. PLATFORM MEGA-MENU ── */}
                <div
                  className="relative"
                  onMouseEnter={() => setActiveMenu("platform")}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <button
                    onClick={() => setActiveMenu(activeMenu === "platform" ? null : "platform")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-150 ${
                      activeMenu === "platform"
                        ? "text-white bg-slate-800/90 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <span>Platform</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === "platform" ? "rotate-180 text-primary" : "text-slate-400"}`} />
                  </button>
                  
                  {activeMenu === "platform" && (
                    <div className="absolute top-full left-0 mt-1.5 w-[640px] bg-[#131c2e] border border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10 rounded-2xl p-6 grid grid-cols-2 gap-6 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150 z-50">
                      <div>
                        <p className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          Security Intelligence
                        </p>
                        <ul className="space-y-2.5">
                          <li>
                            <a href="#platform-features" onClick={() => setActiveMenu(null)} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Threat Detection</p>
                                <p className="text-xs text-slate-300 leading-snug mt-0.5">Identify brute force & anomalies across raw logs.</p>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#platform-features" onClick={() => setActiveMenu(null)} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                <FileSearch className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Log Intelligence</p>
                                <p className="text-xs text-slate-300 leading-snug mt-0.5">Parse and normalize Syslog, JSON, Apache, EVTX.</p>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#ai-forensics" onClick={() => setActiveMenu(null)} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                                <Cpu className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">AI Forensic Reasoning</p>
                                <p className="text-xs text-slate-300 leading-snug mt-0.5">Groq LLaMA 3.3 70B automated root-cause analysis.</p>
                              </div>
                            </a>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" />
                          Security Operations
                        </p>
                        <ul className="space-y-2.5">
                          <li>
                            <a href="#hero-visual" onClick={() => setActiveMenu(null)} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <Activity className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Live Monitoring</p>
                                <p className="text-xs text-slate-300 leading-snug mt-0.5">Real-time telemetry streams & instant alerts.</p>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#timeline-section" onClick={() => setActiveMenu(null)} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <Network className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Evidence Timeline</p>
                                <p className="text-xs text-slate-300 leading-snug mt-0.5">Reconstruct chronological attack stages.</p>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#workflow" onClick={() => setActiveMenu(null)} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                <Shield className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors">Incident Response</p>
                                <p className="text-xs text-slate-300 leading-snug mt-0.5">Move from forensic proof to surgical containment.</p>
                              </div>
                            </a>
                          </li>
                        </ul>
                      </div>

                      <div className="col-span-2 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Next-gen AI forensic operations platform</span>
                        <a href="#platform-features" onClick={() => setActiveMenu(null)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                          Explore Platform Overview →
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 2. SOLUTIONS MEGA-MENU ── */}
                <div
                  className="relative"
                  onMouseEnter={() => setActiveMenu("solutions")}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <button
                    onClick={() => setActiveMenu(activeMenu === "solutions" ? null : "solutions")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-150 ${
                      activeMenu === "solutions"
                        ? "text-white bg-slate-800/90 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <span>Solutions</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === "solutions" ? "rotate-180 text-primary" : "text-slate-400"}`} />
                  </button>

                  {activeMenu === "solutions" && (
                    <div className="absolute top-full left-0 mt-1.5 w-[660px] bg-[#131c2e] border border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10 rounded-2xl p-6 grid grid-cols-3 gap-5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150 z-50">
                      <div>
                        <p className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Security Teams
                        </p>
                        <ul className="space-y-2.5">
                          <li>
                            <a href="#solutions" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">SOC Analysts</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Reduce triage time with AI forensic reasoning.</p>
                            </a>
                          </li>
                          <li>
                            <a href="#solutions" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Incident Responders</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Surgical mitigation & containment playbooks.</p>
                            </a>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" />
                          DevOps & Cloud
                        </p>
                        <ul className="space-y-2.5">
                          <li>
                            <a href="#solutions" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">App Log Forensics</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Trace suspicious backend spikes & API abuses.</p>
                            </a>
                          </li>
                          <li>
                            <a href="#solutions" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Server & SSH Defense</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Audit host telemetry & failed authentication.</p>
                            </a>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          SMB & Startups
                        </p>
                        <ul className="space-y-2.5">
                          <li>
                            <a href="#solutions" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Lean SecOps</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Forensic intelligence without enterprise bloat or overhead.</p>
                            </a>
                          </li>
                        </ul>
                      </div>

                      <div className="col-span-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Tailored solutions across engineering & SecOps</span>
                        <a href="#solutions" onClick={() => setActiveMenu(null)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                          Explore All Solutions →
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 3. PRICING DIRECT LINK ── */}
                <Link
                  to="/pricing"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-150 group"
                >
                  <span className="group-hover:text-primary transition-colors">Pricing</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 leading-none">
                    Plans
                  </span>
                </Link>

                {/* ── 4. RESOURCES MEGA-MENU ── */}
                <div
                  className="relative"
                  onMouseEnter={() => setActiveMenu("resources")}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <button
                    onClick={() => setActiveMenu(activeMenu === "resources" ? null : "resources")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-150 ${
                      activeMenu === "resources"
                        ? "text-white bg-slate-800/90 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <span>Resources</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === "resources" ? "rotate-180 text-primary" : "text-slate-400"}`} />
                  </button>

                  {activeMenu === "resources" && (
                    <div className="absolute top-full left-0 mt-1.5 w-[540px] bg-[#131c2e] border border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10 rounded-2xl p-6 grid grid-cols-2 gap-4 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150 z-50">
                      <div>
                        <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          Knowledge Base
                        </p>
                        <ul className="space-y-2.5">
                          <li>
                            <a href="#faq" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Documentation</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Architecture, API and log schema guides.</p>
                            </a>
                          </li>
                          <li>
                            <a href="#workflow" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Security Playbooks</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Step-by-step containment procedures.</p>
                            </a>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-indigo-400" />
                          Research & Tech
                        </p>
                        <ul className="space-y-2.5">
                          <li>
                            <a href="#future-tech" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Threat Research</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Emerging IOCs & adversary tradecraft.</p>
                            </a>
                          </li>
                          <li>
                            <a href="#hero-visual" onClick={() => setActiveMenu(null)} className="group block p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all">
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Attack Simulation</p>
                              <p className="text-xs text-slate-300 leading-snug mt-0.5">Explore interactive threat scenarios.</p>
                            </a>
                          </li>
                        </ul>
                      </div>

                      <div className="col-span-2 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Security documentation & forensic guides</span>
                        <a href="#faq" onClick={() => setActiveMenu(null)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                          Visit Knowledge Center →
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 5. COMPANY MEGA-MENU ── */}
                <div
                  className="relative"
                  onMouseEnter={() => setActiveMenu("company")}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <button
                    onClick={() => setActiveMenu(activeMenu === "company" ? null : "company")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-150 ${
                      activeMenu === "company"
                        ? "text-white bg-slate-800/90 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <span>Company</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === "company" ? "rotate-180 text-primary" : "text-slate-400"}`} />
                  </button>

                  {activeMenu === "company" && (
                    <div className="absolute top-full left-0 mt-1.5 w-80 bg-[#131c2e] border border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10 rounded-2xl p-4 grid gap-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150 z-50">
                      <a href="#why-threadlens" onClick={() => setActiveMenu(null)} className="p-3 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all block group">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">About ThreadLens</p>
                        <p className="text-xs text-slate-300 leading-snug mt-0.5">Our mission and forensic approach.</p>
                      </a>
                      <a href="#why-threadlens" onClick={() => setActiveMenu(null)} className="p-3 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all block group">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Why ThreadLens</p>
                        <p className="text-xs text-slate-300 leading-snug mt-0.5">Why investigation-first security matters.</p>
                      </a>
                      <a href="#ai-forensics" onClick={() => setActiveMenu(null)} className="p-3 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all block group">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Technology</p>
                        <p className="text-xs text-slate-300 leading-snug mt-0.5">How detection and Groq AI reasoning combine.</p>
                      </a>
                      <a href="#future-tech" onClick={() => setActiveMenu(null)} className="p-3 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/80 transition-all block group">
                        <p className="text-sm font-bold text-white flex items-center justify-between group-hover:text-primary transition-colors">
                          Roadmap <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold">Future</span>
                        </p>
                        <p className="text-xs text-slate-300 leading-snug mt-0.5">Autonomous agents & SIEM integrations.</p>
                      </a>
                    </div>
                  )}
                </div>

              </nav>
            </div>

            {/* Right: Search, Auth & Primary CTA */}
            <div className="flex items-center gap-3">
              {/* ── SEARCH BUTTON TRIGGER ── */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-xs transition-colors"
                title="Search ThreadLens Documentation (⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-primary/80" />
                <span>Search</span>
                <kbd className="bg-slate-700/90 px-1.5 py-0.5 rounded text-[10px] text-slate-200 font-mono">⌘K</kbd>
              </button>

              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-primary/25 flex items-center gap-1.5"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:inline-flex px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800/70 text-slate-200 hover:text-white font-medium text-xs sm:text-sm transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35 whitespace-nowrap"
                  >
                    Start investigating
                  </Link>
                </>
              )}

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                aria-label="Open mobile navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* ── 22. MOBILE NAVIGATION DRAWER ── */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#131c2e] border-b border-slate-700 px-4 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400"
            >
              <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Search documentation & features</span>
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">⌘K</kbd>
            </button>

            {/* Platform Accordion */}
            <div>
              <button
                onClick={() => setMobileAccordion(mobileAccordion === "platform" ? null : "platform")}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-white border-b border-slate-800/60"
              >
                Platform <ChevronDown className={`w-4 h-4 transition-transform ${mobileAccordion === "platform" ? "rotate-180 text-primary" : ""}`} />
              </button>
              {mobileAccordion === "platform" && (
                <div className="pl-3 py-2 space-y-2 text-xs text-slate-300 border-l border-slate-800 my-1">
                  <a href="#platform-features" onClick={() => setMobileMenuOpen(false)} className="block py-1">Threat Detection</a>
                  <a href="#platform-features" onClick={() => setMobileMenuOpen(false)} className="block py-1">Log Intelligence</a>
                  <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="block py-1">Incident Investigation</a>
                  <a href="#ai-forensics" onClick={() => setMobileMenuOpen(false)} className="block py-1">AI Investigation</a>
                </div>
              )}
            </div>

            {/* Solutions Accordion */}
            <div>
              <button
                onClick={() => setMobileAccordion(mobileAccordion === "solutions" ? null : "solutions")}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-white border-b border-slate-800/60"
              >
                Solutions <ChevronDown className={`w-4 h-4 transition-transform ${mobileAccordion === "solutions" ? "rotate-180 text-primary" : ""}`} />
              </button>
              {mobileAccordion === "solutions" && (
                <div className="pl-3 py-2 space-y-2 text-xs text-slate-300 border-l border-slate-800 my-1">
                  <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block py-1">Security Teams</a>
                  <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block py-1">Developers & DevOps</a>
                  <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block py-1">Startups & SMBs</a>
                </div>
              )}
            </div>

            {/* Resources */}
            <div>
              <button
                onClick={() => setMobileAccordion(mobileAccordion === "resources" ? null : "resources")}
                className="w-full flex items-center justify-between py-2 text-sm font-semibold text-white border-b border-slate-800/60"
              >
                Resources <ChevronDown className={`w-4 h-4 transition-transform ${mobileAccordion === "resources" ? "rotate-180 text-primary" : ""}`} />
              </button>
              {mobileAccordion === "resources" && (
                <div className="pl-3 py-2 space-y-2 text-xs text-slate-300 border-l border-slate-800 my-1">
                  <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1">Documentation</a>
                  <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="block py-1">Security Playbooks</a>
                  <a href="#future-tech" onClick={() => setMobileMenuOpen(false)} className="block py-1">Roadmap</a>
                </div>
              )}
            </div>

            {/* Pricing Direct Link */}
            <div className="border-b border-slate-800/60 py-2">
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between text-sm font-semibold text-white hover:text-primary"
              >
                <span>Pricing Plans (3 Tiers)</span>
                <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded font-mono font-bold">Free / Mo / Yr</span>
              </Link>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center rounded-lg bg-blue-600 font-semibold text-sm text-white"
              >
                Start investigating
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 text-center rounded-lg border border-slate-800 text-slate-300 text-sm"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── DESKTOP MEGA-MENU BACKDROP DIMMER ── */}
      {activeMenu && (
        <div
          className="fixed inset-0 top-0 bg-black/60 backdrop-blur-[2px] z-30 transition-opacity duration-200 animate-in fade-in-0"
          onClick={() => setActiveMenu(null)}
          aria-hidden="true"
        />
      )}

      {/* ── 8. HERO SECTION ── */}
      <section className="relative pt-16 sm:pt-24 pb-20 overflow-hidden">
        {/* Background glow meshes */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-40 left-1/3 w-[450px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide mb-6">
            <Shield className="w-3.5 h-3.5" /> AI-Native Forensic Security Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] max-w-5xl mx-auto mb-6">
            From Raw Logs to a Complete Security Story.
          </h1>

          <p className="text-lg sm:text-xl text-primary font-medium max-w-3xl mx-auto mb-4">
            ThreadLens connects threat detection, forensic investigation, AI reasoning, and response in one security workflow.
          </p>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
            Stop treating security events as isolated alerts. ThreadLens connects the evidence, reconstructs what happened, explains why it matters, and helps security teams decide what to do next.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-600/30 hover:scale-105"
            >
              Start investigating
            </Link>
            <a
              href="#platform-features"
              className="px-7 py-3.5 rounded-xl border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-slate-200 font-semibold text-base transition-all flex items-center gap-2"
            >
              Explore the platform <ChevronDown className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            Built for security analysts, developers, and modern security teams.
          </p>

          {/* ── 9. HERO VISUAL (Original Security Visualization) ── */}
          <div id="hero-visual" className="mt-16 text-left">
            
            {/* Step-by-step pipeline bar */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] font-mono uppercase font-bold text-slate-400">
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">RAW LOGS</span>
              <span className="text-slate-600">→</span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">DETECTION</span>
              <span className="text-slate-600">→</span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">CORRELATION</span>
              <span className="text-slate-600">→</span>
              <span className="px-2.5 py-1 rounded bg-primary/20 border border-primary/40 text-primary">AI INVESTIGATION</span>
              <span className="text-slate-600">→</span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">INCIDENT STORY</span>
              <span className="text-slate-600">→</span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">RESPONSE</span>
            </div>

            {/* Security Console Card */}
            <div className="rounded-2xl border border-slate-700 bg-[#1e293b] shadow-2xl overflow-hidden">
              
              {/* Window Header */}
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-slate-300 font-mono ml-2">threadlens-soc-investigator://session-inc-8842</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold font-mono">
                    HIGH RISK
                  </span>
                  <span className="text-slate-400 text-[11px]">Active Investigation</span>
                </div>
              </div>

              {/* Console Body Grid */}
              <div className="grid md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-700">
                
                {/* Left Telemetry Timeline (7 cols) */}
                <div className="md:col-span-7 p-5 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-700 pb-2">
                    <span className="font-semibold text-white">RECONSTRUCTED EVENT CHAIN</span>
                    <span className="text-[11px]">4 Connected Signals</span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-start gap-3">
                      <span className="text-slate-400 text-[10px] pt-0.5">02:13:02</span>
                      <div className="flex-1">
                        <p className="text-amber-400 font-semibold">8 Failed Logins Detected</p>
                        <p className="text-[11px] text-slate-300">Src IP: 45.33.32.156 • Target: admin@company.internal</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-start gap-3">
                      <span className="text-slate-400 text-[10px] pt-0.5">02:13:14</span>
                      <div className="flex-1">
                        <p className="text-blue-400 font-semibold">Successful Authentication</p>
                        <p className="text-[11px] text-slate-300">Session created from external unverified geographic region</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-start gap-3">
                      <span className="text-slate-400 text-[10px] pt-0.5">02:14:01</span>
                      <div className="flex-1">
                        <p className="text-rose-400 font-semibold">Admin Endpoint & Sudo Access</p>
                        <p className="text-[11px] text-slate-300">Executed command: /usr/bin/sudo -l (Privilege escalation probe)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right AI Assessment & Response Panel (5 cols) */}
                <div className="md:col-span-5 p-5 bg-[#0f172a] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                      <Cpu className="w-4 h-4" /> AI Forensic Assessment
                    </div>
                    <h4 className="text-sm font-bold text-white mb-2">Possible Account Compromise</h4>
                    <div className="p-3 rounded-xl bg-primary/15 border border-primary/25 text-xs text-slate-200 leading-relaxed">
                      "Activity is consistent with a credential brute-force attack followed by immediate privileged escalation attempts from an anomalous IP."
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700 space-y-2">
                    <p className="text-[11px] uppercase font-bold text-slate-400">Recommended Action:</p>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
                      <span className="font-mono text-rose-300">Block IP 45.33.32.156</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        1-Click Ready
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── 10. SOLUTION HIGHLIGHT SECTION ── */}
      <section id="platform-features" className="py-20 bg-[#111827] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-widest text-primary">Core Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Security intelligence built around the investigation.
            </h2>
            <p className="text-base text-slate-400 mt-3">
              Designed from first principles to unify log telemetry, detection heuristics, and explainable AI.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 01 */}
            <div className="rounded-2xl p-6 bg-[#1e293b] border border-slate-700/80 hover:border-primary/50 transition-all hover:-translate-y-1.5 shadow-lg group">
              <span className="text-xs font-mono font-extrabold text-primary">01</span>
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center my-4">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">LOG INTELLIGENCE</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Turn raw logs into structured security evidence with automated normalization and schema extraction.
              </p>
              <a href="#workflow" className="text-xs font-semibold text-primary group-hover:underline inline-flex items-center gap-1">
                Explore <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Card 02 */}
            <div className="rounded-2xl p-6 bg-[#1e293b] border border-slate-700/80 hover:border-rose-500/50 transition-all hover:-translate-y-1.5 shadow-lg group">
              <span className="text-xs font-mono font-extrabold text-rose-400">02</span>
              <div className="w-10 h-10 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center my-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">THREAT DETECTION</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Identify suspicious activity and prioritize what matters without drowning in false-positive alert noise.
              </p>
              <a href="#workflow" className="text-xs font-semibold text-rose-400 group-hover:underline inline-flex items-center gap-1">
                Explore <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Card 03 */}
            <div className="rounded-2xl p-6 bg-[#1e293b] border border-slate-700/80 hover:border-indigo-500/50 transition-all hover:-translate-y-1.5 shadow-lg group">
              <span className="text-xs font-mono font-extrabold text-indigo-400">03</span>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center my-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI FORENSIC INVESTIGATION</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Understand what happened, why it happened, and what evidence supports it through plain-language AI reasoning.
              </p>
              <a href="#ai-forensics" className="text-xs font-semibold text-indigo-400 group-hover:underline inline-flex items-center gap-1">
                Explore <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Card 04 */}
            <div className="rounded-2xl p-6 bg-[#1e293b] border border-slate-700/80 hover:border-emerald-500/50 transition-all hover:-translate-y-1.5 shadow-lg group">
              <span className="text-xs font-mono font-extrabold text-emerald-400">04</span>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center my-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">RESPONSE</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Move from investigation to controlled, human-approved action to isolate hosts and block adversarial IPs.
              </p>
              <a href="#workflow" className="text-xs font-semibold text-emerald-400 group-hover:underline inline-flex items-center gap-1">
                Explore <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ── 11. SIGNATURE WORKFLOW SECTION ── */}
      <section id="workflow" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-bold tracking-widest text-primary">Signature Investigation Flow</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Detect. Explain. Investigate. Respond.
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Click through the stages to see how ThreadLens streamlines end-to-end incident investigation.
          </p>
        </div>

        {/* Horizontal Interactive Stage Selector */}
        <div className="grid grid-cols-5 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700 mb-8">
          {workflowStages.map((stage, idx) => (
            <button
              key={stage.id}
              onClick={() => setActiveWorkflowIndex(idx)}
              className={`py-3 px-2 rounded-xl text-center transition-all ${
                activeWorkflowIndex === idx
                  ? "bg-[#1e293b] border border-slate-600 text-white shadow-lg font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
              }`}
            >
              <span className={`text-[10px] font-mono block ${activeWorkflowIndex === idx ? stage.color : "text-slate-500"}`}>
                STAGE 0{idx + 1}
              </span>
              <span className="text-xs sm:text-sm">{stage.label}</span>
            </button>
          ))}
        </div>

        {/* Active Stage Display Panel */}
        <div className="p-8 rounded-3xl bg-[#1e293b] border border-slate-700 grid md:grid-cols-12 gap-8 items-center shadow-xl">
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${workflowStages[activeWorkflowIndex].color.replace("text-", "bg-")}`} />
              STAGE 0{activeWorkflowIndex + 1}: {workflowStages[activeWorkflowIndex].label}
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              {workflowStages[activeWorkflowIndex].title}
            </h3>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {workflowStages[activeWorkflowIndex].description}
            </p>

            <div className="pt-2 flex items-center gap-4">
              <Link to="/signup" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Try this in ThreadLens <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="md:col-span-5 bg-[#0f172a] rounded-2xl p-5 border border-slate-700/80 flex items-center justify-center text-center">
            <div className="space-y-3">
              <div className={`w-14 h-14 mx-auto rounded-2xl ${workflowStages[activeWorkflowIndex].bgColor} ${workflowStages[activeWorkflowIndex].color} flex items-center justify-center shadow-lg`}>
                {(() => {
                  const Icon = workflowStages[activeWorkflowIndex].icon;
                  return <Icon className="w-7 h-7" />;
                })()}
              </div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Automated SOC Stage</p>
              <p className="text-sm font-semibold text-white">{workflowStages[activeWorkflowIndex].title}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. "SEE THE ATTACK, NOT JUST THE ALERT" ── */}
      <section id="timeline-section" className="py-20 bg-[#111827] border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-widest text-primary">Contextual Correlation</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              See the attack, not just the alert.
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Isolated alerts produce noise. ThreadLens unrolls the full timeline of adversary actions.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-start">
            
            {/* Left: Incident Timeline */}
            <div className="md:col-span-6 bg-[#1e293b] border border-slate-700 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Incident Timeline</span>
                <span className="text-[11px] font-mono text-primary font-bold">5 Connected Events</span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                
                <div className="relative">
                  <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-[#1e293b]" />
                  <span className="text-[10px] font-mono text-slate-400 font-bold">02:13:02</span>
                  <p className="text-xs font-semibold text-white mt-0.5">Multiple failed login attempts</p>
                  <p className="text-[11px] text-slate-300">Brute-force password spray against SSH port 22</p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-[#1e293b]" />
                  <span className="text-[10px] font-mono text-slate-400 font-bold">02:13:14</span>
                  <p className="text-xs font-semibold text-white mt-0.5">Successful authentication</p>
                  <p className="text-[11px] text-slate-300">Valid credentials accepted for account 'deployer'</p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-[#1e293b]" />
                  <span className="text-[10px] font-mono text-slate-400 font-bold">02:14:01</span>
                  <p className="text-xs font-semibold text-white mt-0.5">Administrative endpoint accessed</p>
                  <p className="text-[11px] text-slate-300">HTTP GET /api/v1/internal/config queried</p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-[#1e293b]" />
                  <span className="text-[10px] font-mono text-slate-400 font-bold">02:14:43</span>
                  <p className="text-xs font-semibold text-white mt-0.5">Privileged activity detected</p>
                  <p className="text-[11px] text-slate-300">Modification of /etc/pam.d/common-auth</p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-rose-600 ring-4 ring-[#1e293b]" />
                  <span className="text-[10px] font-mono text-slate-400 font-bold">02:15:12</span>
                  <p className="text-xs font-semibold text-white mt-0.5">External connection detected</p>
                  <p className="text-[11px] text-slate-300">Outbound egress stream to known C2 server IP</p>
                </div>

              </div>
            </div>

            {/* Right: AI Investigation Output */}
            <div className="md:col-span-6 bg-[#1e293b] border border-primary/40 rounded-3xl p-6 sm:p-8 space-y-5 relative shadow-xl shadow-primary/10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> AI Investigation
                </span>
                <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-xs font-mono font-bold">
                  Risk: HIGH
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">Possible Account Compromise</h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">Evidence: 5 connected events • Confidence: 94%</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <p className="font-semibold text-primary mb-1">Assessment:</p>
                "The sequence indicates a possible progression from credential attack to privileged access, followed by unauthorized external data exfiltration."
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Explore investigations <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-500 font-mono">ThreadLens AI v1.0</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 13. WHY THREADLENS (Workflow Comparison) ── */}
      <section id="why-threadlens" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-widest text-primary">Architecture Comparison</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Built for investigation, not just alerts.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Traditional Workflow Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#111827] border border-slate-700 space-y-4 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Traditional Security Workflow</p>
            
            <div className="space-y-2 font-mono text-xs text-slate-400">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700">Alert Generated</div>
              <div className="text-center text-slate-500">↓</div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700">Search Millions of Raw Logs</div>
              <div className="text-center text-slate-500">↓</div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700">Manually Correlate Disparate Data</div>
              <div className="text-center text-slate-500">↓</div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700">Manual Threat Research</div>
              <div className="text-center text-slate-500">↓</div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700">Decide & Respond</div>
            </div>
            
            <p className="text-xs text-rose-400/90 pt-2 font-medium">Result: Hours spent per alert, missed threat chains, analyst fatigue.</p>
          </div>

          {/* ThreadLens Workflow Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#1e293b] border border-primary/50 space-y-4 shadow-xl shadow-primary/10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">ThreadLens Workflow</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold">AI-Native</span>
            </div>

            <div className="space-y-2 font-mono text-xs text-slate-200">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-between">
                <span>Alert</span>
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-center text-primary">↓</div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-between">
                <span>Connected Evidence</span>
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-center text-primary">↓</div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-between">
                <span>AI Investigation</span>
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-center text-primary">↓</div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-between">
                <span>Incident Story</span>
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-center text-primary">↓</div>
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                <span>Recommended Response</span>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            <p className="text-xs text-emerald-400 pt-2 font-medium">Result: Instant correlation, plain-language reasoning, sub-second triage.</p>
          </div>

        </div>

        <p className="text-center text-sm sm:text-base text-slate-300 font-semibold mt-10">
          "Less time connecting the dots. More time acting on what matters."
        </p>
      </section>

      {/* ── 14. AI SECTION (Explainable Reasoning) ── */}
      <section id="ai-forensics" className="py-20 bg-[#111827] border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-widest text-primary">AI Explainability</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              AI that explains the evidence.
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Every conclusion is directly referenced to raw logs and verifiable telemetry.
            </p>
          </div>

          {/* Equation Bar */}
          <div className="p-6 rounded-2xl bg-[#1e293b] border border-slate-700 max-w-4xl mx-auto mb-12 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-mono font-bold text-center shadow-lg">
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-blue-400">Security Evidence</span>
            <span className="text-slate-500">+</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo-400">System Context</span>
            <span className="text-slate-500">+</span>
            <span className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary">AI Investigation</span>
            <span className="text-slate-500">=</span>
            <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">Explainable Finding</span>
          </div>

          {/* 5 Feature Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-2 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Context-Aware Investigation</h4>
              <p className="text-xs text-slate-300">Understands user roles, normal baseline behavior, and multi-cloud topology.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-2 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Evidence-Backed Reasoning</h4>
              <p className="text-xs text-slate-300">Zero black-box hallucinations. Every inference links directly to timestamped log lines.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-2 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Incident Summaries</h4>
              <p className="text-xs text-slate-300">Automatically drafts executive and technical briefings ready for incident response reports.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-2 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Risk Explanations</h4>
              <p className="text-xs text-slate-300">Categorizes threat severities using transparent heuristic factors and asset criticality.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-2 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Recommended Actions</h4>
              <p className="text-xs text-slate-300">Provides surgical, human-approved containment steps to neutralize active intrusions.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── 15. FUTURE TECHNOLOGY / ROADMAP SECTION ── */}
      <section id="future-tech" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">Innovation Vision</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Built for the next generation of security operations.
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Continuously advancing the frontier of autonomous cyber defense.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-3xl bg-[#1e293b] border border-slate-700 relative space-y-4 shadow-lg">
            <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase tracking-wider">
              Roadmap
            </span>
            <h4 className="text-lg font-bold text-white">MITRE ATT&CK</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Automated mapping of detected event sequences to adversary tactics, techniques, and sub-techniques.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#1e293b] border border-slate-700 relative space-y-4 shadow-lg">
            <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase tracking-wider">
              Roadmap
            </span>
            <h4 className="text-lg font-bold text-white">Behavior Analytics (UEBA)</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Statistical baseline modeling to detect subtle behavioral deviations and insider threats.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#1e293b] border border-slate-700 relative space-y-4 shadow-lg">
            <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase tracking-wider">
              Roadmap
            </span>
            <h4 className="text-lg font-bold text-white">Multi-Agent Investigation</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Specialized collaborative AI agents for forensic correlation, malware reverse engineering, and threat triage.
            </p>
          </div>

        </div>
      </section>

      {/* ── 16. WHO THREADLENS IS FOR (Solutions Section) ── */}
      <section id="solutions" className="py-20 bg-[#111827] border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-widest text-primary">Audience & Teams</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              Who ThreadLens is built for
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Security Analysts</h4>
              <p className="text-xs text-slate-300">"Investigate incidents faster with unified correlation and automated summaries."</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Developers</h4>
              <p className="text-xs text-slate-300">"Understand suspicious application behavior and audit API traffic effortlessly."</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">DevOps Teams</h4>
              <p className="text-xs text-slate-300">"Analyze infrastructure logs, authentication spikes, and container events."</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1e293b] border border-slate-700 space-y-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Startups & SMBs</h4>
              <p className="text-xs text-slate-300">"Get practical security intelligence without enterprise complexity or heavy overhead."</p>
            </div>

          </div>

        </div>
      </section>

      {/* ── 17. SECURITY / TRUST SECTION ── */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">Security By Design</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Your security data deserves serious protection.
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Built with strict data hygiene, local execution capabilities, and controlled human approvals.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center space-y-2 shadow-md">
            <Lock className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Secure Auth</p>
            <p className="text-[11px] text-slate-300">Encrypted tokens & OTP verification</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center space-y-2 shadow-md">
            <Key className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Protected Credentials</p>
            <p className="text-[11px] text-slate-300">Bcrypt password hashing</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center space-y-2 shadow-md">
            <Shield className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Controlled Access</p>
            <p className="text-[11px] text-slate-300">User-scoped forensic sessions</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center space-y-2 shadow-md">
            <FileText className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Audit-Ready</p>
            <p className="text-[11px] text-slate-300">Structured JSON/CSV export</p>
          </div>

          <div className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 text-center space-y-2 shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Human-Approved</p>
            <p className="text-[11px] text-slate-300">Manual review on all blocks</p>
          </div>
        </div>
      </section>

      {/* ── 17.5 DEDICATED PRICING PLANS SECTION ── */}
      <section id="pricing" className="py-20 border-t border-slate-800 bg-[#111827] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transparent Forensic Plans</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Flexible Plans for Every Security Team
            </h2>
            <p className="text-sm text-slate-400 mt-3">
              Three clear tiers tailored to your log ingestion volume, AI forensic query credits, and retention requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-10">
            
            {/* 1. Free Tier */}
            <div className="rounded-2xl bg-[#1e293b] border border-slate-700 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-600 transition-all shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-600 uppercase tracking-wider">
                    Community
                  </span>
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Free Plan</h3>
                <p className="text-xs text-slate-300 mt-1">For individual security researchers & homelabs.</p>

                <div className="my-5">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-xs text-slate-400 ml-1.5 font-medium">/ forever</span>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-3.5 mb-5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">AI Credits:</span>
                    <span className="font-mono font-bold text-primary">100 / month</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Log Buffer:</span>
                    <span className="font-mono font-bold text-cyan-400">500 MB</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Throughput:</span>
                    <span className="font-mono font-bold text-amber-400">5k lines/day</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Retention:</span>
                    <span className="font-mono font-bold text-emerald-400">7 Days</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-300 mb-6">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Groq LLaMA 3.3 70B analysis</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Syslog, JSON, Apache parsing</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Rule anomaly flags</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Community support</li>
                </ul>
              </div>

              <Link
                to="/pricing"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold text-center transition-colors"
              >
                View Free Details
              </Link>
            </div>

            {/* 2. Monthly Pro Tier */}
            <div className="rounded-2xl bg-gradient-to-b from-[#1e293b] to-[#172554] border-2 border-primary p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-primary/20 relative scale-105">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-primary text-white shadow-md">
                  MOST POPULAR
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 mt-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/40 uppercase tracking-wider">
                    SecOps Pro
                  </span>
                  <Zap className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-white">Monthly Plan</h3>
                <p className="text-xs text-slate-300 mt-1">For security engineers & high-growth teams.</p>

                <div className="my-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-white">$29</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>

                <div className="rounded-xl bg-slate-900/90 border border-primary/30 p-3.5 mb-5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">AI Credits:</span>
                    <span className="font-mono font-bold text-primary">5,000 / mo (Rollover)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Storage:</span>
                    <span className="font-mono font-bold text-cyan-400">50 GB NVMe</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Throughput:</span>
                    <span className="font-mono font-bold text-amber-400">250k lines/day</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Retention:</span>
                    <span className="font-mono font-bold text-emerald-400">90 Days</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-300 mb-6">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Everything in Free, plus:</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Real-time Live Monitoring streams</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> MITRE ATT&CK automated correlation</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Export audit PDF & SHA-256 reports</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Priority 2-hour SOC support</li>
                </ul>
              </div>

              <Link
                to="/pricing"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold text-center transition-all shadow-lg shadow-blue-600/30"
              >
                Select Monthly Pro
              </Link>
            </div>

            {/* 3. Yearly Enterprise Tier */}
            <div className="rounded-2xl bg-[#1e293b] border border-slate-700 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-600 transition-all shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    BEST VALUE • SAVE 25%
                  </span>
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Yearly Plan</h3>
                <p className="text-xs text-slate-300 mt-1">For SOC teams & enterprise cyber defense.</p>

                <div className="my-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-white">$24</span>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-medium">/ mo</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">$288 billed yearly</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-3.5 mb-5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">AI Credits:</span>
                    <span className="font-mono font-bold text-primary">75,000 / yr (+25k bonus)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Storage:</span>
                    <span className="font-mono font-bold text-cyan-400">500 GB + 1TB cold</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Throughput:</span>
                    <span className="font-mono font-bold text-amber-400">Unlimited (5M+/day)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Retention:</span>
                    <span className="font-mono font-bold text-emerald-400">365 Days / Multi-year</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-300 mb-6">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Everything in Monthly, plus:</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Unlimited streams & cloud agents</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Team RBAC & SIEM/SOAR API sync</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> SOC2, HIPAA, ISO27001 export</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> 15-Minute Dedicated Incident SLA</li>
                </ul>
              </div>

              <Link
                to="/pricing"
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold text-center transition-colors"
              >
                Select Yearly Plan
              </Link>
            </div>

          </div>

          <div className="text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/90 hover:underline"
            >
              <span>Explore full specs, credit calculator & comparison matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── 18. HIGH-IMPACT CTA SECTION ── */}
      <section className="py-20 bg-gradient-to-r from-blue-950/70 via-slate-900/80 to-[#1e293b] border-t border-slate-800 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            Your logs already contain the story.
          </h2>
          <p className="text-xl sm:text-2xl text-primary font-semibold mb-8">
            ThreadLens helps you find it.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/signup"
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-600/30 hover:scale-105"
            >
              Start investigating
            </Link>
            <a
              href="#platform-features"
              className="px-7 py-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-base transition-colors"
            >
              Explore the platform
            </a>
          </div>
        </div>
      </section>

      {/* ── 19. ENTERPRISE FOOTER ── */}
      <footer className="bg-[#0b1120] border-t border-slate-800 py-16 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">THREADLENS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              AI-Powered Security Forensics. Turn raw security evidence into a complete incident story.
            </p>
            <p className="text-[11px] text-slate-500">© 2026 ThreadLens Inc. All rights reserved.</p>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Product</h5>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#platform-features" className="hover:text-white transition-colors">Platform</a></li>
              <li><a href="#platform-features" className="hover:text-white transition-colors">Threat Detection</a></li>
              <li><a href="#ai-forensics" className="hover:text-white transition-colors">AI Investigation</a></li>
              <li><a href="#platform-features" className="hover:text-white transition-colors">Log Intelligence</a></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">Response</a></li>
              <li><Link to="/pricing" className="hover:text-white text-primary font-medium transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Solutions</h5>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#solutions" className="hover:text-white transition-colors">Security Teams</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Developers</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">DevOps</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">SMBs</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Resources</h5>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#faq" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">Guides</a></li>
              <li><a href="#future-tech" className="hover:text-white transition-colors">Threat Research</a></li>
              <li><a href="#timeline-section" className="hover:text-white transition-colors">Forensics</a></li>
              <li><a href="#hero-visual" className="hover:text-white transition-colors">Attack Simulation</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Company</h5>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#why-threadlens" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#ai-forensics" className="hover:text-white transition-colors">Technology</a></li>
              <li><a href="#future-tech" className="hover:text-white transition-colors">Roadmap</a></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[11px] gap-4">
          <p>© 2026 ThreadLens • AI-Powered Security Forensics</p>
          <div className="flex items-center gap-6">
            <a href="#faq" className="hover:text-slate-200 transition-colors">Privacy</a>
            <a href="#faq" className="hover:text-slate-200 transition-colors">Terms</a>
            <a href="#faq" className="hover:text-slate-200 transition-colors">Security</a>
          </div>
        </div>
      </footer>

      {/* ── 7. SEARCH OVERLAY MODAL ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center gap-3">
              <Search className="w-5 h-5 text-primary" />
              <input
                type="text"
                autoFocus
                placeholder="Search capabilities (e.g. 'AI investigation', 'Brute force', 'MITRE')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-white text-sm focus:outline-none flex-1 placeholder:text-slate-400"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                {searchResults.length > 0 ? "Results" : "No results found"}
              </div>
              {searchResults.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-start justify-between p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group block"
                >
                  <div>
                    <p className="text-xs font-semibold text-white group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-[11px] text-slate-300">{item.desc}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono shrink-0 ml-2">
                    {item.category}
                  </span>
                </a>
              ))}
            </div>

            <div className="px-4 py-2.5 bg-slate-900/80 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Press <kbd className="px-1 bg-slate-800 rounded text-slate-200">ESC</kbd> to close</span>
              <span>ThreadLens Security Search</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
