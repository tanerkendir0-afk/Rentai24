import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const agentOptions = [
  { id: "musteri-hizmetleri", name: "Müşteri Hizmetleri", icon: Headphones },
  { id: "satis-pazarlama", name: "Satış & Pazarlama", icon: TrendingUp },
  { id: "sosyal-medya", name: "Sosyal Medya", icon: Share2 },
  { id: "muhasebe", name: "Muhasebe", icon: Calculator },
  { id: "randevu-rezervasyon", name: "Randevu & Rezervasyon", icon: CalendarCheck },
  { id: "insan-kaynaklari", name: "İnsan Kaynakları", icon: Users },
];

export default function Demo() {
  const [selectedAgent, setSelectedAgent] = useState(agentOptions[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await apiRequest("POST", "/api/chat", {
        message: userMessage,
        agentType: selectedAgent,
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Bir hata oluştu. Lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const currentAgentName = agentOptions.find((a) => a.id === selectedAgent)?.name || "";

  return (
    <div className="pt-16 min-h-screen flex flex-col">
      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span data-testid="text-demo-banner">
              Bu bir demo versiyondur. Gerçek AI çalışanlarımız çok daha kapsamlıdır.
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
              AI Çalışan Seçin
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
              {agentOptions.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent.id);
                    setMessages([]);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-left text-sm font-medium transition-all ${
                    selectedAgent === agent.id
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                      : "bg-card border border-border/50 text-muted-foreground"
                  }`}
                  data-testid={`button-agent-${agent.id}`}
                >
                  <agent.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{agent.name}</span>
                </button>
              ))}
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
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm" data-testid="text-chat-agent-name">
                  {currentAgentName} AI
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-muted-foreground">Aktif</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2" data-testid="text-chat-empty">
                    {currentAgentName} AI ile Konuşun
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Aşağıdaki alana mesajınızı yazarak AI çalışanımızla demo konuşma başlatabilirsiniz.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user"
                        ? "bg-muted"
                        : "bg-gradient-to-br from-blue-500 to-violet-500"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-foreground"
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
                    <span className="text-sm text-muted-foreground">Yazıyor...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-6 py-4 border-t border-border/50">
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
                  placeholder="Mesajınızı yazın..."
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
