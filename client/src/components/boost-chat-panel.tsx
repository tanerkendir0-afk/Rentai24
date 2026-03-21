import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Send,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  User,
  BarChart3,
  Package,
  Building2,
  X,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  BrainCircuit,
  Square,
  Zap,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import ChatMessageContent from "@/components/chat-message";
import PublishAssistantCard, { parsePublishAssistant } from "@/components/publish-assistant-card";
import ChatRating from "@/components/chat-rating";

const agentOptions = [
  { id: "customer-support", roleKey: "customerSupport", persona: "Ava", icon: Headphones, color: "from-pink-500 to-rose-500", accent: "text-pink-400", bg: "bg-pink-500/10" },
  { id: "sales-sdr", roleKey: "salesSdr", persona: "Rex", icon: TrendingUp, color: "from-blue-500 to-cyan-500", accent: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "social-media", roleKey: "socialMedia", persona: "Maya", icon: Share2, color: "from-violet-500 to-purple-500", accent: "text-violet-400", bg: "bg-violet-500/10" },
  { id: "bookkeeping", roleKey: "bookkeeping", persona: "Finn", icon: Calculator, color: "from-emerald-500 to-green-500", accent: "text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "scheduling", roleKey: "scheduling", persona: "Cal", icon: CalendarCheck, color: "from-orange-500 to-amber-500", accent: "text-orange-400", bg: "bg-orange-500/10" },
  { id: "hr-recruiting", roleKey: "hrRecruiting", persona: "Harper", icon: Users, color: "from-teal-500 to-cyan-500", accent: "text-teal-400", bg: "bg-teal-500/10" },
  { id: "data-analyst", roleKey: "dataAnalyst", persona: "DataBot", icon: BarChart3, color: "from-indigo-500 to-blue-500", accent: "text-indigo-400", bg: "bg-indigo-500/10" },
  { id: "ecommerce-ops", roleKey: "ecommerceOps", persona: "ShopBot", icon: Package, color: "from-amber-500 to-yellow-500", accent: "text-amber-400", bg: "bg-amber-500/10" },
  { id: "real-estate", roleKey: "realEstate", persona: "Reno", icon: Building2, color: "from-rose-500 to-red-500", accent: "text-rose-400", bg: "bg-rose-500/10" },
];

const managerOption = { id: "manager", roleKey: "manager", persona: "Manager", icon: BrainCircuit, color: "from-amber-500 to-orange-500", accent: "text-amber-400", bg: "bg-amber-500/10" };

function getAgent(id: string) {
  if (id === "manager") return managerOption;
  return agentOptions.find(a => a.id === id) || agentOptions[0];
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  actions?: { type: string; description: string }[];
  isLimitWarning?: boolean;
}

interface BoostChatPanelProps {
  panelId: string;
  allowedAgents?: string[];
  rentedAgentIds: Set<string>;
  onClose?: () => void;
  isOnly?: boolean;
}

export default function BoostChatPanel({ panelId, allowedAgents, rentedAgentIds, onClose, isOnly }: BoostChatPanelProps) {
  const { user } = useAuth();
  const { t } = useTranslation("pages");
  const [selectedAgent, setSelectedAgent] = useState(() => {
    if (allowedAgents && allowedAgents.length > 0) {
      const first = allowedAgents.find(a => rentedAgentIds.has(a));
      return first || allowedAgents[0];
    }
    const firstRented = Array.from(rentedAgentIds)[0];
    return firstRented || "customer-support";
  });
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationDbId, setConversationDbId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateVisibleId = () => Date.now().toString() + Math.random().toString(36).slice(2, 6);

  useEffect(() => {
    if (user && !conversationId) {
      const visId = generateVisibleId();
      setConversationId(visId);
      apiRequest("POST", "/api/conversations", { agentType: selectedAgent, visibleId: visId })
        .then(async (res) => {
          const data = await res.json();
          if (data.id) setConversationDbId(data.id);
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userMessage = (text || input).trim();
    if (!userMessage || loading) return;
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          agentType: selectedAgent,
          conversationHistory: messages.slice(-50),
          sessionId: conversationId,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.limitReached) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply || t("demoPage.somethingWrong"), isLimitWarning: true }]);
      } else {
        const replyText = data.reply || t("demoPage.somethingWrong");
        const routingPrefix = data.routedToName ? `🔀 *Routed to ${data.routedToName}*\n\n` : "";
        setMessages(prev => [...prev, { role: "assistant", content: routingPrefix + replyText, actions: data.actions }]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/boost/tasks"] });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: `⏹ ${t("demoPage.responseStopped")}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: t("demoPage.somethingWrong") }]);
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const agent = getAgent(selectedAgent);
  const AgentIcon = agent.icon;

  const availableAgents = allowedAgents
    ? agentOptions.filter(a => allowedAgents.includes(a.id) && rentedAgentIds.has(a.id))
    : agentOptions.filter(a => rentedAgentIds.has(a.id));

  return (
    <div className="flex flex-col h-full bg-background border-r border-border/30 last:border-r-0" data-testid={`boost-panel-${panelId}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-card/30 shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors"
            data-testid={`boost-panel-agent-picker-${panelId}`}
          >
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
              <AgentIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{agent.persona}</p>
              <p className="text-[10px] text-muted-foreground truncate">{t("demoPage.roles." + agent.roleKey)}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {showAgentPicker && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 p-1.5 max-h-[300px] overflow-y-auto">
              {availableAgents.map(a => {
                const AIcon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedAgent(a.id);
                      setShowAgentPicker(false);
                      setMessages([]);
                      setConversationId(null);
                      setConversationDbId(null);
                      const visId = generateVisibleId();
                      setConversationId(visId);
                      apiRequest("POST", "/api/conversations", { agentType: a.id, visibleId: visId })
                        .then(async (res) => {
                          const data = await res.json();
                          if (data.id) setConversationDbId(data.id);
                        }).catch(() => {});
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-all ${
                      selectedAgent === a.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                    data-testid={`boost-panel-agent-${a.id}-${panelId}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center`}>
                      <AIcon className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium">{a.persona}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        {onClose && !isOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            data-testid={`boost-panel-close-${panelId}`}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-3 shadow-lg`}>
              <AgentIcon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{agent.persona}</p>
            <p className="text-xs text-muted-foreground mb-4">{t("demoPage.roles." + agent.roleKey)}</p>
            <div className="space-y-1.5 w-full max-w-[240px]">
              {[
                t("demoPage.promptCapabilitiesText"),
                t("demoPage.promptGetStartedText"),
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card/50 hover:bg-card hover:border-blue-500/30 transition-all text-left text-xs text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className={`w-3 h-3 ${agent.accent} shrink-0`} />
                  <span className="truncate">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const showAvatar = i === 0 || messages[i - 1].role !== msg.role;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex gap-1.5 ${isUser ? "flex-row-reverse" : ""} ${showAvatar ? "mt-3" : "mt-0.5"}`}
                >
                  <div className="w-6 shrink-0">
                    {showAvatar && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isUser ? "bg-muted" : `bg-gradient-to-br ${agent.color}`
                      }`}>
                        {isUser ? <User className="w-3 h-3 text-muted-foreground" /> : <AgentIcon className="w-3 h-3 text-white" />}
                      </div>
                    )}
                  </div>
                  <div className={`max-w-[85%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-col gap-0.5 w-full">
                        {msg.actions.map((action, ai) => (
                          <div key={ai} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium border ${agent.bg} border-current/10 ${agent.accent}`}>
                            <Zap className="w-2.5 h-2.5 shrink-0" />
                            <span>{action.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={`rounded-xl px-3 py-2 text-xs ${
                      msg.isLimitWarning
                        ? "bg-red-500/10 border border-red-500/30 text-red-300"
                        : isUser
                          ? "bg-blue-500 text-white rounded-tr-sm"
                          : "bg-muted/70 text-foreground rounded-tl-sm border border-border/30"
                    }`}>
                      {msg.isLimitWarning && (
                        <div className="flex items-center gap-1.5 mb-1 text-red-400 font-medium text-[10px]">
                          <AlertTriangle className="w-3 h-3" />
                          {t("demoPage.tokenLimitReached")}
                        </div>
                      )}
                      {(() => {
                        const { data: publishData, cleanText } = !isUser ? parsePublishAssistant(msg.content) : { data: null, cleanText: msg.content };
                        return (
                          <>
                            {publishData && <PublishAssistantCard data={publishData} />}
                            <ChatMessageContent content={cleanText} isUser={isUser} onSendMessage={sendMessage} isLatest={i === messages.length - 1} />
                          </>
                        );
                      })()}
                    </div>
                    {!isUser && i === messages.length - 1 && conversationDbId && (
                      <ChatRating conversationId={conversationDbId} messageIndex={i} />
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
        {loading && (
          <div className="flex gap-1.5 mt-3">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
              <AgentIcon className="w-3 h-3 text-white" />
            </div>
            <div className="bg-muted/70 rounded-xl px-3 py-2 border border-border/30">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border/50 bg-card/30 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-1.5"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={t("demoPage.messagePlaceholder", { agent: agent.persona })}
            disabled={loading}
            rows={1}
            className="flex-1 min-h-[36px] max-h-[80px] px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
            data-testid={`boost-panel-input-${panelId}`}
          />
          {loading ? (
            <button
              type="button"
              onClick={() => abortControllerRef.current?.abort()}
              className="w-9 h-9 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white shrink-0 animate-pulse"
              data-testid={`boost-panel-stop-${panelId}`}
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white disabled:opacity-30 shrink-0 transition-opacity"
              data-testid={`boost-panel-send-${panelId}`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
