import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Upload, FileText, Link2, Trash2, RefreshCw, Cpu, ToggleLeft, ToggleRight,
  Lock, Brain, Database, Zap, MessageSquare, Mail, DollarSign, AlertTriangle, HelpCircle,
  Users, BarChart3, CreditCard, LogOut, Activity, ShoppingCart, UserCheck,
  Download, FileDown, CheckCircle, XCircle, Filter, Send, Crown, Bot, Loader2,
  Plus, Clock, ChevronLeft, MoreVertical, History
} from "lucide-react";

const AGENTS = [
  { slug: "customer-support", name: "Ava — Customer Support" },
  { slug: "sales-sdr", name: "Rex — Sales SDR" },
  { slug: "social-media", name: "Maya — Social Media" },
  { slug: "bookkeeping", name: "Finn — Bookkeeping" },
  { slug: "scheduling", name: "Cal — Scheduling" },
  { slug: "hr-recruiting", name: "Harper — HR & Recruiting" },
  { slug: "data-analyst", name: "DataBot — Data Analyst" },
  { slug: "ecommerce-ops", name: "ShopBot — E-Commerce" },
  { slug: "real-estate", name: "Reno — Real Estate" },
];

interface AgentDocument {
  id: number;
  agentType: string;
  filename: string;
  contentType: string;
  chunkCount: number;
  fileSize: number;
  uploadedAt: string;
}

interface FineTuningJob {
  id: number;
  agentType: string;
  openaiJobId: string;
  status: string;
  fineTunedModel: string | null;
  isActive: boolean;
  trainingFile: string;
  error: string | null;
  createdAt: string;
}

interface AgentStats {
  documentCount: number;
  fineTuningJobs: number;
  activeModel: string | null;
}

interface OverviewData {
  totalUsers: number;
  totalRentals: number;
  activeRentals: number;
  totalCost: string;
  totalRequests: number;
  totalContacts: number;
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  company: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  image_credits: number;
  created_at: string;
  active_rentals: number;
  rentals: { agentType: string; plan: string; status: string; messagesUsed: number; messagesLimit: number }[];
}

function AdminLoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auth failed");
      onLogin(data.token);
    } catch (err: any) {
      toast({ title: "Access Denied", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0E27]">
      <Card className="w-full max-w-md bg-[#111633] border-[#1E2448]">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">RentAI 24 Admin</CardTitle>
          <CardDescription className="text-gray-400">Enter admin password to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#0A0E27] border-[#1E2448] text-white"
              data-testid="input-admin-password"
            />
            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
              data-testid="button-admin-login"
            >
              {loading ? "Authenticating..." : "Access Admin Panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewPanel({ token }: { token: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview", { headers });
      const d = await res.json();
      setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cards = [
    { label: "Total Users", value: data?.totalUsers || 0, icon: Users, color: "text-blue-400" },
    { label: "Active Rentals", value: data?.activeRentals || 0, icon: UserCheck, color: "text-emerald-400" },
    { label: "Total API Cost", value: `$${data ? parseFloat(data.totalCost).toFixed(4) : "0.00"}`, icon: DollarSign, color: "text-red-400" },
    { label: "API Requests", value: data?.totalRequests || 0, icon: Activity, color: "text-violet-400" },
    { label: "Total Rentals", value: data?.totalRentals || 0, icon: ShoppingCart, color: "text-yellow-400" },
    { label: "Contact Messages", value: data?.totalContacts || 0, icon: MessageSquare, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Platform Overview
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} data-testid="button-refresh-overview">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="bg-[#0A0E27] border-[#1E2448]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#111633] flex items-center justify-center shrink-0">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`} data-testid={`text-overview-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                  {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UsersPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const agentLabel = (slug: string) => AGENTS.find(a => a.slug === slug)?.name?.split(" — ")[0] || slug;

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Registered Users ({users.length})
            </CardTitle>
            <CardDescription className="text-gray-400">User accounts, subscriptions, and active rentals</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={loading} data-testid="button-refresh-users">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111633] border-[#1E2448] text-white mb-4"
            data-testid="input-search-users"
          />
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{users.length === 0 ? "No registered users yet" : "No users match your search"}</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filtered.map((user) => (
                <div key={user.id} className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`user-row-${user.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{user.full_name || "—"}</p>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                      {user.company && <p className="text-gray-500 text-xs">{user.company}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {user.stripe_subscription_id ? (
                        <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-800 text-xs">
                          <CreditCard className="w-3 h-3 mr-1" />
                          Subscribed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[#1E2448] text-gray-500 text-xs">Free</Badge>
                      )}
                      {user.image_credits > 0 && (
                        <Badge variant="outline" className="border-yellow-800 text-yellow-400 text-xs">
                          {user.image_credits} credits
                        </Badge>
                      )}
                    </div>
                  </div>
                  {user.rentals && user.rentals.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.rentals.map((r, i) => (
                        <Badge
                          key={i}
                          className={`text-xs ${r.status === "active" ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-gray-900/30 text-gray-500 border-gray-700"}`}
                        >
                          {agentLabel(r.agentType)} · {r.plan} · {r.messagesUsed}/{r.messagesLimit}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-600 text-xs mt-2">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsPanel({ agentType, token }: { agentType: string; token: string }) {
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentType}/documents`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setDocuments(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [agentType, token]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/agents/${agentType}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Document uploaded", description: `${file.name} processed into ${data.chunkCount} chunks` });
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentType}/documents/url`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "URL processed", description: `Content extracted into ${data.chunkCount} chunks` });
      setUrlInput("");
      fetchDocs();
    } catch (err: any) {
      toast({ title: "URL processing failed", description: err.message, variant: "destructive" });
    } finally {
      setUrlLoading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Document deleted" });
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              Upload Document
            </CardTitle>
            <CardDescription className="text-gray-400">
              Supports TXT, PDF, DOCX, CSV, MD (max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="block">
              <div className="border-2 border-dashed border-[#1E2448] rounded-lg p-8 text-center cursor-pointer hover:border-blue-500/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                <p className="text-gray-400 text-sm">
                  {uploading ? "Processing document..." : "Click to upload or drag & drop"}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".txt,.pdf,.docx,.csv,.md"
                onChange={handleFileUpload}
                disabled={uploading}
                data-testid="input-document-upload"
              />
            </label>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-violet-400" />
              Add from URL
            </CardTitle>
            <CardDescription className="text-gray-400">
              Extract and index content from any web page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="https://example.com/docs/page"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="bg-[#111633] border-[#1E2448] text-white"
              data-testid="input-url"
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={urlLoading || !urlInput.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700"
              data-testid="button-add-url"
            >
              {urlLoading ? "Processing..." : "Extract & Index"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-green-400" />
              Knowledge Base ({documents.length} documents)
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchDocs} disabled={loading} data-testid="button-refresh-docs">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`document-item-${doc.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{doc.filename}</p>
                      <p className="text-gray-500 text-xs">
                        {doc.chunkCount} chunks · {formatSize(doc.fileSize || 0)} · {doc.contentType}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 shrink-0"
                    data-testid={`button-delete-doc-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AgentPerfStat {
  agentType: string;
  totalSessions: number;
  totalMessages: number;
  totalActions: number;
  failedActions: number;
  duplicateActions: number;
  avgToolsPerSession: number;
  errorRate: number;
  dupRate: number;
}

function PerformancePanel({ token }: { token: string }) {
  const [stats, setStats] = useState<AgentPerfStat[]>([]);
  const [problematic, setProblematic] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agent-performance", { headers });
      if (!res.ok) throw new Error("Failed to fetch performance data");
      const data = await res.json();
      setStats(data.stats || []);
      setProblematic(data.problematicSessions || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const agentNameMap: Record<string, string> = {};
  AGENTS.forEach(a => { agentNameMap[a.slug] = a.name; });

  return (
    <div className="space-y-6">
      <Card className="bg-[#111633] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            Agent Performance Overview
          </CardTitle>
          <CardDescription className="text-gray-400">
            Per-agent statistics: tool usage, error rates, and efficiency metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-agent-performance">
                <thead>
                  <tr className="border-b border-[#1E2448]">
                    <th className="text-left p-2 text-gray-400">Agent</th>
                    <th className="text-center p-2 text-gray-400">Sessions</th>
                    <th className="text-center p-2 text-gray-400">Messages</th>
                    <th className="text-center p-2 text-gray-400">Actions</th>
                    <th className="text-center p-2 text-gray-400">Avg Tools/Session</th>
                    <th className="text-center p-2 text-gray-400">Error Rate</th>
                    <th className="text-center p-2 text-gray-400">Dup Rate</th>
                    <th className="text-center p-2 text-gray-400">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => {
                    const health = s.errorRate > 20 ? "critical" : s.errorRate > 10 ? "warning" : s.dupRate > 10 ? "warning" : "good";
                    return (
                      <tr key={s.agentType} className="border-b border-[#1E2448]/50 hover:bg-[#0A0E27]/50" data-testid={`row-agent-${s.agentType}`}>
                        <td className="p-2 text-white font-medium">{agentNameMap[s.agentType] || s.agentType}</td>
                        <td className="p-2 text-center text-gray-300">{s.totalSessions}</td>
                        <td className="p-2 text-center text-gray-300">{s.totalMessages}</td>
                        <td className="p-2 text-center text-gray-300">{s.totalActions}</td>
                        <td className="p-2 text-center text-cyan-400">{s.avgToolsPerSession}</td>
                        <td className="p-2 text-center">
                          <span className={s.errorRate > 20 ? "text-red-400" : s.errorRate > 10 ? "text-yellow-400" : "text-green-400"}>
                            {s.errorRate}%
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={s.dupRate > 10 ? "text-orange-400" : "text-green-400"}>
                            {s.dupRate}%
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {health === "good" && <Badge className="bg-green-900/30 text-green-400 border-green-800">Good</Badge>}
                          {health === "warning" && <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-800">Warning</Badge>}
                          {health === "critical" && <Badge className="bg-red-900/30 text-red-400 border-red-800">Critical</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {stats.length === 0 && (
                <p className="text-gray-500 text-center py-8">No agent performance data yet. Start chatting with agents to collect data.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {problematic.length > 0 && (
        <Card className="bg-[#111633] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Problematic Sessions
            </CardTitle>
            <CardDescription className="text-gray-400">
              Sessions with excessive tool usage (&gt;5) or very long conversations (&gt;20 messages)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {problematic.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]" data-testid={`row-problematic-${i}`}>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-[#1E2448] text-gray-300">{agentNameMap[s.agent_type] || s.agent_type}</Badge>
                    <span className="text-xs text-gray-400">Session: {String(s.session_id).slice(0, 12)}...</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-gray-400">{s.msg_count} msgs</span>
                    <span className={Number(s.tool_count) > 5 ? "text-orange-400" : "text-gray-400"}>{s.tool_count} tools</span>
                    <span className="text-gray-500">{s.started_at ? new Date(s.started_at).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConversationReviewPanel({ token }: { token: string }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [agentFilter, setAgentFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const { toast } = useToast();
  const headers = { Authorization: `Bearer ${token}` };

  const agentNameMap: Record<string, string> = {};
  AGENTS.forEach(a => { agentNameMap[a.slug] = a.name; });

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentFilter !== "all") params.set("agentType", agentFilter);
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      const res = await fetch(`/api/admin/conversation-review?${params}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [token, agentFilter, ratingFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const viewMessages = async (conv: any) => {
    setSelectedConv(conv);
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/admin/conversation-review/${conv.visible_id}/messages`, { headers });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoadingMsgs(false); }
  };

  const rateConversation = async (id: number, rating: string | null) => {
    try {
      const res = await fetch(`/api/admin/conversation-review/${id}/rate`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error("Failed to rate conversation");
      setConversations(prev => prev.map(c => c.id === id ? { ...c, quality_rating: rating } : c));
      toast({ title: "Rated", description: `Conversation marked as ${rating || "unrated"}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (selectedConv) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => { setSelectedConv(null); setMessages([]); }} className="border-[#1E2448] text-gray-300" data-testid="button-back-to-list">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to List
        </Button>
        <Card className="bg-[#111633] border-[#1E2448]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-base">{selectedConv.title}</CardTitle>
                <CardDescription className="text-gray-400">
                  {agentNameMap[selectedConv.agent_type] || selectedConv.agent_type} — {new Date(selectedConv.created_at).toLocaleString()}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={selectedConv.quality_rating === "good" ? "default" : "outline"}
                  className={selectedConv.quality_rating === "good" ? "bg-green-600 hover:bg-green-700" : "border-green-800 text-green-400 hover:bg-green-900/30"}
                  onClick={() => rateConversation(selectedConv.id, selectedConv.quality_rating === "good" ? null : "good")}
                  data-testid="button-rate-good">
                  <CheckCircle className="w-4 h-4 mr-1" /> Good
                </Button>
                <Button size="sm" variant={selectedConv.quality_rating === "bad" ? "default" : "outline"}
                  className={selectedConv.quality_rating === "bad" ? "bg-red-600 hover:bg-red-700" : "border-red-800 text-red-400 hover:bg-red-900/30"}
                  onClick={() => rateConversation(selectedConv.id, selectedConv.quality_rating === "bad" ? null : "bad")}
                  data-testid="button-rate-bad">
                  <XCircle className="w-4 h-4 mr-1" /> Bad
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMsgs ? (
              <div className="flex items-center gap-2 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Loading messages...</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-lg text-sm ${
                    msg.role === "user" ? "bg-blue-900/20 border border-blue-800/30 ml-8" :
                    msg.role === "assistant" ? "bg-[#0A0E27] border border-[#1E2448] mr-8" :
                    "bg-gray-900/20 border border-gray-800/30 text-gray-500 text-xs"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${
                        msg.role === "user" ? "border-blue-800 text-blue-400" : "border-purple-800 text-purple-400"
                      }`}>{msg.role}</Badge>
                      {msg.used_tool && <Badge className="bg-violet-900/30 text-violet-400 border-violet-800 text-[10px]">Tool Used</Badge>}
                      <span className="text-[10px] text-gray-500">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{msg.content.substring(0, 500)}{msg.content.length > 500 ? "..." : ""}</p>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-gray-500 text-center py-4">No messages found.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[#111633] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-400" />
            Conversation Review
          </CardTitle>
          <CardDescription className="text-gray-400">
            Review conversations, rate quality for fine-tuning data curation. Conversations rated "bad" are excluded from training data export. Unrated and "good" rated conversations are included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="bg-[#0A0E27] border-[#1E2448] text-white w-48" data-testid="select-review-agent">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent className="bg-[#111633] border-[#1E2448]">
                <SelectItem value="all" className="text-white">All Agents</SelectItem>
                {AGENTS.map(a => (
                  <SelectItem key={a.slug} value={a.slug} className="text-white">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="bg-[#0A0E27] border-[#1E2448] text-white w-40" data-testid="select-review-rating">
                <SelectValue placeholder="All Ratings" />
              </SelectTrigger>
              <SelectContent className="bg-[#111633] border-[#1E2448]">
                <SelectItem value="all" className="text-white">All</SelectItem>
                <SelectItem value="unrated" className="text-white">Unrated</SelectItem>
                <SelectItem value="good" className="text-white">Good</SelectItem>
                <SelectItem value="bad" className="text-white">Bad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : (
            <div className="space-y-2">
              {conversations.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448] hover:border-[#2E3468] cursor-pointer transition-colors"
                  onClick={() => viewMessages(c)} data-testid={`row-conversation-${c.id}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{c.title}</p>
                      <p className="text-xs text-gray-500">{agentNameMap[c.agent_type] || c.agent_type} — {new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{c.message_count} msgs</span>
                    {Number(c.tool_count) > 0 && <Badge variant="outline" className="border-violet-800 text-violet-400 text-[10px]">{c.tool_count} tools</Badge>}
                    {c.quality_rating === "good" && <Badge className="bg-green-900/30 text-green-400 border-green-800 text-[10px]">Good</Badge>}
                    {c.quality_rating === "bad" && <Badge className="bg-red-900/30 text-red-400 border-red-800 text-[10px]">Bad</Badge>}
                    {!c.quality_rating && <Badge variant="outline" className="border-gray-700 text-gray-500 text-[10px]">Unrated</Badge>}
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); rateConversation(c.id, c.quality_rating === "good" ? null : "good"); }}
                        className={`p-1 rounded ${c.quality_rating === "good" ? "text-green-400" : "text-gray-600 hover:text-green-400"}`}
                        data-testid={`button-quick-good-${c.id}`}>
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); rateConversation(c.id, c.quality_rating === "bad" ? null : "bad"); }}
                        className={`p-1 rounded ${c.quality_rating === "bad" ? "text-red-400" : "text-gray-600 hover:text-red-400"}`}
                        data-testid={`button-quick-bad-${c.id}`}>
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-gray-500 text-center py-8">No conversations found. Start chatting with agents to generate data.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingDataPanel({ agentType, token }: { agentType: string; token: string }) {
  const [stats, setStats] = useState<{ total_conversations: number; with_tools: number; avg_messages: number; earliest: string | null; latest: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [minTurns, setMinTurns] = useState("2");
  const [toolsOnly, setToolsOnly] = useState(false);
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentType}/training-data-stats`, { headers });
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      if (typeof data.total_conversations === "number") {
        setStats(data);
      }
    } catch (err: any) {
      toast({ title: "Stats Error", description: err.message, variant: "destructive" });
      setStats(null);
    } finally { setLoading(false); }
  }, [agentType, token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ minTurns, toolsOnly: String(toolsOnly) });
      const res = await fetch(`/api/admin/agents/${agentType}/download-training-data?${params}`, { headers });
      if (!res.ok) {
        let errorMsg = "Export failed";
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training-${agentType}-${Date.now()}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);

      const validation = res.headers.get("X-Training-Validation");
      if (validation) {
        const v = JSON.parse(validation);
        toast({
          title: "Training Data Exported",
          description: `${v.totalExamples} conversations exported. ${v.meetsMinimum ? "✅ Meets minimum (10+)" : "⚠️ Below minimum (need 10+)"}`,
        });
      }
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  const handleDownloadRules = async () => {
    try {
      const res = await fetch("/api/admin/agent-rules-pdf", { headers });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RentAI24-Agent-Rules.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Rules Document Downloaded", description: "All 9 agent rules exported successfully." });
    } catch (err: any) {
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
    }
  };

  const agentName = AGENTS.find(a => a.slug === agentType)?.name || agentType;

  return (
    <div className="space-y-6">
      <Card className="bg-[#111633] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Agent Rules Document
          </CardTitle>
          <CardDescription className="text-gray-400">
            Download complete documentation of all 9 agent rules, tools, and behavior guidelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDownloadRules}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            data-testid="button-download-rules"
          >
            <FileText className="w-4 h-4 mr-2" />
            Download Agent Rules (.pdf)
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#111633] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            Export Training Data — {agentName}
          </CardTitle>
          <CardDescription className="text-gray-400">
            Export chat conversations as JSONL for OpenAI fine-tuning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading stats...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">Total Conversations</p>
                <p className="text-xl font-bold text-white" data-testid="text-total-conversations">{stats.total_conversations}</p>
              </div>
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">With Tool Usage</p>
                <p className="text-xl font-bold text-violet-400">{stats.with_tools}</p>
              </div>
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">Avg Messages/Conv</p>
                <p className="text-xl font-bold text-cyan-400">{stats.avg_messages}</p>
              </div>
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-xl font-bold">{stats.total_conversations >= 10 ? (
                  <span className="text-green-400">Ready</span>
                ) : stats.total_conversations > 0 ? (
                  <span className="text-yellow-400">Need more</span>
                ) : (
                  <span className="text-gray-500">No data</span>
                )}</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Min Conversation Turns</label>
              <Select value={minTurns} onValueChange={setMinTurns}>
                <SelectTrigger className="bg-[#0A0E27] border-[#1E2448] text-white" data-testid="select-min-turns">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111633] border-[#1E2448]">
                  <SelectItem value="1" className="text-white">1+ turns</SelectItem>
                  <SelectItem value="2" className="text-white">2+ turns</SelectItem>
                  <SelectItem value="3" className="text-white">3+ turns</SelectItem>
                  <SelectItem value="5" className="text-white">5+ turns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toolsOnly}
                  onChange={(e) => setToolsOnly(e.target.checked)}
                  className="rounded border-[#1E2448]"
                  data-testid="checkbox-tools-only"
                />
                Only conversations with tool usage
              </label>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting || !stats || stats.total_conversations === 0}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              data-testid="button-export-training"
            >
              {exporting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Export JSONL</>
              )}
            </Button>
          </div>

          {stats && stats.total_conversations < 10 && stats.total_conversations > 0 && (
            <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-400">
                {stats.total_conversations} conversations collected. OpenAI recommends at least 50 for good results. Keep chatting with this agent to build more training data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FineTuningPanel({ agentType, token }: { agentType: string; token: string }) {
  const [jobs, setJobs] = useState<FineTuningJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentType}/fine-tuning`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [agentType, token]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/agents/${agentType}/fine-tuning`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Fine-tuning started", description: `Job ${data.openaiJobId} created` });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Fine-tuning failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSync = async (jobId: number) => {
    try {
      const res = await fetch(`/api/admin/fine-tuning/${jobId}/sync`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Status synced", description: `Status: ${data.status}` });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
  };

  const handleActivate = async (jobId: number) => {
    try {
      const res = await fetch(`/api/admin/fine-tuning/${jobId}/activate`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ agentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Model activated" });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeactivate = async () => {
    try {
      const res = await fetch(`/api/admin/agents/${agentType}/fine-tuning/deactivate`, { method: "POST", headers });
      if (!res.ok) throw new Error("Deactivation failed");
      toast({ title: "All models deactivated for this agent" });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Deactivation failed", description: err.message, variant: "destructive" });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "bg-green-900/30 text-green-400 border-green-800";
      case "failed": case "cancelled": return "bg-red-900/30 text-red-400 border-red-800";
      case "running": case "validating_files": return "bg-blue-900/30 text-blue-400 border-blue-800";
      default: return "bg-yellow-900/30 text-yellow-400 border-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" />
            Start New Fine-Tuning
          </CardTitle>
          <CardDescription className="text-gray-400">
            Upload a JSONL file with training data (OpenAI chat format)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="block">
            <div className="border-2 border-dashed border-[#1E2448] rounded-lg p-8 text-center cursor-pointer hover:border-violet-500/50 transition-colors">
              <Cpu className="w-10 h-10 mx-auto text-gray-500 mb-2" />
              <p className="text-gray-400 text-sm">
                {uploading ? "Uploading & starting job..." : "Click to upload JSONL training file"}
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".jsonl,.json"
              onChange={handleUpload}
              disabled={uploading}
              data-testid="input-training-upload"
            />
          </label>
        </CardContent>
      </Card>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Fine-Tuning Jobs ({jobs.length})
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDeactivate} className="text-xs border-[#1E2448] text-gray-400" data-testid="button-deactivate-all">
              Reset to Base Model
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchJobs} disabled={loading} data-testid="button-refresh-jobs">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No fine-tuning jobs yet</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 bg-[#111633] rounded-lg border border-[#1E2448] space-y-3" data-testid={`ft-job-${job.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={statusColor(job.status)}>{job.status}</Badge>
                      {job.isActive && <Badge className="bg-green-900/30 text-green-400 border-green-800">ACTIVE</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleSync(job.id)} className="text-blue-400 hover:text-blue-300" data-testid={`button-sync-${job.id}`}>
                        <RefreshCw className="w-4 h-4 mr-1" /> Sync
                      </Button>
                      {job.status === "succeeded" && !job.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => handleActivate(job.id)} className="text-green-400 hover:text-green-300" data-testid={`button-activate-${job.id}`}>
                          <ToggleRight className="w-4 h-4 mr-1" /> Activate
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-400"><span className="text-gray-500">File:</span> {job.trainingFile}</p>
                    <p className="text-gray-400"><span className="text-gray-500">Job ID:</span> {job.openaiJobId || "N/A"}</p>
                    {job.fineTunedModel && (
                      <p className="text-gray-400"><span className="text-gray-500">Model:</span> <span className="text-green-400 font-mono text-xs">{job.fineTunedModel}</span></p>
                    )}
                    {job.error && <p className="text-red-400 text-xs mt-1">{job.error}</p>}
                    <p className="text-gray-500 text-xs">Created: {new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ContactMsg {
  id: number;
  name: string;
  email: string;
  company: string;
  companySize: string;
  aiWorkerInterest: string | null;
  message: string;
  createdAt: string;
}

interface Subscriber {
  id: number;
  email: string;
  subscribedAt: string;
}

function MessagesPanel({ token }: { token: string }) {
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [msgRes, subRes] = await Promise.all([
        fetch("/api/admin/contact-messages", { headers }),
        fetch("/api/admin/newsletter-subscribers", { headers }),
      ]);
      const msgData = await msgRes.json();
      const subData = await subRes.json();
      if (Array.isArray(msgData)) setMessages(msgData);
      if (Array.isArray(subData)) setSubscribers(subData);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Contact Messages ({messages.length})
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} data-testid="button-refresh-messages">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages yet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`message-item-${msg.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{msg.name}</p>
                      <p className="text-gray-400 text-sm">{msg.email} &middot; {msg.company} ({msg.companySize})</p>
                    </div>
                    <span className="text-gray-500 text-xs">{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  {msg.aiWorkerInterest && (
                    <Badge className="mb-2 bg-blue-900/30 text-blue-400 border-blue-800 text-xs">Interest: {msg.aiWorkerInterest}</Badge>
                  )}
                  <p className="text-gray-300 text-sm leading-relaxed">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-violet-400" />
            Newsletter Subscribers ({subscribers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No subscribers yet</p>
          ) : (
            <div className="space-y-2">
              {subscribers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`subscriber-item-${sub.id}`}>
                  <p className="text-white text-sm">{sub.email}</p>
                  <span className="text-gray-500 text-xs">{new Date(sub.subscribedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TokenTotals {
  total_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost: string;
  unique_users: number;
  expensive_requests: number;
}

interface TokenDetail {
  id: number;
  user_id: number | null;
  user_email: string;
  user_name: string;
  agent_type: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: string;
  operation_type: string;
  created_at: string;
}

interface TokenSummary {
  agent_type: string;
  user_email: string;
  user_name: string;
  request_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost: string;
  last_used: string;
}

interface TokenOptData {
  modelDistribution: Array<{
    model: string;
    count: number;
    total_cost: string;
    avg_prompt_tokens: number;
    avg_completion_tokens: number;
  }>;
  averages: {
    avg_prompt: number;
    avg_completion: number;
    avg_total: number;
    avg_cost: string;
    total_requests: number;
    total_cost: string;
  };
  dailyStats: Array<{
    date: string;
    requests: number;
    avg_prompt: number;
    cost: string;
    mini_count: number;
    gpt4o_count: number;
  }>;
  miniUsagePercent: string;
  estimatedSavingsUsd: string;
  summarizationCount: number;
  summaryCacheHits: number;
}

function TokenOptimizationPanel({ token }: { token: string }) {
  const [data, setData] = useState<TokenOptData | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/token-optimization", { headers });
      const d = await res.json();
      setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Token Optimization
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} data-testid="button-refresh-token-opt">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Avg Prompt Tokens</p>
            <p className="text-2xl font-bold text-blue-400" data-testid="text-avg-prompt-tokens">
              {data?.averages?.avg_prompt?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">per message</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Avg Total Tokens</p>
            <p className="text-2xl font-bold text-violet-400" data-testid="text-avg-total-tokens">
              {data?.averages?.avg_total?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">per message</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Mini Usage</p>
            <p className="text-2xl font-bold text-emerald-400" data-testid="text-mini-usage-percent">
              {data?.miniUsagePercent || "0"}%
            </p>
            <p className="text-xs text-gray-500">of total requests</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Est. Savings</p>
            <p className="text-2xl font-bold text-green-400" data-testid="text-estimated-savings">
              ${data?.estimatedSavingsUsd || "0.00"}
            </p>
            <p className="text-xs text-gray-500">from mini routing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Summaries Generated</p>
            <p className="text-2xl font-bold text-orange-400" data-testid="text-summarization-count">
              {data?.summarizationCount?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">conversation summaries</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Cache Hits</p>
            <p className="text-2xl font-bold text-cyan-400" data-testid="text-cache-hits">
              {data?.summaryCacheHits?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">reused summaries</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Cache Hit Rate</p>
            <p className="text-2xl font-bold text-teal-400" data-testid="text-cache-hit-rate">
              {data && (data.summarizationCount + data.summaryCacheHits) > 0
                ? ((data.summaryCacheHits / (data.summarizationCount + data.summaryCacheHits)) * 100).toFixed(1)
                : "0"}%
            </p>
            <p className="text-xs text-gray-500">summary reuse rate</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Model Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.modelDistribution?.length ? (
            <p className="text-gray-500 text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.modelDistribution.map((m) => {
                const total = data.averages?.total_requests || 1;
                const pct = ((m.count / total) * 100).toFixed(1);
                return (
                  <div key={m.model} className="space-y-1" data-testid={`model-dist-${m.model}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium">{m.model}</span>
                      <span className="text-gray-400">
                        {m.count.toLocaleString()} requests ({pct}%) · ${parseFloat(m.total_cost).toFixed(4)}
                      </span>
                    </div>
                    <div className="w-full bg-[#111633] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${m.model.includes('mini') ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Avg prompt: {m.avg_prompt_tokens}</span>
                      <span>Avg completion: {m.avg_completion_tokens}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.dailyStats?.length ? (
            <p className="text-gray-500 text-center py-4">No recent data</p>
          ) : (
            <div className="space-y-2">
              {data.dailyStats.map((d) => (
                <div key={d.date} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg" data-testid={`daily-stat-${d.date}`}>
                  <div>
                    <p className="text-white text-sm font-medium">{new Date(d.date).toLocaleDateString()}</p>
                    <p className="text-gray-500 text-xs">{d.requests} requests · avg {d.avg_prompt} prompt tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 text-sm">${parseFloat(d.cost).toFixed(4)}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-emerald-400">Mini: {d.mini_count}</span>
                      <span className="text-blue-400">4o: {d.gpt4o_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CostTrackerPanel({ token }: { token: string }) {
  const [totals, setTotals] = useState<TokenTotals | null>(null);
  const [summary, setSummary] = useState<TokenSummary[]>([]);
  const [detailed, setDetailed] = useState<TokenDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExpensive, setShowExpensive] = useState(false);
  const [view, setView] = useState<"summary" | "detailed">("summary");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const minCost = showExpensive ? 0.01 : 0;
      const [totalsRes, summaryRes, detailedRes] = await Promise.all([
        fetch("/api/admin/token-usage/totals", { headers }),
        fetch("/api/admin/token-usage/summary", { headers }),
        fetch(`/api/admin/token-usage/detailed?minCost=${minCost}`, { headers }),
      ]);
      const t = await totalsRes.json();
      const s = await summaryRes.json();
      const d = await detailedRes.json();
      setTotals(t);
      if (Array.isArray(s)) setSummary(s);
      if (Array.isArray(d)) setDetailed(d);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, showExpensive]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const agentLabel = (slug: string) => AGENTS.find(a => a.slug === slug)?.name || slug;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Cost</p>
            <p className="text-xl font-bold text-red-400" data-testid="text-total-cost">
              ${totals ? parseFloat(totals.total_cost).toFixed(4) : "0.0000"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Requests</p>
            <p className="text-xl font-bold text-blue-400" data-testid="text-total-requests">
              {totals?.total_requests || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Tokens</p>
            <p className="text-xl font-bold text-violet-400" data-testid="text-total-tokens">
              {totals?.total_tokens ? totals.total_tokens.toLocaleString() : "0"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Unique Users</p>
            <p className="text-xl font-bold text-emerald-400" data-testid="text-unique-users">
              {totals?.unique_users || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              Token Cost Breakdown
            </CardTitle>
            <CardDescription className="text-gray-400">AI API costs per user and agent</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showExpensive ? "default" : "outline"}
              size="sm"
              onClick={() => setShowExpensive(!showExpensive)}
              className={showExpensive ? "bg-red-600 hover:bg-red-700 text-white" : "border-[#1E2448] text-gray-300"}
              data-testid="button-filter-expensive"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              $0.01+
            </Button>
            <Button
              variant={view === "summary" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("summary")}
              className={view === "summary" ? "bg-blue-600 text-white" : "border-[#1E2448] text-gray-300"}
              data-testid="button-view-summary"
            >
              Summary
            </Button>
            <Button
              variant={view === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("detailed")}
              className={view === "detailed" ? "bg-violet-600 text-white" : "border-[#1E2448] text-gray-300"}
              data-testid="button-view-detailed"
            >
              Detailed
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {view === "summary" ? (
            <div className="space-y-2">
              {summary.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">No token usage data yet. Chat with agents to generate data.</p>
              )}
              {summary.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`cost-summary-row-${i}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{row.user_name}</span>
                      <span className="text-xs text-gray-500">{row.user_email}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="outline" className="border-[#1E2448] text-gray-400 text-xs">
                        {agentLabel(row.agent_type)}
                      </Badge>
                      <span className="text-xs text-gray-500">{row.request_count} requests</span>
                      <span className="text-xs text-gray-500">{row.total_tokens.toLocaleString()} tokens</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${parseFloat(row.total_cost) >= 0.01 ? "text-red-400" : "text-emerald-400"}`}>
                      ${parseFloat(row.total_cost).toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {detailed.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  {showExpensive ? "No requests over $0.01 yet." : "No token usage data yet."}
                </p>
              )}
              {detailed.map((row) => (
                <div key={row.id} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`cost-detail-row-${row.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{row.user_name}</span>
                      <Badge variant="outline" className="border-[#1E2448] text-gray-400 text-xs">
                        {agentLabel(row.agent_type)}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${row.operation_type === "tool_call" ? "border-violet-800 text-violet-400" : "border-blue-800 text-blue-400"}`}>
                        {row.operation_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{row.model}</span>
                      <span className="text-xs text-gray-500">In: {row.prompt_tokens.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">Out: {row.completion_tokens.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${parseFloat(row.cost_usd) >= 0.01 ? "text-red-400" : "text-emerald-400"}`}>
                    ${parseFloat(row.cost_usd).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface BossMessage {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: boolean;
}

interface BossConversation {
  id: number;
  topic: string;
  messages: BossMessage[];
  messageCount: number;
  toolsUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgentCollabResponse {
  slug: string;
  name: string;
  perspective: string;
  response: string;
  tokens: number;
  cost: number;
  error?: boolean;
}

interface CollaborationResult {
  topic: string;
  synthesis: string;
  agentResponses: AgentCollabResponse[];
  meta: {
    totalCost: string;
    totalTokens: number;
    agentCount: number;
    successCount: number;
  };
}

interface SavedCollabSession {
  id: number;
  topic: string;
  synthesis: string;
  agentResponses: AgentCollabResponse[];
  agentCount: number;
  totalCost: string;
  totalTokens: number;
  createdAt: string;
}

function CollaborationPanel({ token }: { token: string }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CollaborationResult | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(AGENTS.map(a => a.slug));
  const [progress, setProgress] = useState(0);
  const [sessions, setSessions] = useState<SavedCollabSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/collaboration-sessions", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data: SavedCollabSession[] = await res.json();
        setSessions(data);
      }
    } catch {}
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const loadSession = (session: SavedCollabSession) => {
    setResult({
      topic: session.topic,
      synthesis: session.synthesis,
      agentResponses: session.agentResponses,
      meta: {
        totalCost: session.totalCost,
        totalTokens: session.totalTokens,
        agentCount: session.agentCount,
        successCount: session.agentCount,
      },
    });
    setTopic(session.topic);
    setShowHistory(false);
  };

  const deleteSession = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/collaboration-sessions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        toast({ title: "Deleted", description: "Session removed" });
      }
    } catch {}
  };

  const toggleAgent = (slug: string) => {
    setSelectedAgents(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const startBrainstorm = async () => {
    if (!topic.trim()) return;
    if (selectedAgents.length === 0) {
      toast({ title: "Error", description: "Select at least one agent", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setProgress(10);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 8, 90));
    }, 1000);

    try {
      const res = await fetch("/api/admin/agent-collaboration", {
        method: "POST",
        headers,
        body: JSON.stringify({ topic: topic.trim(), selectedAgents }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Collaboration failed");
      }
      const data: CollaborationResult = await res.json();
      setResult(data);
      setProgress(100);
      fetchSessions();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({ title: "Error", description: errMsg, variant: "destructive" });
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const agentColors: Record<string, string> = {
    "customer-support": "from-blue-500 to-blue-600",
    "sales-sdr": "from-red-500 to-red-600",
    "social-media": "from-pink-500 to-pink-600",
    "bookkeeping": "from-green-500 to-green-600",
    "scheduling": "from-yellow-500 to-yellow-600",
    "hr-recruiting": "from-purple-500 to-purple-600",
    "data-analyst": "from-cyan-500 to-cyan-600",
    "ecommerce-ops": "from-orange-500 to-orange-600",
    "real-estate": "from-teal-500 to-teal-600",
  };

  const agentIcons: Record<string, string> = {
    "customer-support": "🎧",
    "sales-sdr": "📈",
    "social-media": "📱",
    "bookkeeping": "📊",
    "scheduling": "📅",
    "hr-recruiting": "👥",
    "data-analyst": "🔬",
    "ecommerce-ops": "🛒",
    "real-estate": "🏠",
  };

  const formatCollabText = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h2 key={i} className="text-xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h2>;
      if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-semibold text-white mt-3 mb-1">{line.slice(3)}</h3>;
      if (line.startsWith("### ")) return <h4 key={i} className="text-md font-semibold text-gray-200 mt-2 mb-1">{line.slice(4)}</h4>;
      if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="text-gray-300 ml-4 list-disc">{line.slice(2)}</li>;
      if (line.match(/^\d+\.\s/)) return <li key={i} className="text-gray-300 ml-4 list-decimal">{line.replace(/^\d+\.\s/, "")}</li>;
      if (line.trim() === "") return <br key={i} />;
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
      return <p key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-indigo-400" />
              Agent Collaboration — Brainstorming
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={`border-[#1E2448] ${showHistory ? "bg-indigo-600 text-white" : "text-gray-300"}`}
              data-testid="button-collab-history"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              History ({sessions.length})
            </Button>
          </div>
          <CardDescription className="text-gray-300">
            Bring your AI agents together for a team brainstorming session. Each agent provides their unique perspective, then Boss AI synthesizes everything into an action plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Select Agents for Brainstorm</label>
            <div className="flex flex-wrap gap-2">
              {AGENTS.map(agent => (
                <button
                  key={agent.slug}
                  onClick={() => toggleAgent(agent.slug)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedAgents.includes(agent.slug)
                      ? `bg-gradient-to-r ${agentColors[agent.slug]} text-white shadow-lg`
                      : "bg-[#1E2448] text-gray-400 hover:text-gray-200"
                  }`}
                  data-testid={`toggle-agent-${agent.slug}`}
                >
                  {agentIcons[agent.slug]} {agent.name.split(" — ")[0]}
                </button>
              ))}
              <button
                onClick={() => setSelectedAgents(selectedAgents.length === AGENTS.length ? [] : AGENTS.map(a => a.slug))}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#0A0E27] text-gray-400 hover:text-white border border-[#1E2448]"
                data-testid="toggle-all-agents"
              >
                {selectedAgents.length === AGENTS.length ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic, question, or challenge for the team..."
              className="bg-[#0A0E27] border-[#1E2448] text-white flex-1"
              onKeyDown={(e) => e.key === "Enter" && !loading && startBrainstorm()}
              disabled={loading}
              data-testid="input-collaboration-topic"
            />
            <Button
              onClick={startBrainstorm}
              disabled={loading || !topic.trim() || selectedAgents.length === 0}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6"
              data-testid="button-start-brainstorm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {loading ? "Thinking..." : "Brainstorm"}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-indigo-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                {selectedAgents.length} agents are analyzing the topic...
              </div>
              <div className="w-full bg-[#0A0E27] rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showHistory && (
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Past Brainstorming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No saved sessions yet. Start a brainstorm to save it automatically.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-[#131740] rounded-lg hover:bg-[#1a1f50] cursor-pointer transition-colors"
                    onClick={() => loadSession(session)}
                    data-testid={`collab-session-${session.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{session.topic}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{session.agentCount} agents</span>
                        <span>${parseFloat(session.totalCost).toFixed(4)}</span>
                        <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      data-testid={`collab-session-delete-${session.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  Boss AI — Unified Synthesis
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600/30 text-indigo-300 border-indigo-500/30">
                    {result.meta.successCount}/{result.meta.agentCount} agents
                  </Badge>
                  <Badge className="bg-green-600/30 text-green-300 border-green-500/30">
                    ${parseFloat(result.meta.totalCost).toFixed(4)} cost
                  </Badge>
                  <Badge className="bg-violet-600/30 text-violet-300 border-violet-500/30">
                    {result.meta.totalTokens.toLocaleString()} tokens
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-gray-400 mt-1">
                Topic: "{result.topic}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none" data-testid="text-synthesis">
                {formatCollabText(result.synthesis)}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.agentResponses.map((agent) => (
              <Card
                key={agent.slug}
                className={`bg-[#0A0E27] border-[#1E2448] ${agent.error ? "opacity-60" : ""}`}
                data-testid={`card-agent-response-${agent.slug}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full bg-gradient-to-r ${agentColors[agent.slug]} flex items-center justify-center text-lg`}>
                        {agentIcons[agent.slug]}
                      </span>
                      {agent.name}
                    </CardTitle>
                    {!agent.error && (
                      <Badge className="bg-[#1E2448] text-gray-400 text-xs">
                        ${agent.cost.toFixed(4)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{agent.perspective}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-sm max-h-60 overflow-y-auto" data-testid={`text-agent-perspective-${agent.slug}`}>
                    {agent.error ? (
                      <p className="text-red-400">{agent.response}</p>
                    ) : (
                      formatCollabText(agent.response)
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface SpendOverall {
  total_requests: number;
  total_cost: string;
  total_tokens: string;
  total_prompt_tokens: string;
  total_completion_tokens: string;
  unique_users: number;
  avg_cost_per_request: string;
}

interface SpendPerAgent {
  agent_type: string;
  total_requests: number;
  total_cost: string;
  total_tokens: string;
  prompt_tokens: string;
  completion_tokens: string;
  unique_users: number;
  avg_cost_per_request: string;
  max_single_cost: string;
}

interface SpendByModel {
  model: string;
  total_requests: number;
  total_cost: string;
  total_tokens: string;
}

interface SpendByOp {
  operation_type: string;
  total_requests: number;
  total_cost: string;
  total_tokens: string;
}

interface SpendDaily {
  day: string;
  requests: number;
  cost: string;
  tokens: string;
}

interface SpendData {
  overall: SpendOverall;
  perAgent: SpendPerAgent[];
  byModel: SpendByModel[];
  byOperation: SpendByOp[];
  dailyTrend: SpendDaily[];
  perAgentDaily: { agent_type: string; day: string; requests: number; cost: string }[];
  collaboration: { total_requests: number; total_cost: string; total_tokens: string };
}

function SpendAnalysisPanel({ token }: { token: string }) {
  const [data, setData] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/spend-analysis", { headers });
      if (res.ok) {
        const d: SpendData = await res.json();
        setData(d);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const agentLabel = (slug: string) => AGENTS.find(a => a.slug === slug)?.name || slug;

  const maxAgentCost = data?.perAgent.length
    ? Math.max(...data.perAgent.map(a => parseFloat(a.total_cost)))
    : 1;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading spend analysis...
      </div>
    );
  }

  if (!data) return null;

  const totalCost = parseFloat(data.overall.total_cost);
  const collabCost = parseFloat(data.collaboration.total_cost);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Spend</p>
            <p className="text-2xl font-bold text-red-400" data-testid="text-spend-total">${totalCost.toFixed(4)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.overall.total_requests} requests</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Total Tokens</p>
            <p className="text-2xl font-bold text-violet-400" data-testid="text-spend-tokens">{parseInt(data.overall.total_tokens).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Prompt: {parseInt(data.overall.total_prompt_tokens).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Avg Cost/Request</p>
            <p className="text-2xl font-bold text-blue-400" data-testid="text-spend-avg">${parseFloat(data.overall.avg_cost_per_request).toFixed(4)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.overall.unique_users} users</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">Collaboration Cost</p>
            <p className="text-2xl font-bold text-indigo-400" data-testid="text-spend-collab">${collabCost.toFixed(4)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.collaboration.total_requests} sessions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Per-Agent Spend Breakdown
            </CardTitle>
            <Button size="sm" variant="outline" onClick={fetchData} className="border-[#1E2448] text-gray-300" data-testid="button-refresh-spend">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.perAgent.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No usage data yet</p>
          ) : (
            data.perAgent.map((agent) => {
              const cost = parseFloat(agent.total_cost);
              const pct = maxAgentCost > 0 ? (cost / maxAgentCost) * 100 : 0;
              const costPctOfTotal = totalCost > 0 ? ((cost / totalCost) * 100).toFixed(1) : "0";
              return (
                <div key={agent.agent_type} className="bg-[#131740] rounded-lg p-3" data-testid={`spend-agent-${agent.agent_type}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{agentLabel(agent.agent_type)}</span>
                      <Badge className="bg-[#1E2448] text-gray-400 text-xs">{costPctOfTotal}%</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{agent.total_requests} reqs</span>
                      <span>{parseInt(agent.total_tokens).toLocaleString()} tokens</span>
                      <span className="text-red-400 font-semibold">${cost.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#0A0E27] rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>Avg: ${parseFloat(agent.avg_cost_per_request).toFixed(4)}/req</span>
                    <span>Max: ${parseFloat(agent.max_single_cost).toFixed(4)}</span>
                    <span>{agent.unique_users} users</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-md text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Cost by Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.byModel.map((m) => (
              <div key={m.model} className="flex items-center justify-between p-2 bg-[#131740] rounded" data-testid={`spend-model-${m.model}`}>
                <span className="text-sm text-white font-mono">{m.model}</span>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{m.total_requests} reqs</span>
                  <span className="text-red-400 font-semibold">${parseFloat(m.total_cost).toFixed(4)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-md text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" /> Cost by Operation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.byOperation.map((op) => (
              <div key={op.operation_type} className="flex items-center justify-between p-2 bg-[#131740] rounded" data-testid={`spend-op-${op.operation_type}`}>
                <span className="text-sm text-white capitalize">{op.operation_type}</span>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{op.total_requests} reqs</span>
                  <span className="text-red-400 font-semibold">${parseFloat(op.total_cost).toFixed(4)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-md text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" /> Daily Trend (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyTrend.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No daily data yet</p>
          ) : (
            <div className="space-y-1">
              {data.dailyTrend.slice(0, 14).map((day) => {
                const dayCost = parseFloat(day.cost);
                const maxDayCost = Math.max(...data.dailyTrend.map(d => parseFloat(d.cost)));
                const barWidth = maxDayCost > 0 ? (dayCost / maxDayCost) * 100 : 0;
                return (
                  <div key={day.day} className="flex items-center gap-3" data-testid={`spend-day-${day.day}`}>
                    <span className="text-xs text-gray-400 w-24 shrink-0">{day.day}</span>
                    <div className="flex-1 bg-[#131740] rounded-full h-4 relative">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(barWidth, 5)}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">${dayCost.toFixed(4)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{day.requests} reqs</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BossAIPanel({ token }: { token: string }) {
  const [messages, setMessages] = useState<BossMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<BossConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingTopic, setEditingTopic] = useState<number | null>(null);
  const [editTopicValue, setEditTopicValue] = useState("");
  const [savingConv, setSavingConv] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/boss-conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const saveConversation = useCallback(async (msgs: BossMessage[], convId: number | null, autoTopic?: string) => {
    if (msgs.length < 2) return convId;
    setSavingConv(true);
    try {
      const hasTools = msgs.some(m => m.toolsUsed);
      if (convId) {
        const res = await fetch(`/api/admin/boss-conversations/${convId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: msgs, toolsUsed: hasTools }),
        });
        if (res.ok) fetchConversations();
        return convId;
      } else {
        const topic = autoTopic || msgs.find(m => m.role === "user")?.content.slice(0, 80) || "New Conversation";
        const res = await fetch("/api/admin/boss-conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ topic, messages: msgs, toolsUsed: hasTools }),
        });
        if (res.ok) {
          const conv = await res.json();
          setActiveConvId(conv.id);
          fetchConversations();
          return conv.id as number;
        }
      }
    } catch {} finally {
      setSavingConv(false);
    }
    return convId;
  }, [token, fetchConversations]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: BossMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/boss-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: messages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Boss AI is unavailable");
      }

      const data = await res.json();
      const assistantMsg: BossMessage = {
        role: "assistant",
        content: data.reply,
        toolsUsed: data.toolsUsed,
      };
      const allMessages = [...newMessages, assistantMsg];
      setMessages(allMessages);

      const newId = await saveConversation(allMessages, activeConvId);
      if (newId) setActiveConvId(newId);
    } catch (err: any) {
      toast({ title: "Boss AI Error", description: err.message, variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setActiveConvId(null);
    setShowHistory(false);
  };

  const loadConversation = (conv: BossConversation) => {
    setMessages(conv.messages || []);
    setActiveConvId(conv.id);
    setShowHistory(false);
  };

  const deleteConversation = async (id: number) => {
    try {
      await fetch(`/api/admin/boss-conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeConvId === id) {
        setMessages([]);
        setActiveConvId(null);
      }
      fetchConversations();
    } catch {}
  };

  const updateTopic = async (id: number, newTopic: string) => {
    try {
      await fetch(`/api/admin/boss-conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: newTopic }),
      });
      fetchConversations();
      setEditingTopic(null);
    } catch {}
  };

  const formatMessage = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-bold mt-3 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-4 mb-1">{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
      if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
      if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\.\s/, "")}</li>;
      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold">{line.slice(2, -2)}</p>;
      if (line.startsWith("```")) return <code key={i} className="block bg-black/30 rounded px-2 py-1 text-xs font-mono text-green-400">{line.slice(3)}</code>;
      if (line.trim() === "") return <br key={i} />;

      const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      return (
        <p key={i}>
          {parts.map((part, j) => {
            if (part.startsWith("`") && part.endsWith("`")) return <code key={j} className="bg-black/30 rounded px-1 text-xs font-mono text-emerald-400">{part.slice(1, -1)}</code>;
            if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <Card className="bg-[#111633] border-[#1E2448]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            Boss AI — Platform Commander
            {savingConv && <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-2" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="border-[#1E2448] text-gray-400 hover:text-white hover:border-amber-500/50"
              data-testid="boss-history-toggle"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              History ({conversations.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewConversation}
              className="border-[#1E2448] text-gray-400 hover:text-white hover:border-green-500/50"
              data-testid="boss-new-conversation"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>
        <CardDescription className="text-gray-400">
          {activeConv
            ? <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                {activeConv.topic}
                <span className="text-gray-500 text-xs">({activeConv.messageCount} messages)</span>
              </span>
            : "Your AI assistant that knows everything about the platform. Ask about stats, agents, architecture, or development."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {showHistory ? (
          <div className="h-[500px] flex flex-col">
            <div className="px-4 py-2 border-b border-[#1E2448] flex items-center justify-between">
              <span className="text-sm font-medium text-white">Conversation History</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white h-7"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Back to Chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" data-testid="boss-conversation-list">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <History className="w-10 h-10 text-gray-600" />
                  <p className="text-gray-500 text-sm">No saved conversations yet.</p>
                  <p className="text-gray-600 text-xs">Start chatting with Boss — conversations are saved automatically.</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group rounded-lg border p-3 cursor-pointer transition-all ${
                      activeConvId === conv.id
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-[#0A0E27] border-[#1E2448] hover:border-[#2E3468]"
                    }`}
                    data-testid={`boss-conversation-${conv.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0" onClick={() => loadConversation(conv)}>
                        {editingTopic === conv.id ? (
                          <Input
                            value={editTopicValue}
                            onChange={(e) => setEditTopicValue(e.target.value)}
                            onBlur={() => updateTopic(conv.id, editTopicValue)}
                            onKeyDown={(e) => { if (e.key === "Enter") updateTopic(conv.id, editTopicValue); }}
                            className="h-6 text-sm bg-[#0A0E27] border-amber-500/30 text-white px-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="text-sm font-medium text-white truncate">{conv.topic}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(conv.updatedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-xs text-gray-500">{conv.messageCount} msg</span>
                          {conv.toolsUsed && (
                            <Badge className="bg-violet-900/30 text-violet-400 border-violet-800 text-[10px] px-1 py-0">
                              <Database className="w-2 h-2 mr-0.5" /> data
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-500 hover:text-amber-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTopic(conv.id);
                            setEditTopicValue(conv.topic);
                          }}
                          data-testid={`boss-conv-edit-${conv.id}`}
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          data-testid={`boss-conv-delete-${conv.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" data-testid="boss-messages">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-lg">Boss AI</p>
                    <p className="text-gray-400 text-sm max-w-md mt-1">
                      I oversee all 9 agents and know every detail of the platform. Ask me anything.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {[
                      "How many active users do we have?",
                      "Which agent is most popular?",
                      "What's our total API cost?",
                      "Show me recent platform activity",
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="text-left text-xs bg-[#0A0E27] hover:bg-[#1E2448] border border-[#1E2448] rounded-lg px-3 py-2 text-gray-400 hover:text-white transition-colors"
                        data-testid={`boss-suggestion-${i}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-[#0A0E27] border border-[#1E2448] text-gray-200"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">Boss</span>
                        {msg.toolsUsed && (
                          <Badge className="bg-violet-900/30 text-violet-400 border-violet-800 text-[10px] px-1.5 py-0 ml-1">
                            <Database className="w-2.5 h-2.5 mr-0.5" /> live data
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className={`text-sm leading-relaxed ${msg.role === "user" ? "" : "space-y-1"}`}>
                      {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#0A0E27] border border-[#1E2448] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span className="text-sm text-gray-400">Boss is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[#1E2448] px-4 py-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Boss anything about the platform..."
                  className="flex-1 bg-[#0A0E27] border-[#1E2448] text-white placeholder:text-gray-500"
                  disabled={loading}
                  data-testid="boss-input"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4"
                  data-testid="boss-send"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GuardrailsPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (agentFilter !== "all") params.set("agentType", agentFilter);
      if (ruleFilter !== "all") params.set("ruleType", ruleFilter);
      const res = await fetch(`/api/admin/guardrail-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLogs(await res.json());
    } catch { } finally { setLoading(false); }
  }, [token, agentFilter, ruleFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const ruleTypes = [
    { value: "all", label: "All Rules" },
    { value: "prompt_injection", label: "Prompt Injection" },
    { value: "blocked_topic", label: "Blocked Topic" },
    { value: "input_length", label: "Input Length" },
    { value: "rate_limit", label: "Rate Limit" },
    { value: "daily_limit", label: "Daily Limit" },
  ];

  const ruleColors: Record<string, string> = {
    prompt_injection: "bg-red-500/20 text-red-400 border-red-500/30",
    blocked_topic: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    input_length: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rate_limit: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    daily_limit: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  const todayCount = logs.filter(l => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const topRule = logs.length > 0
    ? Object.entries(logs.reduce((acc: Record<string, number>, l: any) => {
        acc[l.ruleType] = (acc[l.ruleType] || 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
    : "-";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0D1129] border-[#1E2448]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400" data-testid="text-guardrail-today-label">Today's Blocks</p>
                <p className="text-2xl font-bold text-white" data-testid="text-guardrail-today-count">{todayCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0D1129] border-[#1E2448]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400" data-testid="text-guardrail-total-label">Total Blocks</p>
                <p className="text-2xl font-bold text-white" data-testid="text-guardrail-total-count">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0D1129] border-[#1E2448]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400" data-testid="text-guardrail-toprule-label">Most Triggered</p>
                <p className="text-lg font-bold text-white" data-testid="text-guardrail-toprule">{topRule.replace("_", " ")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0D1129] border-[#1E2448]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Guardrail Logs
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-[180px] bg-[#111633] border-[#1E2448] text-white" data-testid="select-guardrail-agent">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {AGENTS.map(a => (
                    <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ruleFilter} onValueChange={setRuleFilter}>
                <SelectTrigger className="w-[180px] bg-[#111633] border-[#1E2448] text-white" data-testid="select-guardrail-rule">
                  <SelectValue placeholder="All Rules" />
                </SelectTrigger>
                <SelectContent>
                  {ruleTypes.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchLogs} className="border-[#1E2448] text-slate-300" data-testid="button-refresh-guardrails">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No guardrail blocks recorded</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#111633] border border-[#1E2448]" data-testid={`guardrail-log-${log.id}`}>
                  <div className="mt-0.5">
                    <Shield className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-xs ${ruleColors[log.ruleType] || "bg-slate-500/20 text-slate-400"}`} data-testid={`badge-rule-${log.id}`}>
                        {log.ruleType?.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-[#1E2448] text-slate-300" data-testid={`badge-agent-${log.id}`}>
                        {AGENTS.find(a => a.slug === log.agentType)?.name || log.agentType}
                      </Badge>
                      {log.userId && (
                        <span className="text-xs text-slate-500">User #{log.userId}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 mb-1">{log.reason}</p>
                    {log.inputPreview && (
                      <p className="text-xs text-slate-500 truncate">{log.inputPreview}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SupportTicketsPanel({ token }: { token: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support-tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTickets(data);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleUpdateTicket = async (id: number, updates: Record<string, string>) => {
    try {
      await fetch(`/api/admin/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      fetchTickets();
      toast({ title: "Updated", description: "Ticket updated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to update ticket", variant: "destructive" });
    }
  };

  const handleReply = async (id: number) => {
    if (!replyText.trim()) return;
    await handleUpdateTicket(id, { adminReply: replyText.trim(), status: "resolved" });
    setReplyText("");
    setReplyingId(null);
  };

  const filtered = statusFilter === "all" ? tickets : tickets.filter(t => t.status === statusFilter);
  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;

  return (
    <Card className="bg-[#0C1029] border-[#1E2448]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-400" />
              Support Tickets
              {openCount > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 text-xs">{openCount} open</Badge>
              )}
              {inProgressCount > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">{inProgressCount} in progress</Badge>
              )}
            </CardTitle>
            <CardDescription>Manage user-submitted bug reports, issues, and feedback</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-[#111633] border-[#1E2448]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={fetchTickets} className="h-8">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No {statusFilter === "all" ? "" : statusFilter} tickets</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ticket: any) => (
              <div key={ticket.id} className="p-4 rounded-xl border border-[#1E2448] bg-[#111633]" data-testid={`admin-ticket-${ticket.id}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">#{ticket.id}</span>
                      <span className="text-sm font-medium text-white truncate">{ticket.subject}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[10px] ${
                      ticket.priority === "high" ? "bg-red-500/20 text-red-400" :
                      ticket.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>
                      {ticket.priority}
                    </Badge>
                    <Select value={ticket.status} onValueChange={(val) => handleUpdateTicket(ticket.id, { status: val })}>
                      <SelectTrigger className={`h-6 text-[10px] w-[100px] border-0 ${
                        ticket.status === "open" ? "bg-orange-500/20 text-orange-400" :
                        ticket.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                        ticket.status === "resolved" ? "bg-emerald-500/20 text-emerald-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                  <span>User #{ticket.userId}</span>
                  <span>·</span>
                  <span className="capitalize">{ticket.category || "general"}</span>
                  {ticket.agentType && (
                    <>
                      <span>·</span>
                      <span className="capitalize">{ticket.agentType.replace("-", " ")}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                {ticket.adminReply && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-2">
                    <p className="text-[10px] font-medium text-emerald-400 mb-0.5">Your Reply:</p>
                    <p className="text-xs text-emerald-300/80">{ticket.adminReply}</p>
                  </div>
                )}
                {replyingId === ticket.id ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply..."
                      className="flex-1 h-8 text-xs bg-[#0C1029] border-[#1E2448]"
                      data-testid={`input-admin-reply-${ticket.id}`}
                    />
                    <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => handleReply(ticket.id)} data-testid={`button-admin-send-reply-${ticket.id}`}>
                      <Send className="w-3 h-3 mr-1" /> Send
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setReplyingId(null); setReplyText(""); }}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-blue-400 hover:text-blue-300 mt-1"
                    onClick={() => setReplyingId(ticket.id)}
                    data-testid={`button-admin-reply-${ticket.id}`}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" /> Reply
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].slug);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchStats = useCallback(async (agent: string, tkn: string) => {
    try {
      const res = await fetch(`/api/admin/agents/${agent}/stats`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      const data = await res.json();
      setStats(data);
    } catch {}
  }, []);

  const handleAgentChange = (agent: string) => {
    setSelectedAgent(agent);
    if (token) fetchStats(agent, token);
  };

  const handleLogin = (tkn: string) => {
    setToken(tkn);
    fetchStats(selectedAgent, tkn);
  };

  const handleLogout = () => {
    setToken(null);
    setStats(null);
  };

  if (!token) {
    return <AdminLoginForm onLogin={handleLogin} />;
  }

  const showAgentSelector = activeTab === "rag" || activeTab === "fine-tuning" || activeTab === "training-data";

  return (
    <div className="min-h-screen bg-[#0A0E27] pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-admin-title">RentAI 24 Admin</h1>
              <p className="text-gray-400 text-sm">Platform management & monitoring</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-[#1E2448] text-gray-400 hover:text-white hover:border-red-500/50"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>

        {showAgentSelector && (
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="w-full md:w-64">
              <Select value={selectedAgent} onValueChange={handleAgentChange}>
                <SelectTrigger className="bg-[#111633] border-[#1E2448] text-white" data-testid="select-agent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111633] border-[#1E2448]">
                  {AGENTS.map((agent) => (
                    <SelectItem key={agent.slug} value={agent.slug} className="text-white">
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {stats && (
              <div className="flex gap-4 items-center">
                <Badge variant="outline" className="border-[#1E2448] text-gray-300 gap-1">
                  <Database className="w-3 h-3" /> {stats.documentCount} docs
                </Badge>
                <Badge variant="outline" className="border-[#1E2448] text-gray-300 gap-1">
                  <Cpu className="w-3 h-3" /> {stats.fineTuningJobs} jobs
                </Badge>
                {stats.activeModel && (
                  <Badge className="bg-green-900/30 text-green-400 border-green-800 gap-1">
                    <ToggleLeft className="w-3 h-3" /> Fine-tuned
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#111633] border border-[#1E2448] flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="boss-ai" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white" data-testid="tab-boss-ai">
              <Crown className="w-3.5 h-3.5 mr-1" />
              Boss AI
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="tab-overview">
              <BarChart3 className="w-3.5 h-3.5 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white" data-testid="tab-users">
              <Users className="w-3.5 h-3.5 mr-1" />
              Users
            </TabsTrigger>
            <TabsTrigger value="rag" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="tab-rag">
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="training-data" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white" data-testid="tab-training-data">
              <Database className="w-3.5 h-3.5 mr-1" />
              Training Data
            </TabsTrigger>
            <TabsTrigger value="fine-tuning" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white" data-testid="tab-fine-tuning">
              Fine-Tuning
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white" data-testid="tab-messages">
              Messages
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white" data-testid="tab-collaboration">
              <Brain className="w-3.5 h-3.5 mr-1" />
              Collaboration
            </TabsTrigger>
            <TabsTrigger value="spend-analysis" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white" data-testid="tab-spend-analysis">
              <BarChart3 className="w-3.5 h-3.5 mr-1" />
              Spend Analysis
            </TabsTrigger>
            <TabsTrigger value="token-optimization" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600 data-[state=active]:text-white" data-testid="tab-token-optimization">
              <Zap className="w-3.5 h-3.5 mr-1" />
              Token Optimization
            </TabsTrigger>
            <TabsTrigger value="costs" className="data-[state=active]:bg-red-600 data-[state=active]:text-white" data-testid="tab-costs">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Cost Tracker
            </TabsTrigger>
            <TabsTrigger value="support-tickets" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white" data-testid="tab-support-tickets">
              <HelpCircle className="w-3.5 h-3.5 mr-1" />
              Support Tickets
            </TabsTrigger>
            <TabsTrigger value="guardrails" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white" data-testid="tab-guardrails">
              <Shield className="w-3.5 h-3.5 mr-1" />
              Guardrails
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white" data-testid="tab-performance">
              <Activity className="w-3.5 h-3.5 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="conversation-review" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white" data-testid="tab-conversation-review">
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Conv. Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="boss-ai">
            <BossAIPanel token={token} />
          </TabsContent>

          <TabsContent value="overview">
            <OverviewPanel token={token} />
          </TabsContent>

          <TabsContent value="users">
            <UsersPanel token={token} />
          </TabsContent>

          <TabsContent value="rag">
            <DocumentsPanel key={`docs-${selectedAgent}`} agentType={selectedAgent} token={token} />
          </TabsContent>

          <TabsContent value="training-data">
            <TrainingDataPanel key={`td-${selectedAgent}`} agentType={selectedAgent} token={token} />
          </TabsContent>

          <TabsContent value="fine-tuning">
            <FineTuningPanel key={`ft-${selectedAgent}`} agentType={selectedAgent} token={token} />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesPanel token={token} />
          </TabsContent>

          <TabsContent value="collaboration">
            <CollaborationPanel token={token} />
          </TabsContent>

          <TabsContent value="spend-analysis">
            <SpendAnalysisPanel token={token} />
          </TabsContent>

          <TabsContent value="token-optimization">
            <TokenOptimizationPanel token={token} />
          </TabsContent>

          <TabsContent value="costs">
            <CostTrackerPanel token={token} />
          </TabsContent>

          <TabsContent value="support-tickets">
            <SupportTicketsPanel token={token} />
          </TabsContent>

          <TabsContent value="guardrails">
            <GuardrailsPanel token={token} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformancePanel token={token} />
          </TabsContent>

          <TabsContent value="conversation-review">
            <ConversationReviewPanel token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
