import { Layout } from "@/components/Layout";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  FileCode,
  Image as ImageIcon,
  Plug,
  Play,
  AlertCircle,
  Loader2,
  X,
  HardDrive,
  Database,
  ShieldAlert,
  Sparkles,
  Eye,
  Check,
  Zap,
  Activity,
  Gauge,
  CheckCircle2,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
import { extractTextFromImage } from "@/lib/ocr";
import { type LogEntry, type Alert } from "@/lib/api";

interface JobStatus {
  status: "processing" | "done" | "failed";
  filename?: string;
  logs_stored?: number;
  logs_parsed?: number;
  threats_detected?: number;
  session_id?: string;
  file_size_mb?: number;
  truncated?: boolean;
  duration?: string;
  error?: string;
}

interface SelectedFileItem {
  id: string;
  file: File;
  kind: "text" | "json" | "image";
  previewUrl?: string;
  ocrText?: string;
  isOcrScanning?: boolean;
  ocrError?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB software architecture max
const SUPPORTED_REGEX = /\.(txt|log|csv|json|jsonl|ndjson|png|jpe?g|webp|bmp|tiff|svg|gif)$/i;

function getFileKind(filename: string): "text" | "json" | "image" {
  if (/\.(json|jsonl|ndjson)$/i.test(filename)) return "json";
  if (/\.(png|jpe?g|webp|bmp|tiff|svg|gif)$/i.test(filename)) return "image";
  return "text";
}

const AnalyzeLogs = () => {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedFileItem[]>([]);
  const [endpoint, setEndpoint] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const [expandedOcrId, setExpandedOcrId] = useState<string | null>(null);

  // Real-time streaming states (WebSocket feed)
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  const [ingestionRate, setIngestionRate] = useState<number>(0);
  const [logSearch, setLogSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [doneJob, setDoneJob] = useState<JobStatus | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Real-time WebSocket connection to receive streaming logs and threat alerts
  useEffect(() => {
    if (!processingJobId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    setLiveLogs([]);
    setLiveAlerts([]);
    setDoneJob(null);
    setIngestionRate(0);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // Primary: same host proxy (/ws), Secondary fallback: direct backend port 8000
    const primaryWsUrl = `${protocol}//${host}/ws/upload/${processingJobId}`;
    const directWsUrl = `${protocol}//127.0.0.1:8000/ws/upload/${processingJobId}`;

    const handleCompletion = (jobData: any) => {
      setDoneJob(jobData);
      setUploading(false);
      if (pollRef.current) clearInterval(pollRef.current);
      if (wsRef.current) wsRef.current.close();

      // Smooth, immediate transition to report
      setTimeout(() => {
        navigate("/report", {
          state: {
            success: true,
            logs_parsed: jobData.logs_parsed ?? jobData.logs_stored ?? 0,
            threats_detected: jobData.threats_detected ?? 0,
            session_id: jobData.session_id ?? "",
            file_size_mb: jobData.file_size_mb ?? 0,
            truncated: jobData.truncated ?? false,
            filename: jobData.filename || currentFilename,
          },
        });
      }, 350);
    };

    const attachWsHandlers = (ws: WebSocket) => {
      ws.onopen = () => {
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 3000);
        ws.addEventListener("close", () => clearInterval(pingInterval));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "progress" || msg.type === "status") {
            setProcessingStatus((prev) => ({
              ...prev,
              status: msg.status || "processing",
              logs_stored: msg.logs_parsed ?? msg.logs_stored ?? prev?.logs_stored ?? 0,
              threats_detected: msg.threats_detected ?? prev?.threats_detected ?? 0,
            }));

            if (msg.rate_per_sec) {
              setIngestionRate(msg.rate_per_sec);
            }

            if (msg.recent_logs && Array.isArray(msg.recent_logs) && msg.recent_logs.length > 0) {
              setLiveLogs((prev) => {
                const ids = new Set(prev.map((l) => l.id));
                const fresh = msg.recent_logs.filter((l: LogEntry) => !ids.has(l.id));
                return [...fresh, ...prev].slice(0, 150);
              });
            }

            if (msg.new_alerts && Array.isArray(msg.new_alerts) && msg.new_alerts.length > 0) {
              setLiveAlerts((prev) => {
                const ids = new Set(prev.map((a) => a.id));
                const fresh = msg.new_alerts.filter((a: Alert) => !ids.has(a.id));
                return [...fresh, ...prev].slice(0, 50);
              });
            }

            if (msg.status === "done") {
              handleCompletion(msg);
            }
          } else if (msg.type === "done") {
            handleCompletion(msg);
          } else if (msg.type === "error") {
            setError(msg.error || "Ingestion error occurred.");
            setProcessingJobId(null);
            setUploading(false);
          }
        } catch {
          // Ignored
        }
      };
    };

    let ws: WebSocket;
    try {
      ws = new WebSocket(primaryWsUrl);
      ws.onerror = () => {
        try {
          const fallbackWs = new WebSocket(directWsUrl);
          attachWsHandlers(fallbackWs);
          wsRef.current = fallbackWs;
        } catch {
          // Fallback handled by pollRef
        }
      };
      attachWsHandlers(ws);
      wsRef.current = ws;
    } catch {
      try {
        ws = new WebSocket(directWsUrl);
        attachWsHandlers(ws);
        wsRef.current = ws;
      } catch {
        // Fallback handled by pollRef
      }
    }

    // High-speed fallback polling in parallel (every 120ms for instant reactivity)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload/status/${processingJobId}`);
        if (!res.ok) return;
        const job: any = await res.json();
        setProcessingStatus((prev) => ({
          ...prev,
          ...job,
          logs_stored: job.logs_parsed ?? job.logs_stored ?? prev?.logs_stored ?? 0,
        }));

        if (job.rate_per_sec) {
          setIngestionRate(job.rate_per_sec);
        }

        if (job.recent_logs && Array.isArray(job.recent_logs) && job.recent_logs.length > 0) {
          setLiveLogs((prev) => {
            const ids = new Set(prev.map((l) => l.id));
            const fresh = job.recent_logs.filter((l: LogEntry) => !ids.has(l.id));
            return [...fresh, ...prev].slice(0, 150);
          });
        }

        if (job.new_alerts && Array.isArray(job.new_alerts) && job.new_alerts.length > 0) {
          setLiveAlerts((prev) => {
            const ids = new Set(prev.map((a) => a.id));
            const fresh = job.new_alerts.filter((a: Alert) => !ids.has(a.id));
            return [...fresh, ...prev].slice(0, 50);
          });
        }

        if (job.status === "done") {
          handleCompletion(job);
        } else if (job.status === "failed") {
          clearInterval(pollRef.current!);
          setProcessingJobId(null);
          setUploading(false);
          setError(job.error || "Processing failed. Please try again.");
        }
      } catch {
        // Network blip
      }
    }, 120);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [processingJobId, currentFilename, navigate]);

  // Scan image with OCR in browser
  const scanImageFile = async (itemId: string, file: File) => {
    try {
      const extracted = await extractTextFromImage(file);
      setSelectedItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, ocrText: extracted, isOcrScanning: false }
            : item
        )
      );
    } catch {
      setSelectedItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, isOcrScanning: false, ocrError: "OCR recognition failed on image." }
            : item
        )
      );
    }
  };

  const addFiles = (newFiles: File[]) => {
    setError(null);
    const oversized = newFiles.filter((f) => f.size > MAX_SIZE);
    if (oversized.length) {
      setError(`Files exceed the maximum software upload limit of 10 GB: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }

    const validFiles = newFiles.filter((f) => SUPPORTED_REGEX.test(f.name));
    if (validFiles.length < newFiles.length) {
      setError("Some files were skipped. Supported formats: .txt, .log, .csv, .json, .jsonl, and image formats (.png, .jpg, .webp, .bmp, .tiff).");
    }

    const newItems: SelectedFileItem[] = validFiles.map((file) => {
      const kind = getFileKind(file.name);
      const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      let previewUrl: string | undefined;

      if (kind === "image") {
        previewUrl = URL.createObjectURL(file);
      }

      return {
        id,
        file,
        kind,
        previewUrl,
        isOcrScanning: kind === "image",
      };
    });

    setSelectedItems((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => {
      if (item.kind === "image") {
        scanImageFile(item.id, item.file);
      }
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
    setError(null);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    if (wsRef.current) wsRef.current.close();
    if (pollRef.current) clearInterval(pollRef.current);
    setProcessingJobId(null);
    setProcessingStatus(null);
    setUploading(false);
    setUploadProgress(0);
    setLiveLogs([]);
    setLiveAlerts([]);
    setDoneJob(null);
  };

  const handleUpload = () => {
    if (!selectedItems.length) return;
    const item = selectedItems[0];
    const file = item.file;
    setCurrentFilename(file.name);
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setProcessingStatus({ status: "processing", logs_stored: 0, threats_detected: 0 });
    setLiveLogs([]);
    setLiveAlerts([]);
    setDoneJob(null);

    const form = new FormData();
    form.append("file", file);
    if (item.kind === "image" && item.ocrText) {
      form.append("ocr_text", item.ocrText);
    }

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.job_id) {
            setProcessingJobId(res.job_id);
          } else {
            setUploading(false);
            setUploadProgress(0);
            setSelectedItems([]);
            navigate("/report", {
              state: {
                success: res.success ?? true,
                logs_parsed: res.logs_parsed ?? 0,
                threats_detected: res.threats_detected ?? 0,
                session_id: res.session_id ?? "",
                file_size_mb: res.file_size_mb ?? 0,
                truncated: res.truncated ?? false,
                filename: file.name,
              },
            });
          }
        } catch {
          setUploading(false);
          setError("Failed to parse server response.");
        }
      } else {
        setUploading(false);
        try {
          const err = JSON.parse(xhr.responseText);
          setError(err.detail || `Upload failed (HTTP ${xhr.status})`);
        } catch {
          setError(`Upload failed (HTTP ${xhr.status})`);
        }
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setError("Network error during upload. Please try again.");
    };

    xhr.onabort = () => {
      setUploading(false);
      setUploadProgress(0);
      setError("Upload cancelled.");
    };

    xhr.open("POST", "/api/upload");
    const token = localStorage.getItem("forensic_token");
    const storedUser = localStorage.getItem("forensic_auth_user");
    let userEmail = "";
    try {
      if (storedUser) userEmail = JSON.parse(storedUser).email || "";
    } catch {}
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (userEmail) xhr.setRequestHeader("X-User-Email", userEmail);
    xhr.send(form);
  };

  const handleNavigateToReport = () => {
    if (!doneJob && !processingStatus) return;
    const s = doneJob || processingStatus;
    navigate("/report", {
      state: {
        success: true,
        logs_parsed: s?.logs_parsed ?? s?.logs_stored ?? 0,
        threats_detected: s?.threats_detected ?? 0,
        session_id: s?.session_id ?? "",
        file_size_mb: s?.file_size_mb ?? 0,
        truncated: s?.truncated ?? false,
        filename: currentFilename,
      },
    });
  };

  const filteredLiveLogs = useMemo(() => {
    if (!logSearch.trim()) return liveLogs;
    const term = logSearch.toLowerCase();
    return liveLogs.filter(
      (l) =>
        l.event.toLowerCase().includes(term) ||
        l.ip.toLowerCase().includes(term) ||
        l.timestamp.includes(term)
    );
  }, [liveLogs, logSearch]);

  const isStreamingActive = uploading || !!processingJobId;

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Analyze Logs & Security Data</h2>
            <p className="text-sm text-muted-foreground mt-1">
              High-throughput real-time ingestion, continuous WebSocket streaming, and forensic AI correlation
            </p>
          </div>

          {/* Status indicators */}
          {isStreamingActive && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs text-safe bg-safe/10 border border-safe/20 rounded-full px-3 py-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-safe pulse-dot" />
                Live WebSocket Pipeline Active
              </span>
              <button
                onClick={cancelUpload}
                className="cyber-btn-outline text-xs !px-3 !py-1 text-destructive border-destructive/40"
              >
                <X className="w-3.5 h-3.5 mr-1 inline" /> Cancel Ingestion
              </button>
            </div>
          )}
        </div>

        {/* ─── ACTIVE STREAMING & SIDE-BY-SIDE ANALYZER VIEW ─── */}
        {isStreamingActive && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Telemetry Bar */}
            <div className="glass-panel rounded-xl p-5 border border-primary/30 shadow-2xl space-y-4 bg-card/80">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      Ingesting: <span className="text-primary">{currentFilename}</span>
                      {doneJob ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-safe/10 text-safe border border-safe/30 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ingestion Completed
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-mono">
                          Live Stream
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Real-time forensic telemetry stream · Streaming data side-by-side as it loads
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNavigateToReport}
                    className="cyber-btn text-xs flex items-center gap-1.5 shadow-lg !px-4 !py-2"
                  >
                    <span>View Full Forensic Report</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress & Live Ingestion Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <Database className="w-3 h-3 text-cyan-400" /> Logs Ingested
                  </span>
                  <span className="text-lg font-bold text-foreground font-mono">
                    {(doneJob?.logs_parsed ?? doneJob?.logs_stored ?? processingStatus?.logs_stored ?? processingStatus?.logs_parsed ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-destructive" /> Threats Flagged
                  </span>
                  <span className="text-lg font-bold text-destructive font-mono">
                    {(doneJob?.threats_detected ?? processingStatus?.threats_detected ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-accent" /> Ingestion Rate
                  </span>
                  <span className="text-lg font-bold text-accent font-mono">
                    {ingestionRate > 0 ? `~${ingestionRate.toLocaleString()} /s` : doneJob ? "Complete" : "Calculating..."}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Pipeline Status
                  </span>
                  <span className="text-xs font-semibold text-foreground mt-1 block">
                    {doneJob ? (
                      <span className="text-emerald-400">Indexed & Saved</span>
                    ) : uploadProgress < 100 ? (
                      `Uploading (${uploadProgress}%)`
                    ) : (
                      "Active Correlating"
                    )}
                  </span>
                </div>
              </div>

              {/* Ingestion Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      doneJob
                        ? "bg-emerald-500 w-full"
                        : "bg-gradient-to-r from-primary via-cyan-400 to-accent animate-pulse w-full"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* ─── SIDE-BY-SIDE PANELS ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Live Ingested Log Stream */}
              <div className="glass-panel rounded-xl flex flex-col h-[520px] border border-border overflow-hidden shadow-xl">
                <div className="px-4 py-3 border-b border-border bg-card/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-safe pulse-dot" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Live Ingested Log Stream
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {filteredLiveLogs.length} live records
                  </span>
                </div>

                {/* Filter Search Input */}
                <div className="p-2 border-b border-border bg-muted/20 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Filter incoming live records by event or IP..."
                      className="bg-card border border-border rounded-md pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 w-full focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Stream Rows */}
                <div className="flex-1 overflow-auto scrollbar-cyber p-1 divide-y divide-border/30">
                  {filteredLiveLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-2">
                      {doneJob ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <p className="text-xs font-semibold text-foreground">
                            {(doneJob.logs_parsed ?? 0).toLocaleString()} logs successfully indexed!
                          </p>
                          <p className="text-[11px] text-muted-foreground">Click "View Full Forensic Report" above to inspect all records.</p>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground">Streaming data as it loads from the file...</p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredLiveLogs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        className={`px-3 py-2 text-xs font-mono transition-all cursor-pointer select-text flex flex-col gap-1 ${
                          log.suspicious
                            ? "bg-destructive/5 hover:bg-destructive/10 border-l-2 border-l-destructive"
                            : "hover:bg-muted/40 border-l-2 border-l-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                              log.level === "critical"
                                ? "bg-destructive/20 text-destructive border-destructive/30"
                                : log.level === "error"
                                ? "bg-destructive/15 text-destructive border-destructive/20"
                                : log.level === "warning"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {log.level}
                          </span>
                          <span className="text-muted-foreground/70 text-[11px]">{log.timestamp}</span>
                          <span className="text-accent font-semibold">{log.ip}</span>
                          <span className={`truncate flex-1 font-sans ${log.suspicious ? "text-destructive font-semibold" : "text-foreground"}`}>
                            {log.event}
                          </span>
                        </div>

                        {selectedLog?.id === log.id && (
                          <div className="mt-1.5 p-2 rounded bg-card border border-border text-[11px] space-y-1 font-sans animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">Log Payload</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/chat", {
                                    state: {
                                      initialPrompt: `Investigate this extracted log entry:\nTimestamp: ${log.timestamp}\nIP: ${log.ip}\nEvent: ${log.event}\nStatus: ${log.status}\nRisk: ${log.risk}`,
                                    },
                                  });
                                }}
                                className="text-primary hover:underline text-[10px] flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" /> Analyze with AI
                              </button>
                            </div>
                            <pre className="text-muted-foreground font-mono bg-background/80 p-1.5 rounded text-[10px] whitespace-pre-wrap break-all">
                              {log.raw || JSON.stringify(log, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Live Detected Threats & AI Co-Pilot */}
              <div className="glass-panel rounded-xl flex flex-col h-[520px] border border-border overflow-hidden shadow-xl">
                <div className="px-4 py-3 border-b border-border bg-card/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Live Detected Threats ({liveAlerts.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 font-semibold">
                    Real-Time Correlation
                  </span>
                </div>

                <div className="flex-1 overflow-auto scrollbar-cyber p-3 space-y-2.5">
                  {liveAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 p-6 text-muted-foreground">
                      <ShieldAlert className="w-8 h-8 opacity-30 animate-pulse" />
                      <p className="text-xs font-medium">Monitoring dataset for anomalies & attacks...</p>
                      <p className="text-[11px] opacity-70">
                        Threats like Brute Force, Port Scans, and SQL Injections will appear here live.
                      </p>
                    </div>
                  ) : (
                    liveAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/15 transition-all space-y-2 animate-fade-in shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            {alert.title}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30">
                            {alert.risk} Risk
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {alert.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-destructive/20 font-mono">
                          <span>Source IP: <strong className="text-accent">{alert.source || "unknown"}</strong></span>
                          <button
                            onClick={() => {
                              navigate("/chat", {
                                state: {
                                  initialPrompt: `Investigate threat alert:\nTitle: ${alert.title}\nSource IP: ${alert.source}\nDescription: ${alert.description}\nRisk: ${alert.risk}`,
                                },
                              });
                            }}
                            className="flex items-center gap-1 text-primary font-sans hover:brightness-125 transition-all font-medium"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Investigate Threat
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Report Navigation */}
                <div className="p-3 border-t border-border bg-card/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {doneJob ? "✅ Full analysis ready" : "Analyzing stream continuously..."}
                  </span>
                  <button
                    onClick={handleNavigateToReport}
                    className="cyber-btn text-xs !px-3 !py-1.5 flex items-center gap-1"
                  >
                    <span>Open Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── UPLOAD SELECTION VIEW (When not streaming) ─── */}
        {!isStreamingActive && (
          <div className="space-y-6">
            {/* Format Support Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <FileText className="w-3.5 h-3.5" />
                <span>Text Logs: .log, .txt, .csv</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON & JSONL: .json, .jsonl, .ndjson</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images & Screenshots: .png, .jpg, .webp (AI OCR)</span>
              </span>
            </div>

            {/* Development Phase & Storage Quota Notice */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300 text-sm tracking-wide">
                      Project Under Development Phase
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-semibold border border-amber-500/30">
                      MongoDB Cloud: 500 MB Quota
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Database storage is currently running on a development sandbox tier (<strong className="text-white">500 MB MongoDB capacity</strong>).
                    The core forensic engine architecture is designed to support high-throughput log ingestion and parsing of up to <strong className="text-cyan-400">10 GB per file</strong> (up to 10 million log entries).
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                    <span>• Engine Max Support: <strong className="text-cyan-300">10 GB</strong></span>
                    <span>• Active Cluster Allocation: <strong className="text-amber-300">500 MB</strong></span>
                    <span>• Supported Formats: <strong className="text-slate-200">.txt, .log, .csv, .json, .jsonl, images (.png, .jpg, .webp)</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Dropzone Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`glass-panel rounded-xl p-10 text-center transition-all duration-300 cursor-pointer border ${
                dragOver ? "border-primary/80 glow-primary bg-primary/5" : "border-border hover:border-primary/40"
              } ${uploading ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.log,.csv,.json,.jsonl,.ndjson,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.svg,.gif,image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex items-center justify-center gap-2 text-muted-foreground mx-auto mb-3">
                <HardDrive className="w-10 h-10 text-primary" />
              </div>
              <p className="text-foreground font-semibold text-base">Drag & drop log files or images here</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-lg mx-auto leading-relaxed">
                Supports <strong className="text-foreground">.txt, .log, .csv</strong>, <strong className="text-cyan-400">.json, .jsonl</strong>, and <strong className="text-emerald-400">images & screenshot logs (.png, .jpg, .webp)</strong> up to <span className="text-primary font-semibold">10 GB</span>
              </p>
              <p className="text-[11px] text-amber-400/90 font-mono mt-1">
                (Development phase active: 500 MB cloud database quota)
              </p>
              <button className="cyber-btn-outline text-xs mt-4 !py-1.5" disabled={uploading}>
                Browse Files & Images
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border-destructive/30 bg-destructive/10 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Selected Files List & Preview */}
            {selectedItems.length > 0 && (
              <div className="glass-panel rounded-xl p-5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Selected Items ({selectedItems.length})</p>
                  <span className="text-xs text-muted-foreground">Ready for real-time analysis</span>
                </div>

                <div className="space-y-3 divide-y divide-border/40">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        {item.kind === "json" ? (
                          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <FileCode className="w-4 h-4 shrink-0" />
                          </div>
                        ) : item.kind === "image" ? (
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ImageIcon className="w-4 h-4 shrink-0" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            <FileText className="w-4 h-4 shrink-0" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">{item.file.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card border border-border uppercase">
                              {item.kind === "json" ? "JSON Format" : item.kind === "image" ? "Image / OCR" : "Text Log"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                        </div>

                        {item.kind === "image" && (
                          <div className="flex items-center gap-2">
                            {item.isOcrScanning ? (
                              <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-2.5 py-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Scanning OCR...
                              </span>
                            ) : item.ocrText ? (
                              <button
                                onClick={() => setExpandedOcrId(expandedOcrId === item.id ? null : item.id)}
                                className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1 hover:bg-emerald-500/20 transition-all"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>{item.ocrText.split("\n").filter(Boolean).length} lines extracted</span>
                                <Eye className="w-3 h-3 ml-1" />
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Image ready</span>
                            )}
                          </div>
                        )}

                        {!uploading && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {item.kind === "image" && (
                        <div className="flex gap-3 items-start pl-11">
                          {item.previewUrl && (
                            <img
                              src={item.previewUrl}
                              alt="preview"
                              className="w-16 h-16 object-cover rounded-lg border border-border shrink-0 shadow-sm"
                            />
                          )}
                          {expandedOcrId === item.id && item.ocrText && (
                            <div className="flex-1 p-2.5 rounded-lg bg-card border border-border text-xs font-mono max-h-36 overflow-auto scrollbar-cyber text-muted-foreground space-y-1 animate-fade-in">
                              <p className="font-semibold text-emerald-400 text-[11px] font-sans pb-1 border-b border-border">
                                Extracted Log Lines from Image Screenshot:
                              </p>
                              <pre className="whitespace-pre-wrap">{item.ocrText}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpload}
                    data-testid="button-upload-analyze"
                    className="cyber-btn flex items-center gap-2 text-sm flex-1 justify-center shadow-lg"
                  >
                    <Upload className="w-4 h-4" />
                    Upload & Start Real-Time Analysis ({selectedItems.length} {selectedItems.length === 1 ? "file" : "files"})
                  </button>
                </div>
              </div>
            )}

            {/* Connect External Source Section */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plug className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Connect External Log Stream</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Dev Mode: 500 MB Cap
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect an external log agent, syslog stream, or REST endpoint for automated ingestion into the forensic engine.
              </p>
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="Enter API endpoint, syslog URI, or file path..."
                className="cyber-input w-full text-sm"
                data-testid="input-endpoint"
              />
              <button
                onClick={() => navigate("/monitoring")}
                className="cyber-btn flex items-center gap-2 text-sm"
                data-testid="button-start-monitoring"
              >
                <Play className="w-4 h-4" />
                Start Live Monitoring
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnalyzeLogs;
