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
  HelpCircle,
  Bug,
  MessageCircle,
  ChevronDown,
  ExternalLink,
  Settings2,
  BrainCircuit,
  Shield,
  FileText,
  Paperclip,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import ChatMessageContent from "@/components/chat-message";
import PublishAssistantCard, { parsePublishAssistant } from "@/components/publish-assistant-card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { AgentTask } from "@shared/schema";
import TasksPanel from "@/components/tasks-panel";

interface AgentAction {
  type: string;
  description: string;
}

interface Message {
  role: "user" | "assistant" | "admin" | "system";
  content: string;
  actions?: AgentAction[];
  isLimitWarning?: boolean;
  isEscalation?: boolean;
  isAdminJoined?: boolean;
  isAdminMessage?: boolean;
  isResolved?: boolean;
}

interface Conversation {
  id: string;
  dbId?: number;
  messages: Message[];
  title: string;
  createdAt: number;
}

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

interface RentalData {
  id: number;
  agentType: string;
  status: string;
}

export default function Demo({ isWorkspace = false }: { isWorkspace?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("pages");
  const [selectedAgent, setSelectedAgent] = useState(agentOptions[0].id);

  const generateVisibleId = () => Date.now().toString() + Math.random().toString(36).slice(2, 6);

  const [activeConvoId, setActiveConvoId] = useState<Record<string, string>>({});
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});
  const [activeEscalationId, setActiveEscalationId] = useState<number | null>(null);
  const escalationPollRef = useRef<any>(null);
  const lastEscMsgIdRef = useRef<number>(0);

  const { data: serverConversations = [], isLoading: convosLoading } = useQuery<any[]>({
    queryKey: ['/api/conversations', selectedAgent],
    queryFn: () => fetch(`/api/conversations?agentType=${selectedAgent}`).then(r => r.json()),
    enabled: !!user,
    staleTime: 5000,
  });

  const conversations: Conversation[] = serverConversations.map((c: any) => ({
    id: c.visibleId,
    dbId: c.id,
    messages: localMessages[c.visibleId] || [],
    title: c.title,
    createdAt: new Date(c.createdAt).getTime(),
  }));

  const currentConvoId = activeConvoId[selectedAgent] || conversations[0]?.id;
  const currentConvo = conversations.find(c => c.id === currentConvoId) || conversations[0];

  const { data: serverMessages = [] } = useQuery<any[]>({
    queryKey: ['/api/conversations', currentConvoId, 'messages'],
    queryFn: () => fetch(`/api/conversations/${currentConvoId}/messages`).then(r => r.json()),
    enabled: !!user && !!currentConvoId,
    staleTime: 10000,
  });

  useEffect(() => {
    if (currentConvoId && serverMessages.length > 0 && !localMessages[currentConvoId]) {
      const mapped: Message[] = serverMessages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setLocalMessages(prev => ({ ...prev, [currentConvoId]: mapped }));
    }
  }, [serverMessages, currentConvoId]);

  useEffect(() => {
    if (activeEscalationId && user) {
      lastEscMsgIdRef.current = 0;
      if (escalationPollRef.current) clearInterval(escalationPollRef.current);
      escalationPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/escalation/${activeEscalationId}/messages`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === "resolved") {
            setActiveEscalationId(null);
            setMessages((prev: Message[]) => [...prev, { role: "system", content: `✅ ${t("demoPage.systemResolved")}`, isResolved: true }]);
            if (escalationPollRef.current) clearInterval(escalationPollRef.current);
            return;
          }
          const adminMsgs = (data.messages || []).filter((m: any) => m.senderType === "admin");
          const newAdminMsgs = adminMsgs.filter((m: any) => m.id > lastEscMsgIdRef.current);
          if (newAdminMsgs.length > 0) {
            if (data.status === "admin_joined") {
              setMessages((prev: Message[]) => {
                if (prev.some(m => m.isAdminJoined)) return prev;
                return [...prev, { role: "system", content: `🟢 ${t("demoPage.systemAdminJoined")}`, isAdminJoined: true }];
              });
            }
            newAdminMsgs.forEach((m: any) => {
              setMessages((prev: Message[]) => [...prev, { role: "admin", content: m.content, isAdminMessage: true }]);
            });
            lastEscMsgIdRef.current = Math.max(...adminMsgs.map((m: any) => m.id));
          } else if (data.status === "admin_joined") {
            setMessages((prev: Message[]) => {
              if (prev.some(m => m.isAdminJoined)) return prev;
              return [...prev, { role: "system", content: `🟢 ${t("demoPage.systemAdminJoined")}`, isAdminJoined: true }];
            });
          }
        } catch {}
      }, 3000);
    }
    return () => { if (escalationPollRef.current) clearInterval(escalationPollRef.current); };
  }, [activeEscalationId, user]);

  useEffect(() => {
    if (user && selectedAgent) {
      fetch(`/api/escalation/active?agentType=${selectedAgent}`)
        .then(r => r.json())
        .then(data => {
          if (data.escalation && (data.escalation.status === "pending" || data.escalation.status === "admin_joined")) {
            setActiveEscalationId(data.escalation.id);
          } else {
            setActiveEscalationId(null);
          }
        })
        .catch(() => {});
    }
  }, [user, selectedAgent]);

  const messages = localMessages[currentConvoId] || [];

  const setMessages = (msgs: Message[] | ((prev: Message[]) => Message[])) => {
    if (!currentConvoId) return;
    setLocalMessages(prev => {
      const current = prev[currentConvoId] || [];
      const newMsgs = typeof msgs === 'function' ? msgs(current) : msgs;
      return { ...prev, [currentConvoId]: newMsgs };
    });
    if (currentConvo && (currentConvo.title === "New Chat" || currentConvo.title === t("demoPage.newChat"))) {
      const newMsgs = typeof msgs === 'function' ? msgs(messages) : msgs;
      const firstUserMsg = newMsgs.find(m => m.role === "user")?.content.slice(0, 30);
      if (firstUserMsg && currentConvo.dbId) {
        apiRequest("PATCH", `/api/conversations/${currentConvo.dbId}`, { title: firstUserMsg }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedAgent] });
        }).catch(() => {});
      }
    }
  };

  const startNewConversation = async () => {
    const visibleId = generateVisibleId();
    try {
      await apiRequest("POST", "/api/conversations", { agentType: selectedAgent, visibleId });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedAgent] });
      setActiveConvoId(prev => ({ ...prev, [selectedAgent]: visibleId }));
    } catch {}
  };

  const deleteConversation = async (convoId: string) => {
    if (conversations.length <= 1) return;
    const convo = conversations.find(c => c.id === convoId);
    if (!convo?.dbId) return;
    try {
      await apiRequest("DELETE", `/api/conversations/${convo.dbId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedAgent] });
      if (currentConvoId === convoId) {
        const currentIndex = conversations.findIndex(c => c.id === convoId);
        const remaining = conversations.filter(c => c.id !== convoId);
        if (remaining.length > 0) {
          const adjacentIndex = Math.min(currentIndex, remaining.length - 1);
          setActiveConvoId(prev => ({ ...prev, [selectedAgent]: remaining[adjacentIndex].id }));
        }
      }
    } catch {}
  };

  const hasAutoCreated = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (user && conversations.length === 0 && !convosLoading && !hasAutoCreated.current.has(selectedAgent)) {
      hasAutoCreated.current.add(selectedAgent);
      startNewConversation();
    }
  }, [user, conversations.length, convosLoading, selectedAgent]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialAgentSet, setInitialAgentSet] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; type: "image" | "document"; size?: number; documentContent?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCreditsPanel, setShowCreditsPanel] = useState(false);
  const [selectedCreditPkg, setSelectedCreditPkg] = useState<string | null>(null);
  const [creditCard, setCreditCard] = useState({ number: "", expiry: "", cvc: "" });
  const [creditPurchasing, setCreditPurchasing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [showQuickTaskForm, setShowQuickTaskForm] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskDescription, setQuickTaskDescription] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState("medium");
  const [quickTaskDueDate, setQuickTaskDueDate] = useState("");
  const [showSocialPanel, setShowSocialPanel] = useState(false);
  const [socialAddMode, setSocialAddMode] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState("");
  const [socialUsername, setSocialUsername] = useState("");
  const [socialSaving, setSocialSaving] = useState(false);
  const [showCargoPanel, setShowCargoPanel] = useState(false);
  const [cargoQuickAdd, setCargoQuickAdd] = useState(false);
  const [cargoAddForm, setCargoAddForm] = useState({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" });
  const [cargoSaving, setCargoSaving] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [helpView, setHelpView] = useState<"menu" | "report" | "tickets">("menu");
  const [helpCategory, setHelpCategory] = useState("bug");
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDescription, setHelpDescription] = useState("");
  const [helpSending, setHelpSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
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
  const isEcommerceAgent = selectedAgent === "ecommerce-ops";

  const { data: socialAccounts = [] } = useQuery<{ id: number; platform: string; username: string; profileUrl: string | null; status: string }[]>({
    queryKey: ["/api/social-accounts"],
    enabled: !!user && isSocialMediaAgent,
  });

  const { data: shippingProviders = [] } = useQuery<{ id: number; provider: string; apiKey: string; status: string }[]>({
    queryKey: ["/api/shipping-providers"],
    enabled: !!user && isEcommerceAgent,
  });

  const { data: supportTickets = [] } = useQuery<{ id: number; subject: string; description: string; category: string; agentType: string | null; status: string; priority: string; adminReply: string | null; createdAt: string }[]>({
    queryKey: ["/api/support-tickets"],
    enabled: !!user,
  });

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
      if (agentParam === "manager") {
        setSelectedAgent("manager");
      } else if (agentParam && rentedAgentIds.has(agentParam)) {
        setSelectedAgent(agentParam);
      } else {
        setSelectedAgent("manager");
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

  const platformIcons: Record<string, string> = {
    instagram: "📸", twitter: "𝕏", linkedin: "💼", facebook: "📘", tiktok: "🎵", youtube: "▶️",
  };

  const handleAddSocial = async () => {
    if (!socialPlatform || !socialUsername.trim()) return;
    setSocialSaving(true);
    try {
      await apiRequest("POST", "/api/social-accounts", {
        platform: socialPlatform,
        username: socialUsername.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setSocialPlatform("");
      setSocialUsername("");
      setSocialAddMode(false);
      toast({ title: t("demoPage.toast.connected"), description: t("demoPage.toast.accountAdded", { platform: socialPlatform }) });
    } catch {
      toast({ title: t("demoPage.toast.error"), description: t("demoPage.toast.failedAddAccount"), variant: "destructive" });
    } finally {
      setSocialSaving(false);
    }
  };

  const handleDeleteSocial = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/social-accounts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      toast({ title: t("demoPage.toast.disconnected"), description: t("demoPage.toast.accountRemoved") });
    } catch {
      toast({ title: t("demoPage.toast.error"), description: t("demoPage.toast.failedRemoveAccount"), variant: "destructive" });
    }
  };

  const extractTaskContextFromChat = () => {
    const recentMessages = messages.slice(-6);
    if (recentMessages.length === 0) return;

    const userMessages = recentMessages.filter(m => m.role === "user").map(m => m.content);
    const lastUserMsg = userMessages[userMessages.length - 1] || "";
    const assistantMessages = recentMessages.filter(m => m.role === "assistant").map(m => m.content);
    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1] || "";

    const titleCandidate = lastUserMsg.length > 80 ? lastUserMsg.substring(0, 80) + "..." : lastUserMsg;
    if (titleCandidate) setQuickTaskTitle(titleCandidate);

    const descParts: string[] = [];
    if (lastUserMsg) descParts.push(lastUserMsg);
    if (lastAssistantMsg) {
      const shortAssistant = lastAssistantMsg.length > 200 ? lastAssistantMsg.substring(0, 200) + "..." : lastAssistantMsg;
      descParts.push(`${t("demoPage.agentResponse")}: ${shortAssistant}`);
    }
    if (descParts.length > 0) setQuickTaskDescription(descParts.join("\n\n"));

    const dateMatch = lastUserMsg.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);
    if (dateMatch) {
      const normalized = dateMatch[1].replace(/[/.]/g, "-");
      setQuickTaskDueDate(normalized);
    }

    const urgentWords = ["acil", "urgent", "hemen", "immediately", "asap"];
    const highWords = ["önemli", "important", "kritik", "critical"];
    const msgLower = lastUserMsg.toLowerCase();
    if (urgentWords.some(w => msgLower.includes(w))) {
      setQuickTaskPriority("urgent");
    } else if (highWords.some(w => msgLower.includes(w))) {
      setQuickTaskPriority("high");
    }
  };

  const [quickTaskSaving, setQuickTaskSaving] = useState(false);
  const handleQuickTaskCreate = async () => {
    if (!quickTaskTitle.trim()) return;
    setQuickTaskSaving(true);
    try {
      await apiRequest("POST", "/api/agent-tasks", {
        title: quickTaskTitle.trim(),
        description: quickTaskDescription.trim() || null,
        agentType: selectedAgent,
        priority: quickTaskPriority,
        dueDate: quickTaskDueDate || null,
        project: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-tasks", selectedAgent] });
      setQuickTaskTitle("");
      setQuickTaskDescription("");
      setQuickTaskPriority("medium");
      setQuickTaskDueDate("");
      setShowQuickTaskForm(false);
      toast({ title: t("demoPage.toast.taskCreated"), description: t("demoPage.toast.taskCreatedDesc", { title: quickTaskTitle.trim() }) });
    } catch {
      toast({ title: t("demoPage.toast.taskError"), description: t("demoPage.toast.taskErrorDesc"), variant: "destructive" });
    } finally {
      setQuickTaskSaving(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!helpSubject.trim() || !helpDescription.trim()) return;
    setHelpSending(true);
    try {
      await apiRequest("POST", "/api/support-tickets", {
        subject: helpSubject.trim(),
        description: helpDescription.trim(),
        category: helpCategory,
        agentType: selectedAgent,
        priority: helpCategory === "bug" ? "high" : "medium",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      setHelpSubject("");
      setHelpDescription("");
      setHelpCategory("bug");
      setHelpView("tickets");
      toast({ title: t("demoPage.toast.ticketCreated"), description: t("demoPage.toast.ticketCreatedDesc") });
    } catch {
      toast({ title: t("demoPage.toast.error"), description: t("demoPage.toast.failedSubmitTicket"), variant: "destructive" });
    } finally {
      setHelpSending(false);
    }
  };

  const openTicketCount = supportTickets.filter(t => t.status === "open" || t.status === "in_progress").length;

  const handleFileUpload = async (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: t("demoPage.toast.fileTooLarge"), description: t("demoPage.toast.fileTooLargeDesc"), variant: "destructive" });
      return;
    }

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md", ".numbers", ".pages"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      toast({ title: t("demoPage.toast.unsupportedFile"), description: t("demoPage.toast.unsupportedFileDesc"), variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        if (data.fileType === "image") {
          setUploadedFile({ url: data.imageUrl, name: data.filename, type: "image" });
        } else {
          setUploadedFile({ url: data.fileUrl, name: data.filename, type: "document", size: data.fileSize, documentContent: data.documentContent });
        }
      } else {
        toast({ title: t("demoPage.toast.uploadFailed"), description: data.error || t("demoPage.toast.uploadFailedDesc"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("demoPage.toast.uploadFailed"), description: t("demoPage.toast.uploadFailedDesc"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await handleFileUpload(file);
  };

  const sendMessage = async (text?: string) => {
    const userMessage = (text || input).trim();
    const fileAttachment = uploadedFile;
    if ((!userMessage && !fileAttachment) || loading) return;
    setInput("");
    setUploadedFile(null);

    let displayContent = userMessage;
    let messageToSend = userMessage;

    if (fileAttachment) {
      if (fileAttachment.type === "image") {
        displayContent = `${userMessage}\n\n![Uploaded](${fileAttachment.url})`;
        messageToSend = `${userMessage}\n\n[User attached an image: ${fileAttachment.name}]`;
      } else {
        const sizeStr = fileAttachment.size ? `${(fileAttachment.size / 1024).toFixed(1)} KB` : "";
        displayContent = `${userMessage}\n\n📎 **${fileAttachment.name}**${sizeStr ? ` (${sizeStr})` : ""}`;
        messageToSend = `${userMessage}\n\n[User attached a document: ${fileAttachment.name}]\n\nContent:\n${fileAttachment.documentContent || "(Could not extract content)"}`;
      }
    }

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
      if (data.code === "GUARDRAIL_BLOCKED") {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${data.reply}`, isLimitWarning: true }]);
      } else if (data.limitReached) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, isLimitWarning: true }]);
      } else if (data.escalation) {
        setMessages((prev) => [...prev, { role: "system", content: data.escalation.message, isEscalation: true }]);
        setActiveEscalationId(data.escalation.id);
      } else if (data.escalationActive?.adminJoined) {
        setActiveEscalationId(data.escalationActive.id);
      } else {
        const routingPrefix = data.routedToName ? `🔀 *Routed to ${data.routedToName}*\n\n` : "";
        setMessages((prev) => [...prev, { role: "assistant", content: routingPrefix + data.reply, actions: data.actions }]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/token-spending"] });
      if (isSocialMediaAgent) {
        queryClient.invalidateQueries({ queryKey: ["/api/image-credits"] });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("demoPage.somethingWrong") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const managerOption = { id: "manager", roleKey: "manager", persona: "Manager", icon: BrainCircuit, color: "from-amber-500 to-orange-500", accent: "text-amber-400", bg: "bg-amber-500/10" };
  const currentAgent = selectedAgent === "manager" ? managerOption : agentOptions.find((a) => a.id === selectedAgent)!;
  const CurrentIcon = currentAgent.icon;

  const quickPrompts = [
    { label: t("demoPage.promptCapabilities"), text: t("demoPage.promptCapabilitiesText") },
    { label: t("demoPage.promptGetStarted"), text: t("demoPage.promptGetStartedText") },
    { label: t("demoPage.promptQuickTask"), text: t("demoPage.promptQuickTaskText") },
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
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" data-testid="text-agent-select-title">
                  {isWorkspace ? t("demoPage.yourWorkers") : t("demoPage.aiWorkers")}
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
                    {t("demoPage.backToDashboard")}
                  </span>
                </Link>
              )}
              {!isWorkspace && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-500/5 border border-blue-500/10">
                  <Info className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-[10px] text-blue-400/80" data-testid="text-demo-banner">{t("demoPage.demoMode")}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-px">
              {user && hasRentals && (
                <>
                  <button
                    onClick={() => {
                      setSelectedAgent("manager");
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-all group ${
                      selectedAgent === "manager"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/10"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                    data-testid="button-agent-manager"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      selectedAgent === "manager" ? "bg-white/20" : "bg-amber-500/10"
                    }`}>
                      <BrainCircuit className={`w-3.5 h-3.5 ${selectedAgent === "manager" ? "text-white" : "text-amber-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate text-[13px]">{t("demoPage.manager")}</span>
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${selectedAgent === "manager" ? "border-white/30 text-white/80" : "border-amber-500/30 text-amber-400"}`}>AI</Badge>
                      </div>
                      <span className={`text-[10px] truncate block ${selectedAgent === "manager" ? "text-white/70" : "text-muted-foreground/60"}`}>
                        {t("demoPage.smartRouter")}
                      </span>
                    </div>
                  </button>
                  <div className="my-1 border-t border-border/20" />
                </>
              )}
              {agentOptions.map((agent) => {
                const isLocked = user && rentalsReady && hasRentals && !rentedAgentIds.has(agent.id);
                const isPending = user && !rentalsReady;
                const isActive = selectedAgent === agent.id;
                const AgentIcon = agent.icon;

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
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-all group ${
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? "bg-white/20" : agent.bg
                    }`}>
                      <AgentIcon className={`w-3.5 h-3.5 ${isActive ? "text-white" : agent.accent}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate text-[13px]">{agent.persona}</span>
                      </div>
                      <span className={`text-[10px] truncate block ${isActive ? "text-white/70" : "text-muted-foreground/60"}`}>
                        {t("demoPage.roles." + agent.roleKey)}
                      </span>
                    </div>
                    {isLocked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-30" />}
                  </button>
                );
              })}

              {user && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70" data-testid="text-chat-history-title">
                      {t("demoPage.chats")}
                    </span>
                    <button
                      onClick={startNewConversation}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-sidebar-new-chat"
                    >
                      <MessageSquarePlus className="w-3 h-3" />
                      <span>{t("demoPage.new")}</span>
                    </button>
                  </div>
                  {conversations.length > 0 && (
                    <div className="space-y-px">
                      {conversations.map((convo) => (
                        <div
                          key={convo.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all group cursor-pointer ${
                            convo.id === currentConvoId
                              ? "bg-muted/80 text-foreground"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                          onClick={() => setActiveConvoId(prev => ({ ...prev, [selectedAgent]: convo.id }))}
                          data-testid={`sidebar-convo-${convo.id}`}
                        >
                          <MessageCircle className={`w-3 h-3 shrink-0 ${convo.id === currentConvoId ? "text-foreground" : "text-muted-foreground/50"}`} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs truncate block leading-tight">{convo.title || t("demoPage.newChat")}</span>
                            <span className="text-[9px] text-muted-foreground/50 leading-tight">
                              {new Date(convo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {conversations.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                              className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0"
                              data-testid={`button-sidebar-delete-convo-${convo.id}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {spendingData && (
              <div className="p-3 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{t("demoPage.tokenUsage")}</span>
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
        <div className={`min-h-[3.5rem] border-b border-border/50 flex items-center gap-3 px-4 bg-card/30 backdrop-blur-sm shrink-0 relative z-20`}>
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
              <span className="text-[11px] text-emerald-400">{t("demoPage.roles." + currentAgent.roleKey)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {user && (
              <Button
                size="sm"
                variant="ghost"
                onClick={startNewConversation}
                className="h-8 text-xs gap-1.5 text-muted-foreground shrink-0"
                data-testid="button-header-new-chat"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">{t("demoPage.newChat")}</span>
              </Button>
            )}
            {user && isSocialMediaAgent && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowSocialPanel(!showSocialPanel); setShowCreditsPanel(false); }}
                  className="h-8 text-xs gap-1.5 text-muted-foreground shrink-0"
                  data-testid="button-social-accounts"
                >
                  <Share2 className="w-3.5 h-3.5 text-violet-500" />
                  <span className="hidden sm:inline">{t("demoPage.social")}</span>
                  {socialAccounts.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-violet-500/20 text-violet-400">
                      {socialAccounts.length}
                    </Badge>
                  )}
                </Button>
                {showSocialPanel && (
                  <div className="fixed inset-x-4 top-[7.5rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 max-h-[calc(100vh-9rem)] overflow-y-auto" data-testid="social-panel">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-violet-500" />
                        {t("demoPage.connectedAccounts")}
                      </h4>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setShowSocialPanel(false); setSocialAddMode(false); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {socialAccounts.length === 0 && !socialAddMode && (
                      <div className="text-center py-4">
                        <Share2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground mb-3">{t("demoPage.noSocialAccounts")}</p>
                        <Button size="sm" onClick={() => setSocialAddMode(true)} className="bg-violet-500 hover:bg-violet-600 text-white text-xs" data-testid="button-social-add-first">
                          <Plus className="w-3 h-3 mr-1" /> {t("demoPage.connectAccount")}
                        </Button>
                      </div>
                    )}

                    {socialAccounts.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {socialAccounts.map((acc) => (
                          <div key={acc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 group" data-testid={`social-item-${acc.id}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{platformIcons[acc.platform] || "🌐"}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate capitalize">{acc.platform === "twitter" ? "X (Twitter)" : acc.platform}</p>
                                <p className="text-[10px] text-muted-foreground truncate">@{acc.username}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSocial(acc.id)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0"
                              data-testid={`button-remove-social-${acc.id}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {socialAddMode ? (
                      <div className="space-y-2 border-t border-border/50 pt-3">
                        <p className="text-xs font-medium text-muted-foreground">{t("demoPage.selectPlatform")}</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setSocialPlatform(p)}
                              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all ${
                                socialPlatform === p
                                  ? "border-violet-500 bg-violet-500/10 text-violet-400"
                                  : "border-border/50 hover:border-violet-500/30 text-muted-foreground"
                              }`}
                              data-testid={`button-social-platform-${p}`}
                            >
                              <span className="text-base">{platformIcons[p]}</span>
                              <span className="capitalize text-[10px]">{p === "twitter" ? "X" : p}</span>
                            </button>
                          ))}
                        </div>
                        {socialPlatform && (
                          <div className="space-y-2">
                            <Input
                              placeholder={`@username`}
                              value={socialUsername}
                              onChange={(e) => setSocialUsername(e.target.value.replace(/^@/, ""))}
                              className="h-8 text-xs"
                              data-testid="input-social-username-chat"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSocialAddMode(false); setSocialPlatform(""); setSocialUsername(""); }}
                                className="flex-1 h-8 text-xs"
                              >
                                {t("demoPage.cancel")}
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleAddSocial}
                                disabled={socialSaving || !socialUsername.trim()}
                                className="flex-1 h-8 text-xs bg-violet-500 hover:bg-violet-600 text-white"
                                data-testid="button-social-save-chat"
                              >
                                {socialSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : t("demoPage.connect")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : socialAccounts.length > 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSocialAddMode(true)}
                        className="w-full h-8 text-xs text-muted-foreground hover:text-violet-400 gap-1"
                        data-testid="button-social-add-more"
                      >
                        <Plus className="w-3 h-3" /> {t("demoPage.addAccount")}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            {user && isSocialMediaAgent && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowCreditsPanel(!showCreditsPanel); setShowSocialPanel(false); }}
                  className="h-8 text-xs gap-1.5 text-muted-foreground shrink-0"
                  data-testid="button-image-credits"
                >
                  <Coins className="w-3.5 h-3.5 text-yellow-500" />
                  {imageCredits}
                </Button>
                {showCreditsPanel && (
                  <div className="fixed inset-x-4 top-[7.5rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 max-h-[calc(100vh-9rem)] overflow-y-auto" data-testid="credits-panel">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        {t("demoPage.imageCredits")}
                      </h4>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setShowCreditsPanel(false); setSelectedCreditPkg(null); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-yellow-400">{imageCredits}</span>
                        <span className="text-xs text-muted-foreground ml-1">{t("demoPage.creditsRemaining")}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-1">
                        {t("demoPage.creditDescription")}
                      </p>
                    </div>

                    {!selectedCreditPkg ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">{t("demoPage.selectPackage")}</p>
                        {(creditPrices || []).map((price) => (
                          <button
                            key={price.id}
                            onClick={() => setSelectedCreditPkg(price.id)}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-colors text-left"
                            data-testid={`button-buy-credits-${price.credits}`}
                          >
                            <div>
                              <span className="text-sm font-semibold">{price.credits} {price.credits !== 1 ? t("demoPage.credits") : t("demoPage.credit")}</span>
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
                          <ChevronLeft className="w-3 h-3" /> {t("demoPage.backToPackages")}
                        </button>
                        <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                          <span className="text-sm font-semibold">
                            {creditPrices?.find(p => p.id === selectedCreditPkg)?.credits} Credits — ${((creditPrices?.find(p => p.id === selectedCreditPkg)?.amount || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t("demoPage.cardNumber")}</label>
                          <Input
                            placeholder="4242 4242 4242 4242"
                            value={creditCard.number}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                              setCreditCard(prev => ({ ...prev, number: digits.replace(/(\d{4})(?=\d)/g, "$1 ") }));
                            }}
                            className="h-9 text-sm"
                            maxLength={19}
                            data-testid="input-credit-card-number"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">{t("demoPage.expiry")}</label>
                            <Input
                              placeholder="MM/YY"
                              value={creditCard.expiry}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                                setCreditCard(prev => ({ ...prev, expiry: digits.length >= 3 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits }));
                              }}
                              className="h-9 text-sm"
                              maxLength={5}
                              data-testid="input-credit-expiry"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">{t("demoPage.cvc")}</label>
                            <Input
                              placeholder="123"
                              value={creditCard.cvc}
                              onChange={(e) => {
                                setCreditCard(prev => ({ ...prev, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }));
                              }}
                              className="h-9 text-sm"
                              maxLength={4}
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
                          {t("demoPage.purchaseCredits")}
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                          {t("demoPage.testCards")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {user && (
              <Button
                size="sm"
                variant={showTasksPanel ? "default" : "ghost"}
                onClick={() => setShowTasksPanel(!showTasksPanel)}
                className={`h-8 text-xs gap-1 shrink-0 ${showTasksPanel ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground hover:text-foreground"}`}
                title={t("demoPage.tasksTitle")}
                data-testid="button-toggle-tasks"
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("demoPage.tasks")}</span>
              </Button>
            )}
            {user && isEcommerceAgent && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowCargoPanel(!showCargoPanel); setShowCreditsPanel(false); setShowSocialPanel(false); setShowHelpPanel(false); }}
                  className="h-8 text-xs gap-1.5 text-muted-foreground shrink-0"
                  data-testid="button-cargo"
                >
                  <Package className="w-3.5 h-3.5 text-orange-500" />
                  <span className="hidden sm:inline">{t("demoPage.cargo")}</span>
                  {shippingProviders.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-orange-500/20 text-orange-400">
                      {shippingProviders.length}
                    </Badge>
                  )}
                </Button>
                {showCargoPanel && (
                  <div className="fixed inset-x-4 top-[7.5rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 max-h-[calc(100vh-9rem)] overflow-y-auto" data-testid="cargo-panel">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-500" />
                        {t("demoPage.shippingProviders")}
                      </h4>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowCargoPanel(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {shippingProviders.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {shippingProviders.map((sp) => {
                          const providerNames: Record<string, { name: string; icon: string }> = {
                            aras: { name: "Aras Kargo", icon: "📦" }, yurtici: { name: "Yurtici Kargo", icon: "🚛" },
                            mng: { name: "MNG Kargo", icon: "📮" }, surat: { name: "Surat Kargo", icon: "⚡" },
                            ptt: { name: "PTT Kargo", icon: "🏤" }, ups: { name: "UPS", icon: "🟤" },
                            fedex: { name: "FedEx", icon: "📬" }, dhl: { name: "DHL", icon: "✈️" },
                          };
                          const cfg = providerNames[sp.provider] || { name: sp.provider, icon: "📦" };
                          return (
                            <div key={sp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 group" data-testid={`cargo-item-${sp.id}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0">{cfg.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{cfg.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">API: ****{sp.apiKey.slice(-4)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] shrink-0">
                                  {sp.status}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-opacity"
                                  onClick={async () => {
                                    try {
                                      await apiRequest("DELETE", `/api/shipping-providers/${sp.id}`);
                                      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
                                      toast({ title: t("demoPage.providerRemoved"), description: t("demoPage.providerDisconnected", { name: cfg.name }) });
                                    } catch { toast({ title: t("demoPage.error"), description: t("demoPage.providerRemoveFailed"), variant: "destructive" }); }
                                  }}
                                  data-testid={`button-cargo-remove-${sp.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {shippingProviders.length === 0 && !cargoQuickAdd && (
                      <div className="text-center py-4">
                        <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground mb-3">{t("demoPage.noShippingProviders")}</p>
                      </div>
                    )}

                    {cargoQuickAdd ? (
                      <div className="space-y-2 border border-border/50 rounded-lg p-3 mb-2">
                        <p className="text-xs font-medium text-foreground">{t("demoPage.quickConnect")}</p>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { key: "aras", name: "Aras", fields: ["apiKey","customerCode"] },
                            { key: "yurtici", name: "Yurtici", fields: ["apiKey","username","password"] },
                            { key: "mng", name: "MNG", fields: ["apiKey","customerCode"] },
                            { key: "surat", name: "Surat", fields: ["apiKey","customerCode"] },
                            { key: "ptt", name: "PTT", fields: ["apiKey","username"] },
                            { key: "ups", name: "UPS", fields: ["apiKey","username","password"] },
                            { key: "fedex", name: "FedEx", fields: ["apiKey","accountNumber"] },
                            { key: "dhl", name: "DHL", fields: ["apiKey","siteId"] },
                          ].filter(p => !shippingProviders.some(sp => sp.provider === p.key)).map(p => (
                            <Button
                              key={p.key}
                              size="sm"
                              variant="outline"
                              className={`h-6 text-[10px] px-2 ${cargoAddForm.provider === p.key ? "border-orange-500 bg-orange-500/10 text-orange-400" : ""}`}
                              onClick={() => setCargoAddForm({ provider: p.key, apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" })}
                              data-testid={`button-cargo-select-${p.key}`}
                            >
                              {p.name}
                            </Button>
                          ))}
                        </div>
                        {cargoAddForm.provider && (() => {
                          const fieldMap: Record<string, string[]> = {
                            aras: ["apiKey","customerCode"], yurtici: ["apiKey","username","password"],
                            mng: ["apiKey","customerCode"], surat: ["apiKey","customerCode"],
                            ptt: ["apiKey","username"], ups: ["apiKey","username","password"],
                            fedex: ["apiKey","accountNumber"], dhl: ["apiKey","siteId"],
                          };
                          const labels: Record<string, string> = { apiKey: t("demoPage.cargoLabels.apiKey"), customerCode: t("demoPage.cargoLabels.customerCode"), username: t("demoPage.cargoLabels.username"), password: t("demoPage.cargoLabels.password"), accountNumber: t("demoPage.cargoLabels.accountNumber"), siteId: t("demoPage.cargoLabels.siteId") };
                          const fields = fieldMap[cargoAddForm.provider] || ["apiKey"];
                          return (
                            <div className="space-y-1.5 mt-2">
                              {fields.map(f => (
                                <Input
                                  key={f}
                                  type={f === "apiKey" || f === "password" ? "password" : "text"}
                                  placeholder={labels[f]}
                                  value={(cargoAddForm as any)[f] || ""}
                                  onChange={e => setCargoAddForm(prev => ({ ...prev, [f]: e.target.value }))}
                                  className="h-7 text-xs bg-muted/30"
                                  data-testid={`input-cargo-${f}`}
                                />
                              ))}
                              <div className="flex gap-1.5 mt-1">
                                <Button
                                  size="sm"
                                  className="flex-1 h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                                  disabled={!cargoAddForm.apiKey.trim() || cargoSaving}
                                  onClick={async () => {
                                    setCargoSaving(true);
                                    try {
                                      const body: any = { provider: cargoAddForm.provider, apiKey: cargoAddForm.apiKey.trim() };
                                      if (cargoAddForm.customerCode.trim()) body.customerCode = cargoAddForm.customerCode.trim();
                                      if (cargoAddForm.username.trim()) body.username = cargoAddForm.username.trim();
                                      if (cargoAddForm.password.trim()) body.password = cargoAddForm.password.trim();
                                      if (cargoAddForm.accountNumber.trim()) body.accountNumber = cargoAddForm.accountNumber.trim();
                                      if (cargoAddForm.siteId.trim()) body.siteId = cargoAddForm.siteId.trim();
                                      await apiRequest("POST", "/api/shipping-providers", body);
                                      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
                                      setCargoAddForm({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" });
                                      setCargoQuickAdd(false);
                                      toast({ title: t("demoPage.toast.providerConnected"), description: t("demoPage.toast.providerConnectedDesc", { provider: cargoAddForm.provider }) });
                                    } catch { toast({ title: t("demoPage.toast.error"), description: t("demoPage.toast.providerConnectFailed"), variant: "destructive" }); }
                                    setCargoSaving(false);
                                  }}
                                  data-testid="button-cargo-save"
                                >
                                  {cargoSaving ? t("demoPage.saving") : t("demoPage.connect")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => { setCargoQuickAdd(false); setCargoAddForm({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" }); }}
                                  data-testid="button-cargo-cancel"
                                >
                                  {t("demoPage.cancel")}
                                </Button>
                              </div>
                            </div>
                          );
                        })()}
                        {!cargoAddForm.provider && (
                          <div className="flex justify-end mt-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setCargoQuickAdd(false)} data-testid="button-cargo-cancel">{t("demoPage.cancel")}</Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCargoQuickAdd(true)}
                        className="w-full h-8 text-xs text-muted-foreground hover:text-orange-400 gap-1 border border-dashed border-border/50"
                        data-testid="button-cargo-add"
                      >
                        <Plus className="w-3 h-3" /> {t("demoPage.addProvider")}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowCargoPanel(false); window.location.href = "/settings"; }}
                      className="w-full h-7 text-[10px] text-muted-foreground hover:text-orange-400 gap-1 mt-1"
                      data-testid="button-cargo-manage"
                    >
                      <Settings2 className="w-3 h-3" /> {t("demoPage.fullSettings")}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {user && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowHelpPanel(!showHelpPanel); setShowCreditsPanel(false); setShowSocialPanel(false); setShowCargoPanel(false); }}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
                  title={t("demoPage.helpTitle")}
                  data-testid="button-help"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {openTicketCount > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-orange-500/20 text-orange-400">
                      {openTicketCount}
                    </Badge>
                  )}
                </Button>
                {showHelpPanel && (
                  <div className="fixed inset-x-4 top-[7.5rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 max-h-[calc(100vh-9rem)] overflow-y-auto" data-testid="help-panel">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-orange-500" />
                        {t("demoPage.helpAndSupport")}
                      </h4>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setShowHelpPanel(false); setHelpView("menu"); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {helpView === "menu" && (
                      <div className="space-y-2">
                        <button
                          onClick={() => setHelpView("report")}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all text-left"
                          data-testid="button-help-report"
                        >
                          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <Bug className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t("demoPage.reportIssue")}</p>
                            <p className="text-[10px] text-muted-foreground">{t("demoPage.reportIssueDesc")}</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { setHelpCategory("feature"); setHelpView("report"); }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left"
                          data-testid="button-help-feature"
                        >
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t("demoPage.feedbackSuggestions")}</p>
                            <p className="text-[10px] text-muted-foreground">{t("demoPage.feedbackSuggestionsDesc")}</p>
                          </div>
                        </button>
                        <button
                          onClick={() => setHelpView("tickets")}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-left"
                          data-testid="button-help-my-tickets"
                        >
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <ListTodo className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{t("demoPage.myTickets")}</p>
                              {openTicketCount > 0 && (
                                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-orange-500/20 text-orange-400">
                                  {openTicketCount} {t("demoPage.open")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{t("demoPage.viewSupportRequests")}</p>
                          </div>
                        </button>
                        <div className="border-t border-border/50 pt-2 mt-2">
                          <a
                            href="/settings"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                            data-testid="link-help-settings"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t("demoPage.settingsConnections")}
                          </a>
                        </div>
                      </div>
                    )}

                    {helpView === "report" && (
                      <div className="space-y-3">
                        <button onClick={() => { setHelpView("menu"); setHelpCategory("bug"); }} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          <ChevronLeft className="w-3 h-3" /> {t("demoPage.back")}
                        </button>
                        <div className="flex gap-2">
                          {([
                            { key: "bug", label: t("demoPage.helpCategories.bug"), icon: "🐛" },
                            { key: "error", label: t("demoPage.helpCategories.error"), icon: "⚠️" },
                            { key: "connection", label: t("demoPage.helpCategories.connection"), icon: "🔗" },
                            { key: "feature", label: t("demoPage.helpCategories.suggestion"), icon: "💡" },
                            { key: "general", label: t("demoPage.helpCategories.other"), icon: "📋" },
                          ] as const).map((cat) => (
                            <button
                              key={cat.key}
                              onClick={() => setHelpCategory(cat.key)}
                              className={`flex-1 flex flex-col items-center gap-0.5 p-2 rounded-lg border text-[10px] transition-all ${
                                helpCategory === cat.key
                                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                                  : "border-border/50 text-muted-foreground hover:border-orange-500/30"
                              }`}
                              data-testid={`button-help-category-${cat.key}`}
                            >
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t("demoPage.subject")}</label>
                          <Input
                            placeholder={t("demoPage.subjectPlaceholder")}
                            value={helpSubject}
                            onChange={(e) => setHelpSubject(e.target.value)}
                            className="h-8 text-xs"
                            data-testid="input-help-subject"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t("demoPage.details")}</label>
                          <textarea
                            placeholder={t("demoPage.detailsPlaceholder")}
                            value={helpDescription}
                            onChange={(e) => setHelpDescription(e.target.value)}
                            className="w-full min-h-[80px] p-2 rounded-lg border border-border bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                            data-testid="input-help-description"
                          />
                        </div>
                        <div className="bg-muted/30 rounded-lg p-2 text-[10px] text-muted-foreground flex items-start gap-1.5">
                          <Info className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{t("demoPage.sendToAdminInfo", { agent: currentAgent.persona })}</span>
                        </div>
                        <Button
                          onClick={handleSubmitTicket}
                          disabled={helpSending || !helpSubject.trim() || !helpDescription.trim()}
                          className="w-full h-9 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold text-xs"
                          data-testid="button-help-submit"
                        >
                          {helpSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                          {t("demoPage.sendToAdmin")}
                        </Button>
                      </div>
                    )}

                    {helpView === "tickets" && (
                      <div className="space-y-2">
                        <button onClick={() => setHelpView("menu")} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          <ChevronLeft className="w-3 h-3" /> {t("demoPage.back")}
                        </button>
                        {supportTickets.length === 0 ? (
                          <div className="text-center py-4">
                            <Check className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">{t("demoPage.noTicketsYet")}</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                            {supportTickets.map((ticket) => (
                              <div key={ticket.id} className="p-2.5 rounded-lg border border-border/50 bg-muted/20" data-testid={`ticket-item-${ticket.id}`}>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-xs font-medium truncate flex-1">{ticket.subject}</p>
                                  <Badge
                                    variant="secondary"
                                    className={`text-[9px] px-1.5 shrink-0 ${
                                      ticket.status === "open" ? "bg-orange-500/20 text-orange-400" :
                                      ticket.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                                      ticket.status === "resolved" ? "bg-emerald-500/20 text-emerald-400" :
                                      "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {ticket.status === "in_progress" ? t("demoPage.inProgress") : ticket.status === "open" ? t("demoPage.open") : ticket.status === "resolved" ? t("demoPage.resolved") : ticket.status}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1">{ticket.description}</p>
                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                  <span className="capitalize">{ticket.category}</span>
                                  <span>·</span>
                                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                  {ticket.agentType && (
                                    <>
                                      <span>·</span>
                                      <span className="capitalize">{ticket.agentType.replace("-", " ")}</span>
                                    </>
                                  )}
                                </div>
                                {ticket.adminReply && (
                                  <div className="mt-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-[10px] font-medium text-emerald-400 mb-0.5">{t("demoPage.adminReply")}:</p>
                                    <p className="text-[10px] text-emerald-300/80">{ticket.adminReply}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => { setHelpCategory("bug"); setHelpView("report"); }}
                          className="w-full h-8 text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20"
                          variant="ghost"
                          data-testid="button-help-new-ticket"
                        >
                          <Plus className="w-3 h-3 mr-1" /> {t("demoPage.newTicket")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto relative"
          data-testid="chat-messages"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-lg m-2 backdrop-blur-sm" data-testid="drag-overlay">
              <div className="text-center">
                <Paperclip className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-400">{t("demoPage.dropFilesHere")}</p>
                <p className="text-xs text-blue-400/60 mt-1">{t("demoPage.supportedFormats")}</p>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center max-w-md w-full"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${currentAgent.color} flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl`}>
                  <CurrentIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2" data-testid="text-chat-empty">
                  {currentAgent.persona}
                </h2>
                <p className="text-muted-foreground mb-1 text-xs sm:text-sm">{t("demoPage.roles." + currentAgent.roleKey)} {t("demoPage.agent")}</p>
                <p className="text-muted-foreground/60 text-xs mb-6 sm:mb-8">
                  {isWorkspace ? t("demoPage.workerReady") : t("demoPage.previewMode")}
                </p>

                {!isWorkspace && !user && (
                  <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-300 text-center">
                      {t("demoPage.demoPreviewText")} <Link href="/login"><span className="font-semibold underline cursor-pointer">{t("demoPage.createAnAccount")}</span></Link> {t("demoPage.andRentAgent")}
                    </p>
                  </div>
                )}

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
                if (msg.role === "system") {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center my-3"
                    >
                      <div className={`rounded-xl px-4 py-3 max-w-[85%] text-center text-sm border ${
                        msg.isEscalation
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                          : msg.isAdminJoined
                            ? "bg-green-500/10 border-green-500/30 text-green-300"
                            : msg.isResolved
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : "bg-blue-500/10 border-blue-500/30 text-blue-300"
                      }`} data-testid={`system-message-${i}`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  );
                }

                if (msg.role === "admin") {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-2 mt-4"
                    >
                      <div className="w-8 shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="max-w-[80%] flex flex-col gap-1.5 items-start">
                        <span className="text-[11px] font-medium px-1 text-amber-400">{t("demoPage.admin")}</span>
                        <div className="rounded-2xl px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-foreground rounded-tl-md border border-amber-500/30" data-testid={`admin-message-${i}`}>
                          <ChatMessageContent content={msg.content} isUser={false} />
                        </div>
                      </div>
                    </motion.div>
                  );
                }

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
                          {isUser ? (user?.fullName?.split(" ")[0] || t("demoPage.you")) : currentAgent.persona}
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
                            {t("demoPage.tokenLimitReached")}
                          </div>
                        )}
                        {(() => {
                          const { data: publishData, cleanText } = !isUser ? parsePublishAssistant(msg.content) : { data: null, cleanText: msg.content };
                          return (
                            <>
                              {publishData && <PublishAssistantCard data={publishData} />}
                              <ChatMessageContent content={cleanText} isUser={isUser} />
                            </>
                          );
                        })()}
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
          <div className="max-w-3xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-3">
            {uploadedFile && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20" data-testid="upload-preview">
                {uploadedFile.type === "image" ? (
                  <img src={uploadedFile.url} alt="Uploaded" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground truncate block">{uploadedFile.name}</span>
                  {uploadedFile.type === "document" && uploadedFile.size && (
                    <span className="text-[10px] text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => setUploadedFile(null)}
                  data-testid="button-remove-upload"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            {!user && messages.length >= 4 && (
              <div className="mb-2 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 text-center" data-testid="demo-signup-banner">
                <p className="text-xs text-blue-300 mb-2">{t("demoPage.unlockCapabilities")}</p>
                <Link href="/login">
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs h-8 px-4" data-testid="button-demo-signup">
                    {t("demoPage.getStarted")}
                  </Button>
                </Link>
              </div>
            )}
            {showQuickTaskForm && user && (
              <div className="mb-2 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2" data-testid="quick-task-form">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-blue-400" />
                    {t("demoPage.createNewTask")}
                  </h4>
                  <button
                    onClick={() => setShowQuickTaskForm(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-close-quick-task"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input
                  placeholder={t("demoPage.taskTitle")}
                  value={quickTaskTitle}
                  onChange={e => setQuickTaskTitle(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-quick-task-title"
                />
                <Input
                  placeholder={t("demoPage.taskDescOptional")}
                  value={quickTaskDescription}
                  onChange={e => setQuickTaskDescription(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-quick-task-description"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={quickTaskDueDate}
                      onChange={e => setQuickTaskDueDate(e.target.value)}
                      className="w-full h-8 px-2 text-xs rounded-md bg-background border border-border/50 text-foreground"
                      data-testid="input-quick-task-date"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {["low", "medium", "high", "urgent"].map(p => (
                      <button
                        key={p}
                        onClick={() => setQuickTaskPriority(p)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${
                          quickTaskPriority === p
                            ? "border-blue-500/50 bg-blue-500/10 text-foreground"
                            : "border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`quick-task-priority-${p}`}
                      >
                        {p === "low" ? t("demoPage.priorityLow") : p === "medium" ? t("demoPage.priorityMedium") : p === "high" ? t("demoPage.priorityHigh") : t("demoPage.priorityUrgent")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-gradient-to-r from-blue-500 to-violet-500 text-white"
                    disabled={!quickTaskTitle.trim() || quickTaskSaving}
                    onClick={handleQuickTaskCreate}
                    data-testid="button-save-quick-task"
                  >
                    {quickTaskSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                    {quickTaskSaving ? t("demoPage.saving") : t("demoPage.saveTask")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setShowQuickTaskForm(false)}
                  >
                    {t("demoPage.cancel")}
                  </Button>
                </div>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              noValidate
              className="flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.numbers,.pages"
                onChange={handleFileInputChange}
                data-testid="input-file-upload"
              />
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    const willOpen = !showQuickTaskForm;
                    setShowQuickTaskForm(willOpen);
                    if (willOpen) {
                      setQuickTaskTitle("");
                      setQuickTaskDescription("");
                      setQuickTaskPriority("medium");
                      setQuickTaskDueDate("");
                      extractTaskContextFromChat();
                    }
                  }}
                  disabled={loading}
                  className={`min-h-[44px] min-w-[44px] h-11 w-11 rounded-full border flex items-center justify-center shrink-0 transition-all touch-manipulation ${
                    showQuickTaskForm
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title={t("demoPage.createTask")}
                  data-testid="button-quick-task"
                >
                  <ListTodo className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px]">{t("demoPage.task")}</span>
                </button>
              )}
              {user && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading}
                  className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40 touch-manipulation"
                  title={t("demoPage.attachFile")}
                  data-testid="button-upload-file"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
              )}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={!user ? t("demoPage.askPlaceholder", { agent: currentAgent.persona }) : t("demoPage.messagePlaceholder", { agent: currentAgent.persona })}
                  disabled={loading}
                  className="w-full h-11 sm:h-11 px-3 sm:px-4 pr-11 sm:pr-12 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all disabled:opacity-50"
                  data-testid="input-chat"
                />
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && !uploadedFile)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
                  data-testid="button-send-chat"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
       </div>

        {showTasksPanel && user && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
              onClick={() => setShowTasksPanel(false)}
            />
            <TasksPanel
              agentType={selectedAgent}
              agentColor={currentAgent.color}
              onClose={() => setShowTasksPanel(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}
