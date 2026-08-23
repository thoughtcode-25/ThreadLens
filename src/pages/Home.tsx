import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Upload,
  Bot,
  Activity,
  Send,
  Zap,
  ChevronRight,
  Image as ImageIcon,
  X,
  FileText,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromImage } from "@/lib/ocr";

const SUGGESTIONS = [
  "Summarize the threats detected in the last upload",
  "What are the most suspicious IP addresses?",
  "What should I do about brute force attacks?",
  "Explain the high-severity alert",
];

interface AttachedFile {
  name: string;
  type: "image" | "text";
  content: string;
  dataUrl?: string;
  ocrText?: string;
  isScanning?: boolean;
}

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAsk = async () => {
    const q = query.trim();
    if (!q && attachedFiles.length === 0) return;
    const textFiles = attachedFiles.filter((f) => f.type === "text");
    const imageFiles = attachedFiles.filter((f) => f.type === "image");
    let fullMessage = q;

    if (textFiles.length > 0) {
      const ctx = textFiles.map((f) => `\n\n--- Attached file: ${f.name} ---\n${f.content}`).join("");
      fullMessage = q ? q + ctx : `Analyze the following attached file(s):${ctx}`;
    }

    if (imageFiles.length > 0) {
      const imageContexts = await Promise.all(
        imageFiles.map(async (f) => {
          let ocr = f.ocrText;
          if (!ocr && f.dataUrl) {
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
      const imgPrompt = imageContexts.join("\n");
      fullMessage = q
        ? `${q}\n\n${imgPrompt}\n\nPlease correlate the screenshot OCR text above with my question and current threat posture.`
        : `Please analyze the security telemetry, errors, logs, or UI indicators visible in the attached screenshot/image:\n${imgPrompt}`;
    }

    navigate("/ask-ai", {
      state: {
        initialMessage: fullMessage,
        initialAttachments: attachedFiles.map((f) => ({ name: f.name, type: f.type, dataUrl: f.dataUrl })),
      },
    });
  };

  const processImageFile = (file: File) => {
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif)$/i.test(file.name);
    if (!isImage) {
      toast({ title: "Invalid file", description: "Please select an image file (JPG, PNG, GIF, WebP, etc.).", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setAttachedFiles((prev) => [
        ...prev,
        { name: file.name, type: "image", content: `[Image attached: ${file.name}]`, dataUrl, isScanning: true }
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
            f.dataUrl === dataUrl ? { ...f, isScanning: false } : f
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

  const handleHomePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
          toast({ title: "Screenshot detected", description: "Scanning screenshot text..." });
          return;
        }
      }
    }
  };

  const removeAttachment = (idx: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const canSend = query.trim().length > 0 || attachedFiles.length > 0;

  return (
    <Layout>
      <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-6">
        <div className="w-full max-w-2xl space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              {greeting}, {user?.name ?? "Analyst"}
            </h1>
            <p className="text-muted-foreground">What would you like to investigate today?</p>
          </div>

          <div
            className="glass-panel rounded-2xl p-4 space-y-3 shadow-xl"
            onPaste={handleHomePaste}
          >
            <div className="flex gap-2">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                placeholder={attachedFiles.length > 0 ? "Ask anything about this screenshot or press Enter to investigate..." : "Ask anything about your logs or paste screenshot (Ctrl+V)..."}
                rows={3}
                data-testid="input-home-query"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none outline-none text-sm leading-relaxed"
              />
              <div className="flex flex-col gap-1.5 self-end">
                <button onClick={() => imageInputRef.current?.click()} data-testid="button-home-attach-image" title="Attach screenshot or image (or paste Ctrl+V)" className="cyber-btn !px-2.5 !py-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleAsk} data-testid="button-home-ask" disabled={!canSend} className="cyber-btn !px-2.5 !py-1.5 disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground shadow-sm" data-testid={`home-attachment-preview-${idx}`}>
                    {file.type === "image" && file.dataUrl
                      ? <img src={file.dataUrl} alt={file.name} className="h-6 w-6 rounded-lg object-cover border border-slate-700" />
                      : <FileText className="w-3.5 h-3.5 text-primary" />}
                    <div className="flex flex-col min-w-0">
                      <span className="max-w-[140px] truncate font-medium">{file.name}</span>
                      {file.type === "image" && (
                        <div className="flex items-center gap-1 text-[10px] font-mono">
                          {file.isScanning ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                              <span className="text-amber-400">Scanning text...</span>
                            </>
                          ) : file.ocrText ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="text-emerald-400">Text extracted</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Image ready</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeAttachment(idx)} className="ml-1 text-muted-foreground hover:text-foreground transition-colors" data-testid={`button-home-remove-attachment-${idx}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`flex flex-wrap gap-2 ${attachedFiles.length === 0 ? "border-t border-border pt-3" : ""}`}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setQuery(s)} className="text-xs px-3 py-1.5 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageAttach} data-testid="input-home-image-upload" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ActionCard icon={Upload} title="Upload Logs" description="Parse & analyze logs up to 10 GB (Dev cluster: 500 MB quota)" color="primary" onClick={() => navigate("/analyze")} testId="card-upload-logs" />
            <ActionCard icon={Activity} title="Live Monitoring" description="Stream real-time logs and detect threats as they happen" color="safe" onClick={() => navigate("/monitoring")} testId="card-live-monitoring" />
            <ActionCard icon={Bot} title="Ask AI" description="Chat with your AI security analyst about any threat or log" color="accent" onClick={() => navigate("/ask-ai")} testId="card-ask-ai" />
          </div>

          <div className="text-center">
            <button onClick={() => navigate("/dashboard")} data-testid="button-view-dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Zap className="w-4 h-4 text-primary" />
              View full security dashboard
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

/* ── Action cards ── */

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: "primary" | "safe" | "accent";
  onClick: () => void;
  testId: string;
}

const colorMap = {
  primary: "bg-primary/10 text-primary group-hover:bg-primary/20",
  safe: "bg-safe/10 text-safe group-hover:bg-safe/20",
  accent: "bg-accent/10 text-accent group-hover:bg-accent/20",
};

function ActionCard({ icon: Icon, title, description, color, onClick, testId }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="group glass-panel rounded-xl p-5 text-left hover:border-primary/40 transition-all duration-200 space-y-3 w-full"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        Get started <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  );
}

export default Home;
