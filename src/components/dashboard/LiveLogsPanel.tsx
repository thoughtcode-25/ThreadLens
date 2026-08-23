import { useEffect, useState, useRef, useMemo } from "react";
import { type LogEntry } from "@/lib/api";
import { generateLiveLogEntry } from "@/data/mockData";
import {
  Activity,
  Play,
  Pause,
  Trash2,
  Download,
  Search,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
  Zap,
  Gauge,
  ArrowDownCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  isActive?: boolean;
  mode?: "demo" | "api";
  apiEndpoint?: string;
}

type SpeedLevel = "fast" | "normal" | "slow";

const SPEED_INTERVALS: Record<SpeedLevel, number> = {
  fast: 600,
  normal: 1200,
  slow: 2500,
};

export function LiveLogsPanel({ isActive = true, mode = "demo", apiEndpoint }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<SpeedLevel>("normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "critical" | "error" | "warning" | "info" | "threats">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, threats: 0, critical: 0 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Reset or initialize on isActive toggle
  useEffect(() => {
    if (!isActive) {
      // Keep existing logs or clean up
      return;
    }

    // Seed with 5 immediate initial logs if completely empty
    if (logs.length === 0) {
      const initialLogs: LogEntry[] = Array.from({ length: 5 }, (_, i) =>
        generateLiveLogEntry(`init-${i}`)
      );
      setLogs(initialLogs);
      setStats({
        total: 5,
        threats: initialLogs.filter((l) => l.suspicious).length,
        critical: initialLogs.filter((l) => l.level === "critical").length,
      });
    }
  }, [isActive]);

  // Continuous streaming interval
  useEffect(() => {
    if (!isActive || isPaused) return;

    const intervalMs = SPEED_INTERVALS[speed];

    const generateNextLog = async () => {
      let newEntry: LogEntry;

      if (mode === "api" && apiEndpoint) {
        try {
          const res = await fetch(apiEndpoint, { headers: { "Accept": "application/json" } });
          if (res.ok) {
            const data = await res.json();
            const logItem = Array.isArray(data) ? data[0] : (data.logs ? data.logs[0] : data);
            if (logItem && logItem.event) {
              newEntry = {
                id: logItem.id || `api-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                timestamp: logItem.timestamp || new Date().toISOString().replace("T", " ").substring(0, 19),
                ip: logItem.ip || "127.0.0.1",
                event: logItem.event || JSON.stringify(logItem),
                level: logItem.level || "info",
                suspicious: !!logItem.suspicious,
                status: logItem.status || "success",
                risk: logItem.risk || "low",
                raw: logItem.raw || JSON.stringify(logItem),
              };
            } else {
              newEntry = generateLiveLogEntry();
            }
          } else {
            newEntry = generateLiveLogEntry();
          }
        } catch {
          newEntry = generateLiveLogEntry();
        }
      } else {
        // Demo Mode: generate dynamic realistic log event
        newEntry = generateLiveLogEntry();
      }

      setLogs((prev) => {
        const updated = [newEntry, ...prev];
        return updated.slice(0, 300); // Maintain 300 live entries max in memory
      });

      setStats((prev) => ({
        total: prev.total + 1,
        threats: prev.threats + (newEntry.suspicious ? 1 : 0),
        critical: prev.critical + (newEntry.level === "critical" ? 1 : 0),
      }));

      if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    };

    const timer = setInterval(generateNextLog, intervalMs);
    return () => clearInterval(timer);
  }, [isActive, isPaused, speed, mode, apiEndpoint, autoScroll]);

  // Filtered log list
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !searchTerm.trim() ||
        log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.timestamp.includes(searchTerm);

      if (!matchSearch) return false;

      if (levelFilter === "threats") return log.suspicious;
      if (levelFilter === "critical") return log.level === "critical";
      if (levelFilter === "error") return log.level === "error";
      if (levelFilter === "warning") return log.level === "warning";
      if (levelFilter === "info") return log.level === "info";
      return true;
    });
  }, [logs, searchTerm, levelFilter]);

  const handleCopyRaw = (log: LogEntry) => {
    const content = log.raw || `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.ip} - ${log.event}`;
    navigator.clipboard.writeText(content);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (format: "json" | "csv") => {
    if (logs.length === 0) return;
    let content = "";
    let mimeType = "";
    let filename = `sentinel-live-logs-${new Date().toISOString().substring(0, 10)}`;

    if (format === "json") {
      content = JSON.stringify(logs, null, 2);
      mimeType = "application/json";
      filename += ".json";
    } else {
      const headers = ["Timestamp", "IP", "Event", "Level", "Suspicious", "Status", "Risk"];
      const rows = logs.map((l) => [
        `"${l.timestamp}"`,
        `"${l.ip}"`,
        `"${l.event.replace(/"/g, '""')}"`,
        `"${l.level}"`,
        `"${l.suspicious}"`,
        `"${l.status || 'unknown'}"`,
        `"${l.risk || 'low'}"`,
      ]);
      content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      mimeType = "text/csv";
      filename += ".csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-destructive/20 text-destructive border-destructive/40";
      case "error":
        return "bg-destructive/15 text-destructive/90 border-destructive/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-destructive/20 text-destructive border-destructive/40";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="glass-panel rounded-xl flex flex-col h-[580px] animate-fade-in border border-border/80 shadow-2xl overflow-hidden">
      {/* Top Header & Live Status Bar */}
      <div className="px-4 py-3 border-b border-border bg-card/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                !isActive
                  ? "bg-muted-foreground/40"
                  : isPaused
                  ? "bg-amber-400 animate-pulse"
                  : "bg-safe pulse-dot"
              }`}
            />
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Live Log Stream
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {mode === "demo" ? "Continuous Demo Mode" : "API Stream"}
              </span>
            </h3>
          </div>
        </div>

        {/* Real-time stats summary badges */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground border border-border">
            <Activity className="w-3.5 h-3.5 text-accent" />
            <strong className="text-foreground">{stats.total}</strong> generated
          </span>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            <strong>{stats.threats}</strong> threats
          </span>

          {stats.critical > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/20 text-destructive font-semibold border border-destructive/40">
              <AlertTriangle className="w-3.5 h-3.5" />
              {stats.critical} Critical
            </span>
          )}

          <span className="text-xs text-muted-foreground ml-1">
            {isActive ? (isPaused ? "Paused" : "Live Streaming") : "Inactive"}
          </span>
        </div>
      </div>

      {/* Action Controls Toolbar */}
      {isActive && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2 text-xs">
          {/* Controls: Pause/Resume, Speed Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium border transition-all ${
                isPaused
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted"
              }`}
              title={isPaused ? "Resume real-time streaming" : "Pause stream view"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? "Resume" : "Pause"}
            </button>

            {/* Stream Speed Control */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5">
              <span className="text-[11px] text-muted-foreground px-2 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-accent" /> Speed:
              </span>
              {(["slow", "normal", "fast"] as SpeedLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSpeed(lvl)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-all ${
                    speed === lvl
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lvl === "fast" ? "0.6s Fast" : lvl === "normal" ? "1.2s Normal" : "2.5s"}
                </button>
              ))}
            </div>

            {/* Auto scroll toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] transition-all ${
                autoScroll
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:text-foreground bg-card"
              }`}
              title="Toggle auto-scroll to new entries"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              Auto-Scroll
            </button>
          </div>

          {/* Search, Clear & Export buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter event or IP..."
                className="bg-card border border-border rounded-md pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 w-36 sm:w-44 focus:outline-none focus:border-primary/50"
              />
            </div>

            <button
              onClick={() => {
                setLogs([]);
                setStats({ total: 0, threats: 0, critical: 0 });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 bg-card transition-all"
              title="Clear current stream buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              onClick={() => handleExport("json")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground bg-card transition-all"
              title="Export current logs to JSON"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {isActive && (
        <div className="px-4 py-1.5 border-b border-border bg-card/40 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
          <span className="text-muted-foreground font-medium">Filter:</span>
          {(
            [
              { key: "all", label: `All (${logs.length})` },
              { key: "threats", label: `Threats Only (${logs.filter((l) => l.suspicious).length})` },
              { key: "critical", label: `Critical (${logs.filter((l) => l.level === "critical").length})` },
              { key: "error", label: `Errors (${logs.filter((l) => l.level === "error").length})` },
              { key: "warning", label: `Warnings (${logs.filter((l) => l.level === "warning").length})` },
              { key: "info", label: `Info (${logs.filter((l) => l.level === "info").length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLevelFilter(tab.key)}
              className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                levelFilter === tab.key
                  ? "bg-primary/20 text-primary border border-primary/30 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Stream Area */}
      {!isActive ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <Activity className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
          <p className="text-sm font-semibold text-muted-foreground/80">Monitoring is Inactive</p>
          <p className="text-xs text-muted-foreground/50 max-w-sm">
            Select Demo Mode or an API Endpoint above and click "Start Monitoring" to generate real-time log events continuously.
          </p>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-cyber divide-y divide-border/40">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-2">
              <Zap className="w-8 h-8 text-primary animate-bounce" />
              <p className="text-xs text-muted-foreground animate-pulse">
                {logs.length === 0
                  ? "Generating live log stream..."
                  : "No events match current search or filters."}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(isSelected ? null : log)}
                  className={`px-3 py-2 text-xs font-mono transition-all cursor-pointer select-text flex flex-col gap-1.5 ${
                    log.suspicious
                      ? "bg-destructive/5 hover:bg-destructive/10 border-l-2 border-l-destructive"
                      : "hover:bg-muted/40 border-l-2 border-l-transparent"
                  } ${i === 0 ? "animate-log-appear" : ""}`}
                >
                  {/* Summary row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Level Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getLevelBadgeClass(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>

                      {/* Timestamp */}
                      <span className="text-muted-foreground/80 text-[11px] whitespace-nowrap">
                        {log.timestamp}
                      </span>

                      {/* IP Address */}
                      <span className="text-accent font-semibold whitespace-nowrap">
                        {log.ip}
                      </span>

                      {/* Event description */}
                      <span
                        className={`truncate flex-1 font-sans ${
                          log.suspicious
                            ? "text-destructive font-semibold flex items-center gap-1.5"
                            : "text-foreground"
                        }`}
                      >
                        {log.suspicious && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                        {log.event}
                      </span>
                    </div>

                    {/* Right attributes */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {log.risk && (
                        <span
                          className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${getRiskBadgeClass(
                            log.risk
                          )}`}
                        >
                          {log.risk}
                        </span>
                      )}

                      {log.status && (
                        <span
                          className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                            log.status === "failed" || log.status === "blocked"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {log.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Inspector Panel when clicked */}
                  {isSelected && (
                    <div className="mt-2 p-3 rounded-lg bg-card/90 border border-border space-y-2 text-xs font-sans animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          Event Inspection Details
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyRaw(log);
                            }}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded bg-muted/60 border border-border"
                          >
                            {copiedId === log.id ? (
                              <>
                                <Check className="w-3 h-3 text-safe" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Raw
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/chat", {
                                state: { initialPrompt: `Investigate this security event:\nIP: ${log.ip}\nEvent: ${log.event}\nTimestamp: ${log.timestamp}\nLevel: ${log.level}\nStatus: ${log.status}` },
                              });
                            }}
                            className="flex items-center gap-1 text-[11px] text-primary hover:brightness-110 px-2 py-0.5 rounded bg-primary/10 border border-primary/30"
                          >
                            <Sparkles className="w-3 h-3" /> Investigate with AI
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">Event ID:</span>
                          <span className="font-mono text-foreground">{log.id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Source IP:</span>
                          <span className="font-mono text-accent font-semibold">{log.ip}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Severity Level:</span>
                          <span className="font-bold uppercase text-foreground">{log.level}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Threat Flag:</span>
                          <span className={log.suspicious ? "text-destructive font-bold" : "text-safe"}>
                            {log.suspicious ? "SUSPICIOUS / ATTACK" : "NORMAL TRAFFIC"}
                          </span>
                        </div>
                      </div>

                      {log.raw && (
                        <div className="mt-2 bg-background/80 p-2 rounded border border-border/80 font-mono text-[11px] text-muted-foreground break-all">
                          {log.raw}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Footer Info */}
      <div className="px-4 py-2 border-t border-border bg-card/60 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {isActive ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-safe animate-ping" />
              Stream active • Generating continuously until stopped
            </span>
          ) : (
            "Stream idle"
          )}
        </span>
        <span>Showing {filteredLogs.length} of {logs.length} logs in buffer</span>
      </div>
    </div>
  );
}
