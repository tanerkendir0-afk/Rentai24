import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  Plus, Clock, ChevronLeft, MoreVertical, History, FlaskConical, ArrowLeftRight
} from "lucide-react";

const ADMIN_API = `/api/${import.meta.env.VITE_ADMIN_PATH}`;

const AGENTS_DATA = [
  { slug: "customer-support", persona: "Ava", roleKey: "customerSupport" },
  { slug: "sales-sdr", persona: "Rex", roleKey: "salesSdr" },
  { slug: "social-media", persona: "Maya", roleKey: "socialMedia" },
  { slug: "bookkeeping", persona: "Finn", roleKey: "bookkeeping" },
  { slug: "scheduling", persona: "Cal", roleKey: "scheduling" },
  { slug: "hr-recruiting", persona: "Harper", roleKey: "hrRecruiting" },
  { slug: "data-analyst", persona: "DataBot", roleKey: "dataAnalyst" },
  { slug: "ecommerce-ops", persona: "ShopBot", roleKey: "ecommerceOps" },
  { slug: "real-estate", persona: "Reno", roleKey: "realEstate" },
  { slug: "manager", persona: "Manager", roleKey: "manager" },
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
  const { t } = useTranslation("pages");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("adminPage.toast.accessDenied"));
      onLogin(data.token);
    } catch (err: any) {
      toast({ title: t("adminPage.toast.accessDenied"), description: err.message, variant: "destructive" });
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
          <CardTitle className="text-2xl text-white">{t("adminPage.login.title")}</CardTitle>
          <CardDescription className="text-gray-400">{t("adminPage.login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder={t("adminPage.login.passwordPlaceholder")}
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
              {loading ? t("adminPage.login.authenticating") : t("adminPage.login.accessPanel")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/overview`, { headers });
      const d = await res.json();
      setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cards = [
    { label: t("adminPage.overview.totalUsers"), value: data?.totalUsers || 0, icon: Users, color: "text-blue-400" },
    { label: t("adminPage.overview.activeRentals"), value: data?.activeRentals || 0, icon: UserCheck, color: "text-emerald-400" },
    { label: t("adminPage.overview.totalApiCost"), value: `$${data ? parseFloat(data.totalCost).toFixed(4) : "0.00"}`, icon: DollarSign, color: "text-red-400" },
    { label: t("adminPage.overview.apiRequests"), value: data?.totalRequests || 0, icon: Activity, color: "text-violet-400" },
    { label: t("adminPage.overview.totalRentals"), value: data?.totalRentals || 0, icon: ShoppingCart, color: "text-yellow-400" },
    { label: t("adminPage.overview.contactMessages"), value: data?.totalContacts || 0, icon: MessageSquare, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          {t("adminPage.overview.platformOverview")}
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} data-testid="button-refresh-overview">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="bg-[#0A0E27] border-[#1E2448]">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#111633] flex items-center justify-center shrink-0">
                <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-400 truncate">{card.label}</p>
                <p className={`text-lg sm:text-xl font-bold ${card.color}`} data-testid={`text-overview-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
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
  const { t } = useTranslation("pages");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/users`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const agentLabel = (slug: string) => AGENTS_DATA.find(a => a.slug === slug)?.persona || slug;

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
              {t("adminPage.users.registeredUsers", { count: users.length })}
            </CardTitle>
            <CardDescription className="text-gray-400">{t("adminPage.users.description")}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={loading} data-testid="button-refresh-users">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t("adminPage.users.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111633] border-[#1E2448] text-white mb-4"
            data-testid="input-search-users"
          />
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{users.length === 0 ? t("adminPage.users.noUsersYet") : t("adminPage.users.noUsersMatch")}</p>
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
                          {t("adminPage.users.subscribed")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[#1E2448] text-gray-500 text-xs">{t("adminPage.users.free")}</Badge>
                      )}
                      {user.image_credits > 0 && (
                        <Badge variant="outline" className="border-yellow-800 text-yellow-400 text-xs">
                          {user.image_credits} {t("adminPage.users.credits")}
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
                  <p className="text-gray-600 text-xs mt-2">{t("adminPage.users.joined")}: {new Date(user.created_at).toLocaleDateString()}</p>
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
  const { t } = useTranslation("pages");
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
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/documents`, { headers });
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
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: t("adminPage.toast.documentUploaded"), description: t("adminPage.toast.documentUploadedDesc", { name: file.name, chunks: data.chunkCount }) });
      fetchDocs();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/documents/url`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: t("adminPage.toast.urlProcessed"), description: t("adminPage.toast.urlProcessedDesc", { chunks: data.chunkCount }) });
      setUrlInput("");
      fetchDocs();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.urlProcessingFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUrlLoading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      const res = await fetch(`${ADMIN_API}/documents/${docId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(t("adminPage.toast.deleteFailed"));
      toast({ title: t("adminPage.toast.documentDeleted") });
      fetchDocs();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.deleteFailed"), description: err.message, variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t("adminPage.documents.unitB")}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t("adminPage.documents.unitKB")}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("adminPage.documents.unitMB")}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              {t("adminPage.documents.uploadDocument")}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t("adminPage.documents.supportedFormats")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="block">
              <div className="border-2 border-dashed border-[#1E2448] rounded-lg p-8 text-center cursor-pointer hover:border-blue-500/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                <p className="text-gray-400 text-sm">
                  {uploading ? t("adminPage.documents.processing") : t("adminPage.documents.clickToUpload")}
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
              {t("adminPage.documents.addFromUrl")}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t("adminPage.documents.extractDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder={t("adminPage.documents.urlPlaceholder")}
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
              {urlLoading ? t("adminPage.documents.urlProcessing") : t("adminPage.documents.extractIndex")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-green-400" />
              {t("adminPage.documents.knowledgeBase", { count: documents.length })}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchDocs} disabled={loading} data-testid="button-refresh-docs">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("adminPage.documents.noDocuments")}</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`document-item-${doc.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{doc.filename}</p>
                      <p className="text-gray-500 text-xs">
                        {doc.chunkCount} {t("adminPage.documents.chunks")} · {formatSize(doc.fileSize || 0)} · {doc.contentType}
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

interface ProblematicSession {
  session_id: string;
  agent_type: string;
  msg_count: number;
  tool_count: number;
  auth_error_count: number;
  max_response_length: number;
  started_at: string;
}

function PerformancePanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [stats, setStats] = useState<AgentPerfStat[]>([]);
  const [problematic, setProblematic] = useState<ProblematicSession[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/agent-performance`, { headers });
      if (!res.ok) throw new Error(t("adminPage.performance.fetchFailed"));
      const data = await res.json();
      setStats(data.stats || []);
      setProblematic(data.problematicSessions || []);
    } catch (err: any) {
      toast({ title: t("adminPage.toast.error"), description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const agentNameMap: Record<string, string> = {};
  AGENTS_DATA.forEach(a => { agentNameMap[a.slug] = `${a.persona} — ${t("adminPage.agents." + a.roleKey)}`; });

  return (
    <div className="space-y-6">
      <Card className="bg-[#111633] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            {t("adminPage.performance.title")}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t("adminPage.performance.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> {t("adminPage.common.loading")}</div>
          ) : (
            <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-agent-performance">
                <thead>
                  <tr className="border-b border-[#1E2448]">
                    <th className="text-left p-2 text-gray-400">{t("adminPage.performance.agent")}</th>
                    <th className="text-center p-2 text-gray-400">{t("adminPage.performance.sessions")}</th>
                    <th className="text-center p-2 text-gray-400">{t("adminPage.performance.messages")}</th>
                    <th className="text-center p-2 text-gray-400">{t("adminPage.performance.actions")}</th>
                    <th className="text-center p-2 text-gray-400">{t("adminPage.performance.avgTools")}</th>
                    <th className="text-center p-2 text-gray-400">{t("adminPage.performance.error")}</th>
                    <th className="text-center p-2 text-gray-400">{t("adminPage.performance.dup")}</th>
                    <th className="text-center p-2 text-gray-400">{t("adminPage.performance.health")}</th>
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
                          {health === "good" && <Badge className="bg-green-900/30 text-green-400 border-green-800">{t("adminPage.performance.good")}</Badge>}
                          {health === "warning" && <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-800">{t("adminPage.performance.warning")}</Badge>}
                          {health === "critical" && <Badge className="bg-red-900/30 text-red-400 border-red-800">{t("adminPage.performance.critical")}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden space-y-2" data-testid="cards-agent-performance">
              {stats.map(s => {
                const health = s.errorRate > 20 ? "critical" : s.errorRate > 10 ? "warning" : s.dupRate > 10 ? "warning" : "good";
                return (
                  <div key={s.agentType} className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]" data-testid={`card-agent-${s.agentType}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{agentNameMap[s.agentType] || s.agentType}</span>
                      {health === "good" && <Badge className="bg-green-900/30 text-green-400 border-green-800 text-[10px]">{t("adminPage.convReview.good")}</Badge>}
                      {health === "warning" && <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-800 text-[10px]">{t("adminPage.performance.warning")}</Badge>}
                      {health === "critical" && <Badge className="bg-red-900/30 text-red-400 border-red-800 text-[10px]">{t("adminPage.performance.critical")}</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">{t("adminPage.performance.sessions")}</span><p className="text-gray-300">{s.totalSessions}</p></div>
                      <div><span className="text-gray-500">{t("adminPage.performance.messages")}</span><p className="text-gray-300">{s.totalMessages}</p></div>
                      <div><span className="text-gray-500">{t("adminPage.performance.actions")}</span><p className="text-gray-300">{s.totalActions}</p></div>
                      <div><span className="text-gray-500">{t("adminPage.performance.avgTools")}</span><p className="text-cyan-400">{s.avgToolsPerSession}</p></div>
                      <div><span className="text-gray-500">{t("adminPage.performance.error")}</span><p className={s.errorRate > 20 ? "text-red-400" : s.errorRate > 10 ? "text-yellow-400" : "text-green-400"}>{s.errorRate}%</p></div>
                      <div><span className="text-gray-500">{t("adminPage.performance.dup")}</span><p className={s.dupRate > 10 ? "text-orange-400" : "text-green-400"}>{s.dupRate}%</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
              {stats.length === 0 && (
                <p className="text-gray-500 text-center py-8">{t("adminPage.performance.noData")}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {problematic.length > 0 && (
        <Card className="bg-[#111633] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              {t("adminPage.performance.problematicSessions")}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t("adminPage.performance.problematicDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {problematic.map((s: ProblematicSession, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448] gap-2" data-testid={`row-problematic-${i}`}>
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Badge variant="outline" className="border-[#1E2448] text-gray-300 text-[10px] sm:text-xs shrink-0">{(agentNameMap[s.agent_type] || s.agent_type).split(" — ")[0]}</Badge>
                    <span className="text-[10px] sm:text-xs text-gray-400 truncate">{t("adminPage.performance.session")}: {String(s.session_id).slice(0, 8)}...</span>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs">
                    <span className="text-gray-400">{s.msg_count} {t("adminPage.performance.msgs")}</span>
                    <span className={Number(s.tool_count) > 5 ? "text-orange-400" : "text-gray-400"}>{s.tool_count} {t("adminPage.performance.tools")}</span>
                    {Number(s.auth_error_count) > 0 && <span className="text-red-400">{s.auth_error_count} {t("adminPage.performance.authErrs")}</span>}
                    {Number(s.max_response_length) > 3000 && <span className="text-yellow-400">{t("adminPage.performance.longResp")}</span>}
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

interface ConvReviewItem {
  id: number;
  visible_id: string;
  agent_type: string;
  title: string;
  quality_rating: string | null;
  created_at: string;
  message_count: number;
  tool_count: number;
}

interface ConvReviewMessage {
  id: number;
  role: string;
  content: string;
  used_tool: boolean;
  created_at: string;
}

function ConversationReviewPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [conversations, setConversations] = useState<ConvReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConv, setSelectedConv] = useState<ConvReviewItem | null>(null);
  const [messages, setMessages] = useState<ConvReviewMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [agentFilter, setAgentFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const { toast } = useToast();
  const headers = { Authorization: `Bearer ${token}` };

  const agentNameMap: Record<string, string> = {};
  AGENTS_DATA.forEach(a => { agentNameMap[a.slug] = `${a.persona} — ${t("adminPage.agents." + a.roleKey)}`; });

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentFilter !== "all") params.set("agentType", agentFilter);
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      const res = await fetch(`${ADMIN_API}/conversation-review?${params}`, { headers });
      if (!res.ok) throw new Error(t("adminPage.convReview.fetchFailed"));
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      toast({ title: t("adminPage.toast.error"), description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [token, agentFilter, ratingFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const viewMessages = async (conv: any) => {
    setSelectedConv(conv);
    setLoadingMsgs(true);
    try {
      const res = await fetch(`${ADMIN_API}/conversation-review/${conv.visible_id}/messages`, { headers });
      if (!res.ok) throw new Error(t("adminPage.messages.fetchFailed"));
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      toast({ title: t("adminPage.toast.error"), description: err.message, variant: "destructive" });
    } finally { setLoadingMsgs(false); }
  };

  const rateConversation = async (id: number, rating: string | null) => {
    try {
      const res = await fetch(`${ADMIN_API}/conversation-review/${id}/rate`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error(t("adminPage.convReview.rateFailed"));
      setConversations(prev => prev.map(c => c.id === id ? { ...c, quality_rating: rating } : c));
      toast({ title: t("adminPage.toast.rated"), description: t("adminPage.toast.ratedDesc", { rating: rating || t("adminPage.toast.unrated") }) });
    } catch (err: any) {
      toast({ title: t("adminPage.toast.error"), description: err.message, variant: "destructive" });
    }
  };

  if (selectedConv) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => { setSelectedConv(null); setMessages([]); }} className="border-[#1E2448] text-gray-300" data-testid="button-back-to-list">
          <ChevronLeft className="w-4 h-4 mr-1" /> {t("adminPage.convReview.backToList")}
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
                  <CheckCircle className="w-4 h-4 mr-1" /> {t("adminPage.convReview.good")}
                </Button>
                <Button size="sm" variant={selectedConv.quality_rating === "bad" ? "default" : "outline"}
                  className={selectedConv.quality_rating === "bad" ? "bg-red-600 hover:bg-red-700" : "border-red-800 text-red-400 hover:bg-red-900/30"}
                  onClick={() => rateConversation(selectedConv.id, selectedConv.quality_rating === "bad" ? null : "bad")}
                  data-testid="button-rate-bad">
                  <XCircle className="w-4 h-4 mr-1" /> {t("adminPage.convReview.bad")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMsgs ? (
              <div className="flex items-center gap-2 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> {t("adminPage.convReview.loadingMessages")}</div>
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
                      {msg.used_tool && <Badge className="bg-violet-900/30 text-violet-400 border-violet-800 text-[10px]">{t("adminPage.messages.toolUsed")}</Badge>}
                      <span className="text-[10px] text-gray-500">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{msg.content.substring(0, 500)}{msg.content.length > 500 ? "..." : ""}</p>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-gray-500 text-center py-4">{t("adminPage.messages.noMessages")}</p>}
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
            {t("adminPage.convReview.title")}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t("adminPage.convReview.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="bg-[#0A0E27] border-[#1E2448] text-white w-48" data-testid="select-review-agent">
                <SelectValue placeholder={t("adminPage.select.allAgents")} />
              </SelectTrigger>
              <SelectContent className="bg-[#111633] border-[#1E2448]">
                <SelectItem value="all" className="text-white">{t("adminPage.select.allAgents")}</SelectItem>
                {AGENTS_DATA.map(a => (
                  <SelectItem key={a.slug} value={a.slug} className="text-white">{`${a.persona} — ${t("adminPage.agents." + a.roleKey)}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="bg-[#0A0E27] border-[#1E2448] text-white w-40" data-testid="select-review-rating">
                <SelectValue placeholder={t("adminPage.select.allRatings")} />
              </SelectTrigger>
              <SelectContent className="bg-[#111633] border-[#1E2448]">
                <SelectItem value="all" className="text-white">{t("adminPage.select.all")}</SelectItem>
                <SelectItem value="unrated" className="text-white">{t("adminPage.convReview.unrated")}</SelectItem>
                <SelectItem value="good" className="text-white">{t("adminPage.convReview.good")}</SelectItem>
                <SelectItem value="bad" className="text-white">{t("adminPage.convReview.bad")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> {t("adminPage.common.loading")}</div>
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
                    {c.quality_rating === "good" && <Badge className="bg-green-900/30 text-green-400 border-green-800 text-[10px]">{t("adminPage.convReview.good")}</Badge>}
                    {c.quality_rating === "bad" && <Badge className="bg-red-900/30 text-red-400 border-red-800 text-[10px]">{t("adminPage.convReview.bad")}</Badge>}
                    {!c.quality_rating && <Badge variant="outline" className="border-gray-700 text-gray-500 text-[10px]">{t("adminPage.convReview.unrated")}</Badge>}
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
                <p className="text-gray-500 text-center py-8">{t("adminPage.convReview.noConversations")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingDataPanel({ agentType, token }: { agentType: string; token: string }) {
  const { t } = useTranslation("pages");
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
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/training-data-stats`, { headers });
      if (!res.ok) throw new Error(t("adminPage.trainingData.fetchStatsFailed"));
      const data = await res.json();
      if (typeof data.total_conversations === "number") {
        setStats(data);
      }
    } catch (err: any) {
      toast({ title: t("adminPage.toast.statsError"), description: err.message, variant: "destructive" });
      setStats(null);
    } finally { setLoading(false); }
  }, [agentType, token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ minTurns, toolsOnly: String(toolsOnly) });
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/download-training-data?${params}`, { headers });
      if (!res.ok) {
        let errorMsg = t("adminPage.toast.exportFailed");
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
        const qualityInfo = v.qualityStats ? ` ${t("adminPage.toast.quality")}: ${v.qualityStats.avgScore}/100 (${v.qualityStats.filtered} ${t("adminPage.toast.filtered")}).` : "";
        toast({
          title: t("adminPage.toast.trainingDataExported"),
          description: `${v.totalExamples} ${t("adminPage.toast.conversationsExported")}. ${v.meetsMinimum ? `✅ ${t("adminPage.toast.meetsMinimum")}` : `⚠️ ${t("adminPage.toast.belowMinimum")}`}${qualityInfo}`,
        });
      }
    } catch (err: any) {
      toast({ title: t("adminPage.toast.exportFailed"), description: err.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  const handleDownloadRules = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/agent-rules-pdf`, { headers });
      if (!res.ok) throw new Error(t("adminPage.toast.downloadFailed"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RentAI24-Agent-Rules.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("adminPage.toast.rulesDocumentDownloaded"), description: t("adminPage.toast.rulesExported") });
    } catch (err: any) {
      toast({ title: t("adminPage.toast.downloadFailed"), description: err.message, variant: "destructive" });
    }
  };

  const agentName = (() => { const a = AGENTS_DATA.find(x => x.slug === agentType); return a ? `${a.persona} — ${t("adminPage.agents." + a.roleKey)}` : agentType; })();

  return (
    <div className="space-y-6">
      <Card className="bg-[#111633] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            {t("adminPage.trainingData.agentRulesDoc")}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t("adminPage.trainingData.agentRulesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDownloadRules}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            data-testid="button-download-rules"
          >
            <FileText className="w-4 h-4 mr-2" />
            {t("adminPage.trainingData.downloadRules")}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#111633] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            {t("adminPage.trainingData.exportTitle")} — {agentName}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t("adminPage.trainingData.exportDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" /> {t("adminPage.common.loadingStats")}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">{t("adminPage.trainingData.totalConversations")}</p>
                <p className="text-xl font-bold text-white" data-testid="text-total-conversations">{stats.total_conversations}</p>
              </div>
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">{t("adminPage.trainingData.withToolUsage")}</p>
                <p className="text-xl font-bold text-violet-400">{stats.with_tools}</p>
              </div>
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">{t("adminPage.trainingData.avgMessagesConv")}</p>
                <p className="text-xl font-bold text-cyan-400">{stats.avg_messages}</p>
              </div>
              <div className="bg-[#0A0E27] rounded-lg p-3 border border-[#1E2448]">
                <p className="text-xs text-gray-400">{t("adminPage.trainingData.status")}</p>
                <p className="text-xl font-bold">{stats.total_conversations >= 10 ? (
                  <span className="text-green-400">{t("adminPage.trainingData.ready")}</span>
                ) : stats.total_conversations > 0 ? (
                  <span className="text-yellow-400">{t("adminPage.trainingData.needMore")}</span>
                ) : (
                  <span className="text-gray-500">{t("adminPage.trainingData.noDataLabel")}</span>
                )}</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">{t("adminPage.trainingData.minConvTurns")}</label>
              <Select value={minTurns} onValueChange={setMinTurns}>
                <SelectTrigger className="bg-[#0A0E27] border-[#1E2448] text-white" data-testid="select-min-turns">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111633] border-[#1E2448]">
                  <SelectItem value="1" className="text-white">1+ {t("adminPage.trainingData.turns")}</SelectItem>
                  <SelectItem value="2" className="text-white">2+ {t("adminPage.trainingData.turns")}</SelectItem>
                  <SelectItem value="3" className="text-white">3+ {t("adminPage.trainingData.turns")}</SelectItem>
                  <SelectItem value="5" className="text-white">5+ {t("adminPage.trainingData.turns")}</SelectItem>
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
                {t("adminPage.trainingData.toolUsageOnly")}
              </label>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting || !stats || stats.total_conversations === 0}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              data-testid="button-export-training"
            >
              {exporting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {t("adminPage.trainingData.exporting")}</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> {t("adminPage.trainingData.exportJsonl")}</>
              )}
            </Button>
          </div>

          {stats && stats.total_conversations < 10 && stats.total_conversations > 0 && (
            <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-400">
                {t("adminPage.trainingData.collectWarning", { count: stats.total_conversations })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FineTuningPanel({ agentType, token }: { agentType: string; token: string }) {
  const { t } = useTranslation("pages");
  const [jobs, setJobs] = useState<FineTuningJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/fine-tuning`, { headers });
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
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/fine-tuning`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: t("adminPage.toast.fineTuningStarted"), description: t("adminPage.toast.fineTuningStartedDesc", { jobId: data.openaiJobId }) });
      fetchJobs();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.fineTuningFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSync = async (jobId: number) => {
    try {
      const res = await fetch(`${ADMIN_API}/fine-tuning/${jobId}/sync`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: t("adminPage.toast.statusSynced"), description: t("adminPage.toast.statusSyncedDesc", { status: data.status }) });
      fetchJobs();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.syncFailed"), description: err.message, variant: "destructive" });
    }
  };

  const handleActivate = async (jobId: number) => {
    try {
      const res = await fetch(`${ADMIN_API}/fine-tuning/${jobId}/activate`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ agentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: t("adminPage.toast.modelActivated") });
      fetchJobs();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.activationFailed"), description: err.message, variant: "destructive" });
    }
  };

  const handleDeactivate = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/agents/${agentType}/fine-tuning/deactivate`, { method: "POST", headers });
      if (!res.ok) throw new Error(t("adminPage.toast.deactivationFailed"));
      toast({ title: t("adminPage.toast.allModelsDeactivated") });
      fetchJobs();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.deactivationFailed"), description: err.message, variant: "destructive" });
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
            {t("adminPage.fineTuning.startNew")}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t("adminPage.fineTuning.uploadDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="block">
            <div className="border-2 border-dashed border-[#1E2448] rounded-lg p-8 text-center cursor-pointer hover:border-violet-500/50 transition-colors">
              <Cpu className="w-10 h-10 mx-auto text-gray-500 mb-2" />
              <p className="text-gray-400 text-sm">
                {uploading ? t("adminPage.fineTuning.uploading") : t("adminPage.fineTuning.clickToUpload")}
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
              {t("adminPage.fineTuning.jobs", { count: jobs.length })}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDeactivate} className="text-xs border-[#1E2448] text-gray-400" data-testid="button-deactivate-all">
              {t("adminPage.fineTuning.resetToBase")}
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchJobs} disabled={loading} data-testid="button-refresh-jobs">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("adminPage.fineTuning.noJobs")}</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 bg-[#111633] rounded-lg border border-[#1E2448] space-y-3" data-testid={`ft-job-${job.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={statusColor(job.status)}>{job.status}</Badge>
                      {job.isActive && <Badge className="bg-green-900/30 text-green-400 border-green-800">{t("adminPage.fineTuning.active")}</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleSync(job.id)} className="text-blue-400 hover:text-blue-300" data-testid={`button-sync-${job.id}`}>
                        <RefreshCw className="w-4 h-4 mr-1" /> {t("adminPage.fineTuning.sync")}
                      </Button>
                      {job.status === "succeeded" && !job.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => handleActivate(job.id)} className="text-green-400 hover:text-green-300" data-testid={`button-activate-${job.id}`}>
                          <ToggleRight className="w-4 h-4 mr-1" /> {t("adminPage.fineTuning.activate")}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-400"><span className="text-gray-500">{t("adminPage.fineTuning.file")}:</span> {job.trainingFile}</p>
                    <p className="text-gray-400"><span className="text-gray-500">{t("adminPage.fineTuning.jobId")}:</span> {job.openaiJobId || "N/A"}</p>
                    {job.fineTunedModel && (
                      <p className="text-gray-400"><span className="text-gray-500">{t("adminPage.fineTuning.model")}:</span> <span className="text-green-400 font-mono text-xs">{job.fineTunedModel}</span></p>
                    )}
                    {job.error && <p className="text-red-400 text-xs mt-1">{job.error}</p>}
                    <p className="text-gray-500 text-xs">{t("adminPage.fineTuning.created")}: {new Date(job.createdAt).toLocaleString()}</p>
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
  const { t } = useTranslation("pages");
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [msgRes, subRes] = await Promise.all([
        fetch(`${ADMIN_API}/contact-messages`, { headers }),
        fetch(`${ADMIN_API}/newsletter-subscribers`, { headers }),
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
              {t("adminPage.contactMessages.title")} ({messages.length})
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} data-testid="button-refresh-messages">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("adminPage.overview.noMessages")}</p>
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
                    <Badge className="mb-2 bg-blue-900/30 text-blue-400 border-blue-800 text-xs">{t("adminPage.contactMessages.interest")}: {msg.aiWorkerInterest}</Badge>
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
            {t("adminPage.newsletter.title")} ({subscribers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("adminPage.overview.noSubscribers")}</p>
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
  const { t } = useTranslation("pages");
  const [data, setData] = useState<TokenOptData | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/token-optimization`, { headers });
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
          {t("adminPage.tokenOpt.title")}
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} data-testid="button-refresh-token-opt">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.tokenOpt.avgPromptTokens")}</p>
            <p className="text-2xl font-bold text-blue-400" data-testid="text-avg-prompt-tokens">
              {data?.averages?.avg_prompt?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">{t("adminPage.tokenOpt.perMessage")}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.tokenOpt.avgTotalTokens")}</p>
            <p className="text-2xl font-bold text-violet-400" data-testid="text-avg-total-tokens">
              {data?.averages?.avg_total?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">{t("adminPage.tokenOpt.perMessage")}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.tokenOpt.miniUsage")}</p>
            <p className="text-2xl font-bold text-emerald-400" data-testid="text-mini-usage-percent">
              {data?.miniUsagePercent || "0"}%
            </p>
            <p className="text-xs text-gray-500">{t("adminPage.tokenOpt.ofTotalRequests")}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.tokenOpt.estSavings")}</p>
            <p className="text-2xl font-bold text-green-400" data-testid="text-estimated-savings">
              ${data?.estimatedSavingsUsd || "0.00"}
            </p>
            <p className="text-xs text-gray-500">{t("adminPage.tokenOpt.fromMiniRouting")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.tokenOpt.summariesGenerated")}</p>
            <p className="text-2xl font-bold text-orange-400" data-testid="text-summarization-count">
              {data?.summarizationCount?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">{t("adminPage.tokenOpt.conversationSummaries")}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.tokenOpt.cacheHits")}</p>
            <p className="text-2xl font-bold text-cyan-400" data-testid="text-cache-hits">
              {data?.summaryCacheHits?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">{t("adminPage.tokenOpt.reusedSummaries")}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.tokenOpt.cacheHitRate")}</p>
            <p className="text-2xl font-bold text-teal-400" data-testid="text-cache-hit-rate">
              {data && (data.summarizationCount + data.summaryCacheHits) > 0
                ? ((data.summaryCacheHits / (data.summarizationCount + data.summaryCacheHits)) * 100).toFixed(1)
                : "0"}%
            </p>
            <p className="text-xs text-gray-500">{t("adminPage.tokenOpt.summaryReuseRate")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            {t("adminPage.tokenOpt.modelDistribution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.modelDistribution?.length ? (
            <p className="text-gray-500 text-center py-4">{t("adminPage.tokenOpt.noDataYet")}</p>
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
                        {m.count.toLocaleString()} {t("adminPage.tokenOpt.requests")} ({pct}%) · ${parseFloat(m.total_cost).toFixed(4)}
                      </span>
                    </div>
                    <div className="w-full bg-[#111633] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${m.model.includes('mini') ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t("adminPage.tokenOpt.avgPrompt")}: {m.avg_prompt_tokens}</span>
                      <span>{t("adminPage.tokenOpt.avgCompletion")}: {m.avg_completion_tokens}</span>
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
            {t("adminPage.tokenOpt.last7Days")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.dailyStats?.length ? (
            <p className="text-gray-500 text-center py-4">{t("adminPage.tokenOpt.noRecentData")}</p>
          ) : (
            <div className="space-y-2">
              {data.dailyStats.map((d) => (
                <div key={d.date} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg" data-testid={`daily-stat-${d.date}`}>
                  <div>
                    <p className="text-white text-sm font-medium">{new Date(d.date).toLocaleDateString()}</p>
                    <p className="text-gray-500 text-xs">{d.requests} {t("adminPage.tokenOpt.requests")} · {t("adminPage.tokenOpt.avgLabel")} {d.avg_prompt} {t("adminPage.tokenOpt.promptTokens")}</p>
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
  const { t } = useTranslation("pages");
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
        fetch(`${ADMIN_API}/token-usage/totals`, { headers }),
        fetch(`${ADMIN_API}/token-usage/summary`, { headers }),
        fetch(`${ADMIN_API}/token-usage/detailed?minCost=${minCost}`, { headers }),
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

  const agentLabel = (slug: string) => { const a = AGENTS_DATA.find(x => x.slug === slug); return a ? `${a.persona} — ${t("adminPage.agents." + a.roleKey)}` : slug; };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.costs.totalCost")}</p>
            <p className="text-xl font-bold text-red-400" data-testid="text-total-cost">
              ${totals ? parseFloat(totals.total_cost).toFixed(4) : "0.0000"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.costs.totalRequests")}</p>
            <p className="text-xl font-bold text-blue-400" data-testid="text-total-requests">
              {totals?.total_requests || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.costs.totalTokens")}</p>
            <p className="text-xl font-bold text-violet-400" data-testid="text-total-tokens">
              {totals?.total_tokens ? totals.total_tokens.toLocaleString() : "0"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.costs.uniqueUsers")}</p>
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
              {t("adminPage.costs.tokenCostBreakdown")}
            </CardTitle>
            <CardDescription className="text-gray-400">{t("adminPage.costs.description")}</CardDescription>
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
              {t("adminPage.costs.summary")}
            </Button>
            <Button
              variant={view === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("detailed")}
              className={view === "detailed" ? "bg-violet-600 text-white" : "border-[#1E2448] text-gray-300"}
              data-testid="button-view-detailed"
            >
              {t("adminPage.costs.detailed")}
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
                <p className="text-gray-500 text-sm text-center py-8">{t("adminPage.costs.noData")}</p>
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
                  {showExpensive ? t("adminPage.tokenOpt.noExpensiveRequests") : t("adminPage.tokenOpt.noTokenData")}
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
                      <span className="text-xs text-gray-500">{t("adminPage.spend.in")}: {row.prompt_tokens.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">{t("adminPage.spend.out")}: {row.completion_tokens.toLocaleString()}</span>
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
  const { t } = useTranslation("pages");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CollaborationResult | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(AGENTS_DATA.map(a => a.slug));
  const [progress, setProgress] = useState(0);
  const [sessions, setSessions] = useState<SavedCollabSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [collabProvider, setCollabProvider] = useState<string>("openai");
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_API}/collaboration-sessions`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${ADMIN_API}/collaboration-sessions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        toast({ title: t("adminPage.toast.deleted"), description: t("adminPage.toast.sessionRemoved") });
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
      toast({ title: t("adminPage.toast.error"), description: t("adminPage.toast.selectAtLeastOneAgent"), variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setProgress(10);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 8, 90));
    }, 1000);

    try {
      const res = await fetch(`${ADMIN_API}/agent-collaboration`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), selectedAgents, provider: collabProvider }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("adminPage.collaboration.failed"));
      }
      const data: CollaborationResult = await res.json();
      setResult(data);
      setProgress(100);
      fetchSessions();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({ title: t("adminPage.toast.error"), description: errMsg, variant: "destructive" });
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
    "manager": "from-amber-500 to-amber-600",
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
    "manager": "🧠",
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
              {t("adminPage.collaboration.title")}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={`border-[#1E2448] ${showHistory ? "bg-indigo-600 text-white" : "text-gray-300"}`}
              data-testid="button-collab-history"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              {t("adminPage.collaboration.history")} ({sessions.length})
            </Button>
          </div>
          <CardDescription className="text-gray-300">
            {t("adminPage.collaboration.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t("adminPage.collaboration.selectAgents")}</label>
            <div className="flex flex-wrap gap-2">
              {AGENTS_DATA.map(agent => (
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
                  {agentIcons[agent.slug]} {agent.persona}
                </button>
              ))}
              <button
                onClick={() => setSelectedAgents(selectedAgents.length === AGENTS_DATA.length ? [] : AGENTS_DATA.map(a => a.slug))}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#0A0E27] text-gray-400 hover:text-white border border-[#1E2448]"
                data-testid="toggle-all-agents"
              >
                {selectedAgents.length === AGENTS_DATA.length ? t("adminPage.collaboration.deselectAll") : t("adminPage.collaboration.selectAll")}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm text-gray-400">{t("adminPage.collaboration.aiProvider")}:</label>
            <Select value={collabProvider} onValueChange={setCollabProvider}>
              <SelectTrigger className="w-[200px] bg-[#0A0E27] border-[#1E2448] text-white text-xs h-8" data-testid="select-collab-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">{t("adminPage.select.openaiGpt4o")}</SelectItem>
                <SelectItem value="anthropic">{t("adminPage.select.anthropicClaude")}</SelectItem>
              </SelectContent>
            </Select>
            <Badge className={`text-xs ${collabProvider === "anthropic" ? "bg-violet-900/30 text-violet-400 border-violet-800" : "bg-green-900/30 text-green-400 border-green-800"}`}>
              {collabProvider === "anthropic" ? "Claude Haiku + Sonnet" : "GPT-4o-mini + GPT-4o"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t("adminPage.collaboration.topicPlaceholder")}
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
              {loading ? t("adminPage.collaboration.thinking") : t("adminPage.collaboration.brainstorm")}
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
              {t("adminPage.collaboration.pastSessions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-6">{t("adminPage.collaboration.noSessions")}</p>
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
                  {t("adminPage.bossAi.unifiedSynthesis")}
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
                      {(() => { const a = AGENTS_DATA.find(x => x.slug === agent.slug); return a ? `${a.persona} — ${t("adminPage.agents." + a.roleKey)}` : agent.name; })()}
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

interface SpendByProvider {
  ai_provider: string;
  total_requests: number;
  total_cost: string;
  total_tokens: string;
  prompt_tokens: string;
  completion_tokens: string;
  unique_users: number;
  avg_cost_per_request: string;
}

interface SpendProviderByAgent {
  ai_provider: string;
  agent_type: string;
  total_requests: number;
  total_cost: string;
  total_tokens: string;
  avg_cost_per_request: string;
}

interface SpendData {
  overall: SpendOverall;
  perAgent: SpendPerAgent[];
  byModel: SpendByModel[];
  byOperation: SpendByOp[];
  dailyTrend: SpendDaily[];
  perAgentDaily: { agent_type: string; day: string; requests: number; cost: string }[];
  collaboration: { total_requests: number; total_cost: string; total_tokens: string };
  byProvider: SpendByProvider[];
  providerByAgent: SpendProviderByAgent[];
  providerDaily: { ai_provider: string; day: string; requests: number; cost: string }[];
}

function SpendAnalysisPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [data, setData] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/spend-analysis`, { headers });
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

  const agentLabel = (slug: string) => { const a = AGENTS_DATA.find(x => x.slug === slug); return a ? `${a.persona} — ${t("adminPage.agents." + a.roleKey)}` : slug; };

  const maxAgentCost = data?.perAgent.length
    ? Math.max(...data.perAgent.map(a => parseFloat(a.total_cost)))
    : 1;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> {t("adminPage.spend.loading")}
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
            <p className="text-xs text-gray-400">{t("adminPage.spend.totalSpend")}</p>
            <p className="text-2xl font-bold text-red-400" data-testid="text-spend-total">${totalCost.toFixed(4)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.overall.total_requests} requests</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.spend.totalTokens")}</p>
            <p className="text-2xl font-bold text-violet-400" data-testid="text-spend-tokens">{parseInt(data.overall.total_tokens).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{t("adminPage.spend.prompt")}: {parseInt(data.overall.total_prompt_tokens).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.spend.avgCostRequest")}</p>
            <p className="text-2xl font-bold text-blue-400" data-testid="text-spend-avg">${parseFloat(data.overall.avg_cost_per_request).toFixed(4)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.overall.unique_users} users</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400">{t("adminPage.spend.collaborationCost")}</p>
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
              {t("adminPage.spend.perAgentBreakdown")}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={fetchData} className="border-[#1E2448] text-gray-300" data-testid="button-refresh-spend">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t("adminPage.common.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.perAgent.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("adminPage.spend.noUsageData")}</p>
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
                    <span>{t("adminPage.spend.avg")}: ${parseFloat(agent.avg_cost_per_request).toFixed(4)}/{t("adminPage.spend.req")}</span>
                    <span>{t("adminPage.spend.max")}: ${parseFloat(agent.max_single_cost).toFixed(4)}</span>
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
              <Cpu className="w-4 h-4 text-cyan-400" /> {t("adminPage.spend.costByModel")}
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
              <Activity className="w-4 h-4 text-yellow-400" /> {t("adminPage.spend.costByOperation")}
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
            <Clock className="w-4 h-4 text-blue-400" /> {t("adminPage.spend.dailyTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyTrend.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t("adminPage.spend.noDailyData")}</p>
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

      {data.byProvider && data.byProvider.length > 0 && (
        <Card className="bg-gradient-to-r from-violet-900/20 to-blue-900/20 border-violet-500/30">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-violet-400" />
              {t("adminPage.spend.providerComparison")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.byProvider.map((p) => {
                const provCost = parseFloat(p.total_cost);
                const provPct = totalCost > 0 ? ((provCost / totalCost) * 100).toFixed(1) : "0";
                const isAnthropic = p.ai_provider === "anthropic";
                return (
                  <div key={p.ai_provider} className={`p-4 rounded-lg border ${isAnthropic ? "bg-violet-900/20 border-violet-700/50" : "bg-green-900/20 border-green-700/50"}`} data-testid={`provider-card-${p.ai_provider}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${isAnthropic ? "bg-violet-900/50 text-violet-300 border-violet-700" : "bg-green-900/50 text-green-300 border-green-700"}`}>
                          {isAnthropic ? "Anthropic" : "OpenAI"}
                        </Badge>
                        <span className="text-xs text-gray-400">{provPct}% of total</span>
                      </div>
                      <span className={`text-lg font-bold ${isAnthropic ? "text-violet-400" : "text-green-400"}`}>${provCost.toFixed(4)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/20 rounded p-2">
                        <p className="text-gray-500">{t("adminPage.spend.requests")}</p>
                        <p className="text-white font-semibold">{p.total_requests.toLocaleString()}</p>
                      </div>
                      <div className="bg-black/20 rounded p-2">
                        <p className="text-gray-500">{t("adminPage.spend.tokens")}</p>
                        <p className="text-white font-semibold">{parseInt(p.total_tokens).toLocaleString()}</p>
                      </div>
                      <div className="bg-black/20 rounded p-2">
                        <p className="text-gray-500">{t("adminPage.spend.avgRequest")}</p>
                        <p className="text-white font-semibold">${parseFloat(p.avg_cost_per_request).toFixed(4)}</p>
                      </div>
                      <div className="bg-black/20 rounded p-2">
                        <p className="text-gray-500">{t("adminPage.spend.users")}</p>
                        <p className="text-white font-semibold">{p.unique_users}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {data.providerByAgent && data.providerByAgent.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">{t("adminPage.spend.providerAgentDetail")}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1E2448]">
                        <th className="text-left text-gray-400 pb-2 pr-4">{t("adminPage.spend.agentHeader")}</th>
                        <th className="text-center text-green-400 pb-2 px-2">{t("adminPage.spend.openaiCost")}</th>
                        <th className="text-center text-green-400 pb-2 px-2">{t("adminPage.spend.openaiReqs")}</th>
                        <th className="text-center text-violet-400 pb-2 px-2">{t("adminPage.spend.anthropicCost")}</th>
                        <th className="text-center text-violet-400 pb-2 px-2">{t("adminPage.spend.anthropicReqs")}</th>
                        <th className="text-center text-yellow-400 pb-2 px-2">{t("adminPage.spend.difference")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const agentMap: Record<string, { openai: SpendProviderByAgent | null; anthropic: SpendProviderByAgent | null }> = {};
                        data.providerByAgent.forEach((r) => {
                          if (!agentMap[r.agent_type]) agentMap[r.agent_type] = { openai: null, anthropic: null };
                          agentMap[r.agent_type][r.ai_provider as "openai" | "anthropic"] = r;
                        });
                        return Object.entries(agentMap).map(([agentType, providers]) => {
                          const oaiCost = providers.openai ? parseFloat(providers.openai.total_cost) : 0;
                          const antCost = providers.anthropic ? parseFloat(providers.anthropic.total_cost) : 0;
                          const diff = antCost - oaiCost;
                          const diffPct = oaiCost > 0 ? ((diff / oaiCost) * 100).toFixed(0) : "N/A";
                          return (
                            <tr key={agentType} className="border-b border-[#1E2448]/50" data-testid={`provider-agent-row-${agentType}`}>
                              <td className="py-2 pr-4 text-white font-medium">{agentLabel(agentType)}</td>
                              <td className="py-2 px-2 text-center text-green-300">${oaiCost.toFixed(4)}</td>
                              <td className="py-2 px-2 text-center text-gray-400">{providers.openai?.total_requests || 0}</td>
                              <td className="py-2 px-2 text-center text-violet-300">${antCost.toFixed(4)}</td>
                              <td className="py-2 px-2 text-center text-gray-400">{providers.anthropic?.total_requests || 0}</td>
                              <td className={`py-2 px-2 text-center font-semibold ${diff > 0 ? "text-red-400" : diff < 0 ? "text-green-400" : "text-gray-400"}`}>
                                {diff !== 0 ? `${diff > 0 ? "+" : ""}${diffPct}%` : "-"}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BossAIPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [messages, setMessages] = useState<BossMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<BossConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingTopic, setEditingTopic] = useState<number | null>(null);
  const [editTopicValue, setEditTopicValue] = useState("");
  const [savingConv, setSavingConv] = useState(false);
  const [bossProvider, setBossProvider] = useState<string>("openai");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_API}/boss-conversations`, {
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
        const res = await fetch(`${ADMIN_API}/boss-conversations/${convId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: msgs, toolsUsed: hasTools }),
        });
        if (res.ok) fetchConversations();
        return convId;
      } else {
        const topic = autoTopic || msgs.find(m => m.role === "user")?.content.slice(0, 80) || t("adminPage.bossAi.newConversation");
        const res = await fetch(`${ADMIN_API}/boss-conversations`, {
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
      const res = await fetch(`${ADMIN_API}/boss-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: messages,
          provider: bossProvider,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t("adminPage.bossAi.requestFailed") }));
        throw new Error(err.error || t("adminPage.bossAi.unavailable"));
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
      toast({ title: t("adminPage.toast.bossAiError"), description: err.message, variant: "destructive" });
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
      await fetch(`${ADMIN_API}/boss-conversations/${id}`, {
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
      await fetch(`${ADMIN_API}/boss-conversations/${id}`, {
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
            {t("adminPage.bossAi.platformCommander")}
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
              {t("adminPage.bossAi.new")}
            </Button>
          </div>
        </div>
        <CardDescription className="text-gray-400">
          {activeConv
            ? <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                {activeConv.topic}
                <span className="text-gray-500 text-xs">({activeConv.messageCount} {t("adminPage.bossAi.messages")})</span>
              </span>
            : t("adminPage.bossAi.description")
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {showHistory ? (
          <div className="h-[500px] flex flex-col">
            <div className="px-4 py-2 border-b border-[#1E2448] flex items-center justify-between">
              <span className="text-sm font-medium text-white">{t("adminPage.bossAi.conversationHistory")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white h-7"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                {t("adminPage.bossAi.backToChat")}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" data-testid="boss-conversation-list">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <History className="w-10 h-10 text-gray-600" />
                  <p className="text-gray-500 text-sm">{t("adminPage.bossAi.noConversations")}</p>
                  <p className="text-gray-600 text-xs">{t("adminPage.bossAi.startChatting")}</p>
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
                    <p className="text-white font-medium text-lg">{t("adminPage.tabs.bossAi")}</p>
                    <p className="text-gray-400 text-sm max-w-md mt-1">
                      {t("adminPage.bossAi.welcomeMessage")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {[
                      t("adminPage.bossAi.q1"),
                      t("adminPage.bossAi.q2"),
                      t("adminPage.bossAi.q3"),
                      t("adminPage.bossAi.q4"),
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
                        <span className="text-xs font-medium text-amber-400">{t("adminPage.bossAi.boss")}</span>
                        {msg.toolsUsed && (
                          <Badge className="bg-violet-900/30 text-violet-400 border-violet-800 text-[10px] px-1.5 py-0 ml-1">
                            <Database className="w-2.5 h-2.5 mr-0.5" /> {t("adminPage.spend.liveData")}
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
                      <span className="text-sm text-gray-400">{t("adminPage.bossAi.analyzing")}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[#1E2448] px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">{t("adminPage.bossAi.provider")}:</label>
                <Select value={bossProvider} onValueChange={setBossProvider}>
                  <SelectTrigger className="w-[160px] bg-[#0A0E27] border-[#1E2448] text-white text-xs h-7" data-testid="select-boss-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">{t("adminPage.select.openaiGpt4o")}</SelectItem>
                    <SelectItem value="anthropic">{t("adminPage.select.anthropicClaude")}</SelectItem>
                  </SelectContent>
                </Select>
                <Badge className={`text-[10px] ${bossProvider === "anthropic" ? "bg-violet-900/30 text-violet-400" : "bg-green-900/30 text-green-400"}`}>
                  {bossProvider === "anthropic" ? "Claude Sonnet 4" : "GPT-4o"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("adminPage.bossAi.askPlaceholder")}
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
  const { t } = useTranslation("pages");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (agentFilter !== "all") params.set("agentType", agentFilter);
      if (ruleFilter !== "all") params.set("ruleType", ruleFilter);
      if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
      if (dateTo) params.set("to", new Date(dateTo + "T23:59:59").toISOString());
      const res = await fetch(`${ADMIN_API}/guardrail-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLogs(await res.json());
    } catch { } finally { setLoading(false); }
  }, [token, agentFilter, ruleFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const ruleTypes = [
    { value: "all", label: t("adminPage.guardrails.allRules") },
    { value: "prompt_injection", label: t("adminPage.guardrails.promptInjection") },
    { value: "blocked_topic", label: t("adminPage.guardrails.blockedTopic") },
    { value: "input_length", label: t("adminPage.guardrails.inputLength") },
    { value: "rate_limit", label: t("adminPage.guardrails.rateLimit") },
    { value: "daily_limit", label: t("adminPage.guardrails.dailyLimit") },
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
                <p className="text-xs text-slate-400" data-testid="text-guardrail-today-label">{t("adminPage.guardrails.todaysBlocks")}</p>
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
                <p className="text-xs text-slate-400" data-testid="text-guardrail-total-label">{t("adminPage.guardrails.totalBlocks")}</p>
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
                <p className="text-xs text-slate-400" data-testid="text-guardrail-toprule-label">{t("adminPage.guardrails.mostTriggered")}</p>
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
              {t("adminPage.guardrails.logs")}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-[180px] bg-[#111633] border-[#1E2448] text-white" data-testid="select-guardrail-agent">
                  <SelectValue placeholder={t("adminPage.select.allAgents")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("adminPage.select.allAgents")}</SelectItem>
                  {AGENTS_DATA.map(a => (
                    <SelectItem key={a.slug} value={a.slug}>{`${a.persona} — ${t("adminPage.agents." + a.roleKey)}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ruleFilter} onValueChange={setRuleFilter}>
                <SelectTrigger className="w-[180px] bg-[#111633] border-[#1E2448] text-white" data-testid="select-guardrail-rule">
                  <SelectValue placeholder={t("adminPage.select.allRules")} />
                </SelectTrigger>
                <SelectContent>
                  {ruleTypes.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 px-2 rounded-md bg-[#111633] border border-[#1E2448] text-white text-sm"
                data-testid="input-guardrail-date-from"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9 px-2 rounded-md bg-[#111633] border border-[#1E2448] text-white text-sm"
                data-testid="input-guardrail-date-to"
              />
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
              <p>{t("adminPage.guardrails.noBlocks")}</p>
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
                        {(() => { const a = AGENTS_DATA.find(x => x.slug === log.agentType); return a ? `${a.persona} — ${t("adminPage.agents." + a.roleKey)}` : log.agentType; })()}
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
  const { t } = useTranslation("pages");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_API}/support-tickets`, {
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
      await fetch(`${ADMIN_API}/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      fetchTickets();
      toast({ title: t("adminPage.toast.updated"), description: t("adminPage.toast.ticketUpdated") });
    } catch {
      toast({ title: t("adminPage.toast.error"), description: t("adminPage.toast.failedUpdateTicket"), variant: "destructive" });
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
              {t("adminPage.tickets.title")}
              {openCount > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 text-xs">{openCount} {t("adminPage.tickets.open")}</Badge>
              )}
              {inProgressCount > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 text-xs">{inProgressCount} {t("adminPage.tickets.inProgress")}</Badge>
              )}
            </CardTitle>
            <CardDescription>{t("adminPage.tickets.description")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-[#111633] border-[#1E2448]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("adminPage.select.allTickets")}</SelectItem>
                <SelectItem value="open">{t("adminPage.select.open")}</SelectItem>
                <SelectItem value="in_progress">{t("adminPage.select.inProgress")}</SelectItem>
                <SelectItem value="resolved">{t("adminPage.select.resolved")}</SelectItem>
                <SelectItem value="closed">{t("adminPage.select.closed")}</SelectItem>
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
          <div className="text-center py-8 text-muted-foreground">{t("adminPage.common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>{t("adminPage.tickets.noTickets")}</p>
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
                      {t("adminPage.tickets." + ticket.priority)}
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
                        <SelectItem value="open">{t("adminPage.select.open")}</SelectItem>
                        <SelectItem value="in_progress">{t("adminPage.select.inProgress")}</SelectItem>
                        <SelectItem value="resolved">{t("adminPage.select.resolved")}</SelectItem>
                        <SelectItem value="closed">{t("adminPage.select.closed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                  <span>{t("adminPage.tickets.userHash", { id: ticket.userId })}</span>
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
                    <p className="text-[10px] font-medium text-emerald-400 mb-0.5">{t("adminPage.tickets.yourReply")}:</p>
                    <p className="text-xs text-emerald-300/80">{ticket.adminReply}</p>
                  </div>
                )}
                {replyingId === ticket.id ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t("adminPage.tickets.replyPlaceholder")}
                      className="flex-1 h-8 text-xs bg-[#0C1029] border-[#1E2448]"
                      data-testid={`input-admin-reply-${ticket.id}`}
                    />
                    <Button size="sm" className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => handleReply(ticket.id)} data-testid={`button-admin-send-reply-${ticket.id}`}>
                      <Send className="w-3 h-3 mr-1" /> {t("adminPage.tickets.send")}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setReplyingId(null); setReplyText(""); }}>
                      {t("adminPage.common.cancel")}
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
                    <MessageSquare className="w-3 h-3 mr-1" /> {t("adminPage.tickets.reply")}
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

interface SecurityEventItem {
  id: number;
  ipAddress: string;
  eventType: string;
  endpoint: string | null;
  userAgent: string | null;
  userId: number | null;
  detail: string | null;
  createdAt: string;
}

interface SecurityReportData {
  events: SecurityEventItem[];
  typeCounts: { eventType: string; count: number }[];
  topIps: { ipAddress: string; count: number; lastSeen: string }[];
  hourlyStats: { hour: string; count: number }[];
  totalCount: number;
  period: string;
}

function SecurityReportPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [data, setData] = useState<SecurityReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("24h");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/security-events?period=${period}`, { headers });
      const d = await res.json();
      setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const eventTypeLabels: Record<string, { label: string; color: string }> = {
    distillation_attempt: { label: t("adminPage.security.distillationAttempt"), color: "text-red-400 bg-red-900/30 border-red-800" },
    guardrail_block: { label: t("adminPage.security.guardrailBlock"), color: "text-yellow-400 bg-yellow-900/30 border-yellow-800" },
    rate_limit: { label: t("adminPage.guardrails.rateLimit"), color: "text-orange-400 bg-orange-900/30 border-orange-800" },
    suspicious_pattern: { label: "Suspicious Pattern", color: "text-purple-400 bg-purple-900/30 border-purple-800" },
  };

  const maxHourlyCount = data?.hourlyStats ? Math.max(...data.hourlyStats.map(h => h.count), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          {t("adminPage.security.title")}
        </h3>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px] bg-[#0A0E27] border-[#1E2448] text-white" data-testid="select-security-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{t("adminPage.select.last24h")}</SelectItem>
              <SelectItem value="7d">{t("adminPage.select.last7d")}</SelectItem>
              <SelectItem value="30d">{t("adminPage.select.last30d")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} data-testid="button-refresh-security">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(eventTypeLabels).map(([type, cfg]) => {
          const count = data?.typeCounts.find(t => t.eventType === type)?.count || 0;
          return (
            <Card key={type} className="bg-[#0A0E27] border-[#1E2448]">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400">{cfg.label}</p>
                <p className={`text-2xl font-bold ${cfg.color.split(" ")[0]}`} data-testid={`text-security-count-${type}`}>
                  {count}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data?.hourlyStats && data.hourlyStats.length > 0 && (
        <Card className="bg-[#0A0E27] border-[#1E2448]">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              {t("adminPage.security.eventsOverTime")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32 overflow-x-auto">
              {data.hourlyStats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center min-w-[24px]" title={`${stat.hour}: ${stat.count} events`}>
                  <div
                    className="w-5 bg-gradient-to-t from-red-500 to-orange-400 rounded-t"
                    style={{ height: `${(stat.count / maxHourlyCount) * 100}%`, minHeight: stat.count > 0 ? "4px" : "0px" }}
                  />
                  <span className="text-[9px] text-gray-500 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                    {stat.hour.split(" ")[1] || stat.hour}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-400" />
            Top Suspicious IPs ({data?.topIps?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.topIps || data.topIps.length === 0 ? (
            <p className="text-gray-500 text-center py-6">{t("adminPage.security.noSuspicious")}</p>
          ) : (
            <div className="space-y-2">
              {data.topIps.map((ip, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`security-ip-row-${i}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-mono">{ip.ipAddress}</p>
                      <p className="text-gray-500 text-xs">Last seen: {new Date(ip.lastSeen).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge className="bg-red-900/30 text-red-400 border-red-800">
                    {ip.count} events
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Recent Security Events ({data?.totalCount || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.events || data.events.length === 0 ? (
            <p className="text-gray-500 text-center py-6">{t("adminPage.security.noEvents")}</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {data.events.slice(0, 50).map((evt) => {
                const cfg = eventTypeLabels[evt.eventType] || { label: evt.eventType, color: "text-gray-400 bg-gray-900/30 border-gray-700" };
                return (
                  <div key={evt.id} className="p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`security-event-${evt.id}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        <span className="text-gray-500 text-xs font-mono">{evt.ipAddress}</span>
                      </div>
                      <span className="text-gray-500 text-xs">{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                    {evt.endpoint && <p className="text-gray-400 text-xs">Endpoint: {evt.endpoint}</p>}
                    {evt.detail && <p className="text-gray-300 text-xs mt-1">{evt.detail}</p>}
                    {evt.userAgent && <p className="text-gray-600 text-xs mt-1 truncate" title={evt.userAgent}>UA: {evt.userAgent}</p>}
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

function PackageManagementPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState("");
  const [editUsed, setEditUsed] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const { toast } = useToast();

  const PLANS = [
    {
      id: "starter",
      name: t("adminPage.limits.starter"),
      price: "$49/ay",
      messages: 100,
      features: [t("adminPage.packages.basicSupport"), t("adminPage.packages.standardResponseTime"), t("adminPage.packages.singleAgentAccess")],
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "professional",
      name: t("adminPage.limits.professional"),
      price: "$39/ay",
      messages: 500,
      features: [t("adminPage.packages.prioritySupport"), t("adminPage.packages.fastResponses"), t("adminPage.packages.allToolsOpen"), t("adminPage.packages.advancedAnalytics")],
      color: "from-violet-500 to-purple-600",
      popular: true,
    },
    {
      id: "enterprise",
      name: t("adminPage.limits.enterprise"),
      price: t("adminPage.packages.customPrice"),
      messages: 5000,
      features: [t("adminPage.packages.customSupport"), t("adminPage.packages.customIntegrations"), t("adminPage.packages.slaGuarantee"), t("adminPage.packages.apiAccess"), t("adminPage.packages.unlimitedAgents")],
      color: "from-amber-500 to-orange-600",
    },
  ];

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/all-rentals", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRentals(await res.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchRentals(); }, [fetchRentals]);

  const startEdit = (rental: any) => {
    setEditingId(rental.id);
    setEditLimit(String(rental.messages_limit));
    setEditUsed(String(rental.messages_used));
    setEditPlan(rental.plan);
  };

  const saveEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messagesLimit: editLimit, messagesUsed: editUsed, plan: editPlan }),
      });
      if (res.ok) {
        toast({ title: t("adminPage.toast.updated"), description: t("adminPage.toast.rentalUpdated") });
        setEditingId(null);
        fetchRentals();
      } else {
        const err = await res.json();
        toast({ title: t("adminPage.toast.error"), description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t("adminPage.toast.error"), description: t("adminPage.toast.updateFailed"), variant: "destructive" });
    }
  };

  const agentLabel = (slug: string) => {
    const map: Record<string, string> = {
      "customer-support": "Ava", "sales-sdr": "Rex", "social-media": "Maya",
      "bookkeeping": "Finn", "scheduling": "Cal", "hr-recruiting": "Harper",
      "data-analyst": "DataBot", "ecommerce-ops": "ShopBot", "real-estate": "Reno",
      "manager": t("adminPage.limits.manager"),
    };
    return map[slug] || slug;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-violet-900/50 to-purple-900/50 border-violet-500/30">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-400" />
            {t("adminPage.packages.title")}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {t("adminPage.packages.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative p-5 rounded-xl border ${plan.popular ? "border-violet-500/50 bg-violet-900/20" : "border-[#1E2448] bg-[#0A0E27]"}`}
                data-testid={`plan-card-${plan.id}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 right-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs">
                    {t("adminPage.packages.popular")}
                  </Badge>
                )}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${plan.color} flex items-center justify-center mb-3`}>
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-2xl font-bold text-white mt-1">{plan.price}</p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-gray-300">{plan.messages.toLocaleString()} mesaj/ay</span>
                  </div>
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#1E2448]">
                  <p className="text-xs text-gray-500">{t("adminPage.limits.planRules")}:</p>
                  <ul className="text-xs text-gray-400 mt-1 space-y-0.5">
                    <li>• {t("adminPage.limits.monthlyMsgLimit", { count: plan.messages.toLocaleString() } as Record<string, string>)}</li>
                    <li>• {t("adminPage.limits.limitExceeded")}</li>
                    <li>• {t("adminPage.limits.monthlyReset")}</li>
                    {plan.id === "professional" && <li>• {t("adminPage.limits.allAgentToolsActive")}</li>}
                    {plan.id === "enterprise" && <li>• {t("adminPage.limits.customSlaIntegration")}</li>}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              {t("adminPage.limits.activeRentalMgmt")}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t("adminPage.limits.editUsersLimits")}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchRentals} disabled={loading} data-testid="button-refresh-rentals">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {rentals.length === 0 ? (
            <p className="text-gray-500 text-center py-6">{t("adminPage.limits.noActiveRental")}</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {rentals.map((rental) => (
                <div
                  key={rental.id}
                  className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]"
                  data-testid={`rental-row-${rental.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{agentLabel(rental.agent_type)}</span>
                        <Badge className={`text-xs ${rental.status === "active" ? "bg-green-900/30 text-green-400 border-green-800" : "bg-gray-900/30 text-gray-500 border-gray-700"}`}>
                          {rental.status}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{rental.full_name || rental.email}</p>
                      <p className="text-gray-500 text-xs">{rental.email}</p>
                    </div>
                    {editingId === rental.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(rental.id)} className="bg-green-600 hover:bg-green-700 text-white" data-testid={`button-save-rental-${rental.id}`}>
                          <CheckCircle className="w-3 h-3 mr-1" /> {t("adminPage.limits.save")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-gray-400">
                          {t("adminPage.limits.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(rental)} className="border-[#1E2448] text-gray-300" data-testid={`button-edit-rental-${rental.id}`}>
                        {t("adminPage.limits.edit")}
                      </Button>
                    )}
                  </div>
                  {editingId === rental.id ? (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">{t("adminPage.limits.plan")}</label>
                        <Select value={editPlan} onValueChange={setEditPlan}>
                          <SelectTrigger className="bg-[#0A0E27] border-[#1E2448] text-white h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111633] border-[#1E2448]">
                            <SelectItem value="starter" className="text-white">{t("adminPage.limits.starter")}</SelectItem>
                            <SelectItem value="professional" className="text-white">{t("adminPage.limits.professional")}</SelectItem>
                            <SelectItem value="enterprise" className="text-white">{t("adminPage.limits.enterprise")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">{t("adminPage.limits.messageLimit")}</label>
                        <Input
                          type="number"
                          value={editLimit}
                          onChange={(e) => setEditLimit(e.target.value)}
                          className="bg-[#0A0E27] border-[#1E2448] text-white h-8 text-sm"
                          data-testid={`input-limit-${rental.id}`}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">{t("adminPage.limits.used")}</label>
                        <Input
                          type="number"
                          value={editUsed}
                          onChange={(e) => setEditUsed(e.target.value)}
                          className="bg-[#0A0E27] border-[#1E2448] text-white h-8 text-sm"
                          data-testid={`input-used-${rental.id}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-4">
                      <Badge variant="outline" className="border-[#1E2448] text-gray-300 text-xs capitalize">{rental.plan}</Badge>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{rental.messages_used}/{rental.messages_limit} {t("adminPage.limits.messages")}</span>
                          <span>{Math.round((rental.messages_used / rental.messages_limit) * 100)}%</span>
                        </div>
                        <div className="w-full bg-[#0A0E27] rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${(rental.messages_used / rental.messages_limit) > 0.8 ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ width: `${Math.min((rental.messages_used / rental.messages_limit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {rental.started_at ? new Date(rental.started_at).toLocaleDateString("tr-TR") : "—"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AgentLimitData {
  id: number;
  agentType: string;
  period: string;
  tokenLimit: number;
  messageLimit: number;
  userId: number | null;
  isActive: boolean;
}

interface UsageData {
  tokens: number;
  messages: number;
}

function LimitManagementPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [limits, setLimits] = useState<AgentLimitData[]>([]);
  const [usageCache, setUsageCache] = useState<Record<string, UsageData>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState("all");
  const [editingLimits, setEditingLimits] = useState<Record<string, { tokenLimit: number; messageLimit: number }>>({});
  const [userOverrideAgent, setUserOverrideAgent] = useState("customer-support");
  const [userOverridePeriod, setUserOverridePeriod] = useState("daily");
  const [userOverrideUserId, setUserOverrideUserId] = useState("");
  const [userOverrideTokenLimit, setUserOverrideTokenLimit] = useState("");
  const [userOverrideMessageLimit, setUserOverrideMessageLimit] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/agent-limits`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setLimits(data);
    } catch {} finally { setLoading(false); }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_API}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {}
  }, [token]);

  const fetchUsage = useCallback(async (agentType: string, period: string) => {
    const key = `${agentType}-${period}`;
    try {
      const res = await fetch(`${ADMIN_API}/agent-limits/usage?agentType=${agentType}&period=${period}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsageCache(prev => ({ ...prev, [key]: data }));
    } catch {}
  }, [token]);

  useEffect(() => { fetchLimits(); fetchUsers(); }, [fetchLimits, fetchUsers]);

  useEffect(() => {
    const agentsToFetch = selectedAgentFilter === "all"
      ? AGENTS_DATA.filter(a => a.slug !== "manager").map(a => a.slug)
      : [selectedAgentFilter];
    const periods = ["daily", "weekly", "monthly"] as const;
    agentsToFetch.forEach(agent => {
      periods.forEach(period => fetchUsage(agent, period));
    });
  }, [selectedAgentFilter, fetchUsage]);

  const handleSaveLimit = async (agentType: string, period: string) => {
    const key = `${agentType}-${period}`;
    const edit = editingLimits[key];
    if (!edit) return;
    setSaving(true);
    try {
      const res = await fetch(`${ADMIN_API}/agent-limits`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, period, tokenLimit: edit.tokenLimit, messageLimit: edit.messageLimit }),
      });
      if (!res.ok) throw new Error(t("adminPage.toast.saveFailed"));
      toast({ title: t("adminPage.toast.limitSaved"), description: `${agentType} — ${period}` });
      fetchLimits();
      fetchUsage(agentType, period);
      setEditingLimits(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
    } catch (err: any) {
      toast({ title: t("adminPage.toast.saveFailed"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeleteLimit = async (id: number) => {
    try {
      const res = await fetch(`${ADMIN_API}/agent-limits/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(t("adminPage.toast.deleteFailed"));
      toast({ title: t("adminPage.toast.limitDeleted") });
      fetchLimits();
    } catch (err: any) {
      toast({ title: t("adminPage.toast.deleteFailed"), description: err.message, variant: "destructive" });
    }
  };

  const handleSaveUserOverride = async () => {
    if (!userOverrideUserId) return;
    setSaving(true);
    try {
      const res = await fetch(`${ADMIN_API}/agent-limits`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: userOverrideAgent,
          period: userOverridePeriod,
          tokenLimit: parseInt(userOverrideTokenLimit) || 0,
          messageLimit: parseInt(userOverrideMessageLimit) || 0,
          userId: parseInt(userOverrideUserId),
        }),
      });
      if (!res.ok) throw new Error(t("adminPage.toast.saveFailed"));
      toast({ title: t("adminPage.toast.userLimitSaved") });
      fetchLimits();
      setUserOverrideTokenLimit("");
      setUserOverrideMessageLimit("");
    } catch (err: any) {
      toast({ title: t("adminPage.toast.saveFailed"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const getEditValue = (agentType: string, period: string) => {
    const key = `${agentType}-${period}`;
    if (editingLimits[key]) return editingLimits[key];
    const existing = limits.find(l => l.agentType === agentType && l.period === period && !l.userId);
    return existing ? { tokenLimit: existing.tokenLimit, messageLimit: existing.messageLimit } : { tokenLimit: 0, messageLimit: 0 };
  };

  const setEditValue = (agentType: string, period: string, field: "tokenLimit" | "messageLimit", value: number) => {
    const key = `${agentType}-${period}`;
    const current = getEditValue(agentType, period);
    setEditingLimits(prev => ({ ...prev, [key]: { ...current, [field]: value } }));
  };

  const getDefaultTokenLimit = (agentType: string) => {
    const defaults: Record<string, number> = {
      "customer-support": 40000, "sales-sdr": 30000, "social-media": 40000,
      "bookkeeping": 35000, "scheduling": 25000, "hr-recruiting": 40000,
      "data-analyst": 50000, "ecommerce-ops": 40000, "real-estate": 40000,
    };
    return defaults[agentType] || 20000;
  };

  const agentsToShow = selectedAgentFilter === "all"
    ? AGENTS_DATA.filter(a => a.slug !== "manager")
    : AGENTS_DATA.filter(a => a.slug === selectedAgentFilter);

  const periods = ["daily", "weekly", "monthly"] as const;
  const periodLabels: Record<string, string> = { daily: t("adminPage.limits.daily"), weekly: t("adminPage.limits.weekly"), monthly: t("adminPage.limits.monthly") };

  const userOverrides = limits.filter(l => l.userId !== null);

  return (
    <div className="space-y-6">
      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              {t("adminPage.tabs.limitManagement")}
            </CardTitle>
            <CardDescription className="text-gray-400">{t("adminPage.limits.agentLimitsDesc")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedAgentFilter} onValueChange={setSelectedAgentFilter}>
              <SelectTrigger className="bg-[#111633] border-[#1E2448] text-white w-48" data-testid="select-limit-agent-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111633] border-[#1E2448]">
                <SelectItem value="all" className="text-white">{t("adminPage.limits.allAgents")}</SelectItem>
                {AGENTS_DATA.filter(a => a.slug !== "manager").map(a => (
                  <SelectItem key={a.slug} value={a.slug} className="text-white">{`${a.persona} — ${t("adminPage.agents." + a.roleKey)}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={fetchLimits} disabled={loading} data-testid="button-refresh-limits">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {agentsToShow.map(agent => (
              <div key={agent.slug} className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`limit-agent-${agent.slug}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-5 h-5 text-blue-400" />
                  <h4 className="text-white font-medium">{`${agent.persona} — ${t("adminPage.agents." + agent.roleKey)}`}</h4>
                  <Badge variant="outline" className="border-[#1E2448] text-gray-400 text-xs ml-auto">
                    {t("adminPage.limits.default")}: {getDefaultTokenLimit(agent.slug).toLocaleString()} token/{t("adminPage.limits.day")}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {periods.map(period => {
                    const usageKey = `${agent.slug}-${period}`;
                    const usage = usageCache[usageKey] || { tokens: 0, messages: 0 };
                    const editVal = getEditValue(agent.slug, period);
                    const existingLimit = limits.find(l => l.agentType === agent.slug && l.period === period && !l.userId);
                    const effectiveTokenLimit = editVal.tokenLimit || (period === "daily" ? getDefaultTokenLimit(agent.slug) : 0);
                    const tokenPercent = effectiveTokenLimit > 0 ? Math.min(100, (usage.tokens / effectiveTokenLimit) * 100) : 0;
                    const messagePercent = editVal.messageLimit > 0 ? Math.min(100, (usage.messages / editVal.messageLimit) * 100) : 0;

                    return (
                      <div key={period} className="p-3 bg-[#0A0E27] rounded-lg border border-[#1E2448]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-300">{periodLabels[period]}</span>
                          {existingLimit && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteLimit(existingLimit.id)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0" data-testid={`button-delete-limit-${agent.slug}-${period}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">{t("adminPage.limits.tokenLimit")}</label>
                            <Input
                              type="number"
                              value={editVal.tokenLimit || ""}
                              onChange={e => setEditValue(agent.slug, period, "tokenLimit", parseInt(e.target.value) || 0)}
                              placeholder={period === "daily" ? getDefaultTokenLimit(agent.slug).toString() : t("adminPage.limits.unlimited")}
                              className="bg-[#111633] border-[#1E2448] text-white h-8 text-sm"
                              data-testid={`input-token-limit-${agent.slug}-${period}`}
                            />
                            {effectiveTokenLimit > 0 && (
                              <div className="mt-1">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>{usage.tokens.toLocaleString()} / {effectiveTokenLimit.toLocaleString()}</span>
                                  <span>{tokenPercent.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-[#1E2448] rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${tokenPercent >= 90 ? "bg-red-500" : tokenPercent >= 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
                                    style={{ width: `${tokenPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">{t("adminPage.limits.messageLimitLabel")}</label>
                            <Input
                              type="number"
                              value={editVal.messageLimit || ""}
                              onChange={e => setEditValue(agent.slug, period, "messageLimit", parseInt(e.target.value) || 0)}
                              placeholder={t("adminPage.limits.unlimited")}
                              className="bg-[#111633] border-[#1E2448] text-white h-8 text-sm"
                              data-testid={`input-message-limit-${agent.slug}-${period}`}
                            />
                            {editVal.messageLimit > 0 && (
                              <div className="mt-1">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>{usage.messages.toLocaleString()} / {editVal.messageLimit.toLocaleString()}</span>
                                  <span>{messagePercent.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-[#1E2448] rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${messagePercent >= 90 ? "bg-red-500" : messagePercent >= 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
                                    style={{ width: `${messagePercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSaveLimit(agent.slug, period)}
                            disabled={saving}
                            className="w-full bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                            data-testid={`button-save-limit-${agent.slug}-${period}`}
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : t("adminPage.limits.save")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            {t("adminPage.limits.userLimitOverride")}
          </CardTitle>
          <CardDescription className="text-gray-400">{t("adminPage.limits.userOverrideDesc")})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminPage.limits.user")}</label>
              <Select value={userOverrideUserId} onValueChange={setUserOverrideUserId}>
                <SelectTrigger className="bg-[#111633] border-[#1E2448] text-white" data-testid="select-override-user">
                  <SelectValue placeholder={t("adminPage.limits.selectUser")} />
                </SelectTrigger>
                <SelectContent className="bg-[#111633] border-[#1E2448] max-h-48">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()} className="text-white">{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminPage.limits.agent")}</label>
              <Select value={userOverrideAgent} onValueChange={setUserOverrideAgent}>
                <SelectTrigger className="bg-[#111633] border-[#1E2448] text-white" data-testid="select-override-agent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111633] border-[#1E2448]">
                  {AGENTS_DATA.filter(a => a.slug !== "manager").map(a => (
                    <SelectItem key={a.slug} value={a.slug} className="text-white">{`${a.persona} — ${t("adminPage.agents." + a.roleKey)}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminPage.limits.period")}</label>
              <Select value={userOverridePeriod} onValueChange={setUserOverridePeriod}>
                <SelectTrigger className="bg-[#111633] border-[#1E2448] text-white" data-testid="select-override-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111633] border-[#1E2448]">
                  <SelectItem value="daily" className="text-white">{t("adminPage.limits.daily")}</SelectItem>
                  <SelectItem value="weekly" className="text-white">{t("adminPage.limits.weekly")}</SelectItem>
                  <SelectItem value="monthly" className="text-white">{t("adminPage.limits.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminPage.limits.tokenLimit")}</label>
              <Input
                type="number"
                value={userOverrideTokenLimit}
                onChange={e => setUserOverrideTokenLimit(e.target.value)}
                placeholder="0"
                className="bg-[#111633] border-[#1E2448] text-white"
                data-testid="input-override-token-limit"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("adminPage.limits.messageLimitLabel")}</label>
              <Input
                type="number"
                value={userOverrideMessageLimit}
                onChange={e => setUserOverrideMessageLimit(e.target.value)}
                placeholder="0"
                className="bg-[#111633] border-[#1E2448] text-white"
                data-testid="input-override-message-limit"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSaveUserOverride}
                disabled={saving || !userOverrideUserId}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
                data-testid="button-save-user-override"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                {t("adminPage.limits.addOverride")}
              </Button>
            </div>
          </div>

          {userOverrides.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">{t("adminPage.limits.existingOverrides")}</h4>
              {userOverrides.map(override => {
                const user = users.find(u => u.id === override.userId);
                const agentName = (() => { const a = AGENTS_DATA.find(x => x.slug === override.agentType); return a ? `${a.persona} — ${t("adminPage.agents." + a.roleKey)}` : override.agentType; })();
                return (
                  <div key={override.id} className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`override-row-${override.id}`}>
                    <div className="flex items-center gap-3">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <div>
                        <span className="text-white text-sm">{user?.full_name || `User #${override.userId}`}</span>
                        <span className="text-gray-500 text-xs ml-2">({user?.email})</span>
                      </div>
                      <Badge variant="outline" className="border-[#1E2448] text-gray-300 text-xs">{agentName}</Badge>
                      <Badge variant="outline" className="border-[#1E2448] text-gray-300 text-xs">{periodLabels[override.period] || override.period}</Badge>
                      <span className="text-gray-400 text-xs">Token: {override.tokenLimit.toLocaleString()} · Mesaj: {override.messageLimit.toLocaleString()}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLimit(override.id)} className="text-red-400 hover:text-red-300" data-testid={`button-delete-override-${override.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

function AgentInstructionsPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  const [globalInstructions, setGlobalInstructions] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInstructions = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_API}/agent-instructions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        data.instructions.forEach((i: any) => { map[i.agentType] = i.instructions; });
        setInstructions(map);
        setGlobalInstructions(data.globalInstructions || "");
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchInstructions(); }, [fetchInstructions]);

  const saveAgentInstruction = async (agentType: string) => {
    setSaving(agentType);
    try {
      const res = await fetch(`${ADMIN_API}/agent-instructions/${agentType}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: instructions[agentType] || "" }),
      });
      if (res.ok) {
        toast({ title: t("adminPage.toast.saved"), description: t("adminPage.toast.agentInstructionsUpdated", { agent: agentType }) });
      }
    } catch (e) { console.error(e); }
    setSaving(null);
  };

  const saveGlobal = async () => {
    setSaving("global");
    try {
      const res = await fetch(`${ADMIN_API}/global-instructions`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: globalInstructions }),
      });
      if (res.ok) {
        toast({ title: t("adminPage.toast.saved"), description: t("adminPage.toast.globalInstructionsUpdated") });
      }
    } catch (e) { console.error(e); }
    setSaving(null);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            {t("adminPage.instructions.title")}
          </CardTitle>
          <CardDescription>
            {t("adminPage.instructions.description")}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            {t("adminPage.instructions.globalTitle")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("adminPage.instructions.globalDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[120px] p-3 rounded-lg border bg-background text-sm font-mono resize-y"
            placeholder={t("adminPage.instructions.globalPlaceholder")}
            value={globalInstructions}
            onChange={(e) => setGlobalInstructions(e.target.value)}
            data-testid="input-global-instructions"
          />
          <Button
            size="sm"
            onClick={saveGlobal}
            disabled={saving === "global"}
            data-testid="button-save-global-instructions"
          >
            {saving === "global" ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
            {t("adminPage.instructions.saveGlobal")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {AGENTS_DATA.filter(a => a.slug !== "manager").map((agent) => (
          <Card key={agent.slug}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{`${agent.persona} — ${t("adminPage.agents." + agent.roleKey)}`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm font-mono resize-y"
                placeholder={t("adminPage.agents.customInstructions", { agent: agent.persona })}
                value={instructions[agent.slug] || ""}
                onChange={(e) => setInstructions(prev => ({ ...prev, [agent.slug]: e.target.value }))}
                data-testid={`input-instructions-${agent.slug}`}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveAgentInstruction(agent.slug)}
                disabled={saving === agent.slug}
                data-testid={`button-save-instructions-${agent.slug}`}
              >
                {saving === agent.slug ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                {t("adminPage.limits.save")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EscalationsPanel({ token, autoOpenId }: { token: string; autoOpenId?: number }) {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const [rules, setRules] = useState<any[]>([]);
  const [escalationsList, setEscalationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [chatEscalation, setChatEscalation] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [editingRule, setEditingRule] = useState<number | null>(null);
  const [editKeywords, setEditKeywords] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editThreshold, setEditThreshold] = useState(2);
  const [newKeyword, setNewKeyword] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<any>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_API}/escalation-rules`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRules(await res.json());
    } catch {}
  }, [token]);

  const fetchEscalations = useCallback(async () => {
    try {
      const url = statusFilter === "all" ? `${ADMIN_API}/escalations` : `${ADMIN_API}/escalations?status=${statusFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setEscalationsList(await res.json());
    } catch {}
  }, [token, statusFilter]);

  useEffect(() => {
    Promise.all([fetchRules(), fetchEscalations()]).then(() => setLoading(false));
  }, [fetchRules, fetchEscalations]);

  useEffect(() => { fetchEscalations(); }, [statusFilter]);

  useEffect(() => {
    if (autoOpenId && !loading) {
      openChat({ id: autoOpenId });
    }
  }, [autoOpenId, loading]);

  const toggleRule = async (id: number, isActive: boolean) => {
    try {
      await fetch(`${ADMIN_API}/escalation-rules/${id}`, { method: "PATCH", headers, body: JSON.stringify({ isActive: !isActive }) });
      fetchRules();
      toast({ title: !isActive ? t("adminPage.toast.ruleActivated") : t("adminPage.toast.ruleDeactivated") });
    } catch { toast({ title: t("adminPage.toast.error"), variant: "destructive" }); }
  };

  const saveRule = async (id: number) => {
    try {
      const keywords = editKeywords.split(",").map(k => k.trim()).filter(Boolean);
      await fetch(`${ADMIN_API}/escalation-rules/${id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ keywords, escalationMessage: editMessage, threshold: editThreshold }),
      });
      setEditingRule(null);
      fetchRules();
      toast({ title: t("adminPage.toast.ruleUpdated") });
    } catch { toast({ title: t("adminPage.toast.error"), variant: "destructive" }); }
  };

  const openChat = async (esc: any) => {
    try {
      const res = await fetch(`${ADMIN_API}/escalation/${esc.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setChatEscalation(data);
        setChatMessages(data.messages || []);
        if (data.status === "pending") {
          await fetch(`${ADMIN_API}/escalation/${esc.id}/join`, { method: "POST", headers });
          fetchEscalations();
        }
        startPolling(esc.id);
      }
    } catch { toast({ title: t("adminPage.toast.error"), variant: "destructive" }); }
  };

  const startPolling = (escId: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${ADMIN_API}/escalation/${escId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const msgs = await res.json();
          setChatMessages(msgs);
        }
      } catch {}
    }, 3000);
  };

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendAdminMessage = async () => {
    if (!adminMessage.trim() || !chatEscalation) return;
    try {
      await fetch(`${ADMIN_API}/escalation/${chatEscalation.id}/message`, {
        method: "POST", headers, body: JSON.stringify({ content: adminMessage }),
      });
      setAdminMessage("");
      const res = await fetch(`${ADMIN_API}/escalation/${chatEscalation.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setChatMessages(await res.json());
    } catch { toast({ title: t("adminPage.toast.messageSendFailed"), variant: "destructive" }); }
  };

  const resolveEscalation = async (id: number) => {
    try {
      await fetch(`${ADMIN_API}/escalation/${id}/resolve`, { method: "POST", headers });
      if (chatEscalation?.id === id) {
        setChatEscalation(null);
        setChatMessages([]);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
      fetchEscalations();
      toast({ title: t("adminPage.toast.escalationResolved") });
    } catch { toast({ title: t("adminPage.toast.error"), variant: "destructive" }); }
  };

  const dismissEscalation = async (id: number) => {
    try {
      await fetch(`${ADMIN_API}/escalation/${id}/dismiss`, { method: "POST", headers });
      fetchEscalations();
      toast({ title: t("adminPage.toast.escalationRejected") });
    } catch { toast({ title: t("adminPage.toast.error"), variant: "destructive" }); }
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-500/20 text-gray-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    admin_joined: "bg-blue-500/20 text-blue-400",
    resolved: "bg-green-500/20 text-green-400",
    dismissed: "bg-gray-500/20 text-gray-400",
  };

  const statusLabels: Record<string, string> = {
    pending: t("adminPage.escalations.pending"),
    admin_joined: t("adminPage.escalations.chatActive"),
    resolved: t("adminPage.escalations.resolved"),
    dismissed: t("adminPage.escalations.dismissed"),
  };

  const reasonLabels: Record<string, string> = {
    angry_customer: t("adminPage.escalations.angryCustomer"),
    repeated_failure: t("adminPage.escalations.repeatedFailure"),
    sensitive_topic: t("adminPage.escalations.sensitiveTopic"),
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;

  if (chatEscalation) {
    return (
      <div className="space-y-4" data-testid="escalation-chat-view">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setChatEscalation(null); setChatMessages([]); if (pollingRef.current) clearInterval(pollingRef.current); }} data-testid="button-back-escalations">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t("adminPage.escalations.back")}
          </Button>
          <div className="flex-1">
            <h3 className="text-white font-medium">{chatEscalation.userName} — {reasonLabels[chatEscalation.reason] || chatEscalation.reason}</h3>
            <p className="text-gray-400 text-xs">{chatEscalation.userEmail} · {chatEscalation.agentType}</p>
          </div>
          <Badge className={statusColors[chatEscalation.status]} data-testid="badge-escalation-status">{statusLabels[chatEscalation.status]}</Badge>
          {(chatEscalation.status === "pending" || chatEscalation.status === "admin_joined") && (
            <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => resolveEscalation(chatEscalation.id)} data-testid="button-resolve-escalation">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t("adminPage.escalations.resolved")}
            </Button>
          )}
        </div>

        <Card className="bg-[#0D1135] border-[#1E2448]">
          <CardHeader className="py-2 px-4 border-b border-[#1E2448]">
            <CardTitle className="text-sm text-gray-300">{t("adminPage.escalations.originalMessage")}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-gray-300 text-sm">{chatEscalation.userMessage}</p>
            {chatEscalation.chatHistory && Array.isArray(chatEscalation.chatHistory) && chatEscalation.chatHistory.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-[#1E2448] pt-3">
                <p className="text-xs text-gray-500 mb-2">{t("adminPage.escalations.recentChatHistory")}:</p>
                {(chatEscalation.chatHistory as any[]).slice(-4).map((m: any, i: number) => (
                  <div key={i} className={`text-xs p-2 rounded ${m.role === "user" ? "bg-blue-500/10 text-blue-300" : "bg-[#111633] text-gray-400"}`}>
                    <span className="font-medium">{m.role === "user" ? t("adminPage.escalations.customer") : t("adminPage.escalations.agentLabel")}:</span> {(m.content || "").slice(0, 200)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0D1135] border-[#1E2448] flex flex-col" style={{ height: "400px" }}>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="escalation-chat-messages">
            {chatMessages.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">{t("adminPage.escalations.noMessagesYet")}</p>
            )}
            {chatMessages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                  msg.senderType === "admin"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-tr-md"
                    : "bg-[#111633] text-gray-300 border border-[#1E2448] rounded-tl-md"
                }`} data-testid={`escalation-msg-${msg.id}`}>
                  <p className="text-xs font-medium mb-1 opacity-70">{msg.senderType === "admin" ? t("adminPage.escalations.admin") : t("adminPage.escalations.customer")}</p>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-[10px] opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString("tr-TR")}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </CardContent>
          {(chatEscalation.status === "pending" || chatEscalation.status === "admin_joined") && (
            <div className="border-t border-[#1E2448] p-3 flex gap-2">
              <Input
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder={t("adminPage.escalations.messagePlaceholder")}
                className="bg-[#111633] border-[#1E2448] text-white"
                onKeyDown={(e) => e.key === "Enter" && sendAdminMessage()}
                data-testid="input-admin-message"
              />
              <Button onClick={sendAdminMessage} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white" data-testid="button-send-admin-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="escalations-panel">
      <Card className="bg-[#0D1135] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> {t("adminPage.escalations.rules")}</CardTitle>
          <CardDescription className="text-gray-400">{t("adminPage.escalations.rulesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`rule-card-${rule.id}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleRule(rule.id, rule.isActive)} data-testid={`toggle-rule-${rule.id}`}>
                    {rule.isActive ? <ToggleRight className="w-8 h-5 text-green-400" /> : <ToggleLeft className="w-8 h-5 text-gray-500" />}
                  </button>
                  <div>
                    <h4 className="text-white font-medium text-sm">{rule.name}</h4>
                    <span className="text-xs text-gray-500">{reasonLabels[rule.type] || rule.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={priorityColors[rule.priority]}>{rule.priority}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (editingRule === rule.id) { setEditingRule(null); } else {
                      setEditingRule(rule.id);
                      setEditKeywords(rule.keywords.join(", "));
                      setEditMessage(rule.escalationMessage);
                      setEditThreshold(rule.threshold);
                    }
                  }} data-testid={`button-edit-rule-${rule.id}`}>
                    {editingRule === rule.id ? <XCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {rule.keywords.slice(0, 8).map((kw: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1f4a] text-gray-400 border border-[#2a2f5a]">{kw}</span>
                ))}
                {rule.keywords.length > 8 && <span className="text-[10px] px-2 py-0.5 text-gray-500">+{rule.keywords.length - 8} more</span>}
              </div>

              {editingRule === rule.id && (
                <div className="mt-3 space-y-3 pt-3 border-t border-[#2a2f5a]">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">{t("adminPage.escalations.keywords")}</label>
                    <textarea
                      value={editKeywords}
                      onChange={(e) => setEditKeywords(e.target.value)}
                      className="w-full bg-[#0D1135] border border-[#1E2448] rounded-lg p-2 text-sm text-white min-h-[60px]"
                      data-testid={`input-keywords-${rule.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">{t("adminPage.escalations.escalationMessage")}</label>
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="w-full bg-[#0D1135] border border-[#1E2448] rounded-lg p-2 text-sm text-white min-h-[60px]"
                      data-testid={`input-message-${rule.id}`}
                    />
                  </div>
                  {rule.type === "repeated_failure" && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">{t("adminPage.escalations.threshold")}</label>
                      <Input type="number" value={editThreshold} onChange={(e) => setEditThreshold(Number(e.target.value))} className="bg-[#0D1135] border-[#1E2448] text-white w-24" data-testid={`input-threshold-${rule.id}`} />
                    </div>
                  )}
                  <Button size="sm" onClick={() => saveRule(rule.id)} className="bg-blue-600 text-white" data-testid={`button-save-rule-${rule.id}`}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t("adminPage.limits.save")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-[#0D1135] border-[#1E2448]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-400" /> {t("adminPage.escalations.title")}</CardTitle>
              <CardDescription className="text-gray-400">{t("adminPage.escalations.historyDescription")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-[#111633] border-[#1E2448] text-white" data-testid="select-escalation-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("adminPage.select.all")}</SelectItem>
                  <SelectItem value="pending">{t("adminPage.select.pending")}</SelectItem>
                  <SelectItem value="admin_joined">{t("adminPage.select.activeChat")}</SelectItem>
                  <SelectItem value="resolved">{t("adminPage.select.resolved")}</SelectItem>
                  <SelectItem value="dismissed">{t("adminPage.select.dismissed")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={fetchEscalations} data-testid="button-refresh-escalations">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {escalationsList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t("adminPage.escalations.noEscalations")}</p>
          ) : (
            <div className="space-y-3">
              {escalationsList.map(esc => (
                <div key={esc.id} className="p-4 bg-[#111633] rounded-lg border border-[#1E2448] flex items-center gap-4" data-testid={`escalation-row-${esc.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm truncate">{esc.userName}</span>
                      <span className="text-gray-500 text-xs">{esc.userEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[esc.status]} data-testid={`badge-status-${esc.id}`}>{statusLabels[esc.status] || esc.status}</Badge>
                      <span className="text-xs text-gray-500">{reasonLabels[esc.reason] || esc.reason}</span>
                      <span className="text-xs text-gray-600">{esc.agentType}</span>
                      <span className="text-xs text-gray-600">{new Date(esc.createdAt).toLocaleDateString("tr-TR")} {new Date(esc.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{esc.userMessage}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(esc.status === "pending" || esc.status === "admin_joined") && (
                      <>
                        <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white" onClick={() => openChat(esc)} data-testid={`button-join-chat-${esc.id}`}>
                          <MessageSquare className="w-3.5 h-3.5 mr-1" /> {t("adminPage.escalations.joinChat")}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400" onClick={() => dismissEscalation(esc.id)} data-testid={`button-dismiss-${esc.id}`}>
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {esc.status === "resolved" && (
                      <Button size="sm" variant="ghost" onClick={() => openChat(esc)} data-testid={`button-view-chat-${esc.id}`}>
                        <History className="w-3.5 h-3.5 mr-1" /> {t("adminPage.escalations.view")}
                      </Button>
                    )}
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

interface ABTestResult {
  provider: string;
  model: string;
  response: string;
  tokens: number;
  cost: number;
  latencyMs: number;
  error?: string;
}

function ABTestPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [prompt, setPrompt] = useState("");
  const [agentType, setAgentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ABTestResult[]>([]);
  const [testedPrompt, setTestedPrompt] = useState("");
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const runTest = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResults([]);
    setTestedPrompt(prompt.trim());
    try {
      const res = await fetch(`${ADMIN_API}/ab-test`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: prompt.trim(), agentType: agentType || undefined }),
      });
      if (!res.ok) throw new Error(t("adminPage.toast.abTestError"));
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      toast({ title: t("adminPage.toast.abTestError"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatResponse = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold text-white mt-3 mb-1">{line.slice(2)}</h2>;
      if (line.startsWith("## ")) return <h3 key={i} className="text-md font-semibold text-white mt-2 mb-1">{line.slice(3)}</h3>;
      if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="text-gray-300 ml-4 list-disc text-sm">{line.slice(2)}</li>;
      if (line.match(/^\d+\.\s/)) return <li key={i} className="text-gray-300 ml-4 list-decimal text-sm">{line.replace(/^\d+\.\s/, "")}</li>;
      if (line.trim() === "") return <br key={i} />;
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-gray-300 text-sm">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part)}
        </p>
      );
    });
  };

  const openaiResult = results.find(r => r.provider === "openai");
  const anthropicResult = results.find(r => r.provider === "anthropic");

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-orange-900/30 to-violet-900/30 border-orange-500/30">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-orange-400" />
            {t("adminPage.abTest.title")}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {t("adminPage.abTest.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t("adminPage.abTest.agentContext")}</label>
            <Select value={agentType} onValueChange={setAgentType}>
              <SelectTrigger className="w-full max-w-xs bg-[#0A0E27] border-[#1E2448] text-white" data-testid="select-ab-agent">
                <SelectValue placeholder={t("adminPage.abTest.generalNoAgent")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t("adminPage.abTest.generalNoAgent")}</SelectItem>
                {AGENTS_DATA.map(a => <SelectItem key={a.slug} value={a.slug}>{`${a.persona} — ${t("adminPage.agents." + a.roleKey)}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("adminPage.abTest.promptPlaceholder")}
              className="bg-[#0A0E27] border-[#1E2448] text-white flex-1"
              onKeyDown={(e) => e.key === "Enter" && !loading && runTest()}
              disabled={loading}
              data-testid="input-ab-prompt"
            />
            <Button
              onClick={runTest}
              disabled={loading || !prompt.trim()}
              className="bg-gradient-to-r from-orange-500 to-violet-600 hover:from-orange-600 hover:to-violet-700 text-white px-6"
              data-testid="button-run-ab-test"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}
              {loading ? t("adminPage.abTest.testing") : t("adminPage.abTest.startTest")}
            </Button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-orange-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("adminPage.abTest.sendingToBoth")}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <div className="p-3 bg-[#111633] rounded-lg border border-[#1E2448]">
            <p className="text-xs text-gray-500">{t("adminPage.abTest.testPrompt")}:</p>
            <p className="text-sm text-white font-medium">"{testedPrompt}"</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: t("adminPage.abTest.latency"),
                openai: openaiResult ? `${(openaiResult.latencyMs / 1000).toFixed(2)}s` : "-",
                anthropic: anthropicResult ? `${(anthropicResult.latencyMs / 1000).toFixed(2)}s` : "-",
                winner: openaiResult && anthropicResult && !openaiResult.error && !anthropicResult.error
                  ? (openaiResult.latencyMs < anthropicResult.latencyMs ? "openai" : "anthropic") : null,
              },
              {
                label: t("adminPage.abTest.cost"),
                openai: openaiResult ? `$${openaiResult.cost.toFixed(4)}` : "-",
                anthropic: anthropicResult ? `$${anthropicResult.cost.toFixed(4)}` : "-",
                winner: openaiResult && anthropicResult && !openaiResult.error && !anthropicResult.error
                  ? (openaiResult.cost < anthropicResult.cost ? "openai" : "anthropic") : null,
              },
              {
                label: t("adminPage.abTest.tokenUsage"),
                openai: openaiResult ? openaiResult.tokens.toLocaleString() : "-",
                anthropic: anthropicResult ? anthropicResult.tokens.toLocaleString() : "-",
                winner: openaiResult && anthropicResult && !openaiResult.error && !anthropicResult.error
                  ? (openaiResult.tokens < anthropicResult.tokens ? "openai" : "anthropic") : null,
              },
            ].map((metric) => (
              <Card key={metric.label} className="bg-[#0A0E27] border-[#1E2448]">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-2">{metric.label}</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className={`${metric.winner === "openai" ? "ring-2 ring-green-500 rounded-lg" : ""} p-2`}>
                      <p className="text-xs text-green-400">OpenAI</p>
                      <p className="text-lg font-bold text-white">{metric.openai}</p>
                    </div>
                    <span className="text-gray-600">{t("adminPage.abTest.vs")}</span>
                    <div className={`${metric.winner === "anthropic" ? "ring-2 ring-violet-500 rounded-lg" : ""} p-2`}>
                      <p className="text-xs text-violet-400">Anthropic</p>
                      <p className="text-lg font-bold text-white">{metric.anthropic}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-green-900/10 border-green-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Badge className="bg-green-900/50 text-green-300 border-green-700 text-xs">OpenAI</Badge>
                  <span className="font-mono text-xs text-gray-400">{openaiResult?.model || "gpt-4o"}</span>
                  {openaiResult && !openaiResult.error && (
                    <span className="text-xs text-gray-500 ml-auto">{(openaiResult.latencyMs / 1000).toFixed(2)}s | ${openaiResult.cost.toFixed(4)}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto" data-testid="ab-result-openai">
                  {openaiResult?.error ? (
                    <p className="text-red-400 text-sm">{openaiResult.error}</p>
                  ) : openaiResult ? (
                    formatResponse(openaiResult.response)
                  ) : (
                    <p className="text-gray-500 text-sm">{t("adminPage.abTest.noResult")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-violet-900/10 border-violet-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Badge className="bg-violet-900/50 text-violet-300 border-violet-700 text-xs">Anthropic</Badge>
                  <span className="font-mono text-xs text-gray-400">{anthropicResult?.model || "claude-sonnet-4-20250514"}</span>
                  {anthropicResult && !anthropicResult.error && (
                    <span className="text-xs text-gray-500 ml-auto">{(anthropicResult.latencyMs / 1000).toFixed(2)}s | ${anthropicResult.cost.toFixed(4)}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto" data-testid="ab-result-anthropic">
                  {anthropicResult?.error ? (
                    <p className="text-red-400 text-sm">{anthropicResult.error}</p>
                  ) : anthropicResult ? (
                    formatResponse(anthropicResult.response)
                  ) : (
                    <p className="text-gray-500 text-sm">{t("adminPage.abTest.noResult")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function AIProviderPanel({ token }: { token: string }) {
  const { t } = useTranslation("pages");
  const [defaultProvider, setDefaultProvider] = useState("openai");
  const [agentProviders, setAgentProviders] = useState<Record<string, string>>({});
  const [anthropicConfigured, setAnthropicConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/ai-provider`, { headers });
      const data = await res.json();
      setDefaultProvider(data.defaultProvider || "openai");
      setAgentProviders(data.agentProviders || {});
      setAnthropicConfigured(data.anthropicConfigured || false);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${ADMIN_API}/ai-provider`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ defaultProvider, agentProviders }),
      });
      if (!res.ok) throw new Error(t("adminPage.toast.saveFailed"));
      toast({ title: t("adminPage.toast.aiProviderSaved") });
    } catch (err: any) {
      toast({ title: t("adminPage.toast.saveFailed"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAgentProviderChange = (agentSlug: string, value: string) => {
    setAgentProviders(prev => {
      const updated = { ...prev };
      if (value === "default") {
        delete updated[agentSlug];
      } else {
        updated[agentSlug] = value;
      }
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-400" />
            {t("adminPage.aiProvider.settings")}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t("adminPage.aiProvider.settingsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!anthropicConfigured && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-300 text-sm">
                {t("adminPage.aiProvider.anthropicNotConfigured")} <code className="bg-yellow-900/50 px-1 rounded">{t("adminPage.aiProvider.anthropicApiKey")}</code> {t("adminPage.aiProvider.addEnvVar")}
              </p>
            </div>
          )}

          <div className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              {t("adminPage.aiProvider.defaultProvider")}
            </h4>
            <p className="text-gray-400 text-sm mb-3">
              {t("adminPage.aiProvider.defaultProviderDesc")}
            </p>
            <Select value={defaultProvider} onValueChange={setDefaultProvider}>
              <SelectTrigger className="w-full max-w-xs bg-[#0A0E27] border-[#1E2448] text-white" data-testid="select-default-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">{t("adminPage.select.openaiModels")}</SelectItem>
                <SelectItem value="anthropic">{t("adminPage.select.anthropicSonnet")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              {t("adminPage.aiProvider.perAgentOverride")}
            </h4>
            <p className="text-gray-400 text-sm mb-4">
              {t("adminPage.aiProvider.perAgentDesc")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AGENTS_DATA.map(agent => (
                <div key={agent.slug} className="flex items-center justify-between p-3 bg-[#0A0E27] rounded-lg border border-[#1E2448]" data-testid={`agent-provider-${agent.slug}`}>
                  <span className="text-white text-sm font-medium">{`${agent.persona} — ${t("adminPage.agents." + agent.roleKey)}`}</span>
                  <Select
                    value={agentProviders[agent.slug] || "default"}
                    onValueChange={(val) => handleAgentProviderChange(agent.slug, val)}
                  >
                    <SelectTrigger className="w-[180px] bg-[#111633] border-[#1E2448] text-white text-xs h-8" data-testid={`select-provider-${agent.slug}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{t("adminPage.aiProvider.default")} ({defaultProvider === "openai" ? "OpenAI" : "Anthropic"})</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#111633] rounded-lg border border-[#1E2448]">
            <h4 className="text-white font-medium mb-3">{t("adminPage.aiProvider.modelInfo")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-[#0A0E27] rounded-lg border border-[#1E2448]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-900/30 text-green-400 border-green-800 text-xs">OpenAI</Badge>
                </div>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li><span className="text-white">{t("adminPage.aiProvider.gpt4o")}:</span> $2.50/1M input, $10.00/1M output</li>
                  <li><span className="text-white">{t("adminPage.aiProvider.gpt4oMini")}:</span> $0.15/1M input, $0.60/1M output</li>
                </ul>
              </div>
              <div className="p-3 bg-[#0A0E27] rounded-lg border border-[#1E2448]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-violet-900/30 text-violet-400 border-violet-800 text-xs">Anthropic</Badge>
                </div>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li><span className="text-white">{t("adminPage.aiProvider.claudeSonnet4")}:</span> $3.00/1M input, $15.00/1M output</li>
                  <li><span className="text-white">{t("adminPage.aiProvider.claude3Haiku")}:</span> $0.25/1M input, $1.25/1M output</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
            data-testid="button-save-ai-provider"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("adminPage.aiProvider.saving")}</> : t("adminPage.aiProvider.saveSettings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminGuidePanel() {
  const { t } = useTranslation("pages");
  const AGENT_DETAILS = [
    { slug: "customer-support", name: "Ava", role: t("adminPage.instructions.customerSupport"), desc: t("adminPage.instructions.customerSupportDesc"), icon: "🎧", color: "from-blue-500 to-blue-600" },
    { slug: "sales-sdr", name: "Rex", role: t("adminPage.instructions.salesRep"), desc: t("adminPage.instructions.salesRepDesc"), icon: "📈", color: "from-red-500 to-red-600" },
    { slug: "social-media", name: "Maya", role: t("adminPage.instructions.socialMedia"), desc: t("adminPage.instructions.socialMediaDesc"), icon: "📱", color: "from-pink-500 to-pink-600" },
    { slug: "bookkeeping", name: "Finn", role: t("adminPage.instructions.accounting"), desc: t("adminPage.instructions.accountingDesc"), icon: "📊", color: "from-green-500 to-green-600" },
    { slug: "scheduling", name: "Cal", role: t("adminPage.instructions.scheduling"), desc: t("adminPage.instructions.schedulingDesc"), icon: "📅", color: "from-yellow-500 to-yellow-600" },
    { slug: "hr-recruiting", name: "Harper", role: t("adminPage.instructions.hrRole"), desc: t("adminPage.instructions.hrDesc"), icon: "👥", color: "from-purple-500 to-purple-600" },
    { slug: "data-analyst", name: "DataBot", role: t("adminPage.instructions.dataAnalyst"), desc: t("adminPage.instructions.dataAnalystDesc"), icon: "🔬", color: "from-cyan-500 to-cyan-600" },
    { slug: "ecommerce-ops", name: "ShopBot", role: t("adminPage.instructions.ecommerceRole"), desc: t("adminPage.instructions.ecommerceDesc"), icon: "🛒", color: "from-orange-500 to-orange-600" },
    { slug: "real-estate", name: "Reno", role: t("adminPage.instructions.realEstate"), desc: t("adminPage.instructions.realEstateDesc"), icon: "🏠", color: "from-teal-500 to-teal-600" },
    { slug: "manager", name: "Manager", role: t("adminPage.instructions.managerRole"), desc: t("adminPage.instructions.managerDesc"), icon: "🧠", color: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-emerald-500/30">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            {t("adminPage.guide.title")}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {t("adminPage.guide.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#0A0E27] rounded-lg border border-[#1E2448]">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-blue-400" />
                {t("adminPage.guide.generalRules")}
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {t("adminPage.guide.rule1")}</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {t("adminPage.guide.rule2")}</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {t("adminPage.guide.rule3")}</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {t("adminPage.guide.rule4")}</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {t("adminPage.guide.rule5")}</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {t("adminPage.guide.rule6")}</li>
                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {t("adminPage.guide.rule7")}</li>
              </ul>
            </div>
            <div className="p-4 bg-[#0A0E27] rounded-lg border border-[#1E2448]">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-violet-400" />
                {t("adminPage.guide.paymentRules")}
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span> <strong className="text-white">{t("adminPage.packages.starterPrice")}:</strong> {t("adminPage.guide.starterFeatures")}</li>
                <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span> <strong className="text-white">{t("adminPage.packages.professionalPrice")}:</strong> {t("adminPage.guide.professionalFeatures")}</li>
                <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span> <strong className="text-white">{t("adminPage.packages.enterprisePrice")}:</strong> {t("adminPage.guide.enterpriseFeatures")}</li>
                <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span> {t("adminPage.guide.paymentTestMode")}</li>
                <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span> {t("adminPage.guide.creditSystem")}</li>
                <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span> {t("adminPage.guide.adminManualChange")}</li>
                <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">•</span> {t("adminPage.guide.adminResetMessages")}</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-[#0A0E27] rounded-lg border border-[#1E2448]">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-amber-400" />
              {t("adminPage.guide.rentalFlow")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[t("adminPage.guide.step1"), t("adminPage.guide.step2"), t("adminPage.guide.step3"), t("adminPage.guide.step4"), t("adminPage.guide.step5"), t("adminPage.guide.step6"), t("adminPage.guide.step7"), t("adminPage.guide.step8")].map((step, i) => (
                <Badge key={i} variant="outline" className="border-[#1E2448] text-gray-300 text-xs py-1.5">
                  {step}
                </Badge>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#0A0E27] rounded-lg border border-[#1E2448]">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-green-400" />
              {t("adminPage.guide.adminPermissions")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: t("adminPage.guide.userMgmt"), desc: t("adminPage.guide.userMgmtDesc") },
                { title: t("adminPage.guide.changeMsgLimit"), desc: t("adminPage.guide.changeMsgLimitDesc") },
                { title: t("adminPage.guide.changePlan"), desc: t("adminPage.guide.changePlanDesc") },
                { title: t("adminPage.guide.resetCounter"), desc: t("adminPage.guide.resetCounterDesc") },
                { title: t("adminPage.guide.ragDocMgmt"), desc: t("adminPage.guide.ragDocMgmtDesc") },
                { title: t("adminPage.guide.fineTuning"), desc: t("adminPage.guide.fineTuningDesc") },
                { title: t("adminPage.guide.securityReports"), desc: t("adminPage.guide.securityReportsDesc") },
                { title: t("adminPage.guide.costAnalysis"), desc: t("adminPage.guide.costAnalysisDesc") },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0A0E27] border-[#1E2448]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            {t("adminPage.guide.agentGuide")}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t("adminPage.guide.agentGuideDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AGENT_DETAILS.map((agent) => (
              <div key={agent.slug} className="p-3 bg-[#111633] rounded-lg border border-[#1E2448]" data-testid={`guide-agent-${agent.slug}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${agent.color} flex items-center justify-center text-lg`}>
                    {agent.icon}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{agent.name} — {agent.role}</p>
                    <p className="text-gray-500 text-xs">{agent.role}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs">{agent.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation("pages");
  const [token, setToken] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS_DATA[0].slug);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeCategory, setActiveCategory] = useState("dashboard");
  const [autoOpenEscalationId, setAutoOpenEscalationId] = useState<number | undefined>();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const fetchStats = useCallback(async (agent: string, tkn: string) => {
    try {
      const res = await fetch(`${ADMIN_API}/agents/${agent}/stats`, {
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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("tab") === "escalations") {
      setActiveCategory("security");
      setActiveTab("escalations");
      const escId = urlParams.get("escalationId");
      if (escId) {
        setAutoOpenEscalationId(parseInt(escId));
      }
    }
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
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate" data-testid="text-admin-title">{t("adminPage.login.title")}</h1>
              <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">{t("adminPage.header.subtitle")}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-[#1E2448] text-gray-400 hover:text-white hover:border-red-500/50 shrink-0 min-h-[44px] min-w-[44px]"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("adminPage.header.logout")}</span>
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
                  {AGENTS_DATA.map((agent) => (
                    <SelectItem key={agent.slug} value={agent.slug} className="text-white">
                      {`${agent.persona} — ${t("adminPage.agents." + agent.roleKey)}`}
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

        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          const tabToCategory: Record<string, string> = {
            "boss-ai": "dashboard", "overview": "dashboard", "users": "dashboard",
            "rag": "ai-training", "training-data": "ai-training", "fine-tuning": "ai-training", "agent-instructions": "ai-training", "ai-provider": "ai-training",
            "messages": "analytics", "spend-analysis": "analytics", "token-optimization": "analytics",
            "costs": "analytics", "performance": "analytics", "conversation-review": "analytics",
            "limit-management": "limits", "packages": "limits",
            "guardrails": "security", "support-tickets": "security", "security-report": "security", "escalations": "security", "collaboration": "security",
            "admin-guide": "help",
          };
          if (tabToCategory[val]) setActiveCategory(tabToCategory[val]);
        }} className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { id: "dashboard", label: t("adminPage.categories.dashboard"), icon: Crown, gradient: "from-amber-500 to-orange-600" },
                  { id: "ai-training", label: t("adminPage.categories.aiTraining"), icon: Database, gradient: "from-violet-500 to-purple-600" },
                  { id: "analytics", label: t("adminPage.categories.analytics"), icon: BarChart3, gradient: "from-emerald-500 to-teal-600" },
                  { id: "limits", label: t("adminPage.categories.limits"), icon: Zap, gradient: "from-yellow-500 to-amber-600" },
                  { id: "security", label: t("adminPage.categories.security"), icon: Shield, gradient: "from-red-500 to-rose-600" },
                  { id: "help", label: t("adminPage.categories.guide"), icon: HelpCircle, gradient: "from-cyan-500 to-blue-600" },
                ].map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        const firstTab: Record<string, string> = {
                          "dashboard": "boss-ai",
                          "ai-training": "rag",
                          "analytics": "messages",
                          "limits": "limit-management",
                          "security": "guardrails",
                          "help": "admin-guide",
                        };
                        setActiveTab(firstTab[cat.id] || "overview");
                      }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all shrink-0 min-h-[44px] ${
                        activeCategory === cat.id
                          ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                          : "bg-[#111633] text-gray-400 hover:text-white hover:bg-[#1a1f4a] border border-[#1E2448]"
                      }`}
                      data-testid={`category-${cat.id}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
            <TabsList className="bg-[#111633] border border-[#1E2448] h-auto gap-0.5 sm:gap-1 p-1 overflow-x-auto max-w-full flex [&>button]:min-h-[44px] [&>button]:text-[11px] [&>button]:sm:text-xs">
              {activeCategory === "dashboard" && (
                <>
                  <TabsTrigger value="boss-ai" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white" data-testid="tab-boss-ai">
                    <Crown className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.bossAi")}
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="tab-overview">
                    <BarChart3 className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.overview")}
                  </TabsTrigger>
                  <TabsTrigger value="users" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white" data-testid="tab-users">
                    <Users className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.users")}
                  </TabsTrigger>
                </>
              )}
              {activeCategory === "ai-training" && (
                <>
                  <TabsTrigger value="rag" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="tab-rag">
                    <Database className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.knowledgeBase")}
                  </TabsTrigger>
                  <TabsTrigger value="training-data" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white" data-testid="tab-training-data">
                    <Database className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.trainingData")}
                  </TabsTrigger>
                  <TabsTrigger value="fine-tuning" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white" data-testid="tab-fine-tuning">
                    <Cpu className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.fineTuning")}
                  </TabsTrigger>
                  <TabsTrigger value="agent-instructions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-600 data-[state=active]:text-white" data-testid="tab-agent-instructions">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.agentInstructions")}
                  </TabsTrigger>
                  <TabsTrigger value="ab-test" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-violet-600 data-[state=active]:text-white" data-testid="tab-ab-test">
                    <FlaskConical className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.abTest")}
                  </TabsTrigger>
                  <TabsTrigger value="ai-provider" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-blue-600 data-[state=active]:text-white" data-testid="tab-ai-provider">
                    <Bot className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.aiProvider")}
                  </TabsTrigger>
                </>
              )}
              {activeCategory === "analytics" && (
                <>
                  <TabsTrigger value="messages" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white" data-testid="tab-messages">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.messages")}
                  </TabsTrigger>
                  <TabsTrigger value="spend-analysis" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white" data-testid="tab-spend-analysis">
                    <BarChart3 className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.spend")}
                  </TabsTrigger>
                  <TabsTrigger value="token-optimization" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600 data-[state=active]:text-white" data-testid="tab-token-optimization">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.tokenOpt")}
                  </TabsTrigger>
                  <TabsTrigger value="costs" className="data-[state=active]:bg-red-600 data-[state=active]:text-white" data-testid="tab-costs">
                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.costs")}
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white" data-testid="tab-performance">
                    <Activity className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.performance")}
                  </TabsTrigger>
                  <TabsTrigger value="conversation-review" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white" data-testid="tab-conversation-review">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.convReview")}
                  </TabsTrigger>
                </>
              )}
              {activeCategory === "limits" && (
                <>
                  <TabsTrigger value="limit-management" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white" data-testid="tab-limit-management">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.limitManagement")}
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white" data-testid="tab-packages">
                    <CreditCard className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.packages")}
                  </TabsTrigger>
                </>
              )}
              {activeCategory === "security" && (
                <>
                  <TabsTrigger value="guardrails" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white" data-testid="tab-guardrails">
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.guardrails")}
                  </TabsTrigger>
                  <TabsTrigger value="support-tickets" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white" data-testid="tab-support-tickets">
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.supportTickets")}
                  </TabsTrigger>
                  <TabsTrigger value="security-report" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-600 data-[state=active]:text-white" data-testid="tab-security-report">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.security")}
                  </TabsTrigger>
                  <TabsTrigger value="escalations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white" data-testid="tab-escalations">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.escalations")}
                  </TabsTrigger>
                  <TabsTrigger value="collaboration" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white" data-testid="tab-collaboration">
                    <Brain className="w-3.5 h-3.5 mr-1" />
                    {t("adminPage.tabs.collaboration")}
                  </TabsTrigger>
                </>
              )}
              {activeCategory === "help" && (
                <TabsTrigger value="admin-guide" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white" data-testid="tab-admin-guide">
                  <HelpCircle className="w-3.5 h-3.5 mr-1" />
                  {t("adminPage.categories.guide")}
                </TabsTrigger>
              )}
            </TabsList>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0A0E27]/90 to-transparent sm:hidden" />
            </div>
          </div>

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

          <TabsContent value="limit-management">
            <LimitManagementPanel token={token} />
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

          <TabsContent value="escalations">
            <EscalationsPanel token={token} autoOpenId={autoOpenEscalationId} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformancePanel token={token} />
          </TabsContent>

          <TabsContent value="conversation-review">
            <ConversationReviewPanel token={token} />
          </TabsContent>

          <TabsContent value="security-report">
            <SecurityReportPanel token={token} />
          </TabsContent>

          <TabsContent value="packages">
            <PackageManagementPanel token={token} />
          </TabsContent>

          <TabsContent value="agent-instructions">
            <AgentInstructionsPanel token={token} />
          </TabsContent>

          <TabsContent value="ab-test">
            <ABTestPanel token={token} />
          </TabsContent>

          <TabsContent value="ai-provider">
            <AIProviderPanel token={token} />
          </TabsContent>

          <TabsContent value="admin-guide">
            <AdminGuidePanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
