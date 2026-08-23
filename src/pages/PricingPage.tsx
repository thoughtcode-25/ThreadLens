import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Check, Sparkles, Zap, HardDrive, Cpu, Activity,
  ArrowRight, CheckCircle2, HelpCircle, Layers, Lock, ShieldCheck,
  Server, Database, AlertCircle, RefreshCw, ChevronRight, X, Info,
  Sliders, FileText, Globe, Key, Flame
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

interface PlanTier {
  id: "free" | "monthly" | "yearly";
  name: string;
  badge?: string;
  badgeColor?: string;
  popular?: boolean;
  price: {
    monthly: number;
    yearly?: number;
    billingPeriod: string;
    savingsBadge?: string;
  };
  tagline: string;
  description: string;
  metrics: {
    credits: string;
    creditsDetail: string;
    storage: string;
    storageDetail: string;
    usage: string;
    usageDetail: string;
    retention: string;
  };
  features: string[];
  highlightFeatures: string[];
  ctaText: string;
  ctaVariant: "outline" | "primary" | "gradient";
}

const PRICING_PLANS: PlanTier[] = [
  {
    id: "free",
    name: "Community",
    badge: "FREE FOREVER",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
    popular: false,
    price: {
      monthly: 0,
      billingPeriod: "Forever free",
    },
    tagline: "For individual security researchers & homelabs",
    description: "Essential log parsing, anomaly detection and AI-assisted forensic explanations with zero cost.",
    metrics: {
      credits: "100 Credits / mo",
      creditsDetail: "100 AI forensic investigation turns per month",
      storage: "500 MB Buffer",
      storageDetail: "Encrypted memory-cached log buffer",
      usage: "5,000 Lines / day",
      usageDetail: "Manual log upload & single stream endpoint",
      retention: "7 Days History",
    },
    highlightFeatures: [
      "100 AI Forensic Queries / month",
      "500 MB Log Storage buffer",
      "5,000 Log Lines / day ingestion",
      "7 Days Historical audit retention",
    ],
    features: [
      "Groq LLaMA 3.3 70B AI forensic reasoning",
      "Standard log formats: Syslog, JSON, Auth, Apache",
      "Rule-based threat & brute force detection",
      "Manual log file upload & parsing",
      "Single active log source / stream",
      "Community forum & docs support",
    ],
    ctaText: "Current Plan",
    ctaVariant: "outline",
  },
  {
    id: "monthly",
    name: "Pro Forensics",
    badge: "MOST POPULAR",
    badgeColor: "bg-primary/20 text-primary border-primary/40",
    popular: true,
    price: {
      monthly: 29,
      billingPeriod: "per month, billed monthly",
    },
    tagline: "For SecOps, DevOps & growing security teams",
    description: "Real-time threat monitoring, live stream ingestion, deep MITRE ATT&CK correlation and high-speed AI analysis.",
    metrics: {
      credits: "5,000 Credits / mo",
      creditsDetail: "Automatic rollover of unused credits",
      storage: "50 GB Storage",
      storageDetail: "High-speed encrypted NVMe storage",
      usage: "250,000 Lines / day",
      usageDetail: "Up to 10 concurrent live stream sources",
      retention: "90 Days Retention",
    },
    highlightFeatures: [
      "5,000 AI Forensic Credits / month (Rollover)",
      "50 GB Encrypted forensic storage",
      "250,000 Log Lines / day throughput",
      "90 Days High-speed audit retention",
      "10 Live log stream endpoints",
    ],
    features: [
      "Ultra-low latency Groq AI reasoning (<400ms)",
      "Real-time Live Monitoring & stream ingestion",
      "Automated MITRE ATT&CK Matrix tactic mapping",
      "Multi-stage incident reconstruction & timeline",
      "Tamper-proof incident report export (PDF / JSON)",
      "Automated containment & IP blocking suggestions",
      "Slack & Webhook real-time security alerts",
      "Priority SOC analyst email support (<2h SLA)",
    ],
    ctaText: "Upgrade to Monthly Pro",
    ctaVariant: "gradient",
  },
  {
    id: "yearly",
    name: "Enterprise Defense",
    badge: "BEST VALUE • SAVE 25%",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    popular: false,
    price: {
      monthly: 24,
      yearly: 288,
      billingPeriod: "per month, billed $288 annually",
      savingsBadge: "Save $60/year",
    },
    tagline: "For SOC teams, enterprises & critical infrastructure",
    description: "Unlimited ingestion throughput, dedicated AI compute instances, team RBAC, compliance exports and 15-min SLA.",
    metrics: {
      credits: "75,000 Credits / yr",
      creditsDetail: "Includes 25,000 bonus annual burst credits",
      storage: "500 GB + 1 TB Archive",
      storageDetail: "Dedicated forensic warehouse + cold tier",
      usage: "5,000,000+ Lines / day",
      usageDetail: "Unlimited streams & cloud connectors",
      retention: "365 Days / Unlimited",
    },
    highlightFeatures: [
      "75,000 AI Credits / year (+25k Bonus Burst)",
      "500 GB NVMe Storage + 1 TB Cold Archive",
      "Unlimited Ingestion (5M+ lines / day)",
      "365 Days Full Compliance Retention",
      "Unlimited Log Stream Connectors",
    ],
    features: [
      "Everything in Monthly Pro, plus:",
      "Unlimited Log Connectors, Syslog Agents & Cloud APIs",
      "Custom AI System Prompts & fine-tuned models",
      "Role-Based Access Control (RBAC) & Team Seats",
      "Bi-directional SIEM / SOAR API Integrations",
      "Compliance audit certification (SOC 2, HIPAA, ISO27001)",
      "Dedicated 15-Minute Critical Incident SLA",
      "Dedicated Solutions Architect & 1-on-1 Onboarding",
    ],
    ctaText: "Get Yearly Enterprise",
    ctaVariant: "primary",
  },
];

