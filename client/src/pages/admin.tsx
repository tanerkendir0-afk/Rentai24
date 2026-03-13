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
  Lock, Brain, Database, Zap, MessageSquare, Mail, DollarSign, AlertTriangle,
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
      const res = await fetch(`/api/admin/export-training-data/${agentType}/stats`, { headers });
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
      const res = await fetch(`/api/admin/export-training-data/${agentType}?${params}`, { headers });
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
      const res = await fetch("/api/admin/agent-rules-doc", { headers });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RentAI24-Agent-Rules.txt`;
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
            Download Agent Rules (.txt)
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
            <TabsTrigger value="costs" className="data-[state=active]:bg-red-600 data-[state=active]:text-white" data-testid="tab-costs">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Cost Tracker
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

          <TabsContent value="costs">
            <CostTrackerPanel token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
