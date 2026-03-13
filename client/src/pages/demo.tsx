import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
  MessageSquarePlus,
  BarChart3,
  Package,
  Building2,
  Lock,
  Plus,
  Coins,
  ShoppingCart,
  X,
  AlertTriangle,
  Gauge,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  ListTodo,
  Calendar,
  ChevronLeft,
  Check,
  Circle,
  Clock,
  Trash2,
  Flag,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import ChatMessageContent from "@/components/chat-message";
import { Link } from "wouter";
import type { AgentTask } from "@shared/schema";
import TasksPanel from "@/components/tasks-panel";

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

interface Conversation {
  id: string;
  messages: Message[];
  title: string;
  createdAt: number;
}

const agentOptions = [
  { id: "customer-support", name: "Customer Support", persona: "Ava", icon: Headphones, color: "from-pink-500 to-rose-500", accent: "text-pink-400", bg: "bg-pink-500/10" },
  { id: "sales-sdr", name: "Sales SDR", persona: "Rex", icon: TrendingUp, color: "from-blue-500 to-cyan-500", accent: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "social-media", name: "Social Media", persona: "Maya", icon: Share2, color: "from-violet-500 to-purple-500", accent: "text-violet-400", bg: "bg-violet-500/10" },
  { id: "bookkeeping", name: "Bookkeeping", persona: "Finn", icon: Calculator, color: "from-emerald-500 to-green-500", accent: "text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "scheduling", name: "Scheduling", persona: "Cal", icon: CalendarCheck, color: "from-orange-500 to-amber-500", accent: "text-orange-400", bg: "bg-orange-500/10" },
  { id: "hr-recruiting", name: "HR & Recruiting", persona: "Harper", icon: Users, color: "from-teal-500 to-cyan-500", accent: "text-teal-400", bg: "bg-teal-500/10" },
  { id: "data-analyst", name: "Data Analyst", persona: "DataBot", icon: BarChart3, color: "from-indigo-500 to-blue-500", accent: "text-indigo-400", bg: "bg-indigo-500/10" },
  { id: "ecommerce-ops", name: "E-Commerce Ops", persona: "ShopBot", icon: Package, color: "from-amber-500 to-yellow-500", accent: "text-amber-400", bg: "bg-amber-500/10" },
  { id: "real-estate", name: "Real Estate", persona: "Reno", icon: Building2, color: "from-rose-500 to-red-500", accent: "text-rose-400", bg: "bg-rose-500/10" },
];

interface RentalData {
  id: number;
  agentType: string;
  status: string;
}

export default function Demo({ isWorkspace = false }: { isWorkspace?: boolean }) {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState(agentOptions[0].id);

  const createConversation = (): Conversation => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    messages: [],
    title: "New Chat",
    createdAt: Date.now(),
  });

  const [agentConversations, setAgentConversations] = useState<Record<string, Conversation[]>>(() => {
    try {
      const saved = localStorage.getItem("rentai_conversations");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [activeConvoId, setActiveConvoId] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("rentai_active_convo");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const prevUserRef = useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = user?.id?.toString() || null;
    if (prevUserRef.current !== null && prevUserRef.current !== currentUserId) {
      const newConvo = createConversation();
      setAgentConversations(prev => {
        const updated = { ...prev };
        for (const agentId of Object.keys(updated)) {
          updated[agentId] = [newConvo, ...updated[agentId]];
        }
        if (!updated[selectedAgent]) {
          updated[selectedAgent] = [newConvo];
        }
        return updated;
      });
      setActiveConvoId(prev => {
        const updated = { ...prev };
        for (const agentId of Object.keys(updated)) {
          updated[agentId] = newConvo.id;
        }
        updated[selectedAgent] = newConvo.id;
        return updated;
      });
    }
    prevUserRef.current = currentUserId;
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem("rentai_conversations", JSON.stringify(agentConversations));
    } catch {}
  }, [agentConversations]);

  useEffect(() => {
    try {
      localStorage.setItem("rentai_active_convo", JSON.stringify(activeConvoId));
    } catch {}
  }, [activeConvoId]);

  const getConversations = (agentId: string): Conversation[] => {
    if (!agentConversations[agentId] || agentConversations[agentId].length === 0) {
      const initial = createConversation();
      setAgentConversations(prev => ({ ...prev, [agentId]: [initial] }));
      setActiveConvoId(prev => ({ ...prev, [agentId]: initial.id }));
      return [initial];
    }
    return agentConversations[agentId];
  };

  const conversations = getConversations(selectedAgent);
  const currentConvoId = activeConvoId[selectedAgent] || conversations[0]?.id;
  const currentConvo = conversations.find(c => c.id === currentConvoId) || conversations[0];
  const messages = currentConvo?.messages || [];

  const setMessages = (msgs: Message[] | ((prev: Message[]) => Message[])) => {
    setAgentConversations(prev => {
      const convos = prev[selectedAgent] || [];
      return {
        ...prev,
        [selectedAgent]: convos.map(c => {
          if (c.id !== currentConvoId) return c;
          const newMsgs = typeof msgs === 'function' ? msgs(c.messages) : msgs;
          const title = c.title === "New Chat" && newMsgs.length > 0
            ? newMsgs.find(m => m.role === "user")?.content.slice(0, 30) || c.title
            : c.title;
          return { ...c, messages: newMsgs, title };
        }),
      };
    });
  };

  const startNewConversation = () => {
    const newConvo = createConversation();
    setAgentConversations(prev => ({
      ...prev,
      [selectedAgent]: [newConvo, ...(prev[selectedAgent] || [])],
    }));
    setActiveConvoId(prev => ({ ...prev, [selectedAgent]: newConvo.id }));
  };

  const deleteConversation = (convoId: string) => {
    const convos = agentConversations[selectedAgent] || [];
    if (convos.length <= 1) return;
    const idx = convos.findIndex(c => c.id === convoId);
    const filtered = convos.filter(c => c.id !== convoId);
    setAgentConversations(prev => ({ ...prev, [selectedAgent]: filtered }));
    if (currentConvoId === convoId) {
      const newIdx = Math.min(idx, filtered.length - 1);
      setActiveConvoId(prev => ({ ...prev, [selectedAgent]: filtered[newIdx].id }));
    }
  };

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialAgentSet, setInitialAgentSet] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCreditsPanel, setShowCreditsPanel] = useState(false);
  const [selectedCreditPkg, setSelectedCreditPkg] = useState<string | null>(null);
  const [creditCard, setCreditCard] = useState({ number: "", expiry: "", cvc: "" });
  const [creditPurchasing, setCreditPurchasing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const buyCredits = async () => {
    if (!selectedCreditPkg || !creditCard.number || !creditCard.expiry || !creditCard.cvc) return;
    setCreditPurchasing(true);
    try {
      const res = await apiRequest("POST", "/api/test-checkout/credits", {
        packageId: selectedCreditPkg,
        cardNumber: creditCard.number.replace(/\s/g, ""),
        expiry: creditCard.expiry,
        cvc: creditCard.cvc,
      });
      const data = await res.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/image-credits"] });
        setSelectedCreditPkg(null);
        setCreditCard({ number: "", expiry: "", cvc: "" });
        setShowCreditsPanel(false);
      }
    } catch {
    } finally {
      setCreditPurchasing(false);
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
          conversationHistory: messages.slice(-50),
          sessionId: currentConvoId,
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

  const currentAgent = agentOptions.find((a) => a.id === selectedAgent)!;
  const CurrentIcon = currentAgent.icon;

  const quickPrompts = [
    { label: "Capabilities", text: "What can you do?" },
    { label: "Get started", text: "Help me get started" },
    { label: "Quick task", text: "I have a quick task for you" },
  ];

  return (
    <div className="fixed inset-0 pt-16 flex bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full w-[280px] border-r border-border/50 bg-card flex flex-col overflow-hidden shrink-0 fixed lg:relative z-50 lg:z-auto"
          >
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" data-testid="text-agent-select-title">
                  {isWorkspace ? "Your Workers" : "AI Workers"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSidebarOpen(false)}
                  data-testid="button-close-sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
              {isWorkspace && (
                <Link href="/dashboard">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <ArrowLeft className="w-3 h-3" />
                    Back to Dashboard
                  </span>
                </Link>
              )}
              {!isWorkspace && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-500/5 border border-blue-500/10">
                  <Info className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-[10px] text-blue-400/80" data-testid="text-demo-banner">Demo Mode</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {agentOptions.map((agent) => {
                const isLocked = user && rentalsReady && hasRentals && !rentedAgentIds.has(agent.id);
                const isPending = user && !rentalsReady;
                const isActive = selectedAgent === agent.id;
                const AgentIcon = agent.icon;
                const agentConvos = agentConversations[agent.id] || [];
                const hasMessages = agentConvos.some(c => c.messages.length > 0);

                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      if (isLocked || isPending) return;
                      setSelectedAgent(agent.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    disabled={!!isLocked || !!isPending}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all group ${
                      isLocked
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : isPending
                          ? "text-muted-foreground/50 cursor-wait"
                          : isActive
                            ? "bg-gradient-to-r " + agent.color + " text-white shadow-lg shadow-blue-500/10"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                    data-testid={`button-agent-${agent.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? "bg-white/20" : agent.bg
                    }`}>
                      <AgentIcon className={`w-4 h-4 ${isActive ? "text-white" : agent.accent}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{agent.persona}</span>
                        {hasMessages && !isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        )}
                      </div>
                      <span className={`text-[11px] truncate block ${isActive ? "text-white/70" : "text-muted-foreground/60"}`}>
                        {agent.name}
                      </span>
                    </div>
                    {isLocked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-30" />}
                  </button>
                );
              })}
            </div>

            {spendingData && (
              <div className="p-3 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />Token Usage</span>
                  <span>${spendingData.spent.toFixed(2)} / ${spendingData.limit.toFixed(2)}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      spendingData.limitReached ? "bg-red-500" :
                      spendingData.remaining < 1 ? "bg-yellow-500" :
                      "bg-gradient-to-r from-blue-500 to-violet-500"
                    }`}
                    style={{ width: `${Math.min((spendingData.spent / spendingData.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex min-w-0">
       <div className="flex-1 flex flex-col min-w-0">
        <div className={`h-14 border-b border-border/50 flex items-center gap-3 px-4 bg-card/30 backdrop-blur-sm shrink-0`}>
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-open-sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          )}

          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${currentAgent.color} flex items-center justify-center shadow-md`}>
            <CurrentIcon className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate" data-testid="text-chat-agent-name">
              {currentAgent.persona}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] text-emerald-400">{currentAgent.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {user && isSocialMediaAgent && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreditsPanel(!showCreditsPanel)}
                  className="h-8 text-xs gap-1.5 text-muted-foreground"
                  data-testid="button-image-credits"
                >
                  <Coins className="w-3.5 h-3.5 text-yellow-500" />
                  {imageCredits}
                </Button>
                {showCreditsPanel && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 p-4" data-testid="credits-panel">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Image Credits
                      </h4>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setShowCreditsPanel(false); setSelectedCreditPkg(null); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-yellow-400">{imageCredits}</span>
                        <span className="text-xs text-muted-foreground ml-1">credits remaining</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-1">
                        1 credit = 1 AI image generation or stock photo search
                      </p>
                    </div>

                    {!selectedCreditPkg ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Select a package:</p>
                        {(creditPrices || []).map((price) => (
                          <button
                            key={price.id}
                            onClick={() => setSelectedCreditPkg(price.id)}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-colors text-left"
                            data-testid={`button-buy-credits-${price.credits}`}
                          >
                            <div>
                              <span className="text-sm font-semibold">{price.credits} Credit{price.credits !== 1 ? "s" : ""}</span>
                              {price.credits > 1 && (
                                <span className="text-xs text-muted-foreground ml-1.5">
                                  (${(price.amount / price.credits / 100).toFixed(2)}/ea)
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-yellow-400">${(price.amount / 100).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button onClick={() => setSelectedCreditPkg(null)} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          <ChevronLeft className="w-3 h-3" /> Back to packages
                        </button>
                        <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                          <span className="text-sm font-semibold">
                            {creditPrices?.find(p => p.id === selectedCreditPkg)?.credits} Credits — ${((creditPrices?.find(p => p.id === selectedCreditPkg)?.amount || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Card Number</label>
                          <Input
                            placeholder="4242 4242 4242 4242"
                            value={creditCard.number}
                            onChange={(e) => setCreditCard(prev => ({ ...prev, number: e.target.value }))}
                            className="h-9 text-sm"
                            data-testid="input-credit-card-number"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Expiry</label>
                            <Input
                              placeholder="12/28"
                              value={creditCard.expiry}
                              onChange={(e) => setCreditCard(prev => ({ ...prev, expiry: e.target.value }))}
                              className="h-9 text-sm"
                              data-testid="input-credit-expiry"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">CVC</label>
                            <Input
                              placeholder="123"
                              value={creditCard.cvc}
                              onChange={(e) => setCreditCard(prev => ({ ...prev, cvc: e.target.value }))}
                              className="h-9 text-sm"
                              data-testid="input-credit-cvc"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={buyCredits}
                          disabled={creditPurchasing || !creditCard.number || !creditCard.expiry || !creditCard.cvc}
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
                          data-testid="button-confirm-credit-purchase"
                        >
                          {creditPurchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                          Purchase Credits
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                          Test cards: 4242 4242 4242 4242
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={startNewConversation}
              className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="New conversation"
              data-testid="button-new-chat"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
            {user && (
              <Button
                size="sm"
                variant={showTasksPanel ? "default" : "ghost"}
                onClick={() => setShowTasksPanel(!showTasksPanel)}
                className={`h-8 text-xs gap-1 ${showTasksPanel ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground hover:text-foreground"}`}
                title="Tasks & Projects"
                data-testid="button-toggle-tasks"
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tasks</span>
              </Button>
            )}
          </div>
        </div>

        {conversations.length > 1 && (
          <div className="border-b border-border/50 bg-card/20 shrink-0">
            <div className="max-w-3xl mx-auto w-full flex items-center gap-1 px-4 py-1.5 overflow-x-auto scrollbar-hide">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all shrink-0 group cursor-pointer ${
                    convo.id === currentConvoId
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setActiveConvoId(prev => ({ ...prev, [selectedAgent]: convo.id }))}
                  data-testid={`tab-convo-${convo.id}`}
                >
                  <span>{convo.messages.length === 0 ? "New Chat" : convo.title}</span>
                  {conversations.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                      className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all"
                      data-testid={`button-delete-convo-${convo.id}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center max-w-md"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${currentAgent.color} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                  <CurrentIcon className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-chat-empty">
                  {currentAgent.persona}
                </h2>
                <p className="text-muted-foreground mb-1 text-sm">{currentAgent.name} Agent</p>
                <p className="text-muted-foreground/60 text-xs mb-8">
                  {isWorkspace ? "Your AI worker is ready. Start a conversation below." : "Try this agent in demo mode. Send a message to get started."}
                </p>

                <div className="space-y-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.text}
                      onClick={() => sendMessage(prompt.text)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-blue-500/30 hover:shadow-md transition-all text-left group"
                      data-testid={`button-prompt-${prompt.label.split(" ")[0].toLowerCase()}`}
                    >
                      <Sparkles className={`w-4 h-4 ${currentAgent.accent} shrink-0`} />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{prompt.text}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 ml-auto group-hover:text-muted-foreground transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-1">
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const showAvatar = i === 0 || messages[i - 1].role !== msg.role;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""} ${showAvatar ? "mt-4" : "mt-0.5"}`}
                  >
                    <div className="w-8 shrink-0">
                      {showAvatar && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isUser ? "bg-muted" : `bg-gradient-to-br ${currentAgent.color} shadow-md`
                        }`}>
                          {isUser ? (
                            <User className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <CurrentIcon className="w-4 h-4 text-white" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className={`max-w-[80%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
                      {showAvatar && (
                        <span className={`text-[11px] font-medium px-1 ${isUser ? "text-muted-foreground" : currentAgent.accent}`}>
                          {isUser ? (user?.fullName?.split(" ")[0] || "You") : currentAgent.persona}
                        </span>
                      )}

                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-col gap-1 w-full" data-testid={`chat-actions-${i}`}>
                          {msg.actions.map((action, ai) => (
                            <div
                              key={ai}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border ${currentAgent.bg} border-current/10 ${currentAgent.accent}`}
                              data-testid={`chat-action-${i}-${ai}`}
                            >
                              <Zap className="w-3 h-3 shrink-0" />
                              <span className="flex-1">{action.description}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          msg.isLimitWarning
                            ? "bg-red-500/10 border border-red-500/30 text-red-300"
                            : isUser
                              ? "bg-blue-500 text-white rounded-tr-md"
                              : "bg-muted/70 text-foreground rounded-tl-md border border-border/30"
                        }`}
                        data-testid={`chat-message-${i}`}
                      >
                        {msg.isLimitWarning && (
                          <div className="flex items-center gap-2 mb-2 text-red-400 font-medium text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Token Limit Reached
                          </div>
                        )}
                        <ChatMessageContent content={msg.content} isUser={isUser} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 mt-4"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentAgent.color} flex items-center justify-center shrink-0 shadow-md`}>
                    <CurrentIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-[11px] font-medium px-1 ${currentAgent.accent}`}>
                      {currentAgent.persona}
                    </span>
                    <div className="bg-muted/70 rounded-2xl rounded-tl-md border border-border/30 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
          <div className="max-w-3xl mx-auto w-full px-4 py-3">
            {uploadedImage && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20" data-testid="upload-preview">
                <img src={uploadedImage.url} alt="Uploaded" className="w-10 h-10 rounded-lg object-cover" />
                <span className="text-xs text-muted-foreground flex-1 truncate">{uploadedImage.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => setUploadedImage(null)}
                  data-testid="button-remove-upload"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading}
                  className="h-9 w-9 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40"
                  title="Attach image"
                  data-testid="button-upload-image"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              )}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message ${currentAgent.persona}...`}
                  disabled={loading}
                  className="w-full h-11 px-4 pr-12 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all disabled:opacity-50"
                  data-testid="input-chat"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 ${
                    input.trim()
                      ? `bg-gradient-to-r ${currentAgent.color} text-white shadow-md hover:shadow-lg`
                      : "text-muted-foreground/30"
                  }`}
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
       </div>

        {showTasksPanel && user && (
          <TasksPanel
            agentType={selectedAgent}
            agentColor={currentAgent.color}
            onClose={() => setShowTasksPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