const COMPARISON_CATEGORIES = [
  {
    category: "Ingestion & Data Capacity",
    rows: [
      { name: "Daily Log Volume", free: "5,000 lines/day", monthly: "250,000 lines/day", yearly: "Unlimited (5M+/day)" },
      { name: "Active Log Stream Sources", free: "1 source", monthly: "10 sources", yearly: "Unlimited" },
      { name: "Cloud & Syslog Connectors", free: "Manual upload only", monthly: "Syslog, Webhooks, API", yearly: "All Cloud + Custom Agents" },
      { name: "Real-time Live Streaming", free: "No", monthly: "Yes (Sub-second)", yearly: "Yes (Dedicated Pipes)" },
    ],
  },
  {
    category: "AI Forensic Reasoning & Credits",
    rows: [
      { name: "Monthly AI Credits", free: "100 / mo", monthly: "5,000 / mo (Rollover)", yearly: "75,000 / yr (+25k Bonus)" },
      { name: "AI Inference Engine", free: "Groq LLaMA 3.3 70B", monthly: "Groq LLaMA 3.3 (Fast Tier)", yearly: "Dedicated Groq + Custom LLMs" },
      { name: "AI Response Latency", free: "Standard (<1.2s)", monthly: "Ultra-Fast (<400ms)", yearly: "Real-Time Priority (<250ms)" },
      { name: "MITRE ATT&CK Mapping", free: "Manual lookup", monthly: "Automated Correlation", yearly: "Custom Matrix & TTP Rules" },
      { name: "Incident Narrative Generator", free: "Basic summary", monthly: "Executive & Technical", yearly: "Full Forensic Dossier & Proof" },
    ],
  },
  {
    category: "Storage, Retention & Audit",
    rows: [
      { name: "Encrypted Cloud Storage", free: "500 MB Buffer", monthly: "50 GB NVMe Storage", yearly: "500 GB NVMe + 1 TB Archive" },
      { name: "Audit Log Retention", free: "7 Days", monthly: "90 Days", yearly: "365 Days / Multi-year" },
      { name: "Tamper-Proof Report Export", free: "JSON Only", monthly: "PDF, JSON & SHA-256 Hash", yearly: "Full Cryptographic Bundle" },
      { name: "Data Encryption", free: "AES-256 at rest", monthly: "AES-256 + TLS 1.3", yearly: "Dedicated Keys (BYOK)" },
    ],
  },
  {
    category: "Security Ops & Support",
    rows: [
      { name: "Real-Time Alerts & Webhooks", free: "In-App only", monthly: "Slack, Email, Discord", yearly: "PagerDuty, SIEM, SOAR, Custom" },
      { name: "Team Seats & RBAC", free: "1 User", monthly: "Up to 5 Seats", yearly: "Unlimited Team Seats" },
      { name: "Support Response SLA", free: "Community Forum", monthly: "< 2 Hours Priority", yearly: "15-Minute Dedicated Hotline" },
      { name: "Compliance Standards", free: "Standard", monthly: "SOC 2 Ready", yearly: "SOC 2, ISO 27001, HIPAA" },
    ],
  },
];

