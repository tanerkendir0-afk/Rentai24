import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Send,
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  Info,
  Loader2,
  User,
  Trash2,
  BarChart3,
  Package,
  Lock,
  ImagePlus,
  Coins,
  ShoppingCart,
  X,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import ChatMessageContent from "@/components/chat-message";

interface AgentAction {
  type: string;
  description: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: AgentAction[];
  isLimitWarning?: boolean;
}

const agentOptions = [
  { id: "customer-support", name: "Customer Support", persona: "Ava", icon: Headphones },
  { id: "sales-sdr", name: "Sales SDR", persona: "Rex", icon: TrendingUp },
  { id: "social-media", name: "Social Media", persona: "Maya", icon: Share2 },
  { id: "bookkeeping", name: "Bookkeeping", persona: "Finn", icon: Calculator },
  { id: "scheduling", name: "Scheduling", persona: "Cal", icon: CalendarCheck },
  { id: "hr-recruiting", name: "HR & Recruiting", persona: "Harper", icon: Users },
  { id: "data-analyst", name: "Data Analyst", persona: "DataBot", icon: BarChart3 },
  { id: "ecommerce-ops", name: "E-Commerce Ops", persona: "ShopBot", icon: Package },
];

const suggestedPrompts = [
  "What can you do?",
  "Handle a complaint",
  "Schedule a meeting",
  "Generate a report",
];

interface RentalData {
  id: number;
  agentType: string;
  status: string;
}

