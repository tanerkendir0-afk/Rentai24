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
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface Message {
  role: "user" | "assistant";
  content: string;
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

export default function Demo() {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState(agentOptions[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialAgentSet, setInitialAgentSet] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rentals, isLoading: rentalsLoading } = useQuery<RentalData[]>({
    queryKey: ["/api/rentals"],
    enabled: !!user,
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

  const sendMessage = async (text?: string) => {
    const userMessage = (text || input).trim();
    if (!userMessage || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          agentType: selectedAgent,
          conversationHistory: messages.slice(-20),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
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

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <motion.aside
          className="w-full lg:w-72 shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3" data-testid="text-agent-select-title">
              Select AI Worker
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
                      setMessages([]);
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
                  <div
                    className={`max-w-[75%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user" ? "bg-blue-500 text-white" : "bg-muted text-foreground"
                    }`}
                    data-testid={`chat-message-${i}`}
                  >
                    {msg.content}
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-3"
              >
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
