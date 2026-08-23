import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Shield, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  variant?: "default" | "danger" | "warning" | "safe";
}

function MetricCard({ title, value, icon: Icon, trend, variant = "default" }: MetricCardProps) {
  const variantStyles = {
    default: "border-border hover:border-primary/30",
    danger: "border-destructive/20 hover:border-destructive/40 glow-danger",
    warning: "border-threat-medium/20 hover:border-threat-medium/40",
    safe: "border-safe/20 hover:border-safe/40",
  };
  const iconStyles = {
    default: "text-primary bg-primary/10",
    danger: "text-destructive bg-destructive/10",
    warning: "text-threat-medium bg-threat-medium/10",
    safe: "text-safe bg-safe/10",
  };
  return (
    <div className={`metric-card ${variantStyles[variant]} animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";

export function MetricsSection() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    logs_analyzed: number;
    threats_detected: number;
    unresolved_alerts: number;
    risk_level: string;
    last_incident: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.stats()
      .then((data) => {
        setStats({
          logs_analyzed: data.logs_analyzed ?? 0,
          threats_detected: data.threats_detected ?? 0,
          unresolved_alerts: data.unresolved_alerts ?? 0,
          risk_level: data.risk_level ?? "Low",
          last_incident: data.last_incident
            ? data.last_incident.toString().slice(11, 16)
            : null,
        });
      })
      .catch(() => {
        setStats({ logs_analyzed: 0, threats_detected: 0, unresolved_alerts: 0, risk_level: "Low", last_incident: null });
      })
      .finally(() => setLoading(false));
  }, [user?.email]);

  const s = stats ?? { logs_analyzed: 0, threats_detected: 0, unresolved_alerts: 0, risk_level: "Low", last_incident: null };
  const isEmpty = !loading && s.logs_analyzed === 0 && s.threats_detected === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Logs Analyzed"
        value={loading ? "—" : s.logs_analyzed.toLocaleString()}
        icon={Activity}
        trend={isEmpty ? "No logs yet" : undefined}
      />
      <MetricCard
        title="Threats Detected"
        value={loading ? "—" : s.threats_detected}
        icon={AlertTriangle}
        trend={isEmpty ? "No threats detected" : `${s.unresolved_alerts} unresolved`}
        variant={s.threats_detected > 0 ? "danger" : "default"}
      />
      <MetricCard
        title="Risk Level"
        value={loading ? "—" : s.risk_level}
        icon={Shield}
        trend={isEmpty ? "Nothing ingested yet" : undefined}
        variant={s.risk_level === "High" ? "warning" : "default"}
      />
      <MetricCard
        title="Last Incident"
        value={loading ? "—" : (s.last_incident ?? "None")}
        icon={Clock}
        trend={isEmpty ? "No incidents recorded" : undefined}
        variant={s.last_incident ? "safe" : "default"}
      />
    </div>
  );
}
