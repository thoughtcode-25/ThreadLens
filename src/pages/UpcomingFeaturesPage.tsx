import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  Rocket,
  Sparkles,
  Bot,
  ShieldCheck,
  Cpu,
  Lock,
  Workflow,
  Terminal,
  Zap,
  Globe,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Flame,
  Layers,
  FileCode,
  ShieldAlert,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UpcomingFeature {
  id: string;
  title: string;
  tagline: string;
  category: string;
  status: "In Active Development" | "Alpha Testing" | "Architecture & Design" | "Community Requested";
  releaseTarget: string;
  icon: React.ElementType;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
  description: string;
  keyCapabilities: string[];
  architectureHighlights: string[];
  mockPreviewSnippet?: string;
}

const UPCOMING_FEATURES: UpcomingFeature[] = [
  {
    id: "autonomous-threat-swarm",
    title: "Autonomous AI Threat Hunting Swarm",
    tagline: "Multi-Agent Coordinated Incident Response & Root Cause Analysis",
    category: "Next-Gen AI & Agents",
    status: "In Active Development",
    releaseTarget: "Q4 2026",
    icon: Bot,
    accentColor: "text-purple-400",
    bgGradient: "from-purple-950/30 via-slate-900/60 to-slate-950",
    borderColor: "border-purple-500/30",
    description:
      "A self-orchestrating swarm of specialized AI agents (Incident Commander, Network Forensics Analyst, Threat Intel Correlator, and Remediation Architect) that continuously investigate anomalous telemetry in parallel, reconstructing the entire kill-chain without human fatigue.",
    keyCapabilities: [
      "Dynamic Agent Delegation: AI Commander spawns sub-agents to dissect PCAPs, auth logs, and cloud trails simultaneously.",
      "Automated MITRE ATT&CK Mapping: Correlates disparate log events into structured tactic/technique timelines.",
      "Executable Containment Playbooks: Generates ready-to-deploy bash, PowerShell, and Terraform remediation scripts.",
      "Hallucination-Proof Verification: Cross-verifies evidence against local forensic hashes before issuing recommendations.",
    ],
    architectureHighlights: [
      "Gemini 2.5 Flash + Local RAG vector memory",
      "Graph-based attack path correlation (GQL)",
      "Continuous asynchronous sub-agent spawning",
    ],
    mockPreviewSnippet: `[AI_SWARM_ORCHESTRATOR] ➜ Spawning 3 Forensic Sub-Agents...
Agent_1 (Network_Analyst)  ➜ Reconstructing TLS session anomalies from 185.220.101.34
Agent_2 (Identity_Auditor) ➜ Analyzing Kerberos ticket grant requests for user 'svc-backup'
Agent_3 (Playbook_Builder) ➜ Generating Zero-Trust IAM revocation payload...
[VERDICT] High confidence Ransomware Precursor (MITRE T1078.002). Recommended action: Isolate Host-04.`,
  },
  {
    id: "zero-trust-soar",
    title: "Zero-Trust Automated SOAR & Cloud Interceptor",
    tagline: "One-Click Automated Firewall & Cloud Identity Remediation",
    category: "Automation & Cloud Defense",
    status: "Alpha Testing",
    releaseTarget: "Q1 2027",
    icon: Workflow,
    accentColor: "text-cyan-400",
    bgGradient: "from-cyan-950/30 via-slate-900/60 to-slate-950",
    borderColor: "border-cyan-500/30",
    description:
      "Direct bi-directional integrations with AWS GuardDuty, CrowdStrike Falcon, Cloudflare, Palo Alto Networks, and Okta to enforce zero-touch quarantine, revoke active sessions, and dynamically adjust edge security policies within milliseconds of an attack.",
    keyCapabilities: [
      "Zero-Touch Cloud Isolation: Instantly attach restrictive AWS Security Groups or isolate compromised EC2/Kubernetes nodes.",
      "Okta & Azure AD Session Killing: Immediately terminate compromised user tokens and enforce step-up MFA.",
      "Cloudflare / WAF Edge Block Rule Push: Block malicious autonomous ASN networks and brute-force IPs across edge CDN nodes.",
      "Human-in-the-Loop Safeguards: Configurable auto-enforcement thresholds with approval workflows for production systems.",
    ],
    architectureHighlights: [
      "Webhooks & REST Connectors for AWS, GCP, Azure, Cloudflare",
      "Cryptographically signed SOAR action tokens",
      "Rollback and audit undo ledger",
    ],
    mockPreviewSnippet: `POST /api/v2/soar/enforce-action
{
  "target_ip": "45.33.32.156",
  "threat_level": "CRITICAL",
  "actions": [
    "AWS_WAF_ADD_IP_SET (Rule: Block-Brute-Force)",
    "OKTA_SUSPEND_SESSION (User: admin@threatlens.io)",
    "SLACK_SOC_PAGER (Channel: #incident-critical)"
  ],
  "execution_status": "ENFORCED_IN_42MS"
}`,
  },
  {
    id: "malware-decompiler-sandbox",
    title: "In-Browser Forensic Sandbox & Script Decompiler",
    tagline: "Interactive Payload Emulation & Heuristic Malware Analysis",
    category: "Forensic Analysis",
    status: "Architecture & Design",
    releaseTarget: "Q2 2027",
    icon: Terminal,
    accentColor: "text-emerald-400",
    bgGradient: "from-emerald-950/30 via-slate-900/60 to-slate-950",
    borderColor: "border-emerald-500/30",
    description:
      "A sandboxed forensic execution engine inside Thread Lens that safely parses, deobfuscates, and dynamic-emulates suspicious script payloads (.ps1, .sh, .vbs, .js, ELF/PE binaries) to extract hidden C2 callouts without executing code on the host machine.",
    keyCapabilities: [
      "Abstract Syntax Tree (AST) Deobfuscation: Unpacks layered XOR, Base64, and variable substitution tricks automatically.",
      "Heuristic API Call-Graph Viewer: Visually tracks process injection, registry modifications, and persistence hooks.",
      "Automated YARA & Sigma Rule Generator: Generates exportable SIEM detection rules from uploaded malware samples.",
      "Safe WebAssembly Isolation: Execution happens inside an isolated WebAssembly micro-container with zero host leak.",
    ],
    architectureHighlights: [
      "Wasm-based safe emulators",
      "Yara v4 pattern synthesis engine",
      "Dynamic control flow graph rendering",
    ],
    mockPreviewSnippet: `[SANDBOX_EMULATOR] Inspecting suspicious script: payload_win32.ps1
✓ Layer 1 Base64 Decompressed (Gzip Stream detected)
✓ Layer 2 XOR Key Discovered: 0x5A
✓ API Calls Hooked: VirtualAllocEx, WriteProcessMemory, CreateRemoteThread
[EXTRACTED_IOC] Target Process: lsass.exe | C2 Beacon: http://185.220.101.34:8443/gate.php
✓ Generated YARA Signature: rule Trojan_ThreadLens_Auto_2026 { ... }`,
  },
  {
    id: "immutable-blockchain-audit",
    title: "Quantum-Resistant Immutable Forensic Log Ledger",
    tagline: "Court-Admissible Tamper-Proof Cryptographic Notarization",
    category: "Compliance & Integrity",
    status: "Community Requested",
    releaseTarget: "Q3 2027",
    icon: Lock,
    accentColor: "text-amber-400",
    bgGradient: "from-amber-950/30 via-slate-900/60 to-slate-950",
    borderColor: "border-amber-500/30",
    description:
      "Guarantees forensic chain-of-custody and zero tampering for court-admissible evidence. Logs and incident reports are sealed using post-quantum lattice-based Merkle trees, ensuring that even if an adversary gains root database access, historical logs cannot be retroactively altered.",
    keyCapabilities: [
      "Cryptographic Merkle Proofs: Verify that an individual log record was not modified since ingestion time.",
      "Post-Quantum Kyber/Dilithium Signatures: Future-proof integrity verification against quantum computing decryption.",
      "One-Click Legal Compliance Export: Generates court-admissible chain-of-custody certificates (ISO/IEC 27037, NIST SP 800-86).",
      "Tamper Detection Alarms: Instant SOC alerts if any historical database record hash differs from the Merkle root.",
    ],
    architectureHighlights: [
      "Lattice-based cryptographic hashing",
      "Decentralized Merkle Tree checkpoints",
      "RFC 3161 digital timestamping authority compatibility",
    ],
    mockPreviewSnippet: `MERKLE_ROOT: 0x9f83...b2c4 | TIME_NOTARIZED: 2026-08-23T15:58:00Z
LOG_ID: #91823 | STATUS: CRYPTOGRAPHICALLY_SEALED (Dilithium-5)
Chain-of-Custody Verification: PASS (Zero Tampering Detected)
Legal Hash Witness: Verified across 5 Distributed Notary Nodes.`,
  },
];

