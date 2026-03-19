import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  LayoutTemplate,
  Activity,
  ChevronRight,
  Loader2,
  Webhook,
  Timer,
  Bot,
  Mail,
  FileText,
  Bell,
  Target,
  Package,
  BarChart3,
  Headphones,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface AutomationWorkflow {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, any>;
  nodes: any[];
  isActive: boolean;
  templateId: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  nametr: string;
  description: string;
  descriptionTr: string;
  category: string;
  icon: string;
  triggerType: string;
  nodeCount: number;
}

interface Execution {
  id: number;
  workflowId: number;
  status: string;
  triggerData: any;
  nodeResults: any[];
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

const categoryIcons: Record<string, any> = {
  finance: FileText,
  sales: Target,
  ecommerce: Package,
  management: BarChart3,
  communication: Mail,
  support: Headphones,
};

const categoryLabels: Record<string, string> = {
  finance: "Finans",
  sales: "Satış",
  ecommerce: "E-Ticaret",
  management: "Yönetim",
  communication: "İletişim",
  support: "Destek",
};

const triggerTypeLabels: Record<string, string> = {
  agent_tool_complete: "Ajan Aksiyonu",
  webhook: "Webhook",
  schedule: "Zamanlı",
  manual: "Manuel",
};

const triggerTypeIcons: Record<string, any> = {
  agent_tool_complete: Bot,
  webhook: Webhook,
  schedule: Timer,
  manual: Play,
};

export default function Automations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "templates" | "detail" | "create">("list");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: workflows = [], isLoading } = useQuery<AutomationWorkflow[]>({
    queryKey: ["/api/automations"],
    enabled: !!user,
  });

  const { data: templates = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/automations/templates"],
    enabled: !!user,
  });

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  const { data: executions = [] } = useQuery<Execution[]>({
    queryKey: ["/api/automations", selectedWorkflowId, "executions"],
    queryFn: async () => {
      const r = await fetch(`/api/automations/${selectedWorkflowId}/executions`);
      if (!r.ok) throw new Error("Failed to fetch executions");
      return r.json();
    },
    enabled: !!selectedWorkflowId && view === "detail",
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/automations/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: "Otomasyon güncellendi" });
    },
    onError: () => toast({ title: "Güncelleme başarısız", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setView("list");
      toast({ title: "Otomasyon silindi" });
    },
    onError: () => toast({ title: "Silme başarısız", variant: "destructive" }),
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", "/api/automations/from-template", { templateId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setView("list");
      toast({ title: "Otomasyon oluşturuldu", description: "Şablondan başarıyla oluşturuldu. Aktifleştirmek için düğmeye basın." });
    },
    onError: () => toast({ title: "Şablon oluşturma başarısız", variant: "destructive" }),
  });

  const executeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/automations/${id}/execute`, { data: {} });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automations", selectedWorkflowId, "executions"] });
      toast({
        title: data.success ? "Otomasyon çalıştırıldı" : "Otomasyon başarısız",
        description: data.error || "Başarıyla tamamlandı",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => toast({ title: "Çalıştırma başarısız", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/automations", {
        name: newName,
        description: newDescription || null,
        triggerType: "manual",
        triggerConfig: {},
        nodes: [
          { id: "trigger-1", type: "trigger", label: "Manuel Tetikleyici", config: {}, nextNodeId: "action-1" },
          { id: "action-1", type: "action", actionType: "log_action", label: "Aksiyon Kaydet", config: { description: "Manuel otomasyon çalıştırıldı" }, nextNodeId: null },
        ],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setView("list");
      setNewName("");
      setNewDescription("");
      toast({ title: "Otomasyon oluşturuldu" });
    },
    onError: () => toast({ title: "Oluşturma başarısız", variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center" data-testid="automations-login-prompt">
        <Card className="bg-gray-900/50 border-gray-800 max-w-md">
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Otomasyonlar</h2>
            <p className="text-gray-400 mb-6">Otomasyonları kullanmak için giriş yapın.</p>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="link-login-automations">Giriş Yap</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "templates") {
    const categories = [...new Set(templates.map((t) => t.category))];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setView("list")} data-testid="button-back-templates">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Şablon Galerisi</h1>
              <p className="text-gray-400 text-sm">Hazır otomasyon şablonlarından seçin</p>
            </div>
          </div>

          {categories.map((category) => {
            const CategoryIcon = categoryIcons[category] || Zap;
            const catTemplates = templates.filter((t) => t.category === category);
            return (
              <div key={category} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <CategoryIcon className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">{categoryLabels[category] || category}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catTemplates.map((template) => (
                    <Card key={template.id} className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors" data-testid={`card-template-${template.id}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-2xl">{template.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-sm">{template.nametr}</h3>
                            <p className="text-gray-400 text-xs mt-1">{template.descriptionTr}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                              {triggerTypeLabels[template.triggerType]}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                              {template.nodeCount} adım
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                            onClick={() => createFromTemplateMutation.mutate(template.id)}
                            disabled={createFromTemplateMutation.isPending}
                            data-testid={`button-use-template-${template.id}`}
                          >
                            {createFromTemplateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kullan"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setView("list")} data-testid="button-back-create">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Yeni Otomasyon</h1>
          </div>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">İsim</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Otomasyon adı..."
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-automation-name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Açıklama</label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Bu otomasyon ne yapar..."
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                  data-testid="input-automation-description"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName.trim() || createMutation.isPending}
                  data-testid="button-create-automation"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Oluştur
                </Button>
                <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setView("list")} data-testid="button-cancel-create">
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "detail" && selectedWorkflow) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => { setView("list"); setSelectedWorkflowId(null); }} data-testid="button-back-detail">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{selectedWorkflow.name}</h1>
              {selectedWorkflow.description && (
                <p className="text-gray-400 text-sm mt-1">{selectedWorkflow.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={selectedWorkflow.isActive}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: selectedWorkflow.id, isActive: checked })}
                data-testid="switch-workflow-active"
              />
              <span className="text-sm text-gray-400">{selectedWorkflow.isActive ? "Aktif" : "Pasif"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{selectedWorkflow.runCount}</p>
                  <p className="text-xs text-gray-400">Toplam Çalışma</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedWorkflow.lastRunAt ? new Date(selectedWorkflow.lastRunAt).toLocaleString("tr-TR") : "Hiç"}
                  </p>
                  <p className="text-xs text-gray-400">Son Çalışma</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 flex items-center gap-3">
                {(() => {
                  const TriggerIcon = triggerTypeIcons[selectedWorkflow.triggerType] || Zap;
                  return <TriggerIcon className="w-8 h-8 text-yellow-400" />;
                })()}
                <div>
                  <p className="text-sm font-medium text-white">{triggerTypeLabels[selectedWorkflow.triggerType] || selectedWorkflow.triggerType}</p>
                  <p className="text-xs text-gray-400">Tetikleyici Türü</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 mb-8">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => executeMutation.mutate(selectedWorkflow.id)}
              disabled={executeMutation.isPending}
              data-testid="button-execute-workflow"
            >
              {executeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Manuel Çalıştır
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Bu otomasyonu silmek istediğinizden emin misiniz?")) {
                  deleteMutation.mutate(selectedWorkflow.id);
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-workflow"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Sil
            </Button>
          </div>

          <Card className="bg-gray-900/50 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">Workflow Adımları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(selectedWorkflow.nodes as any[]).map((node: any, i: number) => (
                  <div key={node.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      node.type === "trigger" ? "bg-yellow-500/20 text-yellow-400" :
                      node.type === "condition" ? "bg-purple-500/20 text-purple-400" :
                      node.type === "delay" ? "bg-orange-500/20 text-orange-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{node.label}</p>
                      <p className="text-xs text-gray-500">
                        {node.type === "trigger" ? "Tetikleyici" : node.type === "condition" ? "Koşul" : node.type === "delay" ? "Bekleme" : node.actionType || "Aksiyon"}
                      </p>
                    </div>
                    {i < (selectedWorkflow.nodes as any[]).length - 1 && (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Çalışma Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-gray-500 text-sm">Henüz çalışma geçmişi yok.</p>
              ) : (
                <div className="space-y-3">
                  {executions.map((exec) => (
                    <div key={exec.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50" data-testid={`execution-${exec.id}`}>
                      {exec.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : exec.status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-white capitalize">{exec.status === "completed" ? "Başarılı" : exec.status === "failed" ? "Başarısız" : "Çalışıyor"}</p>
                        {exec.error && <p className="text-xs text-red-400 mt-0.5">{exec.error}</p>}
                      </div>
                      <p className="text-xs text-gray-500">{new Date(exec.startedAt).toLocaleString("tr-TR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              Otomasyonlar
            </h1>
            <p className="text-gray-400 text-sm mt-1">Ajan aksiyonlarını otomatik workflow'lara bağlayın</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:text-white"
              onClick={() => setView("templates")}
              data-testid="button-view-templates"
            >
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Şablonlar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setView("create")}
              data-testid="button-new-automation"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-12 text-center">
              <Zap className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Henüz otomasyon yok</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Ajan aksiyonlarını otomatik zincirlere bağlayın. Örneğin: fatura oluşturulunca e-posta gönder, yeni lead gelince takip planla.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => setView("templates")}
                  data-testid="button-browse-templates-empty"
                >
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  Şablonlara Göz At
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setView("create")}
                  data-testid="button-create-first-automation"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Otomasyonu Oluştur
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => {
              const TriggerIcon = triggerTypeIcons[workflow.triggerType] || Zap;
              return (
                <Card
                  key={workflow.id}
                  className="bg-gray-900/50 border-gray-800 hover:border-gray-700 cursor-pointer transition-all"
                  onClick={() => { setSelectedWorkflowId(workflow.id); setView("detail"); }}
                  data-testid={`card-workflow-${workflow.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TriggerIcon className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-semibold text-white text-sm">{workflow.name}</h3>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={workflow.isActive}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: workflow.id, isActive: checked })}
                          data-testid={`switch-active-${workflow.id}`}
                        />
                      </div>
                    </div>
                    {workflow.description && (
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{workflow.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant={workflow.isActive ? "default" : "secondary"} className={`text-xs ${workflow.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-700/50 text-gray-400"}`}>
                          {workflow.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                          {workflow.runCount} çalışma
                        </Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                    {workflow.lastRunAt && (
                      <p className="text-xs text-gray-600 mt-2">
                        Son: {new Date(workflow.lastRunAt).toLocaleString("tr-TR")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
