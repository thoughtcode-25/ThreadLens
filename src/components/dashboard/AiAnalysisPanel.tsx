import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Image as ImageIcon, X, FileText, Copy, Check, Sparkles, ScanText, CheckCircle2 } from "lucide-react";
import { api, type ChatMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { extractTextFromImage } from "@/lib/ocr";

interface AttachedFile {
  name: string;
  type: "image" | "text";
  content: string;
  dataUrl?: string;
  ocrText?: string;
  isScanning?: boolean;
}

interface Props {
  sessionId?: string | null;
  onSessionCreated?: (id: string, title: string) => void;
  initialMessage?: string;
  initialAttachments?: { name: string; type: "image" | "text"; dataUrl?: string }[];
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "ai",
    content: "**ThreadLens AI Security Analyst initialized.**\n\nI have live access to your parsed logs, active threat alerts, and telemetry. You can ask me to:\n- **Analyze detected attack patterns** or suspicious IPs\n- **Scan and investigate screenshots or log images** for security errors & anomalies\n- **Explain specific log anomalies** (e.g. brute force, port scans, priv escalation)\n- **Recommend incident containment actions** and mitigation steps.",
    timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  },
];

const QUICK_PROMPTS = [
  "Summarize all high-severity threats detected in my logs",
  "What are the top suspicious IP addresses and their activities?",
  "How do I investigate and contain a brute-force SSH attack?",
  "Explain privilege escalation indicators in Linux logs",
];