export default function Demo({ isWorkspace = false }: { isWorkspace?: boolean }) {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState(agentOptions[0].id);
  const [conversationMap, setConversationMap] = useState<Record<string, Message[]>>({});
  const messages = conversationMap[selectedAgent] || [];
  const setMessages = (msgs: Message[] | ((prev: Message[]) => Message[])) => {
    setConversationMap(prev => ({
      ...prev,
      [selectedAgent]: typeof msgs === 'function' ? msgs(prev[selectedAgent] || []) : msgs,
    }));
  };
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialAgentSet, setInitialAgentSet] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCreditsPanel, setShowCreditsPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rentals, isLoading: rentalsLoading } = useQuery<RentalData[]>({
    queryKey: ["/api/rentals"],
    enabled: !!user,
  });

  const { data: creditsData } = useQuery<{ credits: number }>({
    queryKey: ["/api/image-credits"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: creditPrices } = useQuery<{ id: string; credits: number; amount: number; currency: string }[]>({
    queryKey: ["/api/image-credits/prices"],
    enabled: !!user,
  });

  const imageCredits = creditsData?.credits ?? 0;
  const isSocialMediaAgent = selectedAgent === "social-media";

  const { data: spendingData } = useQuery<{ spent: number; limit: number; remaining: number; limitReached: boolean }>({
    queryKey: ["/api/token-spending", selectedAgent],
    queryFn: async () => {
      const params = user ? `?agentType=${selectedAgent}` : "";
      const res = await fetch(`/api/token-spending${params}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const rentalsReady = !user || !rentalsLoading;
  const activeRentals = rentals?.filter(r => r.status === "active") || [];
  const hasRentals = activeRentals.length > 0;
  const rentedAgentIds = new Set(activeRentals.map(r => r.agentType));

  useEffect(() => {
    if (user && hasRentals && !initialAgentSet) {
      const params = new URLSearchParams(window.location.search);
      const agentParam = params.get("agent");
      if (agentParam && rentedAgentIds.has(agentParam)) {
        setSelectedAgent(agentParam);
      } else {
        setSelectedAgent(activeRentals[0].agentType);
      }
      setInitialAgentSet(true);
    }
  }, [user, hasRentals, initialAgentSet]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buyCredits = async (priceId: string) => {
    try {
      const res = await apiRequest("POST", "/api/stripe/checkout/credits", { priceId });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadedImage({ url: data.imageUrl, name: data.filename });
      }
    } catch {
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (text?: string) => {
    const userMessage = (text || input).trim();
    if (!userMessage || loading) return;

    const imageAttachment = uploadedImage;
    setInput("");
    setUploadedImage(null);

    const displayContent = imageAttachment
      ? `${userMessage}\n\n![Uploaded](${imageAttachment.url})`
      : userMessage;
    const messageToSend = imageAttachment
      ? `${userMessage}\n\n[User attached an image: ${imageAttachment.name}]`
      : userMessage;

    setMessages((prev) => [...prev, { role: "user", content: displayContent }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          agentType: selectedAgent,
          conversationHistory: messages.slice(-20),
        }),
      });
      const data = await res.json();
      if (data.limitReached) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, isLimitWarning: true }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, actions: data.actions }]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/token-spending"] });
      if (isSocialMediaAgent) {
        queryClient.invalidateQueries({ queryKey: ["/api/image-credits"] });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const currentAgent = agentOptions.find((a) => a.id === selectedAgent);

  return (
    <div className="pt-16 min-h-screen flex flex-col">
      {isWorkspace ? (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 justify-center text-sm text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span data-testid="text-workspace-banner">
                AI Workspace — Full access active. Your agents are ready to work.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span data-testid="text-demo-banner">
                This is a demo version. Our production AI workers are significantly more capable and customizable.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <motion.aside
          className="w-full lg:w-72 shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3" data-testid="text-agent-select-title">
              {isWorkspace ? "Your AI Workers" : "Select AI Worker"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2">
              {agentOptions.map((agent) => {
                const isLocked = user && rentalsReady && hasRentals && !rentedAgentIds.has(agent.id);
                const isPending = user && !rentalsReady;
                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      if (isLocked || isPending) return;
                      setSelectedAgent(agent.id);
                    }}
                    disabled={!!isLocked || !!isPending}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-left text-sm font-medium transition-all ${
                      isLocked
                        ? "bg-card/50 border border-border/30 text-muted-foreground/40 cursor-not-allowed opacity-50"
                        : isPending
                          ? "bg-card/50 border border-border/30 text-muted-foreground/60 cursor-wait opacity-60"
                          : selectedAgent === agent.id
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          : "bg-card border border-border/50 text-muted-foreground"
                    }`}
                    data-testid={`button-agent-${agent.id}`}
                  >
                    <agent.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{agent.name}</span>
                    {isLocked ? (
                      <Lock className="w-3 h-3 ml-auto shrink-0 text-muted-foreground/40" />
                    ) : selectedAgent === agent.id ? (
                      <div className="ml-auto flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.aside>

        <motion.div
          className="flex-1 flex flex-col min-h-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="flex-1 flex flex-col bg-card border-border/50 min-h-[500px]">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm" data-testid="text-chat-agent-name">
                    {currentAgent?.persona} — {currentAgent?.name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {spendingData && (
                  <Badge
                    variant="outline"
                    className={`text-xs gap-1 ${spendingData.limitReached ? "border-red-500/50 text-red-400 bg-red-500/10" : spendingData.remaining < 1 ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" : "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"}`}
                    data-testid="badge-token-spending"
                  >
                    <Gauge className="w-3 h-3" />
                    ${spendingData.spent.toFixed(2)} / ${spendingData.limit.toFixed(2)}
                  </Badge>
                )}
                {user && isSocialMediaAgent && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCreditsPanel(!showCreditsPanel)}
                      className="text-xs gap-1.5"
                      data-testid="button-image-credits"
                    >
                      <Coins className="w-3.5 h-3.5 text-yellow-500" />
                      <span>{imageCredits} credit{imageCredits !== 1 ? "s" : ""}</span>
                    </Button>
                    {showCreditsPanel && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-50 p-4" data-testid="credits-panel">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm">Image Credits</h4>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowCreditsPanel(false)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Each AI image generation or stock photo search uses 1 credit ($3.00).
                          Buy in bulk to save!
                        </p>
                        <div className="space-y-2">
                          {(creditPrices || []).map((price) => (
                            <button
                              key={price.id}
                              onClick={() => buyCredits(price.id)}
                              className="w-full flex items-center justify-between p-2.5 rounded-md border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors text-left"
                              data-testid={`button-buy-credits-${price.credits}`}
                            >
                              <div>
                                <span className="text-sm font-medium">{price.credits} Credit{price.credits !== 1 ? "s" : ""}</span>
                                {price.credits > 1 && (
                                  <span className="text-xs text-muted-foreground ml-1.5">
                                    (${(price.amount / price.credits / 100).toFixed(2)}/ea)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-blue-400">${(price.amount / 100).toFixed(2)}</span>
                                <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                            </button>
                          ))}
                        </div>
                        {(!creditPrices || creditPrices.length === 0) && (
                          <div className="text-center py-3 text-xs text-muted-foreground">Loading prices...</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {messages.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMessages([])}
                    className="text-muted-foreground"
                    data-testid="button-clear-chat"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2" data-testid="text-chat-empty">
                    Chat with {currentAgent?.persona}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    Start a conversation to see this AI worker in action. Try one of the prompts below.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        size="sm"
                        variant="outline"
                        onClick={() => sendMessage(prompt)}
                        className="text-xs"
                        data-testid={`button-prompt-${prompt.split(" ")[0].toLowerCase()}`}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user" ? "bg-muted" : "bg-gradient-to-br from-blue-500 to-violet-500"
                    }`}
                  >
                    {msg.role === "user" ? <User className="w-4 h-4 text-muted-foreground" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className="max-w-[75%] flex flex-col gap-2">
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-col gap-1" data-testid={`chat-actions-${i}`}>
                        {msg.actions.map((action, ai) => (
                          <div
                            key={ai}
                            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-blue-400"
                            data-testid={`chat-action-${i}-${ai}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            {action.description}
                          </div>
                        ))}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        msg.isLimitWarning ? "bg-red-500/20 border border-red-500/40 text-red-300" :
                        msg.role === "user" ? "bg-blue-500 text-white rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                      }`}
                      data-testid={`chat-message-${i}`}
                    >
                      {msg.isLimitWarning && (
                        <div className="flex items-center gap-2 mb-2 text-red-400 font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          Token Limit Reached
                        </div>
                      )}
                      <ChatMessageContent content={msg.content} isUser={msg.role === "user"} />
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-md px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Agent is typing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-6 py-4 border-t border-border/50">
              {messages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestedPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      size="sm"
                      variant="outline"
                      onClick={() => sendMessage(prompt)}
                      className="text-xs"
                      disabled={loading}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}
              {uploadedImage && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20" data-testid="upload-preview">
                  <img src={uploadedImage.url} alt="Uploaded" className="w-10 h-10 rounded object-cover" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{uploadedImage.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                    onClick={() => setUploadedImage(null)}
                    data-testid="button-remove-upload"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  data-testid="input-image-upload"
                />
                {user && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploading}
                    className="shrink-0"
                    title="Upload image"
                    data-testid="button-upload-image"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  </Button>
                )}
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="flex-1"
                  data-testid="input-chat"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
