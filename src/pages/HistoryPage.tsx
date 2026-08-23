import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api, type Session, type ChatSession } from "@/lib/api";
import {
  History as HistoryIcon,
  ChevronRight,
  AlertTriangle,
  FileText,
  Bot,
  MessageSquare,
  BarChart3,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"logs" | "chats">("logs");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSessions([]);
    setChatSessions([]);
    Promise.allSettled([api.getSessions(), api.listChatSessions()])
      .then(([sessionsRes, chatRes]) => {
        if (sessionsRes.status === "fulfilled" && sessionsRes.value.sessions) {
          setSessions(sessionsRes.value.sessions);
        }
        if (chatRes.status === "fulfilled" && chatRes.value.sessions) {
          setChatSessions(chatRes.value.sessions);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.email]);

  const handleOpenLogReport = (session: Session) => {
    navigate("/report", {
      state: {
        success: true,
        logs_parsed: session.logsAnalyzed,
        threats_detected: session.threatsDetected,
        session_id: session.id,
        file_size_mb: 0,
        truncated: false,
        filename: session.sourceFile || `Session-${session.date}`,
      },
    });
  };

  const handleAskAiAboutSession = (session: Session, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prompt = `Please provide an in-depth forensic investigation and breakdown for the log upload session from ${session.date} (File: ${session.sourceFile || "Uploaded Log Stream"}, ${session.logsAnalyzed.toLocaleString()} logs parsed, ${session.threatsDetected} threats detected). What are the critical findings, affected systems, and remediation actions?`;
    navigate("/ask-ai", {
      state: {
        initialMessage: prompt,
      },
    });
  };

  const handleOpenChat = (chat: ChatSession) => {
    navigate("/ask-ai", {
      state: {
        activeSessionId: chat.id,
        activeTitle: chat.title,
      },
    });
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Log session removed from history" });
    } catch {
      toast({ title: "Could not remove log session", variant: "destructive" });
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(id);
      setChatSessions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Chat session deleted" });
    } catch {
      toast({ title: "Could not delete chat session", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Activity & Session History</h2>
              <p className="text-sm text-muted-foreground">
                View previous forensic log upload reports and interactive AI chat investigations
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("logs")}
              data-testid="tab-log-sessions"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "logs"
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Log Sessions ({sessions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("chats")}
              data-testid="tab-ai-chats"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "chats"
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chats ({chatSessions.length})</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="glass-panel rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground font-mono">Loading telemetry and chat history…</p>
          </div>
        ) : activeTab === "logs" ? (
          /* Log Upload Sessions */
          sessions.length === 0 ? (
            <div className="glass-panel rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center border-dashed border-slate-800">
              <FileText className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm font-medium text-slate-300">No log upload sessions yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Your forensic reports and session records will appear here after you upload log files.
              </p>
              <button
                onClick={() => navigate("/analyze")}
                className="cyber-btn text-xs mt-2 !py-2 !px-4 flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                Upload Log File
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, i) => (
                <div
                  key={session.id || i}
                  onClick={() => handleOpenLogReport(session)}
                  className="glass-panel rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/50 transition-all duration-200 cursor-pointer group shadow-lg bg-[#0f172a]/95"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 group-hover:border-primary/40 transition-colors">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">
                          {session.sourceFile || `Session Log Ingestion`}
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {session.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {session.logsAnalyzed.toLocaleString()} log entries parsed
                        {session.duration ? ` • Duration: ${session.duration}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                    {session.threatsDetected > 0 ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{session.threatsDetected} Threats</span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                        All Clean
                      </div>
                    )}

                    <button
                      onClick={(e) => handleAskAiAboutSession(session, e)}
                      title="Investigate this session with AI"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask AI</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLogReport(session);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:border-slate-600 transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Report</span>
                      <ChevronRight className="w-3 h-3 ml-0.5" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      title="Delete log session"
                      className="p-2 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* AI Chat History */
          chatSessions.length === 0 ? (
            <div className="glass-panel rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center border-dashed border-slate-800">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm font-medium text-slate-300">No saved AI chats yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Start a conversation with the AI Forensic Analyst and your chat sessions will be automatically saved here.
              </p>
              <button
                onClick={() => navigate("/ask-ai")}
                className="cyber-btn text-xs mt-2 !py-2 !px-4 flex items-center gap-2"
              >
                <Bot className="w-3.5 h-3.5" />
                Start New Chat
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {chatSessions.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleOpenChat(chat)}
                  className="glass-panel rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-primary/50 transition-all duration-200 cursor-pointer group shadow-lg bg-[#0f172a]/95"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/30 text-primary">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                        {chat.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{chat.updated_at ? new Date(chat.updated_at).toLocaleString() : "Recently"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChat(chat);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-md"
                    >
                      <span>Open Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      title="Delete chat session"
                      className="p-2 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  );
};

export default HistoryPage;
