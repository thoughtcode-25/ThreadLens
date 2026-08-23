import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Brain,
  ChevronRight,
  BarChart2,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  Download,
  FileDown,
  Image as ImageIcon,
  FileCode,
  Loader2,
} from "lucide-react";
import { api, type Alert } from "@/lib/api";
import { ReportGraphs } from "@/components/report/ReportGraphs";
import { exportReportToPdf, exportReportToJpeg, exportReportToTxt } from "@/lib/reportExport";
import { useToast } from "@/hooks/use-toast";

interface ReportState {
  logs_parsed: number;
  threats_detected: number;
  session_id: string;
  file_size_mb: number;
  truncated: boolean;
  filename?: string;
}

const ReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = location.state as ReportState | null;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [exporting, setExporting] = useState<"pdf" | "jpeg" | "txt" | null>(null);

  useEffect(() => {
    api.getAlerts()
      .then((d) => setAlerts(d.alerts ?? []))
      .catch(() => {
        // The report remains usable when alert history is unavailable.
      });
  }, []);

  if (!state) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <FileText className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No report data found.</p>
          <button onClick={() => navigate("/analyze")} className="cyber-btn text-sm">
            Upload Logs
          </button>
        </div>
      </Layout>
    );
  }

  const handleExport = async (format: "pdf" | "jpeg" | "txt") => {
    setExporting(format);
    const cleanFilename = state.filename
      ? state.filename.replace(/\.[^/.]+$/, "")
      : `Forensic_Report_${state.session_id.slice(0, 8)}`;

    try {
      if (format === "pdf") {
        await exportReportToPdf("forensic-report-container", `${cleanFilename}_Report.pdf`);
        toast({ title: "PDF Report Downloaded", description: "High-resolution forensic PDF generated successfully." });
      } else if (format === "jpeg") {
        await exportReportToJpeg("forensic-report-container", `${cleanFilename}_Report.jpeg`);
        toast({ title: "JPEG Image Exported", description: "Report visual snapshot saved to image." });
      } else if (format === "txt") {
        exportReportToTxt(
          {
            filename: state.filename,
            session_id: state.session_id,
            date: new Date().toISOString().split("T")[0],
            logs_parsed: state.logs_parsed,
            threats_detected: state.threats_detected,
            file_size_mb: state.file_size_mb,
            status: state.truncated ? "Truncated" : "Complete",
            alerts,
          },
          `${cleanFilename}_Report.txt`
        );
        toast({ title: "TXT Report Exported", description: "Plaintext SIEM summary generated." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast({ title: "Export Error", description: msg, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleAskAiAboutResults = () => {
    const fileDesc = state.filename ? `file "${state.filename}"` : "the uploaded log batch";
    const threatDetails =
      alerts.length > 0
        ? `Threats identified include:\n` +
          alerts
            .slice(0, 4)
            .map(
              (a, i) =>
                `  ${i + 1}. [${(a.risk || "medium").toUpperCase()}] ${a.title || a.type || "Security Alert"} (Source: ${a.source || "Unknown"})`
            )
            .join("\n")
        : "No direct high-risk threats detected in this batch.";

    const prompt =
      `Please perform a deep-dive forensic threat assessment for ${fileDesc}.\n\n` +
      `Summary Statistics:\n` +
      `- Logs Parsed: ${state.logs_parsed.toLocaleString()}\n` +
      `- Threats Detected: ${state.threats_detected}\n` +
      `- File Size: ${state.file_size_mb} MB\n\n` +
      `${threatDetails}\n\n` +
      `Please provide:\n` +
      `1. Attack Sequence & Threat Classification (with MITRE ATT&CK mapping if applicable)\n` +
      `2. Potential Root Cause & Compromise Indicators\n` +
      `3. Prioritized Step-by-Step Incident Containment & Remediation Playbook`;

    navigate("/ask-ai", {
      state: {
        initialMessage: prompt,
      },
    });
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-10">
        {/* Top Header & Export Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/analyze")}
              className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-safe/10 flex items-center justify-center border border-safe/20">
              <CheckCircle className="w-5 h-5 text-safe" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Analysis & Forensic Report</h2>
              <p className="text-sm text-muted-foreground">
                {state.filename ? `${state.filename} · ` : ""}
                {state.file_size_mb} MB processed · Session ID: {state.session_id.slice(0, 8)}
              </p>
            </div>
          </div>

          {/* Export Action Bar */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => handleExport("pdf")}
              disabled={!!exporting}
              data-testid="export-pdf-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/15 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>PDF</span>
            </button>

            <button
              onClick={() => handleExport("jpeg")}
              disabled={!!exporting}
              data-testid="export-jpeg-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              {exporting === "jpeg" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />}
              <span>JPEG</span>
            </button>

            <button
              onClick={() => handleExport("txt")}
              disabled={!!exporting}
              data-testid="export-txt-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              {exporting === "txt" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5 text-amber-400" />}
              <span>TXT</span>
            </button>
          </div>
        </div>

        {/* Printable & Exportable Report Container */}
        <div id="forensic-report-container" className="space-y-6 bg-[#0b1120] p-4 sm:p-6 rounded-2xl border border-slate-800">
          {/* Executive Header Badge (Export Branding) */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                TL
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">ThreadLens SOC Report</h4>
                <p className="text-[10px] text-slate-400 font-mono">CONFIDENTIAL & FORENSIC ARTIFACT</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {new Date().toISOString().split("T")[0]}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Logs Parsed" value={state.logs_parsed.toLocaleString()} icon={FileText} color="primary" />
            <StatCard
              label="Threats Found"
              value={state.threats_detected.toString()}
              icon={AlertTriangle}
              color={state.threats_detected > 0 ? "danger" : "safe"}
            />
            <StatCard label="File Size" value={`${state.file_size_mb} MB`} icon={BarChart2} color="accent" />
            <StatCard
              label="Status"
              value={state.truncated ? "Truncated" : "Complete"}
              icon={CheckCircle}
              color={state.truncated ? "warning" : "safe"}
            />
          </div>

          {state.truncated && (
            <div className="glass-panel rounded-xl p-4 flex items-start gap-3 border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-400">
                File was very large — only the first 10,000,000 entries were stored. The rest were counted but not analyzed.
              </p>
            </div>
          )}

          {/* Integrated Interactive Graph Reports */}
          <ReportGraphs alerts={alerts} totalLogs={state.logs_parsed} />

          {/* Detected Threats */}
          {alerts.length > 0 && (
            <div className="glass-panel rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a]/95">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-foreground">Detected Threat Signatures ({alerts.length})</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">SOC Verified</span>
              </div>
              <div className="divide-y divide-slate-800">
                {alerts.slice(0, 10).map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        a.risk === "high"
                          ? "bg-destructive"
                          : a.risk === "medium"
                          ? "bg-yellow-400"
                          : "bg-safe"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.title || a.type || "Threat"}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase shrink-0 ${
                        a.risk === "high"
                          ? "bg-destructive/15 text-destructive border-destructive/30"
                          : a.risk === "medium"
                          ? "bg-yellow-400/15 text-yellow-400 border-yellow-400/30"
                          : "bg-safe/15 text-safe border-safe/30"
                      }`}
                    >
                      {a.risk}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 font-mono">{a.source}</span>
                  </div>
                ))}
                {alerts.length > 10 && (
                  <div className="px-5 py-2 text-xs text-muted-foreground bg-slate-900/30">
                    +{alerts.length - 10} more threats
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ask AI Banner / Action Card */}
        <div className="glass-panel rounded-xl p-6 border border-primary/30 bg-gradient-to-br from-primary/10 via-[#0f172a] to-slate-950 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>ThreadLens SOC Forensic Assistant</span>
              </div>
              <h3 className="text-lg font-bold text-white">Investigate These Results with AI</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Automatically generate a full incident report, MITRE ATT&CK breakdown, root cause analysis, and actionable remediation playbook tailored to this log session.
              </p>
            </div>

            <button
              onClick={handleAskAiAboutResults}
              data-testid="button-ask-ai-report"
              className="cyber-btn flex items-center justify-center gap-2.5 text-sm !px-5 !py-3 whitespace-nowrap shadow-lg shrink-0"
            >
              <Brain className="w-4 h-4" />
              <span>Ask AI About These Results</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="cyber-btn-outline flex items-center gap-2 text-sm !py-2.5 !px-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            View Dashboard
          </button>

          <button
            onClick={() => navigate("/analyze")}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Upload Another Log File
          </button>
        </div>
      </div>
    </Layout>
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/20",
    safe: "bg-safe/10 text-safe border-safe/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    accent: "bg-accent/10 text-accent border-accent/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return (
    <div className="glass-panel rounded-xl p-4 space-y-2 border border-slate-800 bg-[#0f172a]/95">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorClasses[color] ?? colorClasses.primary}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default ReportPage;
