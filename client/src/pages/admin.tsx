import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, FileText, Link2, Trash2, RefreshCw, Cpu, ToggleLeft, ToggleRight, Lock, Brain, Database, Zap } from "lucide-react";

const AGENTS = [
  { slug: "customer-support", name: "Ava — Customer Support" },
  { slug: "sales-sdr", name: "Rex — Sales SDR" },
  { slug: "social-media", name: "Maya — Social Media" },
  { slug: "bookkeeping", name: "Finn — Bookkeeping" },
  { slug: "scheduling", name: "Cal — Scheduling" },
  { slug: "hr-recruiting", name: "Harper — HR & Recruiting" },
  { slug: "data-analyst", name: "DataBot — Data Analyst" },
  { slug: "ecommerce-ops", name: "ShopBot — E-Commerce" },
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
          <CardTitle className="text-2xl text-white">Admin Panel</CardTitle>
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

  useState(() => { fetchDocs(); });

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
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDocs}
            disabled={loading}
            data-testid="button-refresh-docs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-[#111633] rounded-lg border border-[#1E2448]"
                  data-testid={`document-item-${doc.id}`}
                >
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

  useState(() => { fetchJobs(); });

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
      const res = await fetch(`/api/admin/fine-tuning/${jobId}/sync`, {
        method: "POST",
        headers,
      });
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
      const res = await fetch(`/api/admin/agents/${agentType}/fine-tuning/deactivate`, {
        method: "POST",
        headers,
      });
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeactivate}
              className="text-xs border-[#1E2448] text-gray-400"
              data-testid="button-deactivate-all"
            >
              Reset to Base Model
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
              data-testid="button-refresh-jobs"
            >
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
                <div
                  key={job.id}
                  className="p-4 bg-[#111633] rounded-lg border border-[#1E2448] space-y-3"
                  data-testid={`ft-job-${job.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={statusColor(job.status)}>
                        {job.status}
                      </Badge>
                      {job.isActive && (
                        <Badge className="bg-green-900/30 text-green-400 border-green-800">
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSync(job.id)}
                        className="text-blue-400 hover:text-blue-300"
                        data-testid={`button-sync-${job.id}`}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" /> Sync
                      </Button>
                      {job.status === "succeeded" && !job.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivate(job.id)}
                          className="text-green-400 hover:text-green-300"
                          data-testid={`button-activate-${job.id}`}
                        >
                          <ToggleRight className="w-4 h-4 mr-1" /> Activate
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-400">
                      <span className="text-gray-500">File:</span> {job.trainingFile}
                    </p>
                    <p className="text-gray-400">
                      <span className="text-gray-500">Job ID:</span> {job.openaiJobId || "N/A"}
                    </p>
                    {job.fineTunedModel && (
                      <p className="text-gray-400">
                        <span className="text-gray-500">Model:</span>{" "}
                        <span className="text-green-400 font-mono text-xs">{job.fineTunedModel}</span>
                      </p>
                    )}
                    {job.error && (
                      <p className="text-red-400 text-xs mt-1">{job.error}</p>
                    )}
                    <p className="text-gray-500 text-xs">
                      Created: {new Date(job.createdAt).toLocaleString()}
                    </p>
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

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].slug);
  const [stats, setStats] = useState<AgentStats | null>(null);

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

  if (!token) {
    return <AdminLoginForm onLogin={handleLogin} />;
  }

  const selectedAgentName = AGENTS.find((a) => a.slug === selectedAgent)?.name || selectedAgent;

  return (
    <div className="min-h-screen bg-[#0A0E27] pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin — Agent Training</h1>
            <p className="text-gray-400 text-sm">RAG Knowledge Base & Fine-Tuning Management</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
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

        <Tabs defaultValue="rag" className="space-y-6">
          <TabsList className="bg-[#111633] border border-[#1E2448]">
            <TabsTrigger value="rag" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="tab-rag">
              Knowledge Base (RAG)
            </TabsTrigger>
            <TabsTrigger value="fine-tuning" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white" data-testid="tab-fine-tuning">
              Fine-Tuning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rag">
            <DocumentsPanel key={`docs-${selectedAgent}`} agentType={selectedAgent} token={token} />
          </TabsContent>

          <TabsContent value="fine-tuning">
            <FineTuningPanel key={`ft-${selectedAgent}`} agentType={selectedAgent} token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