export default function UpcomingFeaturesPage() {
  const { toast } = useToast();
  const [selectedFeature, setSelectedFeature] = useState<UpcomingFeature>(UPCOMING_FEATURES[0]);
  const [subscribedList, setSubscribedList] = useState<string[]>([]);

  const handleNotifyMe = (featureId: string, title: string) => {
    if (subscribedList.includes(featureId)) {
      toast({
        title: "Already Subscribed",
        description: `You are already on the priority early-access list for ${title}.`,
      });
      return;
    }
    setSubscribedList([...subscribedList, featureId]);
    toast({
      title: "Priority Access Requested!",
      description: `You'll be notified via email when ${title} enters private beta.`,
    });
  };

  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("businessthought.code@gmail.com");
    setCopiedEmail(true);
    toast({ title: "Email copied to clipboard!" });
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-6xl mx-auto animate-fade-in pb-16">
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-panel p-6 sm:p-8 rounded-2xl border-primary/30 relative overflow-hidden bg-gradient-to-br from-primary/15 via-slate-950 to-slate-900 shadow-2xl">
          <div className="space-y-2 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/40 uppercase tracking-wider">
              <Rocket className="w-3.5 h-3.5" />
              <span>Thread Lens Product Roadmap</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Upcoming Functionalities & Innovations
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore upcoming enterprise capabilities engineered to transform SOC operations, from autonomous AI threat hunting swarms to zero-touch cloud interception and post-quantum forensic audit ledgers.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 shrink-0">
            <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-center">
              <p className="text-2xl font-extrabold text-primary font-mono">4</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-0.5">Core Features in R&D</p>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-center">
              <p className="text-2xl font-extrabold text-emerald-400 font-mono">2026-27</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-0.5">Rollout Horizon</p>
            </div>
          </div>
        </div>

        {/* Feature Grid & Interactive Deep-Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Cards List */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Select Feature to Preview Details
            </h3>

            {UPCOMING_FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isSelected = selectedFeature.id === feature.id;
              return (
                <div
                  key={feature.id}
                  onClick={() => setSelectedFeature(feature)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col gap-2.5 ${
                    isSelected
                      ? `bg-slate-900/90 ${feature.borderColor} shadow-lg shadow-primary/10 scale-[1.01] ring-1 ring-primary/40`
                      : "glass-panel border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center bg-black/50 border border-slate-800 ${feature.accentColor}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight">
                          {feature.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {feature.category}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-slate-800 shrink-0">
                      {feature.releaseTarget}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {feature.tagline}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span
                      className={`font-semibold text-[10px] uppercase ${
                        feature.status === "In Active Development"
                          ? "text-purple-400"
                          : feature.status === "Alpha Testing"
                          ? "text-cyan-400"
                          : feature.status === "Architecture & Design"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      ● {feature.status}
                    </span>

                    <span className="text-primary hover:underline flex items-center gap-1 font-medium text-xs">
                      Inspect Spec <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Selected Deep-Dive Panel */}
          <div className="lg:col-span-7">
            <div
              className={`glass-panel p-6 sm:p-7 rounded-2xl border ${selectedFeature.borderColor} bg-gradient-to-b ${selectedFeature.bgGradient} space-y-6 shadow-2xl animate-fade-in`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-black/60 border border-slate-800 ${selectedFeature.accentColor} shadow-inner`}>
                    <selectedFeature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider font-mono">
                        {selectedFeature.category}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400 font-mono">Target: {selectedFeature.releaseTarget}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                      {selectedFeature.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => handleNotifyMe(selectedFeature.id, selectedFeature.title)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 ${
                    subscribedList.includes(selectedFeature.id)
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-primary text-white hover:bg-primary/90 shadow-primary/25 border border-primary/50"
                  }`}
                >
                  {subscribedList.includes(selectedFeature.id) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Early Access Enrolled
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5" /> Request Early Access
                    </>
                  )}
                </button>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Vision & Technical Architecture
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedFeature.description}
                </p>
              </div>

              {/* Key Capabilities */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Core Capabilities & Innovations
                </h4>
                <div className="space-y-2">
                  {selectedFeature.keyCapabilities.map((cap, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-black/40 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed"
                    >
                      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture Highlights Chips */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Engine & Stack Specifications
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFeature.architectureHighlights.map((arch, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                    >
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      {arch}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Preview / Code Simulation Snippet */}
              {selectedFeature.mockPreviewSnippet && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      Execution Telemetry Prototype
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Interactive Mock</span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-black/80 border border-slate-800 text-[11px] font-mono text-emerald-300/90 whitespace-pre-wrap overflow-x-auto leading-relaxed scrollbar-cyber">
                    {selectedFeature.mockPreviewSnippet}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Option Banner at Bottom */}
        <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-primary/30 bg-gradient-to-br from-primary/10 via-slate-950 to-slate-900 text-center space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/40">
            <Mail className="w-3.5 h-3.5" />
            <span>Partnerships & Research Contact</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Interested in pilot testing or enterprise feature co-development?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Connect directly with the core engineering team behind Thread Lens to request private beta access or discuss custom SIEM/SOAR integrations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="mailto:businessthought.code@gmail.com"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-105"
            >
              <Mail className="w-4 h-4" />
              <span>businessthought.code@gmail.com</span>
            </a>
            <button
              onClick={handleCopyEmail}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmail ? "Copied!" : "Copy Email"}</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
