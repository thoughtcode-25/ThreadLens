export interface LogEntry {
  id: string;
  timestamp: string;
  ip: string;
  event: string;
  level: "info" | "warning" | "error" | "critical";
  suspicious: boolean;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  risk: "low" | "medium" | "high";
  timestamp: string;
  source: string;
  resolved: boolean;
}

export interface Session {
  id: string;
  date: string;
  logsAnalyzed: number;
  threatsDetected: number;
  duration: string;
  status: "completed" | "in-progress";
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

const events = [
  // High-severity Attacks & Suspicious
  "SSH login attempt (invalid user 'root')",
  "SSH brute force detected (>50 attempts/min)",
  "Failed authentication for user 'admin'",
  "Port scan detected (SYN sweep ports 1-1024)",
  "Firewall rule triggered: DROP inbound to port 445",
  "Suspicious outbound C2 beacon to 91.219.236.222:4444",
  "Privilege escalation attempt: sudo su without auth",
  "SQL Injection detected: SELECT * FROM users WHERE '1'='1'",
  "Cross-Site Scripting (XSS) detected in GET /search",
  "Malware signature match: Trojan.Generic.KDZ",
  "DNS tunneling data exfiltration suspected (subdomain queries)",
  "Unauthorized file access attempt: /etc/shadow",
  "Directory traversal attempt: ../../../../etc/passwd",
  "DDoS SYN flood anomaly: 12,000 pkts/sec on port 443",
  "Reverse TCP shell connection initiated",
  "Ransomware file encryption activity detected in /var/data",

  // Normal / Operational
  "Normal HTTP GET /api/v1/health 200 OK",
  "Normal HTTP POST /api/auth/token 200 OK",
  "Database query executed: SELECT count(*) FROM metrics",
  "User session created for user 'operator_1'",
  "Config file modified: /etc/nginx/nginx.conf by admin",
  "System service restarted: systemd-journald.service",
  "Automated backup completed successfully (4.2 GB)",
  "TLS certificate renewed for *.internal.corp",
  "API rate limit warning: 85% of quota used on /api/v2/stream",
  "Kubernetes pod health probe check passed",
  "Outbound HTTPS request to api.github.com 200 OK",
  "DHCP lease renewed for 192.168.1.145",
];

const ips = [
  "185.220.101.34", "91.219.236.222", "178.128.0.12", "45.33.32.156",
  "103.251.167.20", "194.26.29.112", "198.51.100.23", "203.0.113.50",
  "192.168.1.105", "10.0.0.42", "172.16.0.88", "192.0.2.1",
  "10.244.0.15", "172.20.10.4", "192.168.0.254",
];

const suspiciousKeywords = [
  "SSH brute force", "Port scan", "Suspicious outbound", "Privilege escalation",
  "SQL Injection", "XSS", "Malware", "DNS tunneling", "Unauthorized file",
  "Directory traversal", "DDoS", "Reverse TCP shell", "Ransomware", "Failed authentication",
];

function isEventSuspicious(eventStr: string): boolean {
  return suspiciousKeywords.some((kw) => eventStr.includes(kw));
}

function formatCurrentTimestamp(offsetSeconds = 0): string {
  const d = new Date(Date.now() - offsetSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function generateLiveLogEntry(idSuffix?: number | string) {
  const event = events[Math.floor(Math.random() * events.length)];
  const isSuspicious = isEventSuspicious(event);
  const ip = ips[Math.floor(Math.random() * ips.length)];
  const uniqueId = `live-${Date.now()}-${idSuffix ?? Math.random().toString(36).substring(2, 7)}`;

  let level: "info" | "warning" | "error" | "critical" = "info";
  let risk: "low" | "medium" | "high" = "low";
  let status: "success" | "failed" | "blocked" = "success";

  if (isSuspicious) {
    const isCritical = event.includes("Ransomware") || event.includes("Reverse TCP") || event.includes("Malware") || event.includes("SQL Injection");
    level = isCritical ? "critical" : (Math.random() > 0.4 ? "error" : "warning");
    risk = isCritical || Math.random() > 0.5 ? "high" : "medium";
    status = Math.random() > 0.3 ? "failed" : "blocked";
  } else {
    level = event.includes("warning") ? "warning" : (Math.random() > 0.9 ? "warning" : "info");
    risk = "low";
    status = "success";
  }

  return {
    id: uniqueId,
    timestamp: formatCurrentTimestamp(0),
    ip,
    event,
    level,
    suspicious: isSuspicious,
    status,
    risk,
    raw: `[${formatCurrentTimestamp(0)}] ${ip} -> ${event} [status=${status}, risk=${risk}]`,
  };
}

export function generateLogEntry(index: number): LogEntry {
  const event = events[Math.floor(Math.random() * events.length)];
  const isSuspicious = isEventSuspicious(event);
  const ip = ips[Math.floor(Math.random() * ips.length)];

  return {
    id: `log-${Date.now()}-${index}`,
    timestamp: formatCurrentTimestamp(index * Math.floor(Math.random() * 4 + 1)),
    ip,
    event,
    level: isSuspicious
      ? Math.random() > 0.5 ? "critical" : "error"
      : Math.random() > 0.7 ? "warning" : "info",
    suspicious: isSuspicious,
  };
}

export function generateInitialLogs(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, i) => generateLogEntry(i));
}

export const mockAlerts: Alert[] = [
  { id: "a1", title: "Brute Force Attack Detected", description: "Multiple failed SSH login attempts from IP 185.220.101.34. Over 200 attempts in the last 5 minutes.", risk: "high", timestamp: "2026-04-09 14:23:01", source: "185.220.101.34", resolved: false },
  { id: "a2", title: "Suspicious DNS Queries", description: "Unusual DNS query patterns detected suggesting possible data exfiltration through DNS tunneling.", risk: "high", timestamp: "2026-04-09 14:18:44", source: "10.0.0.42", resolved: false },
  { id: "a3", title: "Port Scan Activity", description: "Sequential port scanning detected from external IP. Ports 1-1024 being probed.", risk: "medium", timestamp: "2026-04-09 14:10:22", source: "45.33.32.156", resolved: false },
  { id: "a4", title: "Unauthorized Config Change", description: "Firewall configuration modified outside of maintenance window.", risk: "medium", timestamp: "2026-04-09 13:55:11", source: "192.168.1.105", resolved: true },
  { id: "a5", title: "API Rate Limit Exceeded", description: "API endpoint /api/v2/users exceeded rate limit threshold by 300%.", risk: "low", timestamp: "2026-04-09 13:40:08", source: "203.0.113.50", resolved: true },
];

export const mockSessions: Session[] = [
  { id: "s1", date: "2026-04-09", logsAnalyzed: 15420, threatsDetected: 8, duration: "2h 15m", status: "in-progress" },
  { id: "s2", date: "2026-04-08", logsAnalyzed: 42100, threatsDetected: 3, duration: "6h 30m", status: "completed" },
  { id: "s3", date: "2026-04-07", logsAnalyzed: 38750, threatsDetected: 12, duration: "8h 00m", status: "completed" },
  { id: "s4", date: "2026-04-06", logsAnalyzed: 29800, threatsDetected: 1, duration: "5h 45m", status: "completed" },
  { id: "s5", date: "2026-04-05", logsAnalyzed: 51200, threatsDetected: 7, duration: "10h 20m", status: "completed" },
  { id: "s6", date: "2026-04-04", logsAnalyzed: 33600, threatsDetected: 5, duration: "7h 10m", status: "completed" },
];

export const mockChatMessages: ChatMessage[] = [
  { id: "c1", role: "ai", content: "I've detected a brute force attack pattern from IP 185.220.101.34. The attacker has attempted over 200 SSH login attempts in the past 5 minutes using common username/password combinations.", timestamp: "14:23" },
  { id: "c2", role: "ai", content: "**Recommended Actions:**\n1. Block IP 185.220.101.34 at firewall level\n2. Enable fail2ban if not already active\n3. Review SSH key-only authentication policy\n4. Check if any credentials were compromised", timestamp: "14:23" },
];
