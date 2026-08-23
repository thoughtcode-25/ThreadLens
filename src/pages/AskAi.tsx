import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { AiAnalysisPanel } from "@/components/dashboard/AiAnalysisPanel";
import { api, type ChatSession } from "@/lib/api";
import { Bot, Plus, Trash2, MessageSquare, Clock } from "lucide-react";

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AskAi = () => {
  const location = useLocation();
  const locationState = location.state as {
    initialMessage?: string;
    initialAttachments?: { name: string; type: "image" | "text"; dataUrl?: string }[];
    activeSessionId?: string;
    activeTitle?: string;
  } | null;
  const initialMessage = locationState?.initialMessage;
  const initialAttachments = locationState?.initialAttachments;
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(locationState?.activeSessionId ?? null);
  const [activeTitle, setActiveTitle] = useState<string>(locationState?.activeTitle ?? "");

  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/sessions"],
    queryFn: () => api.listChatSessions(),
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteChatSession(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setActiveTitle("");
      }
    },
  });

  const sessions: ChatSession[] = historyData?.sessions ?? [];

  const handleNewChat = () => {
    setActiveSessionId(null);
    setActiveTitle("");
  };

  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setActiveTitle(session.title);
  };

  const handleSessionCreated = (id: string, title: string) => {
    setActiveSessionId(id);
    setActiveTitle(title);
    queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
  };

  return (
    <Layout>
      <div className="flex gap-4 h-[calc(100vh-120px)]">
        <div className="w-64 shrink-0 flex flex-col glass-panel rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Chat History</span>
            </div>
            <button
              onClick={handleNewChat}
              data-testid="button-new-chat"
              className="cyber-btn !px-2 !py-1 text-xs flex items-center gap-1"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          <div className="flex-1 overflow-auto scrollbar-cyber p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 px-3">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No chat history yet. Start a conversation!</p>
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  data-testid={`chat-session-${s.id}`}
                  onClick={() => handleSelectSession(s)}
                  className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeSessionId === s.id
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
                      <p className="text-[10px] text-muted-foreground/60">{formatDate(s.updated_at || s.created_at)}</p>
                    </div>
                  </div>
                  <button
                    data-testid={`button-delete-session-${s.id}`}
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {activeTitle || "Ask AI"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeSessionId ? "Viewing saved chat session" : "Get AI-powered insights about your logs and threats"}
              </p>
            </div>
          </div>
          <AiAnalysisPanel
            sessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            initialMessage={initialMessage}
            initialAttachments={initialAttachments}
          />
        </div>
      </div>
    </Layout>
  );
};

export default AskAi;
