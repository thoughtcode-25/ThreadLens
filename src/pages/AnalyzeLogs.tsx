import { Layout } from "@/components/Layout";
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Plug, Play, CheckCircle, AlertCircle, Loader2, X, HardDrive, Database, Info, ShieldAlert, Sparkles } from "lucide-react";

interface UploadResult {
  success: boolean;
  logs_parsed: number;
  threats_detected: number;
  session_id: string;
  file_size_mb: number;
  truncated: boolean;
}

interface JobStatus {
  status: "processing" | "done" | "failed";
  filename?: string;
  logs_stored?: number;
  logs_parsed?: number;
  threats_detected?: number;
  session_id?: string;
  file_size_mb?: number;
  truncated?: boolean;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB Software architecture max

const AnalyzeLogs = () => {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [endpoint, setEndpoint] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll job status while processing
  useEffect(() => {
    if (!processingJobId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload/status/${processingJobId}`);
        if (!res.ok) return;
        const job: JobStatus = await res.json();
        setProcessingStatus(job);

        if (job.status === "done") {
          clearInterval(pollRef.current!);
          setProcessingJobId(null);
          setUploading(false);
          setUploadProgress(0);
          setSelectedFiles([]);
          navigate("/report", {
            state: {
              success: true,
              logs_parsed: job.logs_parsed ?? 0,
              threats_detected: job.threats_detected ?? 0,
              session_id: job.session_id ?? "",
              file_size_mb: job.file_size_mb ?? 0,
              truncated: job.truncated ?? false,
              filename: currentFilename,
            },
          });
        } else if (job.status === "failed") {
          clearInterval(pollRef.current!);
          setProcessingJobId(null);
          setUploading(false);
          setUploadProgress(0);
          setError(job.error || "Processing failed. Please try again.");
        }
      } catch {
        // network blip — keep polling
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [processingJobId]);

  const addFiles = (newFiles: File[]) => {
    setError(null);
    const oversized = newFiles.filter((f) => f.size > MAX_SIZE);
    if (oversized.length) {
      setError(`Files exceed the maximum software upload limit of 10 GB: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }
    const valid = newFiles.filter((f) => /\.(txt|log|csv)$/i.test(f.name));
    if (valid.length < newFiles.length) {
      setError("Some files were skipped. Only .txt, .log, and .csv files are supported.");
    }
    setSelectedFiles((prev) => [...prev, ...valid]);
    setResult(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const removeFile = (i: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
    setResult(null);
    setError(null);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    if (pollRef.current) clearInterval(pollRef.current);
    setProcessingJobId(null);
    setProcessingStatus(null);
    setUploading(false);
    setUploadProgress(0);
  };

  const handleUpload = () => {
    if (!selectedFiles.length) return;
    const file = selectedFiles[0];
    setCurrentFilename(file.name);
    setUploading(true);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    setProcessingStatus(null);

    const form = new FormData();
    form.append("file", file);

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
            setProcessingStatus({ status: "processing", logs_stored: 0 });
          } else {
            setUploading(false);
            setUploadProgress(0);
            setSelectedFiles([]);
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
    xhr.send(form);
  };

  const isProcessing = uploading || !!processingJobId;
  const phase = processingJobId
    ? "processing"
    : uploadProgress < 100
    ? "uploading"
    : "queuing";

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h2 className="text-xl font-bold text-foreground">Analyze Logs</h2>
          <p className="text-sm text-muted-foreground mt-1">Upload log files or connect a live data source for forensic analysis</p>
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
                <span>• Supported Formats: <strong className="text-slate-200">.txt, .log, .csv, JSON Lines</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Box */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`glass-panel rounded-xl p-10 text-center transition-all duration-300 cursor-pointer ${
            dragOver ? "border-primary/60 glow-primary" : "border-border"
          } ${isProcessing ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.log,.csv"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <HardDrive className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Drag & drop log files here</p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports .txt, .log, .csv files up to <span className="text-primary font-semibold">10 GB</span> · up to 10 million log entries
          </p>
          <p className="text-[11px] text-amber-400/90 font-mono mt-1">
            (Development phase active: 500 MB cloud database quota)
          </p>
          <button className="cyber-btn-outline text-xs mt-4 !py-1.5" disabled={isProcessing}>Browse Files</button>
        </div>

        {error && (
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3 border-destructive/30">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}


        {selectedFiles.length > 0 && (
          <div className="glass-panel rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Selected Files</p>
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-xs shrink-0">{formatBytes(f.size)}</span>
                {!isProcessing && (
                  <button onClick={() => removeFile(i)} className="hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="space-y-2">
                {/* Upload progress bar */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {phase === "uploading"
                      ? "Uploading file..."
                      : phase === "queuing"
                      ? "Sending to server..."
                      : "Processing logs..."}
                  </span>
                  {phase === "uploading" && (
                    <span className="font-medium text-primary">{uploadProgress}%</span>
                  )}
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      phase === "processing"
                        ? "bg-primary animate-pulse w-full"
                        : "bg-primary"
                    }`}
                    style={phase !== "processing" ? { width: `${uploadProgress}%` } : undefined}
                  />
                </div>
                {phase === "processing" && processingStatus && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    <span>
                      Parsing and storing logs in database
                      {(processingStatus.logs_stored ?? 0) > 0
                        ? ` — ${(processingStatus.logs_stored ?? 0).toLocaleString()} entries stored so far...`
                        : "..."}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!isProcessing ? (
                <button
                  onClick={handleUpload}
                  data-testid="button-upload-analyze"
                  className="cyber-btn flex items-center gap-2 text-sm flex-1 justify-center"
                >
                  <Upload className="w-4 h-4" />
                  Upload & Analyze
                </button>
              ) : (
                <button
                  onClick={cancelUpload}
                  data-testid="button-cancel-upload"
                  className="cyber-btn-outline flex items-center gap-2 text-sm flex-1 justify-center text-destructive border-destructive/40"
                >
                  <X className="w-4 h-4" />
                  Cancel Upload
                </button>
              )}
            </div>
          </div>
        )}

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plug className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Connect Source</p>
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
          <button className="cyber-btn flex items-center gap-2 text-sm" data-testid="button-start-monitoring">
            <Play className="w-4 h-4" />
            Start Monitoring
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyzeLogs;
