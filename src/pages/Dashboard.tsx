import { useState } from "react";
import { Layout } from "@/components/Layout";
import { MetricsSection } from "@/components/dashboard/MetricsSection";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { AiAnalysisPanel } from "@/components/dashboard/AiAnalysisPanel";
import { Zap, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const Dashboard = () => {
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<{ logs: number; threats: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const runDemo = async () => {
    setDemoLoading(true);
    setDemoResult(null);
    try {
      const data = await api.simulateDemo();
      setDemoResult({ logs: data.logs_inserted ?? 0, threats: data.alerts_inserted ?? 0 });
      setRefreshKey((prev) => prev + 1);
    } catch {
      setDemoResult({ logs: 0, threats: 0 });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Security Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Real-time threat overview and analysis</p>
          </div>
          <div className="flex items-center gap-3">
            {demoResult && (
              <div className="flex items-center gap-2 text-xs text-safe bg-safe/10 border border-safe/20 rounded-lg px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5" />
                {demoResult.threats} threats detected from {demoResult.logs} demo logs
              </div>
            )}
            <button
              onClick={runDemo}
              disabled={demoLoading}
              data-testid="button-demo-simulation"
              className="cyber-btn flex items-center gap-2 text-xs !px-4 !py-2"
            >
              {demoLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {demoLoading ? "Simulating..." : "Run Demo Attack Simulation"}
            </button>
          </div>
        </div>

        <MetricsSection key={`metrics-${refreshKey}`} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <AlertsPanel key={`alerts-${refreshKey}`} />
          </div>
          <div className="flex flex-col h-[420px]">
            <AiAnalysisPanel />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