export function AiAnalysisPanel({ sessionId, onSessionCreated, initialMessage, initialAttachments }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState(initialMessage ?? "");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId ?? null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevSessionId = useRef<string | null | undefined>(undefined);
  const didAutoSend = useRef(false);
  const internallyCreatedSession = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard", description: "AI forensic response copied." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (initialMessage && !didAutoSend.current) {
      didAutoSend.current = true;
      const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const userMsg: ChatMessage = {
        id: `u-auto`,
        role: "user",
        content: initialAttachments && initialAttachments.length > 0
          ? (initialMessage.startsWith("Analyze the following") || initialMessage.startsWith("[Image") || initialMessage.startsWith("Please analyze the security")
              ? initialAttachments[0].name
              : initialMessage.split("\n\n--- Attached file:")[0].split("\n\n--- OCR EXTRACTED")[0] || initialMessage)
          : initialMessage,
        timestamp: ts,
        attachments: initialAttachments,
      };
      setMessages((prev) => {
        const updated = [...prev, userMsg];
        sendToAI(initialMessage, updated, ts);
        return updated;
      });
      setInput("");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (prevSessionId.current === sessionId) return;
    prevSessionId.current = sessionId;

    if (sessionId && sessionId === internallyCreatedSession.current) {
      internallyCreatedSession.current = null;
      return;
    }

    if (!sessionId) {
      setMessages(INITIAL_MESSAGES);
      setCurrentSessionId(null);
      return;
    }

    setCurrentSessionId(sessionId);
    setLoadingHistory(true);
    api.getChatSession(sessionId)
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m, i) => ({ ...m, id: `hist-${i}` }))
          );
        } else {
          setMessages(INITIAL_MESSAGES);
        }
      })
      .catch(() => setMessages(INITIAL_MESSAGES))
      .finally(() => setLoadingHistory(false));
  }, [sessionId]);

  const processImageFile = (file: File) => {
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif)$/i.test(file.name);
    if (!isImage) {
      toast({ title: "Invalid file", description: "Please select an image file (JPG, PNG, GIF, WebP, etc.).", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const fileId = `${file.name}-${Date.now()}`;
      
      setAttachedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          type: "image",
          content: `[Image attached: ${file.name}]`,
          dataUrl,
          isScanning: true,
        },
      ]);

      try {
        const extracted = await extractTextFromImage(dataUrl);
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.dataUrl === dataUrl
              ? { ...f, ocrText: extracted, isScanning: false }
              : f
          )
        );
      } catch {
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.dataUrl === dataUrl
              ? { ...f, isScanning: false }
              : f
          )
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = "";
  };

  const handleGlobalPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
          toast({ title: "Screenshot detected", description: "Scanning screenshot text and security indicators..." });
          return;
        }
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const text = input.trim();
    const hasAttachments = attachedFiles.length > 0;
    if ((!text && !hasAttachments) || loading) return;

    let fullMessage = text;

    const textFiles = attachedFiles.filter((f) => f.type === "text");
    const imageFiles = attachedFiles.filter((f) => f.type === "image");

    if (textFiles.length > 0) {
      const fileContext = textFiles
        .map((f) => `\n\n--- Attached file: ${f.name} ---\n${f.content}`)
        .join("");
      fullMessage = (text ? text + fileContext : `Analyze the following attached file(s):${fileContext}`);
    }

    if (imageFiles.length > 0) {
      const imageContexts = await Promise.all(
        imageFiles.map(async (f) => {
          let ocr = f.ocrText;
          if (ocr === undefined && f.dataUrl) {
            try {
              ocr = await extractTextFromImage(f.dataUrl);
            } catch {
              ocr = "";
            }
          }
          if (ocr && ocr.trim().length > 0) {
            return `\n\n--- OCR EXTRACTED TEXT FROM SCREENSHOT (${f.name}) ---\n${ocr.trim()}\n--- END OF SCREENSHOT DATA ---`;
          }
          return `\n\n[Attached screenshot: ${f.name}]`;
        })
      );

      const imagePrompt = imageContexts.join("\n");
      fullMessage = text
        ? `${text}\n\n${imagePrompt}\n\nPlease correlate the screenshot OCR text above with my question and current threat posture.`
        : `Please analyze the security telemetry, errors, logs, or UI indicators visible in the attached screenshot/image:\n${imagePrompt}`;
    }

    const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const displayContent = text || (imageFiles.length > 0 ? `Screenshot analysis: ${imageFiles[0].name}` : attachedFiles[0].name);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: displayContent,
      timestamp: ts,
      attachments: attachedFiles.map((f) => ({ name: f.name, type: f.type, dataUrl: f.dataUrl })),
    };

    setAttachedFiles([]);
    setInput("");

    setMessages((prev) => {
      const updated = [...prev, userMsg];
      sendToAI(fullMessage, updated, ts);
      return updated;
    });
  };

  const sendToAI = async (text: string, currentMessages: ChatMessage[], ts: string) => {
    setLoading(true);
    try {
      let sid = currentSessionId;

      // Ensure session exists with a clean human title before chatting so MongoDB persists all messages
      if (!sid) {
        let cleanTitle = text.split("\n\n---")[0].split("\n---")[0].trim();
        if (!cleanTitle || cleanTitle.startsWith("Please analyze the security") || cleanTitle.startsWith("Analyze the following")) {
          cleanTitle = "Log Forensic Investigation";
        } else if (cleanTitle.startsWith("Screenshot analysis:")) {
          cleanTitle = cleanTitle.replace("Screenshot analysis:", "Screenshot:").trim();
        }
        cleanTitle = cleanTitle.slice(0, 50);

        try {
          const session = await api.createChatSession(cleanTitle);
          sid = session.session_id;
          internallyCreatedSession.current = sid;
          setCurrentSessionId(sid);
          onSessionCreated?.(sid, session.title);
        } catch (e) {
          console.error("Session creation error:", e);
        }
      }

      const history = currentMessages
        .slice(0, -1)
        .filter((m) => m.role === "user" || m.role === "ai" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const data = await api.chat(text, history.length > 0 ? history : undefined, sid ?? undefined);

      if (data.off_topic) {
        setMessages((prev) => prev.filter((m) => m.id !== currentMessages[currentMessages.length - 1].id));
        toast({
          title: "Off-topic question",
          description: "I can only answer cybersecurity and log analysis questions. Please ask something related to security.",
          variant: "destructive",
        });
        return;
      }

      if (data.session_id && !sid) {
        sid = data.session_id;
        internallyCreatedSession.current = sid;
        setCurrentSessionId(sid);
        onSessionCreated?.(sid, "Security Investigation");
      }

      const aiMsg: ChatMessage = { id: `ai-${Date.now()}`, role: "ai", content: data.response, timestamp: data.timestamp };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      let userMessage = "Sorry, something went wrong. Please try again.";
      if (raw.includes("rate limit") || raw.includes("Rate limit") || raw.includes("429")) {
        const waitMatch = raw.match(/Please try again in ([^.]+)/);
        const waitInfo = waitMatch ? ` Please try again in ${waitMatch[1]}.` : " Please wait a moment before trying again.";
        userMessage = `⚠️ The AI is temporarily unavailable due to a usage rate limit.${waitInfo}`;
      } else if (raw.includes("GROQ_API_KEY") || raw.includes("not configured")) {
        userMessage = "The AI service is not configured. Please ensure the GROQ_API_KEY is set correctly.";
      } else if (raw && raw !== "Internal Server Error") {
        userMessage = `Sorry, the AI encountered an error: ${raw}`;
      }
      const errMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: "ai",
        content: userMessage,
        timestamp: ts,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-xl flex flex-col flex-1 h-full animate-fade-in overflow-hidden border border-slate-800 bg-[#0f172a]/95">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>ThreadLens SOC Analyst</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-semibold hidden sm:inline-block">
                LLaMA 3.3 70B
              </span>
            </h3>
          </div>
        </div>
        {(loading || loadingHistory) && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-mono animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Reasoning...</span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto scrollbar-cyber p-4 sm:p-5 space-y-5">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading forensic chat session...</span>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isAi = msg.role === "ai" || msg.role === "assistant";
              const msgId = msg.id ?? `msg-${i}`;
              return (
                <div
                  key={msgId}
                  className={`flex gap-3.5 ${!isAi ? "flex-row-reverse" : "flex-row"} items-start group`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      isAi
                        ? "bg-gradient-to-br from-primary/30 to-blue-600/30 text-primary border border-primary/40"
                        : "bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-300 border border-indigo-500/40"
                    }`}
                  >
                    {isAi ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                  </div>

                  {/* Message Container */}
                  <div className={`max-w-[85%] sm:max-w-[80%] flex flex-col ${!isAi ? "items-end" : "items-start"}`}>
                    
                    {/* Role / Author Label */}
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400 font-mono">
                      <span className="font-semibold text-slate-300">
                        {isAi ? "ThreadLens AI" : "You"}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl p-4 sm:p-4.5 text-sm shadow-xl transition-all ${
                        isAi
                          ? "bg-[#1e293b] border border-slate-700/90 text-slate-100 w-full"
                          : "bg-primary/25 border border-primary/40 text-slate-100"
                      }`}
                    >
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) =>
                            att.type === "image" && att.dataUrl ? (
                              <img
                                key={idx}
                                src={att.dataUrl}
                                alt={att.name}
                                className="max-h-48 max-w-full rounded-xl object-cover border border-slate-700 shadow-md"
                                data-testid={`img-attachment-${idx}`}
                              />
                            ) : (
                              <div
                                key={idx}
                                className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
                                data-testid={`file-attachment-${idx}`}
                              >
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span>{att.name}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Content */}
                      {isAi ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-100 font-sans text-sm">
                          {msg.content}
                        </p>
                      )}

                      {/* AI Action Toolbar */}
                      {isAi && msg.content && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                            Verified Forensic Analysis
                          </span>
                          <button
                            onClick={() => handleCopyMessage(msgId, msg.content)}
                            className="flex items-center gap-1 hover:text-white px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 transition-colors border border-slate-700/50"
                            title="Copy response"
                          >
                            {copiedId === msgId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Prompts on initial chat */}
            {messages.length === 1 && (
              <div className="pt-2 pl-12 space-y-2">
                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Suggested Investigations:</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(prompt);
                      }}
                      className="text-xs text-slate-300 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 px-3 py-1.5 rounded-xl transition-all hover:text-white text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex gap-3.5 items-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-blue-600/30 text-primary border border-primary/40 flex items-center justify-center shrink-0">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="bg-[#1e293b] border border-slate-700/90 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white font-mono">Forensic Engine Analyzing</span>
                <p className="text-[11px] text-slate-400">Correlating logs, heuristics, and threat intelligence...</p>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <div
        className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 space-y-2.5"
        onPaste={handleGlobalPaste}
      >
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 shadow-md transition-all"
                data-testid={`attachment-preview-${idx}`}
              >
                {file.type === "image" && file.dataUrl ? (
                  <img src={file.dataUrl} alt={file.name} className="h-6 w-6 rounded-lg object-cover border border-slate-700" />
                ) : (
                  <FileText className="w-4 h-4 text-primary" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                  {file.type === "image" && (
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      {file.isScanning ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                          <span className="text-amber-400">Scanning text & logs...</span>
                        </>
                      ) : file.ocrText ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-emerald-400">Text & logs extracted ({file.ocrText.length} chars)</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Image attached</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="ml-1 text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
                  data-testid={`button-remove-attachment-${idx}`}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageAttach}
            data-testid="input-image-upload"
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="cyber-btn !px-3 shrink-0 rounded-xl"
            title="Attach security screenshot, error image, or diagram (or paste Ctrl+V)"
            disabled={loading || loadingHistory}
            data-testid="button-attach-image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            data-testid="input-chat-message"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={attachedFiles.length > 0 ? "Ask a question about this screenshot or press Enter to analyze..." : "Ask AI about logs or paste screenshot (Ctrl+V)..."}
            className="cyber-input flex-1 text-sm bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
            disabled={loading || loadingHistory}
          />
          <button
            onClick={handleSend}
            data-testid="button-send-message"
            className="cyber-btn !px-4 rounded-xl"
            disabled={(loading || loadingHistory) || (!input.trim() && attachedFiles.length === 0)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
