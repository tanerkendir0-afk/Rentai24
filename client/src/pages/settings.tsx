import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAnalytics } from "@/lib/analytics";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Building2,
  Shield,
  CreditCard,
  Bot,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Link2,
  Sparkles,
  ShoppingCart,
  Users,
  Plus,
  Trash2,
  Pencil,
  Phone,
  Briefcase,
  Bell,
  Package,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Smartphone,
  Copy,
  ExternalLink,
  Zap,
  Share2,
  FileText,
  Upload,
  Download,
  AlertTriangle,
  Database,
  Store,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Rental {
  id: number;
  agentType: string;
  agentName: string;
  plan: string;
  status: string;
  messagesUsed: number;
  messagesLimit: number;
}

interface SocialAccount {
  id: number;
  userId: number;
  platform: string;
  username: string;
  profileUrl: string | null;
  accessToken: string | null;
  accountType?: string;
  status: string;
  connectedAt: string;
}

interface ShippingProvider {
  id: number;
  userId: number;
  provider: string;
  apiKey: string;
  customerCode: string | null;
  username: string | null;
  password: string | null;
  accountNumber: string | null;
  siteId: string | null;
  hasCustomerCode?: boolean;
  hasUsername?: boolean;
  hasPassword?: boolean;
  hasAccountNumber?: boolean;
  hasSiteId?: boolean;
  status: string;
  createdAt: string;
  [key: string]: string | number | boolean | null | undefined;
}

