import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LiveLogsPanel } from "@/components/dashboard/LiveLogsPanel";
import { Activity, Play, Square, Zap, Plug, AlertCircle, Clock } from "lucide-react";

const LiveMonitoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [mode, setMode] = useState<"demo" | "api">("demo");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [endpointError, setEndpointError] = useState("");
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    if (!isMonitoring) {
      setSessionSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isMonitoring]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (mode === "api") {
      if (!apiEndpoint.trim()) {
        setEndpointError("Please enter an API endpoint to monitor.");
        return;
      }
      if (!apiEndpoint.startsWith("http")) {
        setEndpointError("Endpoint must start with http:// or https://");
        return;
      }
    }
    setEndpointError("");
    setSessionSeconds(0);
    setIsMonitoring(true);
  };

  const handleStop = () => {
    setIsMonitoring(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMonitoring ? "bg-safe/10" : "bg-muted/50"}`}>
              <Activity className={`w-5 h-5 ${isMonitoring ? "text-safe" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Live Monitoring</h2>
              <p className="text-sm text-muted-foreground">Real-time continuous log stream analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isMonitoring && (
              <>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Duration: {formatDuration(sessionSeconds)}
                </span>
                <span className="flex items-center gap-2 text-xs text-safe bg-safe/10 border border-safe/20 rounded-full px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-safe pulse-dot" />
                  {mode === "demo" ? "Continuous Demo Mode Active" : "API Streaming Active"}
                </span>
              </>
            )}
          </div>
        </div>

        {!isMonitoring && (
          <div className="glass-panel rounded-xl p-6 space-y-5 max-w-xl">
            <p className="text-sm font-semibold text-foreground">Configure Monitoring Source</p>

            <div className="flex gap-3">
              <button
                onClick={() => setMode("demo")}
                data-testid="button-mode-demo"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-all ${
                  mode === "demo"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                <Zap className="w-4 h-4" />
                Demo Mode
              </button>
              <button
                onClick={() => setMode("api")}
                data-testid="button-mode-api"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-all ${
                  mode === "api"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                <Plug className="w-4 h-4" />
                API Endpoint
              </button>
            </div>

            {mode === "demo" && (
              <p className="text-xs text-muted-foreground">
                Demo mode streams simulated security events including brute force, port scans, and malware detections — perfect for testing and demonstrations.
              </p>
            )}

            {mode === "api" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API Endpoint URL</label>
                <input
                  value={apiEndpoint}
                  onChange={(e) => { setApiEndpoint(e.target.value); setEndpointError(""); }}
                  placeholder="https://your-log-api.com/stream"
                  className="cyber-input w-full text-sm"
                  data-testid="input-api-endpoint"
                />
                {endpointError && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {endpointError}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleStart}
              data-testid="button-start-monitoring"
              className="cyber-btn flex items-center gap-2 text-sm"
            >
              <Play className="w-4 h-4" />
              Start Monitoring
            </button>
          </div>
        )}

        {isMonitoring && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {mode === "api" ? `Streaming from: ${apiEndpoint}` : "Streaming demo security events"}
              </p>
              <button
                onClick={handleStop}
                data-testid="button-stop-monitoring"
                className="cyber-btn-outline flex items-center gap-2 text-sm text-destructive border-destructive/40 !px-4 !py-2"
              >
                <Square className="w-3.5 h-3.5" />
                Stop Monitoring
              </button>
            </div>
            <LiveLogsPanel isActive={true} mode={mode} apiEndpoint={apiEndpoint} />
          </div>
        )}

        {!isMonitoring && (
          <div className="glass-panel rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
            <Activity className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Monitoring is paused. Configure a source and click Start Monitoring to begin.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LiveMonitoring;