const FAQS = [
  {
    q: "What is an AI Forensic Credit and how are they counted?",
    a: "1 AI Forensic Credit corresponds to one deep analytical query or investigation run by our Groq LLaMA 3.3 70B security model. This includes parsing log batches, correlating suspicious IP sequences, mapping MITRE ATT&CK tactics, and producing plain-English incident summaries.",
  },
  {
    q: "How does storage allocation and retention work?",
    a: "Storage is used to buffer and index raw incoming log streams so they can be searched, queried, and visualized in the timeline. The Free plan includes 500 MB for 7 days, Pro includes 50 GB for 90 days, and Enterprise provides 500 GB active NVMe storage with 1 TB long-term cold archive for full compliance.",
  },
  {
    q: "Can I upgrade or switch between Monthly and Yearly anytime?",
    a: "Yes! You can upgrade anytime. In this interactive demonstration, selecting any plan simulates immediate provisioning so you can explore how ThreadLens scales with your security needs.",
  },
  {
    q: "Are unused AI credits rolled over to next month?",
    a: "On the Monthly Pro and Yearly Enterprise plans, any unused AI credits automatically roll over to the subsequent billing cycle, ensuring you never lose unused forensic capacity during low-incident periods.",
  },
  {
    q: "Is our ingested security log data safe and compliant?",
    a: "All ingested logs are encrypted with AES-256 at rest and TLS 1.3 in transit. We enforce zero-retention on raw telemetry outside your designated storage buffer and provide cryptographic tamper-proof verification hashes.",
  },
  {
    q: "Is this pricing interface for preview/demo purposes?",
    a: "Yes. This pricing interface is fully interactive for presentation and evaluation purposes. You can select plans, inspect detailed usage metrics, and test the credit calculator without any real billing charges.",
  },
];

function PricingContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Active Billing Selector / Filter tab
  const [selectedPlanModal, setSelectedPlanModal] = useState<PlanTier | null>(null);
  const [billingCycle, setBillingCycle] = useState<"all" | "monthly" | "yearly">("all");

  // Interactive Live Usage & Credit Calculator state
  const [dailyLogs, setDailyLogs] = useState<number>(50000);
  const [monthlyQueries, setMonthlyQueries] = useState<number>(1200);

  // Calculate recommendation based on sliders
  const estimatedCredits = Math.round(monthlyQueries * 1.2 + (dailyLogs / 1000) * 15);
  const estimatedStorageGB = Math.round(((dailyLogs * 250 * 30) / (1024 * 1024 * 1024)) * 10) / 10;
  
  let recommendedPlanId: "free" | "monthly" | "yearly" = "free";
  if (dailyLogs > 250000 || monthlyQueries > 5000) {
    recommendedPlanId = "yearly";
  } else if (dailyLogs > 5000 || monthlyQueries > 100) {
    recommendedPlanId = "monthly";
  }

  const handleSelectPlan = (plan: PlanTier) => {
    setSelectedPlanModal(plan);
  };

  const handleConfirmPlan = () => {
    if (!selectedPlanModal) return;
    toast({
      title: `Plan Selected: ${selectedPlanModal.name}`,
      description: `You selected the ${selectedPlanModal.name} (${selectedPlanModal.price.billingPeriod}). (Presentation Preview Mode - No charges applied).`,
    });
    setSelectedPlanModal(null);
  };

  return (
    <div className="space-y-16 pb-20">
      
      {/* ── HEADER HERO ── */}
      <div className="text-center max-w-4xl mx-auto pt-6 sm:pt-10 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Transparent Cyber Telemetry Pricing</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Forensic Security Plans <br />
          <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Built For High-Scale Detection
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          From community researchers to enterprise SOC operations. Ingest logs, reconstruct multi-stage cyber threats, and unlock lightning-fast Groq AI forensic reasoning.
        </p>

        {/* Quick Plan Navigation Tabs */}
        <div className="mt-8 inline-flex p-1 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <button
            onClick={() => setBillingCycle("all")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === "all"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Plans (3 Menus)
          </button>
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === "monthly"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Tier
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Yearly Tier
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
              25% OFF
            </span>
          </button>
        </div>
      </div>

      {/* ── 3 PRICING MENUS / CARDS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PRICING_PLANS.filter((p) => billingCycle === "all" || p.id === billingCycle || (billingCycle === "monthly" && p.id === "monthly") || (billingCycle === "yearly" && p.id === "yearly")).map((plan) => {
            const isHighlighted = plan.popular;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl flex flex-col transition-all duration-300 ${
                  isHighlighted
                    ? "bg-gradient-to-b from-[#111836] to-[#0a0f24] border-2 border-primary shadow-2xl shadow-primary/15 scale-[1.02]"
                    : "bg-[#0b0f20]/90 border border-slate-800 hover:border-slate-700 shadow-xl"
                } p-6 sm:p-8`}
              >
                {/* Popular / Best value badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-md ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="border-b border-slate-800/80 pb-6 mb-6">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                    {plan.id === "free" && <Shield className="w-5 h-5 text-slate-400" />}
                    {plan.id === "monthly" && <Zap className="w-5 h-5 text-primary animate-pulse" />}
                    {plan.id === "yearly" && <Flame className="w-5 h-5 text-amber-400" />}
                  </div>
                  
                  <p className="mt-2 text-xs text-slate-400 min-h-[32px]">{plan.tagline}</p>

                  {/* Price display */}
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      ${plan.price.monthly}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-400">/ month</span>
                      {plan.price.savingsBadge && (
                        <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                          {plan.price.savingsBadge}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{plan.price.billingPeriod}</p>
                </div>

                {/* Usage, Credits & Storage Details Box */}
                <div className="rounded-xl bg-black/40 border border-slate-800/80 p-4 mb-6 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Allocated Resources</span>
                    <span className="font-mono text-primary">Live Quota</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Cpu className="w-3.5 h-3.5 text-primary" />
                        <span>AI Credits</span>
                      </div>
                      <p className="font-bold text-slate-100 mt-1 font-mono text-[13px]">{plan.metrics.credits}</p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Storage</span>
                      </div>
                      <p className="font-bold text-slate-100 mt-1 font-mono text-[13px]">{plan.metrics.storage}</p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>Daily Intake</span>
                      </div>
                      <p className="font-bold text-slate-100 mt-1 font-mono text-[13px]">{plan.metrics.usage}</p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Retention</span>
                      </div>
                      <p className="font-bold text-slate-100 mt-1 font-mono text-[13px]">{plan.metrics.retention}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/40 leading-snug">
                    <Info className="w-3 h-3 inline mr-1 text-slate-500" />
                    {plan.metrics.creditsDetail}
                  </p>
                </div>

                {/* Core Feature List */}
                <div className="flex-1 space-y-3 mb-8">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Included Forensic Capabilities:
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                    plan.ctaVariant === "gradient"
                      ? "bg-gradient-to-r from-primary via-indigo-500 to-cyan-500 text-white shadow-lg shadow-primary/30 hover:brightness-110 active:scale-[0.98]"
                      : plan.ctaVariant === "primary"
                      ? "bg-primary text-white shadow-md hover:bg-primary/90 active:scale-[0.98]"
                      : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-750 hover:text-white"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── INTERACTIVE LIVE USAGE & CREDIT ESTIMATOR ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-b from-[#0e142e] to-[#080c1c] border border-slate-800 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold mb-2 font-mono">
                  <Sliders className="w-3.5 h-3.5" />
                  INTERACTIVE ESTIMATOR
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Estimate Your Telemetry & Credit Requirements
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust the sliders to project daily log lines and forensic query volumes.
                </p>
              </div>

              {/* Recommended Badge */}
              <div className="flex items-center gap-3 bg-black/40 border border-slate-700/80 rounded-xl p-3 px-4 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Suggested Tier</p>
                  <p className="text-sm font-bold text-white capitalize">{recommendedPlanId} Plan</p>
                </div>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Slider 1: Daily Log Lines */}
              <div className="space-y-3 bg-black/30 p-5 rounded-xl border border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Daily Ingested Log Lines
                  </label>
                  <span className="text-xs font-bold font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {dailyLogs.toLocaleString()} lines / day
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={1000000}
                  step={5000}
                  value={dailyLogs}
                  onChange={(e) => setDailyLogs(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1,000 (Free)</span>
                  <span>250k (Monthly)</span>
                  <span>1,000,000+ (Yearly)</span>
                </div>
              </div>

              {/* Slider 2: Monthly AI Forensic Queries */}
              <div className="space-y-3 bg-black/30 p-5 rounded-xl border border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    Monthly AI Forensic Queries
                  </label>
                  <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {monthlyQueries.toLocaleString()} queries / mo
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={20000}
                  step={100}
                  value={monthlyQueries}
                  onChange={(e) => setMonthlyQueries(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>50 (Free)</span>
                  <span>5,000 (Pro)</span>
                  <span>20,000+ (Enterprise)</span>
                </div>
              </div>

            </div>

            {/* Live Calculation Results Matrix */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Estimated Credit Need</p>
                  <p className="text-lg font-bold text-white font-mono">~{estimatedCredits.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts/mo</span></p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                  <HardDrive className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Est. Monthly Storage</p>
                  <p className="text-lg font-bold text-white font-mono">~{estimatedStorageGB} <span className="text-xs text-slate-400 font-normal">GB</span></p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Recommended Tier</p>
                  <p className="text-lg font-bold text-emerald-300 capitalize">{recommendedPlanId}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── COMPREHENSIVE COMPARISON MATRIX ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Compare Plans & Specifications</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Detailed breakdown of limits, AI engine features, storage retention, and SLAs.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#090d1f] shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="p-4 sm:p-5 font-bold text-slate-200 text-sm w-1/3">Feature Category</th>
                <th className="p-4 sm:p-5 font-bold text-slate-200 text-sm w-1/5">Free Community</th>
                <th className="p-4 sm:p-5 font-bold text-primary text-sm w-1/5 bg-primary/5">Monthly Pro</th>
                <th className="p-4 sm:p-5 font-bold text-emerald-400 text-sm w-1/4">Yearly Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {COMPARISON_CATEGORIES.map((category, idx) => (
                <div key={idx} style={{ display: "contents" }}>
                  <tr className="bg-slate-950/80">
                    <td colSpan={4} className="p-3 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/40">
                      {category.category}
                    </td>
                  </tr>
                  {category.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 sm:p-4 text-slate-300 font-medium">{row.name}</td>
                      <td className="p-4 sm:p-4 text-slate-400 font-mono">{row.free}</td>
                      <td className="p-4 sm:p-4 text-slate-200 font-mono font-semibold bg-primary/5">{row.monthly}</td>
                      <td className="p-4 sm:p-4 text-emerald-300 font-mono font-semibold">{row.yearly}</td>
                    </tr>
                  ))}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FAQ ACCORDION ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Pricing & Usage Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FAQS.map((faq, i) => (
            <div key={i} className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM CTA BANNER ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-primary/20 via-indigo-900/40 to-cyan-900/20 border border-primary/30 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <h3 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to Upgrade Your Threat Investigation?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mt-3">
            Test and investigate security telemetry immediately with live AI forensic reasoning and automated incident reports.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => handleSelectPlan(PRICING_PLANS[1])}
              className="cyber-btn flex items-center gap-2 text-xs !px-6 !py-3"
            >
              <Zap className="w-4 h-4" />
              Try Monthly Pro Demo
            </button>
            <button
              onClick={() => handleSelectPlan(PRICING_PLANS[2])}
              className="cyber-btn-outline flex items-center gap-2 text-xs !px-6 !py-3"
            >
              <Shield className="w-4 h-4" />
              Explore Yearly Enterprise
            </button>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE PLAN SELECTION PREVIEW MODAL ── */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0c1126] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedPlanModal.name} Plan</h3>
                  <p className="text-xs text-slate-400">{selectedPlanModal.price.billingPeriod}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Presentation mode notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  <strong>Preview Mode Notice:</strong> This pricing interface is configured for presentation and evaluation purposes. No payment gateway or real credit card is required.
                </p>
              </div>

              {/* Resource Quota Summary */}
              <div className="rounded-xl bg-black/40 border border-slate-800 p-4 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Included Resource Allocation:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400">AI Credits:</span>
                    <p className="font-bold text-white font-mono">{selectedPlanModal.metrics.credits}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400">Storage Buffer:</span>
                    <p className="font-bold text-white font-mono">{selectedPlanModal.metrics.storage}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400">Daily Ingestion:</span>
                    <p className="font-bold text-white font-mono">{selectedPlanModal.metrics.usage}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400">Retention:</span>
                    <p className="font-bold text-white font-mono">{selectedPlanModal.metrics.retention}</p>
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-300">
                <span>Calculated Amount:</span>
                <span className="text-lg font-bold text-white font-mono">
                  ${selectedPlanModal.price.monthly} <span className="text-xs text-slate-400 font-normal">/ mo</span>
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPlan}
                className="cyber-btn flex items-center gap-1.5 text-xs !px-5 !py-2.5"
              >
                <Check className="w-3.5 h-3.5" />
                Activate Plan (Demo Preview)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function PricingPage() {
  const { isAuthenticated } = useAuth();

  // If user is authenticated, render inside the standard Layout with sidebar
  if (isAuthenticated) {
    return (
      <Layout>
        <PricingContent />
      </Layout>
    );
  }

  // If user is unauthenticated, render with top navigation and full landing page theme
  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans selection:bg-primary/30 selection:text-primary relative">
      
      {/* Top Simple Sticky Navbar for standalone view */}
      <header className="sticky top-0 z-40 bg-[#070913]/90 backdrop-blur-md border-b border-slate-800/80 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-cyan-500 p-[1.5px] shadow-lg shadow-primary/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#070913] rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary group-hover:scale-105 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight leading-none">THREADLENS</span>
              <span className="text-[9px] uppercase font-semibold tracking-widest text-primary/80 mt-0.5">AI Forensics</span>
            </div>
          </Link>

          <nav className="flex items-center gap-4 text-xs font-medium">
            <Link to="/landing" className="text-slate-300 hover:text-white transition-colors">Platform</Link>
            <Link to="/pricing" className="text-primary font-semibold transition-colors">Pricing</Link>
            <Link to="/login" className="text-slate-300 hover:text-white transition-colors">Sign in</Link>
            <Link to="/signup" className="cyber-btn !px-3.5 !py-1.5 text-xs">
              Start Free
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <PricingContent />
      </main>

      <footer className="border-t border-slate-900 bg-[#04060c] py-8 text-center text-xs text-slate-500">
        <p>© 2026 ThreadLens • AI-Powered Security Forensics • Presentation Mode</p>
      </footer>
    </div>
  );
}