function CrmDocumentsSection() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation("pages");
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/crm-documents"],
  });

  const getFileExtension = (fileName: string): string => {
    const parts = fileName.toLowerCase().split(".");
    return parts.length > 1 ? parts[parts.length - 1] : "";
  };

  const isAllowedFile = (file: File): boolean => {
    const allowedMimeTypes = [
      "application/pdf", "text/plain", "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (file.type && allowedMimeTypes.includes(file.type)) return true;

    const allowedExtensions = ["pdf", "txt", "csv", "xlsx", "xls", "doc", "docx"];
    const ext = getFileExtension(file.name);
    return allowedExtensions.includes(ext);
  };

  const isTextFile = (file: File): boolean => {
    const textMimeTypes = ["text/plain", "text/csv"];
    if (file.type && textMimeTypes.includes(file.type)) return true;
    const textExtensions = ["txt", "csv"];
    return textExtensions.includes(getFileExtension(file.name));
  };

  const resolveFileType = (file: File): string => {
    const extMap: Record<string, string> = {
      pdf: "application/pdf",
      txt: "text/plain",
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
    };
    const ext = getFileExtension(file.name);
    return extMap[ext] || file.type || "application/octet-stream";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: t("settingsPage.crmDocuments.fileSizeExceeded"), description: t("settingsPage.crmDocuments.maxFileSize"), variant: "destructive" });
      e.target.value = "";
      return;
    }

    if (!isAllowedFile(file)) {
      const ext = getFileExtension(file.name);
      toast({
        title: t("settingsPage.crmDocuments.unsupportedFormat"),
        description: t("settingsPage.crmDocuments.unsupportedFormatDesc", { ext: ext || t("settingsPage.crmDocuments.unknownFormat") }),
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onerror = () => {
        toast({ title: t("settingsPage.crmDocuments.readError"), description: t("settingsPage.crmDocuments.readErrorDesc"), variant: "destructive" });
        setUploading(false);
        e.target.value = "";
      };
      reader.onload = async () => {
        try {
          const content = reader.result as string;
          const fileType = resolveFileType(file);
          const res = await apiRequest("POST", "/api/crm-documents", {
            fileName: `${Date.now()}_${file.name}`,
            originalName: file.name,
            fileType,
            fileSize: file.size,
            content,
            encoding: isTextFile(file) ? "text" : "base64",
          });
          if (res.ok) {
            toast({ title: t("settingsPage.crmDocuments.uploaded"), description: t("settingsPage.crmDocuments.uploadedDesc", { name: file.name }) });
            queryClient.invalidateQueries({ queryKey: ["/api/crm-documents"] });
          } else {
            toast({ title: t("settingsPage.crmDocuments.serverError"), description: t("settingsPage.crmDocuments.serverErrorDesc"), variant: "destructive" });
          }
        } catch (err) {
          toast({ title: t("settingsPage.crmDocuments.uploadError"), description: t("settingsPage.crmDocuments.uploadErrorDesc"), variant: "destructive" });
        }
        setUploading(false);
        e.target.value = "";
      };
      if (isTextFile(file)) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (err) {
      toast({ title: t("settingsPage.crmDocuments.uploadError"), description: t("settingsPage.crmDocuments.uploadErrorDesc"), variant: "destructive" });
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      const res = await apiRequest("DELETE", `/api/crm-documents/${id}`);
      if (res.ok) {
        toast({ title: t("settingsPage.crmDocuments.deleted"), description: t("settingsPage.crmDocuments.deletedDesc", { name }) });
        queryClient.invalidateQueries({ queryKey: ["/api/crm-documents"] });
      }
    } catch (err) {
      toast({ title: t("settingsPage.crmDocuments.deleteError"), description: t("settingsPage.crmDocuments.deleteErrorDesc"), variant: "destructive" });
    }
  };

  const handleDownload = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/crm-documents/${id}/download`, { credentials: "include" });
      if (!res.ok) {
        toast({ title: t("settingsPage.crmDocuments.downloadError"), description: t("settingsPage.crmDocuments.downloadErrorDesc"), variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: t("settingsPage.crmDocuments.downloadError"), description: t("settingsPage.crmDocuments.downloadErrorDesc"), variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-crm-documents">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.crmDocuments.title")}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {t("settingsPage.crmDocuments.description")}
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer" data-testid="button-upload-crm-document">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.txt,.csv,.xlsx,.xls,.doc,.docx,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,*/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-400/50 hover:border-blue-400 hover:bg-blue-500/5 transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-blue-400" />}
              <span className="text-sm">{uploading ? t("settingsPage.crmDocuments.uploading") : t("settingsPage.crmDocuments.uploadDocument")}</span>
            </div>
          </label>
          <span className="text-xs text-muted-foreground">{t("settingsPage.crmDocuments.fileTypes")}</span>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("settingsPage.crmDocuments.noDocuments")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
                data-testid={`crm-document-${doc.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(doc.fileSize)} — {new Date(doc.uploadedAt).toLocaleDateString(i18n.language === "tr" ? "tr-TR" : "en-US")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.id, doc.originalName)}
                    className="text-blue-400 hover:text-blue-300"
                    data-testid={`button-download-crm-document-${doc.id}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.originalName)}
                    className="text-red-400 hover:text-red-300"
                    data-testid={`button-delete-crm-document-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function LanguagePreferenceCard() {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation("common");
  const { toast } = useToast();

  const handleLanguageChange = async (lng: string) => {
    try {
      await changeLanguage(lng);
      toast({
        title: t("language.saved"),
        description: t("language.savedDesc"),
      });
    } catch {
      toast({
        title: t("footer.errorToast"),
        description: t("language.savedDesc"),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-language">
      <div className="flex items-center gap-2 mb-5">
        <Languages className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-foreground">{t("language.preference")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("language.preferenceDesc")}</p>
      <div className="flex gap-3">
        <Button
          variant={language === "en" ? "default" : "outline"}
          className={language === "en" ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""}
          onClick={() => handleLanguageChange("en")}
          data-testid="button-language-en"
        >
          {t("language.english")}
        </Button>
        <Button
          variant={language === "tr" ? "default" : "outline"}
          className={language === "tr" ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""}
          onClick={() => handleLanguageChange("tr")}
          data-testid="button-language-tr"
        >
          {t("language.turkish")}
        </Button>
        <Button
          variant={language === "zh" ? "default" : "outline"}
          className={language === "zh" ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" : ""}
          onClick={() => handleLanguageChange("zh")}
          data-testid="button-language-zh"
        >
          {t("language.chinese")}
        </Button>
      </div>
    </Card>
  );
}

function MarketplaceConnectionsCard() {
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState<"trendyol" | "shopify">("trendyol");
  const [storeName, setStoreName] = useState("");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [testingId, setTestingId] = useState<number | null>(null);

  const { data: connectionsData, isLoading } = useQuery<{ connections: any[] }>({
    queryKey: ["/api/marketplace/connections"],
  });

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest("POST", "/api/marketplace/connections", body);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || "Bağlantı oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/connections"] });
      setShowForm(false);
      setCreds({});
      setStoreName("");
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/marketplace/connections/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bağlantı kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/connections"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      setTestingId(id);
      const res = await apiRequest("POST", `/api/marketplace/connections/${id}/test`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.success ? "Bağlantı başarılı" : "Bağlantı hatası", description: data.message, variant: data.success ? "default" : "destructive" });
      setTestingId(null);
    },
    onError: (err: any) => {
      toast({ title: "Test hatası", description: err.message, variant: "destructive" });
      setTestingId(null);
    },
  });

  const handleSubmit = () => {
    if (platform === "trendyol" && (!creds.sellerId || !creds.apiKey || !creds.apiSecret)) {
      toast({ title: "Tüm alanları doldurun", variant: "destructive" });
      return;
    }
    if (platform === "shopify" && (!creds.storeUrl || !creds.accessToken)) {
      toast({ title: "Tüm alanları doldurun", variant: "destructive" });
      return;
    }
    createMutation.mutate({ platform, storeName, credentials: creds });
  };

  const connections = connectionsData?.connections || [];

  return (
    <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-marketplace-connections">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-foreground">Pazaryeri Bağlantıları</h2>
          {connections.length > 0 && (
            <Badge variant="secondary" className="text-xs">{connections.length}</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-marketplace"
        >
          <Plus className="w-4 h-4 mr-1" />
          Bağlantı Ekle
        </Button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={platform === "trendyol" ? "default" : "outline"}
              onClick={() => { setPlatform("trendyol"); setCreds({}); }}
              data-testid="button-platform-trendyol"
            >
              Trendyol
            </Button>
            <Button
              size="sm"
              variant={platform === "shopify" ? "default" : "outline"}
              onClick={() => { setPlatform("shopify"); setCreds({}); }}
              data-testid="button-platform-shopify"
            >
              Shopify
            </Button>
          </div>

          <div>
            <Label>Mağaza Adı</Label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Mağazanızın adı"
              data-testid="input-marketplace-store-name"
            />
          </div>

          {platform === "trendyol" ? (
            <>
              <div>
                <Label>Satıcı ID (Seller ID)</Label>
                <Input
                  value={creds.sellerId || ""}
                  onChange={(e) => setCreds({ ...creds, sellerId: e.target.value })}
                  placeholder="Trendyol Satıcı ID"
                  data-testid="input-trendyol-seller-id"
                />
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  value={creds.apiKey || ""}
                  onChange={(e) => setCreds({ ...creds, apiKey: e.target.value })}
                  placeholder="Trendyol API Key"
                  data-testid="input-trendyol-api-key"
                />
              </div>
              <div>
                <Label>API Secret</Label>
                <Input
                  type="password"
                  value={creds.apiSecret || ""}
                  onChange={(e) => setCreds({ ...creds, apiSecret: e.target.value })}
                  placeholder="Trendyol API Secret"
                  data-testid="input-trendyol-api-secret"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Mağaza URL</Label>
                <Input
                  value={creds.storeUrl || ""}
                  onChange={(e) => setCreds({ ...creds, storeUrl: e.target.value })}
                  placeholder="magazaniz.myshopify.com"
                  data-testid="input-shopify-store-url"
                />
              </div>
              <div>
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={creds.accessToken || ""}
                  onChange={(e) => setCreds({ ...creds, accessToken: e.target.value })}
                  placeholder="Shopify Access Token"
                  data-testid="input-shopify-access-token"
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              data-testid="button-save-marketplace"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Kaydet
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
              data-testid="button-cancel-marketplace"
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Henüz bağlı pazaryeri yok. Trendyol veya Shopify mağazanızı bağlayın.
        </p>
      ) : (
        <div className="space-y-3">
          {connections.map((conn: any) => (
            <div
              key={conn.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-background/50"
              data-testid={`marketplace-connection-${conn.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${conn.platform === "trendyol" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
                  {conn.platform === "trendyol" ? "TY" : "SP"}
                </div>
                <div>
                  <p className="font-medium text-sm">{conn.storeName || conn.platform}</p>
                  <p className="text-xs text-muted-foreground capitalize">{conn.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testMutation.mutate(conn.id)}
                  disabled={testingId === conn.id}
                  data-testid={`button-test-marketplace-${conn.id}`}
                >
                  {testingId === conn.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(conn.id)}
                  data-testid={`button-delete-marketplace-${conn.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface OrgData {
  organization: {
    id: number;
    name: string;
    logoUrl: string | null;
    ownerId: number;
    createdAt: string;
  } | null;
  members: Array<{
    id: number;
    orgId: number;
    userId: number;
    role: string;
    joinedAt: string;
    user: { id: number; fullName: string; email: string };
  }>;
  invitations: Array<{
    id: number;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    createdAt: string;
  }>;
  role: string;
}

function OrganizationCard({ userId }: { userId: number }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [orgNameEdit, setOrgNameEdit] = useState("");
  const [roleDialogMember, setRoleDialogMember] = useState<OrgData["members"][0] | null>(null);
  const [newRole, setNewRole] = useState("member");
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  const { data: orgData, isLoading: orgLoading } = useQuery<OrgData>({
    queryKey: ["/api/organization"],
    enabled: true,
  });

  const createOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/organization", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      setShowCreate(false);
      setCreateName("");
      toast({ title: "Organizasyon oluşturuldu" });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PATCH", "/api/organization", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      setEditingOrgName(false);
      toast({ title: "Organizasyon adı güncellendi" });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await apiRequest("POST", "/api/organization/invite", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteRole("member");
      toast({ title: "Davet gönderildi", description: "Kullanıcıya e-posta ile davet gönderildi." });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/organization/invitations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Davet iptal edildi" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/organization/members/${id}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      setRoleDialogMember(null);
      toast({ title: "Rol güncellendi" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/organization/members/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      setRemovingMemberId(null);
      toast({ title: "Üye çıkarıldı" });
    },
  });

  const isOwner = orgData?.organization?.ownerId === userId;

  if (orgLoading) {
    return (
      <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-team-members">
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!orgData?.organization) {
    return (
      <Card className="p-4 sm:p-6 bg-card border-border/50 border-dashed" data-testid="card-team-members">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Organizasyon</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
            Bir organizasyon oluşturarak ekip üyelerinizi davet edin ve AI çalışanlarınızı birlikte yönetin.
          </p>
          {showCreate ? (
            <div className="max-w-sm mx-auto space-y-3">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Organizasyon adı"
                data-testid="input-org-name-create"
              />
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  onClick={() => createName.trim() && createOrgMutation.mutate(createName.trim())}
                  disabled={createOrgMutation.isPending}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
                  data-testid="button-create-org-submit"
                >
                  {createOrgMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Building2 className="w-4 h-4 mr-1" />Oluştur</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} data-testid="button-create-org-cancel">
                  İptal
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
              data-testid="button-create-org"
            >
              <Plus className="w-4 h-4 mr-2" />
              Organizasyon Oluştur
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const org = orgData.organization;
  const members = orgData.members || [];
  const invitations = orgData.invitations || [];

  return (
    <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-team-members">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-foreground">Organizasyon</h2>
          <Badge variant="secondary" className="ml-1 text-xs" data-testid="badge-team-count">{members.length + 1} üye</Badge>
        </div>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
            onClick={() => setShowInviteForm(!showInviteForm)}
            data-testid="button-invite-member"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />Üye Davet Et
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          {editingOrgName ? (
            <div className="flex items-center gap-2">
              <Input
                value={orgNameEdit}
                onChange={(e) => setOrgNameEdit(e.target.value)}
                className="h-7 text-sm"
                data-testid="input-org-name-edit"
              />
              <Button
                size="sm"
                className="h-7 text-xs bg-violet-500 text-white border-0"
                onClick={() => orgNameEdit.trim() && updateOrgMutation.mutate(orgNameEdit.trim())}
                disabled={updateOrgMutation.isPending}
                data-testid="button-save-org-name"
              >
                {updateOrgMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingOrgName(false)}>
                İptal
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-sm" data-testid="text-org-name">{org.name}</p>
              {isOwner && (
                <button
                  onClick={() => { setOrgNameEdit(org.name); setEditingOrgName(true); }}
                  className="p-1 rounded hover:bg-violet-500/10 text-muted-foreground hover:text-violet-400 transition-colors"
                  data-testid="button-edit-org-name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {isOwner ? "Sahibi" : (orgData.role === "admin" ? "Yönetici" : "Üye")}
          </p>
        </div>
      </div>

      {isOwner && showInviteForm && (
        <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-violet-500/20 space-y-3">
          <p className="text-sm font-medium text-foreground">Yeni Üye Davet Et</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">E-posta *</Label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="kullanici@sirket.com"
                className="mt-1 h-8 text-sm"
                data-testid="input-invite-email"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rol</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1 h-8 text-sm" data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Üye</SelectItem>
                  <SelectItem value="admin">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => inviteEmail.trim() && inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole })}
              disabled={inviteMutation.isPending}
              className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Davet Gönder
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowInviteForm(false)} data-testid="button-cancel-invite-form">
              İptal
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Aktif Üyeler</p>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50" data-testid={`card-member-owner`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{members.find(m => m.userId === org.ownerId)?.user?.fullName || "Sen"}</p>
              <p className="text-xs text-muted-foreground">Sahip</p>
            </div>
          </div>
          <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/30 text-xs">Sahip</Badge>
        </div>

        {members.filter(m => m.userId !== org.ownerId).map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 group" data-testid={`card-member-${member.id}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground" data-testid={`text-member-name-${member.id}`}>{member.user.fullName}</p>
                <p className="text-xs text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>{member.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`text-xs ${member.role === "admin" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"}`} data-testid={`badge-member-role-${member.id}`}>
                {member.role === "admin" ? "Yönetici" : "Üye"}
              </Badge>
              {isOwner && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setRoleDialogMember({ ...member, id: member.userId }); setNewRole(member.role); }}
                    className="p-1.5 rounded hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors"
                    title="Rol Değiştir"
                    data-testid={`button-change-role-${member.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRemovingMemberId(member.userId)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Üyeyi Çıkar"
                    data-testid={`button-remove-member-${member.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOwner && invitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Bekleyen Davetler</p>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-dashed border-border/50" data-testid={`card-invitation-${inv.id}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" data-testid={`text-invite-email-${inv.id}`}>{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.role === "admin" ? "Yönetici" : "Üye"} · {new Date(inv.expiresAt) > new Date() ? "Bekliyor" : "Süresi doldu"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">Bekliyor</Badge>
                <button
                  onClick={() => cancelInviteMutation.mutate(inv.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  title="İptal Et"
                  data-testid={`button-cancel-invite-${inv.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {roleDialogMember && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRoleDialogMember(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="dialog-change-role">
            <h3 className="font-semibold text-foreground mb-4">Rol Değiştir</h3>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>{roleDialogMember.user.fullName}</strong> için yeni rol seçin:
            </p>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger data-testid="select-new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Üye</SelectItem>
                <SelectItem value="admin">Yönetici</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
                onClick={() => updateRoleMutation.mutate({ id: roleDialogMember.id, role: newRole })}
                disabled={updateRoleMutation.isPending}
                data-testid="button-confirm-role-change"
              >
                {updateRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Güncelle"}
              </Button>
              <Button variant="outline" onClick={() => setRoleDialogMember(null)} data-testid="button-cancel-role-change">İptal</Button>
            </div>
          </div>
        </div>
      )}

      {removingMemberId !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRemovingMemberId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="dialog-remove-member">
            <h3 className="font-semibold text-foreground mb-2">Üyeyi Çıkar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Bu üyeyi organizasyondan çıkarmak istediğinizden emin misiniz?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => removeMemberMutation.mutate(removingMemberId)}
                disabled={removeMemberMutation.isPending}
                data-testid="button-confirm-remove-member"
              >
                {removeMemberMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Çıkar"}
              </Button>
              <Button variant="outline" onClick={() => setRemovingMemberId(null)} data-testid="button-cancel-remove-member">İptal</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation("pages");
  const { trackEvent } = useAnalytics();

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [profileIndustry, setProfileIndustry] = useState("");
  const [profileCompanySize, setProfileCompanySize] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileIntendedAgents, setProfileIntendedAgents] = useState<string[]>([]);
  const [profileReferralSource, setProfileReferralSource] = useState("");
  const [enrichmentSaving, setEnrichmentSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);
  const [gmailReconnecting, setGmailReconnecting] = useState(false);
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [appPasswordForm, setAppPasswordForm] = useState({ gmailAddress: "", gmailAppPassword: "" });
  const [appPasswordSaving, setAppPasswordSaving] = useState(false);
  const [showAppPass, setShowAppPass] = useState(false);


  const [showAddSocial, setShowAddSocial] = useState(false);
  const [socialForm, setSocialForm] = useState({ platform: "", username: "", profileUrl: "", accountType: "personal" as "personal" | "business", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "", pageId: "", businessAccountId: "" });

  const [showAddShipping, setShowAddShipping] = useState(false);
  const [shippingForm, setShippingForm] = useState({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" });
  const [showShippingApiKey, setShowShippingApiKey] = useState(false);

  const [showWhatsappSetup, setShowWhatsappSetup] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({ phoneNumberId: "", businessAccountId: "", accessToken: "", verifyToken: "", displayName: "" });
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappTesting, setWhatsappTesting] = useState(false);

  const [editingSecretId, setEditingSecretId] = useState<number | null>(null);
  const [secretForm, setSecretForm] = useState<Record<string, string>>({});
  const [secretSaving, setSecretSaving] = useState(false);
  const [visibleSecretFields, setVisibleSecretFields] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setCompany(user.company || "");
      setProfileIndustry(user.industry || "");
      setProfileCompanySize(user.companySize || "");
      setProfileCountry(user.country || "");
      setProfileIntendedAgents(user.intendedAgents || []);
      setProfileReferralSource(user.referralSource || "");
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  // Auto-scroll to section from URL param (e.g., /settings?tab=organization)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      const sectionMap: Record<string, string> = { organization: "team-members", team: "team-members" };
      const sectionId = sectionMap[tab] || tab;
      setTimeout(() => {
        const el = document.querySelector(`[data-testid="card-${sectionId}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }, []);

  const { data: rentals } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
    enabled: !!user,
  });

  const { data: emailStatus } = useQuery<{ provider: string; address: string | null; connected: boolean; canRead?: boolean; canSend?: boolean }>({
    queryKey: ["/api/email-status"],
    enabled: !!user,
  });

  const { data: subscriptionData } = useQuery<{ subscription: any }>({
    queryKey: ["/api/stripe/subscription"],
    enabled: !!user,
  });

  const { data: creditsData } = useQuery<{ credits: number }>({
    queryKey: ["/api/image-credits"],
    enabled: !!user,
  });

  const { data: gmailSettings } = useQuery<{ gmailAddress: string | null; hasOAuth: boolean; hasAppPassword: boolean }>({
    queryKey: ["/api/settings/gmail"],
    enabled: !!user,
  });

  const { data: socialAccountsData, isLoading: socialLoading } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social-accounts"],
    enabled: !!user,
  });

  const { data: shippingProvidersData, isLoading: shippingLoading } = useQuery<ShippingProvider[]>({
    queryKey: ["/api/shipping-providers"],
    enabled: !!user,
  });

  const { data: whatsappData, isLoading: whatsappLoading } = useQuery<{
    connected: boolean;
    phoneNumberId?: string;
    businessAccountId?: string;
    displayName?: string;
    hasAccessToken?: boolean;
    hasVerifyToken?: boolean;
    status?: string;
  }>({
    queryKey: ["/api/whatsapp/config"],
    enabled: !!user,
  });

  const { data: creditPrices } = useQuery<{ id: string; credits: number; amount: number; currency: string }[]>({
    queryKey: ["/api/image-credits/prices"],
    enabled: !!user,
  });

  const [selectedCreditPkg, setSelectedCreditPkg] = useState<string | null>(null);
  const [creditCard, setCreditCard] = useState({ number: "", expiry: "", cvc: "" });
  const [creditPurchasing, setCreditPurchasing] = useState(false);

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
        toast({ title: t("settingsPage.toast.creditsPurchased"), description: data.message });
      }
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.purchaseFailed"), description: err.message || t("settingsPage.toast.failedPurchaseCredits"), variant: "destructive" });
    } finally {
      setCreditPurchasing(false);
    }
  };

  const profileMutation = useMutation({
    mutationFn: async (data: { fullName: string; company: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      trackEvent("profile_updated", "settings", { fields: ["fullName", "company"] });
      toast({ title: t("settingsPage.toast.profileUpdated"), description: t("settingsPage.toast.profileSaved") });
    },
    onError: (err: any) => {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedUpdateProfile"), variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/password", data);
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      trackEvent("password_changed", "settings");
      toast({ title: t("settingsPage.toast.passwordChanged"), description: t("settingsPage.toast.passwordUpdated") });
    },
    onError: (err: any) => {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedChangePassword"), variant: "destructive" });
    },
  });

  const handleAddSocialAccount = async () => {
    if (!socialForm.platform || !socialForm.username.trim()) {
      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.platformUsernameRequired"), variant: "destructive" });
      return;
    }
    try {
      const payload: any = {
        platform: socialForm.platform,
        username: socialForm.username.trim().replace(/^@/, ""),
        profileUrl: socialForm.profileUrl.trim() || null,
        accountType: socialForm.accountType,
      };
      if (socialForm.accountType === "business") {
        if (socialForm.apiKey.trim()) payload.apiKey = socialForm.apiKey.trim();
        if (socialForm.apiSecret.trim()) payload.apiSecret = socialForm.apiSecret.trim();
        if (socialForm.accessToken.trim()) payload.accessToken = socialForm.accessToken.trim();
        if (socialForm.accessTokenSecret.trim()) payload.accessTokenSecret = socialForm.accessTokenSecret.trim();
        if (socialForm.pageId.trim()) payload.pageId = socialForm.pageId.trim();
        if (socialForm.businessAccountId.trim()) payload.businessAccountId = socialForm.businessAccountId.trim();
      }
      await apiRequest("POST", "/api/social-accounts", payload);
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      setSocialForm({ platform: "", username: "", profileUrl: "", accountType: "personal", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "", pageId: "", businessAccountId: "" });
      setShowAddSocial(false);
      toast({ title: t("settingsPage.toast.accountConnected"), description: t("settingsPage.toast.accountConnectedDesc", { platform: socialForm.platform, username: socialForm.username.replace(/^@/, "") }) });
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedAddAccount"), variant: "destructive" });
    }
  };

  const handleDeleteSocialAccount = async (id: number, platform: string, username: string) => {
    try {
      await apiRequest("DELETE", `/api/social-accounts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/social-accounts"] });
      toast({ title: t("settingsPage.toast.accountRemoved"), description: t("settingsPage.toast.accountRemovedDesc", { platform, username }) });
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedRemoveAccount"), variant: "destructive" });
    }
  };

  const shippingProviderConfig: Record<string, { name: string; icon: string; color: string; bgColor: string; fields: string[]; guide: string }> = {
    aras: { name: "Aras Kargo", icon: "📦", color: "text-orange-400", bgColor: "bg-orange-500/10",
      fields: ["apiKey", "customerCode"],
      guide: "Aras Kargo API panel: araskargoapi.com > Developer > API Keys" },
    yurtici: { name: "Yurtici Kargo", icon: "🚛", color: "text-blue-400", bgColor: "bg-blue-500/10",
      fields: ["apiKey", "username", "password"],
      guide: "Yurtici Kargo API: yurticikargo.com > Kurumsal > API Entegrasyonu" },
    mng: { name: "MNG Kargo", icon: "📮", color: "text-red-400", bgColor: "bg-red-500/10",
      fields: ["apiKey", "customerCode"],
      guide: "MNG Kargo API: mngkargo.com.tr > Kurumsal > API Basvuru" },
    surat: { name: "Surat Kargo", icon: "⚡", color: "text-yellow-400", bgColor: "bg-yellow-500/10",
      fields: ["apiKey", "customerCode"],
      guide: "Surat Kargo API: suratkargo.com.tr > Kurumsal > Teknoloji" },
    ptt: { name: "PTT Kargo", icon: "🏤", color: "text-amber-400", bgColor: "bg-amber-500/10",
      fields: ["apiKey", "username"],
      guide: "PTT Kargo API: ptt.gov.tr > e-Hizmetler > API Basvuru" },
    ups: { name: "UPS", icon: "🟤", color: "text-amber-600", bgColor: "bg-amber-600/10",
      fields: ["apiKey", "username", "password"],
      guide: "UPS Developer Kit: developer.ups.com > Apps > Create App" },
    fedex: { name: "FedEx", icon: "📬", color: "text-purple-400", bgColor: "bg-purple-500/10",
      fields: ["apiKey", "accountNumber"],
      guide: "FedEx Developer: developer.fedex.com > My Apps > Create API Key" },
    dhl: { name: "DHL", icon: "✈️", color: "text-yellow-500", bgColor: "bg-yellow-600/10",
      fields: ["apiKey", "siteId"],
      guide: "DHL Developer: developer.dhl.com > MyDHL API > Get Started" },
  };

  const shippingFieldLabels: Record<string, string> = {
    apiKey: t("settingsPage.shipping.fieldLabels.apiKey"),
    customerCode: t("settingsPage.shipping.fieldLabels.customerCode"),
    username: t("settingsPage.shipping.fieldLabels.username"),
    password: t("settingsPage.shipping.fieldLabels.password"),
    accountNumber: t("settingsPage.shipping.fieldLabels.accountNumber"),
    siteId: t("settingsPage.shipping.fieldLabels.siteId"),
  };

  const handleAddShippingProvider = async () => {
    if (!shippingForm.provider || !shippingForm.apiKey.trim()) {
      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.providerApiKeyRequired"), variant: "destructive" });
      return;
    }
    try {
      const body: any = { provider: shippingForm.provider, apiKey: shippingForm.apiKey.trim() };
      if (shippingForm.customerCode.trim()) body.customerCode = shippingForm.customerCode.trim();
      if (shippingForm.username.trim()) body.username = shippingForm.username.trim();
      if (shippingForm.password.trim()) body.password = shippingForm.password.trim();
      if (shippingForm.accountNumber.trim()) body.accountNumber = shippingForm.accountNumber.trim();
      if (shippingForm.siteId.trim()) body.siteId = shippingForm.siteId.trim();
      await apiRequest("POST", "/api/shipping-providers", body);
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
      setShippingForm({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" });
      setShowAddShipping(false);
      const cfg = shippingProviderConfig[shippingForm.provider];
      toast({ title: t("settingsPage.toast.providerConnected"), description: t("settingsPage.toast.providerConnectedDesc", { name: cfg?.name || shippingForm.provider }) });
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedAddProvider"), variant: "destructive" });
    }
  };

  const handleUpdateSecret = async (id: number, providerKey: string) => {
    const nonEmpty: Record<string, string> = {};
    for (const [k, v] of Object.entries(secretForm)) {
      if (v.trim()) nonEmpty[k] = v.trim();
    }
    if (Object.keys(nonEmpty).length === 0) {
      toast({ title: t("settingsPage.toast.noChanges"), description: t("settingsPage.toast.enterFieldToUpdate"), variant: "destructive" });
      return;
    }
    setSecretSaving(true);
    try {
      await apiRequest("PATCH", `/api/shipping-providers/${id}`, nonEmpty);
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
      setEditingSecretId(null);
      setSecretForm({});
      setVisibleSecretFields({});
      const cfg = shippingProviderConfig[providerKey];
      toast({ title: t("settingsPage.toast.secretsUpdated"), description: t("settingsPage.toast.secretsUpdatedDesc", { name: cfg?.name || providerKey }) });
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedUpdateSecrets"), variant: "destructive" });
    } finally {
      setSecretSaving(false);
    }
  };

  const handleDeleteShippingProvider = async (id: number, providerKey: string) => {
    const cfg = shippingProviderConfig[providerKey];
    try {
      await apiRequest("DELETE", `/api/shipping-providers/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-providers"] });
      toast({ title: t("settingsPage.toast.providerRemoved"), description: t("settingsPage.toast.providerRemovedDesc", { name: cfg?.name || providerKey }) });
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedRemoveProvider"), variant: "destructive" });
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsappForm.phoneNumberId.trim() || !whatsappForm.accessToken.trim() || !whatsappForm.verifyToken.trim()) {
      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.whatsappRequired"), variant: "destructive" });
      return;
    }
    setWhatsappSaving(true);
    try {
      await apiRequest("POST", "/api/whatsapp/config", {
        phoneNumberId: whatsappForm.phoneNumberId.trim(),
        businessAccountId: whatsappForm.businessAccountId.trim() || null,
        accessToken: whatsappForm.accessToken.trim(),
        verifyToken: whatsappForm.verifyToken.trim(),
        displayName: whatsappForm.displayName.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
      setShowWhatsappSetup(false);
      toast({ title: t("settingsPage.toast.whatsappConnected"), description: t("settingsPage.toast.whatsappConfigured") });
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedSaveWhatsapp"), variant: "destructive" });
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleTestWhatsapp = async () => {
    setWhatsappTesting(true);
    try {
      const res = await apiRequest("POST", "/api/whatsapp/test");
      const data = await res.json();
      if (data.success) {
        toast({ title: t("settingsPage.toast.connectionSuccessful"), description: `Phone: ${data.phone}${data.name ? ` (${data.name})` : ""}` });
      } else {
        toast({ title: t("settingsPage.toast.connectionFailed"), description: data.error || t("settingsPage.toast.couldNotVerifyWhatsapp"), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.testFailed"), description: err.message || t("settingsPage.toast.connectionTestFailed"), variant: "destructive" });
    } finally {
      setWhatsappTesting(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    try {
      await apiRequest("DELETE", "/api/whatsapp/config");
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
      setWhatsappForm({ phoneNumberId: "", businessAccountId: "", accessToken: "", verifyToken: "", displayName: "" });
      toast({ title: t("settingsPage.toast.whatsappDisconnected"), description: t("settingsPage.toast.whatsappRemoved") });
    } catch (err: any) {
      toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedDisconnectWhatsapp"), variant: "destructive" });
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/whatsapp/webhook`;
    navigator.clipboard.writeText(url);
    toast({ title: t("settingsPage.toast.copied"), description: t("settingsPage.toast.webhookCopied") });
  };

  const platformConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
    instagram: { icon: "📸", color: "text-pink-400", bgColor: "bg-pink-500/10" },
    twitter: { icon: "𝕏", color: "text-sky-400", bgColor: "bg-sky-500/10" },
    linkedin: { icon: "💼", color: "text-blue-400", bgColor: "bg-blue-500/10" },
    facebook: { icon: "📘", color: "text-blue-500", bgColor: "bg-blue-600/10" },
    tiktok: { icon: "🎵", color: "text-rose-400", bgColor: "bg-rose-500/10" },
    youtube: { icon: "▶️", color: "text-red-400", bgColor: "bg-red-500/10" },
  };

  const handleProfileSave = () => {
    if (!fullName.trim()) {
      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.fullNameRequired"), variant: "destructive" });
      return;
    }
    profileMutation.mutate({ fullName: fullName.trim(), company: company.trim() });
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.fillPasswordFields"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.passwordMinLength"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.passwordsDoNotMatch"), variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  if (authLoading || !user) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRentals = rentals?.filter((r) => r.status === "active") || [];
  const totalMessages = activeRentals.reduce((sum, r) => sum + r.messagesUsed, 0);
  const totalLimit = activeRentals.reduce((sum, r) => sum + r.messagesLimit, 0);
  const subscription = subscriptionData?.subscription;
  const planName = subscription?.metadata?.plan
    ? subscription.metadata.plan.charAt(0).toUpperCase() + subscription.metadata.plan.slice(1)
    : null;

  const settingsSections = [
    { id: "profile", label: t("settingsPage.nav.profile"), icon: User },
    { id: "language", label: t("settingsPage.nav.language"), icon: Languages },
    { id: "integrations", label: t("settingsPage.nav.integrations"), icon: Link2 },
    { id: "personal-gmail", label: t("settingsPage.nav.gmail"), icon: Mail },
    { id: "social-accounts", label: t("settingsPage.nav.socialMedia"), icon: Share2 },
    { id: "team-members", label: t("settingsPage.nav.team"), icon: Users },
    { id: "whatsapp-business", label: t("settingsPage.nav.whatsapp"), icon: Phone },
    { id: "shipping-providers", label: t("settingsPage.nav.shipping"), icon: Package },
    { id: "crm-documents", label: t("settingsPage.nav.crm"), icon: FileText },
    { id: "api-secrets", label: t("settingsPage.nav.apiKeys"), icon: KeyRound },
    { id: "subscription", label: t("settingsPage.nav.subscription"), icon: CreditCard },
    { id: "image-credits", label: t("settingsPage.nav.imageCredits"), icon: Sparkles },
    { id: "security", label: t("settingsPage.nav.security"), icon: Shield },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(`[data-testid="card-${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" data-testid="button-back-dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-settings-title">{t("settingsPage.title")}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">{t("settingsPage.subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative">
            <div className="flex overflow-x-auto gap-1 py-2 scrollbar-hide" data-testid="settings-mobile-nav">
              {settingsSections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                    data-testid={`nav-mobile-${section.id}`}
                  >
                    <SectionIcon className="w-3.5 h-3.5" />
                    {section.label}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/90 to-transparent" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24 space-y-1" data-testid="settings-desktop-nav">
              {settingsSections.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                    data-testid={`nav-desktop-${section.id}`}
                  >
                    <SectionIcon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 space-y-6 sm:space-y-8">
        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-profile">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.profile.title")}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-sm text-muted-foreground">{t("settingsPage.profile.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("settingsPage.profile.fullNamePlaceholder")}
                className="mt-1.5"
                data-testid="input-fullname"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground">{t("settingsPage.profile.email")}</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="mt-1.5 opacity-60"
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground mt-1">{t("settingsPage.profile.emailCannotChange")}</p>
            </div>
            <div>
              <Label htmlFor="company" className="text-sm text-muted-foreground">{t("settingsPage.profile.company")}</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t("settingsPage.profile.companyPlaceholder")}
                className="mt-1.5"
                data-testid="input-company"
              />
            </div>
            <Button
              onClick={handleProfileSave}
              disabled={profileMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
              data-testid="button-save-profile"
            >
              {profileMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{t("settingsPage.profile.saving")}</>
              ) : (
                <><Save className="w-4 h-4 mr-1.5" />{t("settingsPage.profile.saveChanges")}</>
              )}
            </Button>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">{t("settingsPage.profile.industry")}</Label>
                <Select value={profileIndustry} onValueChange={setProfileIndustry}>
                  <SelectTrigger className="mt-1.5" data-testid="select-settings-industry">
                    <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {["technology", "finance", "healthcare", "ecommerce", "realEstate", "marketing", "manufacturing", "education", "consulting", "other"].map((ind) => (
                      <SelectItem key={ind} value={ind}>{t(`onboarding.industries.${ind}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t("settingsPage.profile.companySize")}</Label>
                <Select value={profileCompanySize} onValueChange={setProfileCompanySize}>
                  <SelectTrigger className="mt-1.5" data-testid="select-settings-company-size">
                    <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((size) => (
                      <SelectItem key={size} value={size}>{t(`onboarding.companySizes.${size}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t("settingsPage.profile.country")}</Label>
                <Select value={profileCountry} onValueChange={setProfileCountry}>
                  <SelectTrigger className="mt-1.5" data-testid="select-settings-country">
                    <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {["TR", "US", "GB", "DE", "FR", "NL", "AE", "SA", "JP", "KR", "IN", "BR", "CA", "AU", "ES", "IT", "SE", "NO", "DK", "FI", "PL", "CZ", "AT", "CH", "BE", "PT", "GR", "RO", "BG", "HR", "other"].map((c) => (
                      <SelectItem key={c} value={c}>{t(`onboarding.countries.${c}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t("settingsPage.profile.intendedAgents")}</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {[
                    { slug: "customer-support", persona: "Ava" },
                    { slug: "sales-sdr", persona: "Rex" },
                    { slug: "social-media", persona: "Maya" },
                    { slug: "bookkeeping", persona: "Finn" },
                    { slug: "scheduling", persona: "Cal" },
                    { slug: "hr-recruiting", persona: "Harper" },
                    { slug: "data-analyst", persona: "DataBot" },
                    { slug: "ecommerce-ops", persona: "ShopBot" },
                    { slug: "real-estate", persona: "Reno" },
                  ].map((agent) => (
                    <label
                      key={agent.slug}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                      data-testid={`checkbox-settings-agent-${agent.slug}`}
                    >
                      <Checkbox
                        checked={profileIntendedAgents.includes(agent.slug)}
                        onCheckedChange={() => setProfileIntendedAgents((prev) => prev.includes(agent.slug) ? prev.filter((s) => s !== agent.slug) : [...prev, agent.slug])}
                      />
                      <span className="text-sm">{agent.persona}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t("settingsPage.profile.referralSource")}</Label>
                <Select value={profileReferralSource} onValueChange={setProfileReferralSource}>
                  <SelectTrigger className="mt-1.5" data-testid="select-settings-referral">
                    <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {["socialMedia", "searchEngine", "friendColleague", "blogArticle", "advertisement", "other"].map((src) => (
                      <SelectItem key={src} value={src}>{t(`onboarding.referralSources.${src}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={async () => {
                  setEnrichmentSaving(true);
                  try {
                    const payload = {
                      industry: profileIndustry || null,
                      companySize: profileCompanySize || null,
                      country: profileCountry || null,
                      intendedAgents: profileIntendedAgents.length > 0 ? profileIntendedAgents : null,
                      referralSource: profileReferralSource || null,
                    };
                    const res = await apiRequest("PATCH", "/api/auth/onboarding", payload);
                    const data = await res.json();
                    queryClient.setQueryData(["/api/auth/me"], { user: data.user });
                    trackEvent("profile_enrichment_updated", "settings");
                    toast({ title: t("settingsPage.profile.profileSaved"), description: t("settingsPage.profile.profileSavedDesc") });
                  } catch {
                    toast({ title: t("settingsPage.toast.error"), variant: "destructive" });
                  }
                  setEnrichmentSaving(false);
                }}
                disabled={enrichmentSaving}
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
                data-testid="button-save-enrichment"
              >
                {enrichmentSaving ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{t("settingsPage.profile.saving")}</>
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" />{t("settingsPage.profile.saveChanges")}</>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <LanguagePreferenceCard />

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-integrations">
          <div className="flex items-center gap-2 mb-5">
            <Link2 className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.integrations.title")}</h2>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{t("settingsPage.gmail.title")}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emailStatus?.provider === "gmail"
                      ? (emailStatus.address && emailStatus.address !== "Connected" ? emailStatus.address : t("settingsPage.integrations.connectedViaGoogle"))
                      : t("settingsPage.integrations.connectGoogleForEmail")}
                  </p>
                  {emailStatus?.provider === "gmail" && (
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {"✓ "}{t("settingsPage.integrations.send")}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {"✓ "}{t("settingsPage.integrations.readInbox")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {emailStatus?.provider === "gmail" ? (
                  <>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1" data-testid="badge-gmail-connected">
                      <CheckCircle2 className="w-3 h-3" />
                      {t("settingsPage.integrations.connected")}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                      disabled={gmailDisconnecting}
                      onClick={async () => {
                        setGmailDisconnecting(true);
                        try {
                          await apiRequest("DELETE", "/api/settings/gmail");
                          queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
                          toast({ title: t("settingsPage.toast.gmailDisconnected"), description: t("settingsPage.toast.gmailDisconnectedDesc") });
                        } catch {
                          toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.failedDisconnectGmail"), variant: "destructive" });
                        } finally {
                          setGmailDisconnecting(false);
                        }
                      }}
                      data-testid="button-disconnect-gmail"
                    >
                      {gmailDisconnecting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />{t("settingsPage.integrations.disconnecting")}</> : t("settingsPage.integrations.disconnect")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1" data-testid="badge-gmail-disconnected">
                      <XCircle className="w-3 h-3" />
                      {t("settingsPage.integrations.notConnected")}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
                      disabled={gmailReconnecting}
                      onClick={async () => {
                        setGmailReconnecting(true);
                        try {
                          const res = await apiRequest("GET", "/api/auth/google/url");
                          const data = await res.json();
                          if (data.url) {
                            window.location.href = data.url;
                          } else {
                            toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.couldNotGenerateGoogleUrl"), variant: "destructive" });
                          }
                        } catch {
                          toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.failedStartGoogleAuth"), variant: "destructive" });
                        } finally {
                          setGmailReconnecting(false);
                        }
                      }}
                      data-testid="button-connect-gmail"
                    >
                      {gmailReconnecting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />{t("settingsPage.integrations.connecting")}</> : t("settingsPage.integrations.connectGmail")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{t("settingsPage.integrations.platformEmail")}</p>
                  <p className="text-xs text-muted-foreground">{t("settingsPage.integrations.platformEmailDesc")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1" data-testid="badge-platform-email">
                  <CheckCircle2 className="w-3 h-3" />
                  {t("settingsPage.integrations.active")}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  onClick={async () => {
                    toast({ title: t("settingsPage.toast.cannotDeactivate"), description: t("settingsPage.toast.platformEmailDefault"), variant: "destructive" });
                  }}
                  data-testid="button-deactivate-platform-email"
                >
                  {t("settingsPage.integrations.deactivate")}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-personal-gmail">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.gmail.title")}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t("settingsPage.gmail.description")}
          </p>
          {gmailSettings?.gmailAddress && (gmailSettings?.hasOAuth || gmailSettings?.hasAppPassword) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground" data-testid="text-user-gmail">{gmailSettings.gmailAddress}</p>
                    <p className="text-xs text-emerald-400">{t("settingsPage.gmail.connectedVia", { method: gmailSettings.hasOAuth ? t("settingsPage.gmail.googleOAuth") : t("settingsPage.gmail.appPassword") })}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={async () => {
                      try {
                        const res = await apiRequest("GET", "/api/settings/gmail/status");
                        const status = await res.json();
                        if (status.connected) {
                          toast({ title: t("settingsPage.toast.connectionOk"), description: t("settingsPage.toast.gmailConnectionStatus", { email: status.email, method: status.method === "oauth" ? t("settingsPage.gmail.googleOAuth") : t("settingsPage.gmail.appPassword") }) });
                        } else {
                          toast({ title: t("settingsPage.toast.notConnectedGmail"), description: t("settingsPage.toast.gmailNotConnected"), variant: "destructive" });
                        }
                      } catch {
                        toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.failedTestGmail"), variant: "destructive" });
                      }
                    }}
                    data-testid="button-test-gmail"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />{t("settingsPage.gmail.test")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={async () => {
                      try {
                        await apiRequest("DELETE", "/api/settings/gmail");
                        queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                        toast({ title: t("settingsPage.toast.gmailDisconnected"), description: t("settingsPage.toast.gmailDisconnectedDesc") });
                      } catch {
                        toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.failedDisconnectGmail"), variant: "destructive" });
                      }
                    }}
                    data-testid="button-remove-gmail"
                  >
                    {t("settingsPage.integrations.disconnect")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  setGmailReconnecting(true);
                  try {
                    const res = await apiRequest("GET", "/api/auth/google/url");
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.couldNotStartGoogleAuth"), variant: "destructive" });
                    }
                  } catch {
                    toast({ title: t("settingsPage.toast.error"), description: t("settingsPage.toast.failedStartGoogleAuth"), variant: "destructive" });
                  } finally {
                    setGmailReconnecting(false);
                  }
                }}
                disabled={gmailReconnecting}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0"
                data-testid="button-connect-gmail-oauth"
              >
                {gmailReconnecting ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{t("settingsPage.integrations.connecting")}</>
                ) : (
                  <><Mail className="w-4 h-4 mr-1.5" />{t("settingsPage.gmail.connectWithGoogle")}</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                {t("settingsPage.gmail.googleRedirect")}
              </p>
              <Separator className="my-3" />
              <button
                onClick={() => setShowAppPassword(!showAppPassword)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid="button-toggle-app-password"
              >
                <KeyRound className="w-3 h-3" />
                {showAppPassword ? t("settingsPage.gmail.hideAppPassword") : t("settingsPage.gmail.orUseAppPassword")} {t("settingsPage.gmail.appPasswordLabel")}
                <ChevronDown className={`w-3 h-3 transition-transform ${showAppPassword ? "rotate-180" : ""}`} />
              </button>
              {showAppPassword && (
                <div className="mt-3 space-y-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">
                    {t("settingsPage.gmail.appPasswordHelp")}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("settingsPage.gmail.gmailAddress")}</Label>
                      <Input
                        type="email"
                        placeholder={t("settingsPage.gmail.gmailAddressPlaceholder")}
                        value={appPasswordForm.gmailAddress}
                        onChange={(e) => setAppPasswordForm(f => ({ ...f, gmailAddress: e.target.value }))}
                        className="h-8 text-xs"
                        data-testid="input-gmail-address"
                      />
                    </div>
                    <div className="relative">
                      <Label className="text-xs text-muted-foreground">{t("settingsPage.gmail.appPassword")}</Label>
                      <Input
                        type={showAppPass ? "text" : "password"}
                        placeholder={t("settingsPage.gmail.appPasswordPlaceholder")}
                        value={appPasswordForm.gmailAppPassword}
                        onChange={(e) => setAppPasswordForm(f => ({ ...f, gmailAppPassword: e.target.value }))}
                        className="h-8 text-xs pr-8"
                        data-testid="input-gmail-app-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAppPass(!showAppPass)}
                        className="absolute right-2 top-[26px] text-muted-foreground hover:text-foreground"
                      >
                        {showAppPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={appPasswordSaving || !appPasswordForm.gmailAddress || !appPasswordForm.gmailAppPassword}
                    onClick={async () => {
                      setAppPasswordSaving(true);
                      try {
                        await apiRequest("POST", "/api/settings/gmail", appPasswordForm);
                        queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
                        setAppPasswordForm({ gmailAddress: "", gmailAppPassword: "" });
                        setShowAppPassword(false);
                        toast({ title: t("settingsPage.toast.gmailConnectedToast"), description: t("settingsPage.toast.gmailAppPasswordSaved") });
                      } catch (err: any) {
                        toast({ title: t("settingsPage.toast.error"), description: err.message || t("settingsPage.toast.failedSaveGmail"), variant: "destructive" });
                      } finally {
                        setAppPasswordSaving(false);
                      }
                    }}
                    data-testid="button-save-app-password"
                  >
                    {appPasswordSaving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />{t("settingsPage.gmail.savingAppPassword")}</> : <><Save className="w-3 h-3 mr-1" />{t("settingsPage.gmail.saveAppPassword")}</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-social-accounts">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.social.title")}</h2>
              {socialAccountsData && socialAccountsData.length > 0 && (
                <Badge variant="secondary" className="ml-1" data-testid="badge-social-count">{socialAccountsData.length}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
              onClick={() => { setSocialForm({ platform: "", username: "", profileUrl: "", accountType: "personal", apiKey: "", apiSecret: "", accessToken: "", accessTokenSecret: "", pageId: "", businessAccountId: "" }); setShowAddSocial(true); }}
              data-testid="button-add-social"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />{t("settingsPage.social.connectAccount")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t("settingsPage.social.description")}
          </p>

          {showAddSocial && (
            <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-pink-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground">{t("settingsPage.social.connectNew")}</p>
              <div>
                <Label className="text-xs text-muted-foreground">{t("settingsPage.social.platform")}</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1.5">
                  {Object.entries(platformConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setSocialForm(p => ({ ...p, platform: key }))}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        socialForm.platform === key
                          ? `border-pink-500 ${cfg.bgColor} ring-1 ring-pink-500/30`
                          : "border-border/50 hover:border-pink-500/50"
                      }`}
                      data-testid={`button-platform-${key}`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{key === "twitter" ? "X" : key}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("settingsPage.social.accountType")}</Label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => setSocialForm(p => ({ ...p, accountType: "personal" }))}
                    className={`flex-1 p-2.5 rounded-lg border text-center transition-all ${
                      socialForm.accountType === "personal"
                        ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/30"
                        : "border-border/50 hover:border-pink-500/50"
                    }`}
                    data-testid="button-account-type-personal"
                  >
                    <span className="text-sm">👤</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("settingsPage.social.personal")}</p>
                  </button>
                  <button
                    onClick={() => setSocialForm(p => ({ ...p, accountType: "business" }))}
                    className={`flex-1 p-2.5 rounded-lg border text-center transition-all ${
                      socialForm.accountType === "business"
                        ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                        : "border-border/50 hover:border-blue-500/50"
                    }`}
                    data-testid="button-account-type-business"
                  >
                    <span className="text-sm">🔗</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("settingsPage.social.businessApi")}</p>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {socialForm.accountType === "personal"
                    ? t("settingsPage.social.personalDesc")
                    : t("settingsPage.social.businessDesc")}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.social.username")}</Label>
                  <Input
                    value={socialForm.username}
                    onChange={(e) => setSocialForm(p => ({ ...p, username: e.target.value }))}
                    placeholder={t("settingsPage.social.usernamePlaceholder")}
                    className="mt-1 h-8 text-sm"
                    data-testid="input-social-username"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.social.profileUrl")}</Label>
                  <Input
                    value={socialForm.profileUrl}
                    onChange={(e) => setSocialForm(p => ({ ...p, profileUrl: e.target.value }))}
                    placeholder={t("settingsPage.social.profileUrlPlaceholder")}
                    className="mt-1 h-8 text-sm"
                    data-testid="input-social-url"
                  />
                </div>
              </div>

              {socialForm.accountType === "business" && (
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <p className="text-xs font-medium text-blue-400">{t("settingsPage.social.apiCredentials")}</p>
                  {(socialForm.platform === "twitter" || socialForm.platform === "tiktok" || socialForm.platform === "youtube" || !socialForm.platform) && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t("settingsPage.social.apiKey")}</Label>
                          <Input value={socialForm.apiKey} onChange={(e) => setSocialForm(p => ({ ...p, apiKey: e.target.value }))} placeholder={t("settingsPage.social.apiKey")} className="mt-0.5 h-7 text-xs" data-testid="input-api-key" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t("settingsPage.social.apiSecret")}</Label>
                          <Input value={socialForm.apiSecret} onChange={(e) => setSocialForm(p => ({ ...p, apiSecret: e.target.value }))} placeholder={t("settingsPage.social.apiSecret")} className="mt-0.5 h-7 text-xs" type="password" data-testid="input-api-secret" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t("settingsPage.social.accessToken")}</Label>
                          <Input value={socialForm.accessToken} onChange={(e) => setSocialForm(p => ({ ...p, accessToken: e.target.value }))} placeholder={t("settingsPage.social.accessToken")} className="mt-0.5 h-7 text-xs" data-testid="input-access-token" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t("settingsPage.social.accessTokenSecret")}</Label>
                          <Input value={socialForm.accessTokenSecret} onChange={(e) => setSocialForm(p => ({ ...p, accessTokenSecret: e.target.value }))} placeholder={t("settingsPage.social.accessTokenSecret")} className="mt-0.5 h-7 text-xs" type="password" data-testid="input-access-token-secret" />
                        </div>
                      </div>
                    </>
                  )}
                  {(socialForm.platform === "instagram" || socialForm.platform === "facebook") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{socialForm.platform === "instagram" ? t("settingsPage.social.metaAccessToken") : t("settingsPage.social.pageAccessToken")}</Label>
                        <Input value={socialForm.accessToken} onChange={(e) => setSocialForm(p => ({ ...p, accessToken: e.target.value }))} placeholder={t("settingsPage.social.accessToken")} className="mt-0.5 h-7 text-xs" type="password" data-testid="input-access-token" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{socialForm.platform === "instagram" ? t("settingsPage.social.businessAccountId") : t("settingsPage.social.pageId")}</Label>
                        <Input
                          value={socialForm.platform === "instagram" ? socialForm.businessAccountId : socialForm.pageId}
                          onChange={(e) => setSocialForm(p => ({ ...p, [socialForm.platform === "instagram" ? "businessAccountId" : "pageId"]: e.target.value }))}
                          placeholder={socialForm.platform === "instagram" ? t("settingsPage.social.igBusinessAccountId") : t("settingsPage.social.facebookPageId")}
                          className="mt-0.5 h-7 text-xs" data-testid="input-business-id"
                        />
                      </div>
                    </div>
                  )}
                  {socialForm.platform === "linkedin" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t("settingsPage.social.linkedinAccessToken")}</Label>
                        <Input value={socialForm.accessToken} onChange={(e) => setSocialForm(p => ({ ...p, accessToken: e.target.value }))} placeholder={t("settingsPage.social.linkedinAccessToken")} className="mt-0.5 h-7 text-xs" type="password" data-testid="input-access-token" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t("settingsPage.social.organizationId")}</Label>
                        <Input value={socialForm.businessAccountId} onChange={(e) => setSocialForm(p => ({ ...p, businessAccountId: e.target.value }))} placeholder={t("settingsPage.social.companyPageIdPlaceholder")} className="mt-0.5 h-7 text-xs" data-testid="input-business-id" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleAddSocialAccount}
                  disabled={!socialForm.platform || !socialForm.username.trim()}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0"
                  data-testid="button-save-social"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1" />{t("settingsPage.social.connect")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddSocial(false)}
                  data-testid="button-cancel-social"
                >
                  {t("settingsPage.social.cancel")}
                </Button>
              </div>
            </div>
          )}

          {socialLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : socialAccountsData && socialAccountsData.length > 0 ? (
            <div className="space-y-2">
              {socialAccountsData.map((account) => {
                const cfg = platformConfig[account.platform] || { icon: "🔗", color: "text-gray-400", bgColor: "bg-gray-500/10" };
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 group" data-testid={`card-social-${account.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                        <span className="text-base">{cfg.icon}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${cfg.color}`} data-testid={`text-social-platform-${account.id}`}>
                          {account.platform === "twitter" ? "X (Twitter)" : account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                        </p>
                        <p className="text-xs text-foreground" data-testid={`text-social-username-${account.id}`}>@{account.username}</p>
                        {account.profileUrl && (
                          <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-blue-400 truncate block max-w-[200px]">
                            {account.profileUrl}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${account.accountType === "business" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
                        {account.accountType === "business" ? `🔗 ${t("settingsPage.social.apiLabel")}` : `👤 ${t("settingsPage.social.personalLabel")}`}
                      </Badge>
                      <button
                        onClick={() => handleDeleteSocialAccount(account.id, account.platform, account.username)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        data-testid={`button-delete-social-${account.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="flex justify-center gap-2 mb-2 opacity-30 text-2xl">
                <span>📸</span><span>𝕏</span><span>💼</span><span>🎵</span><span>▶️</span>
              </div>
              <p className="text-sm">{t("settingsPage.social.noAccounts")}</p>
              <p className="text-xs mt-1">{t("settingsPage.social.noAccountsDesc")}</p>
            </div>
          )}
        </Card>

        <OrganizationCard userId={user.id} />

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-whatsapp-business">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.whatsapp.title")}</h2>
              {whatsappData?.connected && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] ml-1">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />{t("settingsPage.integrations.connected")}
                </Badge>
              )}
            </div>
            {!whatsappData?.connected && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => setShowWhatsappSetup(true)}
                data-testid="button-connect-whatsapp"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />{t("settingsPage.whatsapp.connectWhatsapp")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t("settingsPage.whatsapp.description")}
          </p>

          {whatsappLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : whatsappData?.connected ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/30 border border-green-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("settingsPage.whatsapp.phoneNumberIdLabel")}</p>
                    <p className="text-sm font-medium text-foreground" data-testid="text-wa-phone-id">{whatsappData.phoneNumberId}</p>
                  </div>
                  {whatsappData.displayName && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("settingsPage.whatsapp.displayNameLabel")}</p>
                      <p className="text-sm font-medium text-foreground" data-testid="text-wa-display-name">{whatsappData.displayName}</p>
                    </div>
                  )}
                  {whatsappData.businessAccountId && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("settingsPage.whatsapp.businessAccountIdLabel")}</p>
                      <p className="text-sm font-medium text-foreground">{whatsappData.businessAccountId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("settingsPage.whatsapp.accessTokenLabel")}</p>
                    <p className="text-sm font-medium text-foreground">{t("settingsPage.whatsapp.accessTokenConfigured")}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("settingsPage.whatsapp.webhookUrl")}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted/50 px-2 py-1 rounded flex-1 truncate text-foreground" data-testid="text-wa-webhook-url">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "/api/whatsapp/webhook"}
                    </code>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyWebhookUrl} data-testid="button-copy-webhook">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("settingsPage.whatsapp.webhookPasteHint")}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={handleTestWhatsapp}
                  disabled={whatsappTesting}
                  data-testid="button-test-whatsapp"
                >
                  {whatsappTesting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                  {t("settingsPage.whatsapp.testConnection")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={() => { setShowWhatsappSetup(true); setWhatsappForm({ phoneNumberId: whatsappData.phoneNumberId || "", businessAccountId: whatsappData.businessAccountId || "", accessToken: "", verifyToken: "", displayName: whatsappData.displayName || "" }); }}
                  data-testid="button-edit-whatsapp"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />{t("settingsPage.whatsapp.updateBtn")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={handleDisconnectWhatsapp}
                  data-testid="button-disconnect-whatsapp"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />{t("settingsPage.whatsapp.disconnectBtn")}
                </Button>
              </div>
            </div>
          ) : showWhatsappSetup ? (
            <div className="p-4 rounded-lg bg-muted/30 border border-green-500/20 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-green-400" />
                <p className="text-sm font-medium text-foreground">{t("settingsPage.whatsapp.connectApi")}</p>
              </div>

              <div className="p-2 rounded bg-green-500/5 border border-green-500/10">
                <p className="text-[10px] text-green-400 leading-relaxed">
                  {t("settingsPage.whatsapp.metaRequirement")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.whatsapp.phoneNumberIdLabel")} *</Label>
                  <Input
                    value={whatsappForm.phoneNumberId}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, phoneNumberId: e.target.value }))}
                    placeholder={t("settingsPage.whatsapp.phoneNumberId")}
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-phone-number-id"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.whatsapp.businessAccountIdLabel")}</Label>
                  <Input
                    value={whatsappForm.businessAccountId}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, businessAccountId: e.target.value }))}
                    placeholder={t("settingsPage.whatsapp.optional")}
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-business-id"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.whatsapp.accessTokenLabel")} *</Label>
                  <div className="relative">
                    <Input
                      type={showWhatsappToken ? "text" : "password"}
                      value={whatsappForm.accessToken}
                      onChange={(e) => setWhatsappForm(p => ({ ...p, accessToken: e.target.value }))}
                      placeholder={t("settingsPage.whatsapp.accessTokenPlaceholder")}
                      className="mt-1 h-8 text-sm pr-8"
                      data-testid="input-wa-access-token"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground"
                    >
                      {showWhatsappToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.whatsapp.verifyTokenLabel")} *</Label>
                  <Input
                    value={whatsappForm.verifyToken}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, verifyToken: e.target.value }))}
                    placeholder={t("settingsPage.whatsapp.verifyTokenPlaceholder")}
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-verify-token"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.whatsapp.displayNameLabel")}</Label>
                  <Input
                    value={whatsappForm.displayName}
                    onChange={(e) => setWhatsappForm(p => ({ ...p, displayName: e.target.value }))}
                    placeholder={t("settingsPage.whatsapp.displayNamePlaceholder")}
                    className="mt-1 h-8 text-sm"
                    data-testid="input-wa-display-name"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground mb-2">{t("settingsPage.whatsapp.webhookForMeta")}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded flex-1 truncate text-foreground">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "/api/whatsapp/webhook"}
                  </code>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyWebhookUrl} data-testid="button-copy-webhook-setup">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveWhatsapp}
                  disabled={whatsappSaving || !whatsappForm.phoneNumberId.trim() || !whatsappForm.accessToken.trim() || !whatsappForm.verifyToken.trim()}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                  data-testid="button-save-whatsapp"
                >
                  {whatsappSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1" />}
                  {t("settingsPage.common.connect")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowWhatsappSetup(false)} data-testid="button-cancel-whatsapp">
                  {t("settingsPage.common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="flex justify-center gap-2 mb-2 opacity-30 text-2xl">
                <span>📱</span><span>💬</span><span>🟢</span>
              </div>
              <p className="text-sm">{t("settingsPage.whatsapp.notConnected")}</p>
              <p className="text-xs mt-1">{t("settingsPage.whatsapp.notConnectedDesc")}</p>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-2 transition-colors"
                data-testid="link-whatsapp-docs"
              >
                <ExternalLink className="w-3 h-3" />
                {t("settingsPage.whatsapp.setupGuide")}
              </a>
            </div>
          )}
        </Card>

        <MarketplaceConnectionsCard />

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-shipping-providers">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.shipping.title")}</h2>
              {shippingProvidersData && shippingProvidersData.length > 0 && (
                <Badge variant="secondary" className="ml-1" data-testid="badge-shipping-count">{shippingProvidersData.length}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              onClick={() => { setShippingForm({ provider: "", apiKey: "", customerCode: "", username: "", password: "", accountNumber: "", siteId: "" }); setShowAddShipping(true); setShowShippingApiKey(false); }}
              data-testid="button-add-shipping"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />{t("settingsPage.shipping.connectProvider")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t("settingsPage.shipping.description")}
          </p>

          {showAddShipping && (
            <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-orange-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground">{t("settingsPage.shipping.connectShippingProvider")}</p>
              <div>
                <Label className="text-xs text-muted-foreground">{t("settingsPage.shipping.provider")} *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                  {Object.entries(shippingProviderConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setShippingForm(p => ({ ...p, provider: key, customerCode: "", username: "", password: "", accountNumber: "", siteId: "" }))}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        shippingForm.provider === key
                          ? `border-orange-500 ${cfg.bgColor} ring-1 ring-orange-500/30`
                          : "border-border/50 hover:border-orange-500/50"
                      }`}
                      data-testid={`button-shipping-${key}`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {shippingForm.provider && (
                <>
                  <div className="p-2 rounded bg-orange-500/5 border border-orange-500/10">
                    <p className="text-[10px] text-orange-400">{shippingProviderConfig[shippingForm.provider]?.guide}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shippingProviderConfig[shippingForm.provider]?.fields.map((field) => (
                      <div key={field}>
                        <Label className="text-xs text-muted-foreground">{shippingFieldLabels[field]} *</Label>
                        <div className="relative">
                          <Input
                            type={(field === "apiKey" || field === "password") && !showShippingApiKey ? "password" : "text"}
                            value={shippingForm[field as keyof typeof shippingForm] || ""}
                            onChange={(e) => setShippingForm(p => ({ ...p, [field]: e.target.value }))}
                            placeholder={shippingFieldLabels[field]}
                            className="mt-1 h-8 text-sm pr-8"
                            data-testid={`input-shipping-${field}`}
                          />
                          {(field === "apiKey" || field === "password") && (
                            <button
                              type="button"
                              onClick={() => setShowShippingApiKey(!showShippingApiKey)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground"
                            >
                              {showShippingApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleAddShippingProvider}
                  disabled={!shippingForm.provider || !shippingForm.apiKey.trim()}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0"
                  data-testid="button-save-shipping"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1" />{t("settingsPage.common.connect")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddShipping(false)}
                  data-testid="button-cancel-shipping"
                >
                  {t("settingsPage.common.cancel")}
                </Button>
              </div>
            </div>
          )}

          {shippingLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : shippingProvidersData && shippingProvidersData.length > 0 ? (
            <div className="space-y-2">
              {shippingProvidersData.map((sp) => {
                const cfg = shippingProviderConfig[sp.provider] || { icon: "📦", name: sp.provider, color: "text-gray-400", bgColor: "bg-gray-500/10" };
                return (
                  <div key={sp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 group gap-2" data-testid={`card-shipping-${sp.id}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                        <span className="text-base">{cfg.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${cfg.color} truncate`} data-testid={`text-shipping-name-${sp.id}`}>
                          {cfg.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{t("settingsPage.shipping.apiKeyLabel")}: ****{sp.apiKey.slice(-4)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        {sp.status}
                      </Badge>
                      <button
                        onClick={() => handleDeleteShippingProvider(sp.id, sp.provider)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        data-testid={`button-delete-shipping-${sp.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <div className="flex justify-center gap-2 mb-2 opacity-30 text-2xl">
                <span>📦</span><span>🚛</span><span>📮</span><span>✈️</span>
              </div>
              <p className="text-sm">{t("settingsPage.shipping.noProviders")}</p>
              <p className="text-xs mt-1">{t("settingsPage.shipping.noProvidersDesc")}</p>
            </div>
          )}
        </Card>

        <CrmDocumentsSection />

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-api-secrets">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.secrets.title")}</h2>
              <ShieldCheck className="w-4 h-4 text-emerald-500 ml-1" />
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {t("settingsPage.secrets.description")}
            </p>

            {!shippingProvidersData || shippingProvidersData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("settingsPage.secrets.noProviders")}</p>
              </div>
            ) : (
            <div className="space-y-2">
              {shippingProvidersData.map((sp) => {
                const cfg = shippingProviderConfig[sp.provider] || { icon: "📦", name: sp.provider, color: "text-gray-400", bgColor: "bg-gray-500/10", fields: ["apiKey"], guide: "" };
                const isEditing = editingSecretId === sp.id;
                const fieldList = cfg.fields || ["apiKey"];

                return (
                  <div key={sp.id} className="rounded-lg border border-border/50 overflow-hidden" data-testid={`secret-provider-${sp.id}`}>
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingSecretId(null);
                          setSecretForm({});
                          setVisibleSecretFields({});
                        } else {
                          setEditingSecretId(sp.id);
                          setSecretForm({});
                          setVisibleSecretFields({});
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                      data-testid={`button-secret-toggle-${sp.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${cfg.bgColor} flex items-center justify-center shrink-0`}>
                          <span className="text-sm">{cfg.icon}</span>
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-medium ${cfg.color}`}>{cfg.name}</p>
                          <p className="text-[10px] text-muted-foreground">{fieldList.length} {t("settingsPage.secrets.credentialsStored")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isEditing ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {isEditing && (
                      <div className="p-4 border-t border-border/50 space-y-3 bg-muted/10">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <p className="text-[10px] text-emerald-400 font-medium">{t("settingsPage.secrets.storedCredentials")}</p>
                        </div>

                        {fieldList.map((field) => {
                          const isSensitive = field === "apiKey" || field === "password";
                          const fieldKey = `${sp.id}-${field}`;
                          const isVisible = visibleSecretFields[fieldKey] || false;

                          const hasFieldKey = `has${field.charAt(0).toUpperCase() + field.slice(1)}`;
                          const currentMasked = field === "apiKey" ? sp.apiKey : (
                            sp[hasFieldKey]
                              ? "********"
                              : ""
                          );
                          const hasValue = field === "apiKey" ? !!sp.apiKey : !!sp[hasFieldKey];

                          return (
                            <div key={field} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  {isSensitive && <Lock className="w-2.5 h-2.5" />}
                                  {shippingFieldLabels[field]}
                                </Label>
                                {hasValue && (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] h-4">
                                    <CheckCircle2 className="w-2 h-2 mr-0.5" />{t("settingsPage.secrets.set")}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type={isSensitive && !isVisible ? "password" : "text"}
                                    placeholder={hasValue ? `${t("settingsPage.secrets.current")}: ${currentMasked}` : `${t("settingsPage.secrets.enter")} ${shippingFieldLabels[field]}`}
                                    value={secretForm[field] || ""}
                                    onChange={(e) => setSecretForm(p => ({ ...p, [field]: e.target.value }))}
                                    className="h-8 text-sm pr-8 font-mono bg-background/50"
                                    data-testid={`input-secret-${field}-${sp.id}`}
                                  />
                                  {isSensitive && (
                                    <button
                                      type="button"
                                      onClick={() => setVisibleSecretFields(p => ({ ...p, [fieldKey]: !isVisible }))}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <div className="flex gap-2 pt-2 border-t border-border/30">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateSecret(sp.id, sp.provider)}
                            disabled={secretSaving || Object.values(secretForm).every(v => !v.trim())}
                            className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0"
                            data-testid={`button-save-secret-${sp.id}`}
                          >
                            {secretSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                            {t("settingsPage.secrets.updateSecrets")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingSecretId(null); setSecretForm({}); setVisibleSecretFields({}); }}
                            data-testid={`button-cancel-secret-${sp.id}`}
                          >
                            {t("settingsPage.common.cancel")}
                          </Button>
                        </div>

                        <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          {t("settingsPage.secrets.leaveEmpty")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-subscription">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.subscription.title")}</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t("settingsPage.subscription.plan")}</p>
                <p className="text-lg font-bold text-foreground" data-testid="text-plan-name">
                  {planName || (user.hasSubscription ? t("settingsPage.subscription.activeLabel") : t("settingsPage.subscription.none"))}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Bot className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t("settingsPage.subscription.activeWorkers")}</p>
                </div>
                <p className="text-lg font-bold text-foreground" data-testid="text-active-workers-count">
                  {activeRentals.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t("settingsPage.subscription.messagesUsed")}</p>
                </div>
                <p className="text-lg font-bold text-foreground" data-testid="text-messages-used">
                  {totalMessages}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t("settingsPage.subscription.remaining")}</p>
                </div>
                <p className="text-lg font-bold text-foreground" data-testid="text-messages-remaining">
                  {totalLimit ? totalLimit - totalMessages : 0}
                </p>
              </div>
            </div>
            {totalLimit > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{t("settingsPage.subscription.usage")}</span>
                  <span>{Math.round((totalMessages / totalLimit) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                    style={{ width: `${Math.min(Math.round((totalMessages / totalLimit) * 100), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-image-credits">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.imageCredits.title")}</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("settingsPage.imageCredits.availableCredits")}</p>
                  <p className="text-3xl font-bold text-yellow-400" data-testid="text-image-credits">{creditsData?.credits ?? 0}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("settingsPage.imageCredits.creditDescription")}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-3">{t("settingsPage.imageCredits.purchaseCredits")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(creditPrices || []).map((price) => (
                  <button
                    key={price.id}
                    onClick={() => setSelectedCreditPkg(selectedCreditPkg === price.id ? null : price.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      selectedCreditPkg === price.id 
                        ? "border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500/30" 
                        : "border-border/50 hover:border-yellow-500/50 hover:bg-yellow-500/5"
                    }`}
                    data-testid={`button-settings-credits-${price.credits}`}
                  >
                    <p className="text-lg font-bold text-foreground">{price.credits}</p>
                    <p className="text-[10px] text-muted-foreground">{t("settingsPage.imageCredits.credits")}</p>
                    <p className="text-sm font-semibold text-yellow-400 mt-1">${(price.amount / 100).toFixed(2)}</p>
                    {price.credits > 1 && (
                      <p className="text-[9px] text-muted-foreground">${(price.amount / price.credits / 100).toFixed(2)}/ea</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedCreditPkg && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <p className="text-sm font-medium text-foreground">{t("settingsPage.imageCredits.paymentDetails")}</p>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("settingsPage.imageCredits.cardNumber")}</Label>
                  <Input
                    placeholder="4242 4242 4242 4242"
                    value={creditCard.number}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                      setCreditCard(prev => ({ ...prev, number: digits.replace(/(\d{4})(?=\d)/g, "$1 ") }));
                    }}
                    className="mt-1"
                    maxLength={19}
                    data-testid="input-settings-credit-card"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("settingsPage.imageCredits.expiry")}</Label>
                    <Input
                      placeholder="MM/YY"
                      value={creditCard.expiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCreditCard(prev => ({ ...prev, expiry: digits.length >= 3 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits }));
                      }}
                      className="mt-1"
                      maxLength={5}
                      data-testid="input-settings-credit-expiry"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("settingsPage.imageCredits.cvc")}</Label>
                    <Input
                      placeholder="123"
                      value={creditCard.cvc}
                      onChange={(e) => {
                        setCreditCard(prev => ({ ...prev, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }));
                      }}
                      className="mt-1"
                      maxLength={4}
                      data-testid="input-settings-credit-cvc"
                    />
                  </div>
                </div>
                <Button
                  onClick={buyCredits}
                  disabled={creditPurchasing || !creditCard.number || !creditCard.expiry || !creditCard.cvc}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
                  data-testid="button-settings-purchase-credits"
                >
                  {creditPurchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                  {t("settingsPage.imageCredits.purchase", { credits: creditPrices?.find(p => p.id === selectedCreditPkg)?.credits, amount: ((creditPrices?.find(p => p.id === selectedCreditPkg)?.amount || 0) / 100).toFixed(2) })}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  {t("settingsPage.imageCredits.testCards")}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-data-privacy">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.dataPrivacy.title")}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t("settingsPage.dataPrivacy.description")}
          </p>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-border/50 bg-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-medium">{t("settingsPage.dataPrivacy.exportTitle")}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("settingsPage.dataPrivacy.exportDesc")}</p>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                data-testid="button-export-data"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/user/data-export", { credentials: "include" });
                    if (!res.ok) throw new Error();
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `rentai24-data-export.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: t("settingsPage.dataPrivacy.exportSuccess"), description: t("settingsPage.dataPrivacy.exportSuccessDesc") });
                  } catch {
                    toast({ title: t("settingsPage.dataPrivacy.exportFailed"), variant: "destructive" });
                  }
                }}
              >
                <Download className="w-4 h-4 mr-1.5" />
                {t("settingsPage.dataPrivacy.exportButton")}
              </Button>
            </div>
            <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-medium text-red-400">{t("settingsPage.dataPrivacy.deleteTitle")}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("settingsPage.dataPrivacy.deleteDesc")}</p>
              {showDeleteConfirm ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-400 font-medium">{t("settingsPage.dataPrivacy.deleteConfirmDesc")}</p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={t("settingsPage.dataPrivacy.deleteConfirmPlaceholder")}
                    className="h-8 text-sm"
                    data-testid="input-delete-confirm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                      data-testid="button-confirm-delete"
                      onClick={async () => {
                        setDeletingAccount(true);
                        try {
                          await apiRequest("DELETE", "/api/user/account", { confirmation: "DELETE" });
                          toast({ title: t("settingsPage.dataPrivacy.deleteSuccess"), description: t("settingsPage.dataPrivacy.deleteSuccessDesc") });
                          setTimeout(() => { window.location.href = "/"; }, 1000);
                        } catch {
                          toast({ title: t("settingsPage.dataPrivacy.deleteFailed"), variant: "destructive" });
                        } finally {
                          setDeletingAccount(false);
                        }
                      }}
                    >
                      {deletingAccount ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                      {t("settingsPage.dataPrivacy.deleteConfirm")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}>
                      {t("settingsPage.dataPrivacy.deleteCancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  data-testid="button-delete-account"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  {t("settingsPage.dataPrivacy.deleteButton")}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 bg-card border-border/50" data-testid="card-security">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-foreground">{t("settingsPage.security.title")}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-sm text-muted-foreground">{t("settingsPage.security.currentPassword")}</Label>
              <div className="relative mt-1.5">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("settingsPage.security.currentPasswordPlaceholder")}
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-current-password"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-sm text-muted-foreground">{t("settingsPage.security.newPassword")}</Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("settingsPage.security.newPasswordPlaceholder")}
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">{t("settingsPage.security.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settingsPage.security.confirmPasswordPlaceholder")}
                className="mt-1.5"
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={passwordMutation.isPending}
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              data-testid="button-change-password"
            >
              {passwordMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{t("settingsPage.security.changing")}</>
              ) : (
                <><Lock className="w-4 h-4 mr-1.5" />{t("settingsPage.security.changePassword")}</>
              )}
            </Button>
          </div>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
