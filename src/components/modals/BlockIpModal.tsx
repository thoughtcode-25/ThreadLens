import { useState } from "react";
import { ShieldAlert, ShieldOff, X, AlertTriangle, Loader2, CheckCircle2, Globe, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface ThreatIpInfo {
  ip: string;
  threatType?: string;
  risk?: "high" | "medium" | "low" | string;
  sourceEvent?: string;
  alertId?: string;
  timestamp?: string;
}

interface BlockIpModalProps {
  isOpen: boolean;
  onClose: () => void;
  threat: ThreatIpInfo | null;
  onSuccess?: (ip: string) => void;
}

export function BlockIpModal({ isOpen, onClose, threat, onSuccess }: BlockIpModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  if (!isOpen || !threat) return null;

  const displayReason = reason.trim() || threat.sourceEvent || threat.threatType || "Potential spam & unauthorized probe verified by security software";

  const handleConfirmBlock = async () => {
    setLoading(true);
    try {
      const res = await api.blockIp(threat.ip, threat.alertId, displayReason);
      if (res.already_blocked) {
        toast({
          title: "Already In Blocklist",
          description: `IP address ${threat.ip} is already blocked.`,
        });
      } else {
        toast({
          title: "IP Blocked Successfully",
          description: `IP ${threat.ip} has been added to firewall blocklist and isolated.`,
        });
      }
      onSuccess?.(threat.ip);
      onClose();
    } catch {
      toast({
        title: "Block Operation Failed",
        description: "Could not enforce IP block. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isHighRisk = threat.risk === "high" || threat.risk === "critical";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md glass-panel bg-slate-950/95 border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-destructive/30 glow-danger"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-destructive/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center border border-destructive/30">
              <ShieldAlert className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Potential Spam / Threat Detected</h3>
              <p className="text-[11px] text-destructive font-medium">Security Verification Alert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            The software forensic engine has identified this IP address as a <strong className="text-destructive font-semibold">potential threat / automated spam source</strong>.
          </p>

          {/* Threat Details Card */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800 space-y-2.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Suspicious IP Address</span>
              <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-bold text-xs border border-accent/30">
                {threat.ip}
              </span>
            </div>

            {threat.risk && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Risk Classification</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isHighRisk
                      ? "bg-destructive/20 text-destructive border border-destructive/40"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  }`}
                >
                  {threat.risk}
                </span>
              </div>
            )}

            {threat.threatType && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Identified Pattern</span>
                <span className="text-slate-200 text-right truncate max-w-[200px]">
                  {threat.threatType}
                </span>
              </div>
            )}

            {threat.timestamp && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Detected At</span>
                <span className="text-slate-400">{threat.timestamp}</span>
              </div>
            )}
          </div>

          {/* Reason / Note input */}
          <div className="space-y-1.5 font-sans">
            <label className="text-[11px] font-medium text-slate-400">
              Block Reason & Firewall Annotation:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={displayReason}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-destructive/50"
            />
          </div>

          {/* Action Impact Warning */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px] font-sans">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Blocking this IP will drop all incoming packet connections and quarantine future telemetry from this host.
            </span>
          </div>
        </div>

        {/* Modal Action Buttons: 1) Block IP  2) Cancel */}
        <div className="px-5 py-3.5 bg-slate-900/70 border-t border-slate-800 flex items-center justify-end gap-2.5">
          {/* Option 2: Cancel */}
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
          >
            Cancel
          </button>

          {/* Option 1: Block IP */}
          <button
            onClick={handleConfirmBlock}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-destructive text-white hover:bg-destructive/90 transition-all flex items-center gap-1.5 shadow-lg shadow-destructive/30 border border-destructive/50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldOff className="w-3.5 h-3.5" />
            )}
            <span>{loading ? "Blocking..." : "Block IP"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
