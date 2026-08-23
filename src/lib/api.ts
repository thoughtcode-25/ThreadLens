const BASE = "";

function getUserEmail(): string {
  try {
    const stored = localStorage.getItem("forensic_auth_user");
    if (stored) {
      const user = JSON.parse(stored);
      return user.email || "";
    }
  } catch {
    // Ignore malformed local user state.
  }
  return "";
}

function getToken(): string {
  try {
    return localStorage.getItem("forensic_token") || "";
  } catch { return ""; }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const email = getUserEmail();
  const token = getToken();
  return {
    ...(email ? { "X-User-Email": email } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string; db_connected: boolean; ai_configured: boolean }>("/api/health"),

  stats: () =>
    request<{
      logs_analyzed: number;
      threats_detected: number;
      unresolved_alerts: number;
      high_risk_alerts: number;
      risk_level: string;
      last_incident: string | null;
    }>("/api/stats"),

  getLogs: (limit = 100) =>
    request<{ logs: LogEntry[]; total: number }>(`/api/logs?limit=${limit}`),

  getLiveLogs: (count = 15) =>
    request<{ logs: LogEntry[] }>(`/api/live-logs?count=${count}`),

  getAlerts: () => request<{ alerts: Alert[] }>("/api/alerts"),

  uploadLogs: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ success: boolean; job_id: string }>(
      "/api/upload",
      { method: "POST", body: form }
    );
  },


  getUploadStatus: (jobId: string) =>
    request<{
      status: string;
      logs_stored?: number;
      threats_detected?: number;
      file_size_mb?: number;
      truncated?: boolean;
      error?: string;
    }>(`/api/upload/status/${jobId}`),

  analyze: (event: object) =>
    request<{
      explanation: string;
      attack_type: string;
      risk_level: string;
      why_dangerous: string;
      recommended_actions: string[];
    }>("/api/analyze", { method: "POST", body: JSON.stringify({ event }) }),

  investigate: (logs: object[]) =>
    request<{
      attack_flow: string;
      root_cause: string;
      attacker_intent: string;
      affected_systems: string[];
      severity: string;
      remediation_steps: string[];
      summary: string;
    }>("/api/investigate", { method: "POST", body: JSON.stringify({ logs }) }),

  chat: (message: string, history?: { role: string; content: string }[], session_id?: string) =>
    request<{ success: boolean; off_topic: boolean; response: string; timestamp: string; session_id?: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, history, session_id }),
    }),

  createChatSession: (title: string) =>
    request<{ session_id: string; title: string; created_at: string }>("/api/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  listChatSessions: () =>
    request<{ sessions: ChatSession[] }>("/api/chat/sessions"),

  getChatSession: (session_id: string) =>
    request<{ id: string; title: string; messages: ChatMessage[]; created_at: string }>(
      `/api/chat/sessions/${session_id}`
    ),

  deleteChatSession: (session_id: string) =>
    request<{ success: boolean }>(`/api/chat/sessions/${session_id}`, { method: "DELETE" }),

  getSessions: () => request<{ sessions: Session[] }>("/api/sessions"),

  exportData: (format: "json" | "csv", collection: "logs" | "alerts") =>
    fetch(`/api/export?format=${format}&collection=${collection}`, {
      headers: authHeaders(),
    }),

  blockIp: (ip: string, alertId?: string, reason?: string) =>
    request<{ success: boolean; already_blocked: boolean; message: string }>("/api/block-ip", {
      method: "POST",
      body: JSON.stringify({ ip, alert_id: alertId, reason }),
    }),

  getBlockedIps: () =>
    request<{ blocked_ips: { ip: string; blocked_at: string; reason: string }[] }>("/api/blocked-ips"),
};

export interface LogEntry {
  id: string;
  timestamp: string;
  ip: string;
  event: string;
  level: "info" | "warning" | "error" | "critical";
  suspicious: boolean;
  status: string;
  risk: string;
  raw?: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  risk: "low" | "medium" | "high";
  timestamp: string;
  source: string;
  resolved: boolean;
  type?: string;
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
  id?: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  attachments?: { name: string; type: "image" | "text"; dataUrl?: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}
