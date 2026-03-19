import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, Plus, Play, Pause, Trash2, Clock, CheckCircle2, XCircle,
  ArrowLeft, LayoutTemplate, Activity, ChevronRight, ChevronDown,
  Loader2, Webhook, Timer, Bot, Mail, FileText, Bell, Target,
  Package, BarChart3, Headphones, AlertTriangle, ExternalLink,
  Settings, GripVertical, Link2, Unlink, RotateCcw, Eye,
  MessageSquare, Database, Variable, Globe, Hash, Users,
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
  finance: FileText, sales: Target, ecommerce: Package,
  management: BarChart3, communication: Mail, support: Headphones,
  hr: Users, marketing: Globe,
};

const categoryLabels: Record<string, string> = {
  finance: "Finans", sales: "Satış", ecommerce: "E-Ticaret",
  management: "Yönetim", communication: "İletişim", support: "Destek",
  hr: "İnsan Kaynakları", marketing: "Pazarlama",
};

const triggerTypeLabels: Record<string, string> = {
  agent_tool_complete: "Ajan Aksiyonu", webhook: "Webhook",
  schedule: "Zamanlı", manual: "Manuel", threshold: "Eşik Değer",
  email_received: "E-posta Alındı",
};

const triggerTypeIcons: Record<string, any> = {
  agent_tool_complete: Bot, webhook: Webhook, schedule: Timer,
  manual: Play, threshold: AlertTriangle, email_received: Mail,
};

const actionTypeLabels: Record<string, string> = {
  send_email: "E-posta Gönder", create_task: "Görev Oluştur",
  notify_boss: "Boss Bildirimi", update_lead: "Lead Güncelle",
  webhook_call: "Webhook Çağrısı", log_action: "Kayıt Tut",
  calculate: "Hesapla", http_request: "HTTP İsteği",
  set_variable: "Değişken Ata", format_data: "Veri Dönüştür",
  whatsapp_message: "WhatsApp Mesajı", multi_email: "Toplu E-posta",
  db_query: "Veritabanı Sorgusu",
};

const actionTypeIcons: Record<string, any> = {
  send_email: Mail, create_task: FileText, notify_boss: Bell,
  update_lead: Target, webhook_call: Webhook, log_action: Activity,
  calculate: Hash, http_request: Globe, set_variable: Variable,
  format_data: Database, whatsapp_message: MessageSquare,
  multi_email: Users, db_query: Database,
};

const conditionOperatorLabels: Record<string, string> = {
  equals: "Eşittir", not_equals: "Eşit Değil", contains: "İçerir",
  not_contains: "İçermez", greater_than: "Büyüktür", less_than: "Küçüktür",
  greater_than_or_equal: "Büyük Eşit", less_than_or_equal: "Küçük Eşit",
  exists: "Var", not_exists: "Yok", regex: "Regex",
  between: "Arasında", contains_any_of: "Herhangi Birini İçerir",
  starts_with: "İle Başlar", ends_with: "İle Biter",
};

const actionConfigFields: Record<string, string[]> = {
  send_email: ["to", "subject", "body"],
  create_task: ["title", "description", "agentType", "priority"],
  notify_boss: ["summary", "notificationType"],
  update_lead: ["leadId", "status", "notes"],
  webhook_call: ["url", "method"],
  log_action: ["description", "agentType"],
  calculate: ["expression", "resultVariable"],
  http_request: ["url", "method", "authType", "authToken", "body"],
  set_variable: ["variableName", "value", "valueType"],
  format_data: ["format", "sourceField"],
  whatsapp_message: ["phone", "message"],
  multi_email: ["recipients", "subject", "body"],
  db_query: ["table", "queryType"],
};

const configFieldLabels: Record<string, string> = {
  to: "Alıcı E-posta", subject: "Konu", body: "İçerik", title: "Başlık",
  description: "Açıklama", agentType: "Ajan Türü", priority: "Öncelik",
  summary: "Özet", notificationType: "Bildirim Türü", leadId: "Lead ID",
  status: "Durum", notes: "Notlar", url: "URL", method: "Metod",
  expression: "İfade", resultVariable: "Sonuç Değişkeni",
  authType: "Kimlik Doğrulama", authToken: "Token", authUsername: "Kullanıcı Adı",
  variableName: "Değişken Adı", value: "Değer",
  valueType: "Değer Tipi", format: "Format", sourceField: "Kaynak Alan",
  phone: "Telefon", message: "Mesaj", recipients: "Alıcılar (virgülle ayır)",
  table: "Tablo", queryType: "Sorgu Türü",
};

const configFieldPlaceholders: Record<string, string> = {
  to: "ornek@email.com", subject: "Konu başlığı", body: "E-posta içeriği...",
  title: "Görev başlığı", description: "Detaylı açıklama...",
  agentType: "bookkeeping, sales-sdr...", priority: "high, medium, low",
  summary: "Bildirim özeti...", url: "https://api.example.com/endpoint",
  method: "GET, POST, PUT", variableName: "myVar",
  value: "{{data}}", valueType: "string, number, boolean, json",
  format: "json, csv, text",
  sourceField: "data", phone: "+905551234567", message: "Mesaj metni...",
  recipients: "a@b.com, c@d.com", table: "agent_tasks, leads...",
  queryType: "count",
};

const NODE_W = 200;
const NODE_H = 64;

function getNodeColor(node: any): string {
  if (node.type === "trigger") return "border-yellow-500/50 bg-yellow-500/10";
  if (node.type === "condition") return "border-purple-500/50 bg-purple-500/10";
  if (node.type === "delay") return "border-orange-500/50 bg-orange-500/10";
  return "border-blue-500/50 bg-blue-500/10";
}

function getNodeIconColor(node: any): string {
  if (node.type === "trigger") return "text-yellow-400";
  if (node.type === "condition") return "text-purple-400";
  if (node.type === "delay") return "text-orange-400";
  return "text-blue-400";
}

function getNodeStatusColor(status: string): string {
  if (status === "success" || status === "completed") return "ring-2 ring-green-500/50";
  if (status === "error" || status === "failed") return "ring-2 ring-red-500/50";
  if (status === "running") return "ring-2 ring-blue-500/50 animate-pulse";
  return "";
}

function VisualWorkflowEditor({ nodes, onChange, executionResults }: {
  nodes: any[];
  onChange?: (nodes: any[]) => void;
  executionResults?: any[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const positionedNodes = nodes.map((n, i) => ({
    ...n,
    position: n.position || { x: 250, y: 50 + i * 130 },
  }));

  const getNodeResult = (nodeId: string) => {
    return executionResults?.find((r: any) => r.nodeId === nodeId);
  };

  const connections: Array<{ from: any; to: any; label?: string }> = [];
  for (const node of positionedNodes) {
    if (node.nextNodeId) {
      const target = positionedNodes.find((n: any) => n.id === node.nextNodeId);
      if (target) connections.push({ from: node, to: target });
    }
    if (node.conditionTrueNodeId) {
      const target = positionedNodes.find((n: any) => n.id === node.conditionTrueNodeId);
      if (target) connections.push({ from: node, to: target, label: "Evet" });
    }
    if (node.conditionFalseNodeId) {
      const target = positionedNodes.find((n: any) => n.id === node.conditionFalseNodeId);
      if (target) connections.push({ from: node, to: target, label: "Hayır" });
    }
    if (node.onErrorNodeId) {
      const target = positionedNodes.find((n: any) => n.id === node.onErrorNodeId);
      if (target) connections.push({ from: node, to: target, label: "Hata" });
    }
  }

  const maxX = Math.max(...positionedNodes.map((n: any) => n.position.x + NODE_W), 600);
  const maxY = Math.max(...positionedNodes.map((n: any) => n.position.y + NODE_H), 400);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!onChange) return;
    const node = positionedNodes.find((n: any) => n.id === nodeId);
    if (!node) return;
    setDragState({ nodeId, offsetX: e.clientX - node.position.x, offsetY: e.clientY - node.position.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !onChange) return;
    const newNodes = positionedNodes.map((n: any) => {
      if (n.id !== dragState.nodeId) return n;
      return { ...n, position: { x: Math.max(0, e.clientX - dragState.offsetX), y: Math.max(0, e.clientY - dragState.offsetY) } };
    });
    onChange(newNodes);
  }, [dragState, onChange, positionedNodes]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  return (
    <div
      className="relative bg-gray-950/50 border border-gray-800 rounded-lg overflow-auto"
      style={{ minHeight: maxY + 80 }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-testid="visual-workflow-editor"
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        width={maxX + 100}
        height={maxY + 80}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4B5563" />
          </marker>
          <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#22C55E" />
          </marker>
          <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#EF4444" />
          </marker>
        </defs>
        {connections.map((conn, i) => {
          const fromX = conn.from.position.x + NODE_W / 2;
          const fromY = conn.from.position.y + NODE_H;
          const toX = conn.to.position.x + NODE_W / 2;
          const toY = conn.to.position.y;
          const midY = (fromY + toY) / 2;
          const strokeColor = conn.label === "Evet" ? "#22C55E" : conn.label === "Hayır" ? "#EF4444" : conn.label === "Hata" ? "#F97316" : "#4B5563";
          const markerId = conn.label === "Evet" ? "arrowhead-green" : conn.label === "Hayır" ? "arrowhead-red" : "arrowhead";

          return (
            <g key={i}>
              <path
                d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                markerEnd={`url(#${markerId})`}
              />
              {conn.label && (
                <text
                  x={(fromX + toX) / 2 + (conn.label === "Evet" ? -30 : conn.label === "Hayır" ? 20 : 0)}
                  y={midY - 5}
                  fill={strokeColor}
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {positionedNodes.map((node: any) => {
        const result = getNodeResult(node.id);
        const NodeIcon = node.type === "trigger" ? Zap :
          node.type === "condition" ? AlertTriangle :
          node.type === "delay" ? Timer :
          (node.actionType && actionTypeIcons[node.actionType]) || Settings;

        return (
          <div
            key={node.id}
            className={`absolute rounded-lg border-2 px-3 py-2 cursor-pointer transition-all select-none ${getNodeColor(node)} ${
              selectedNodeId === node.id ? "ring-2 ring-white/30" : ""
            } ${result ? getNodeStatusColor(result.status) : ""}`}
            style={{
              left: node.position.x,
              top: node.position.y,
              width: NODE_W,
              minHeight: NODE_H,
            }}
            onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            data-testid={`node-${node.id}`}
          >
            <div className="flex items-center gap-2">
              {onChange && <GripVertical className="w-3 h-3 text-gray-600 flex-shrink-0" />}
              <NodeIcon className={`w-4 h-4 flex-shrink-0 ${getNodeIconColor(node)}`} />
              <span className="text-xs font-medium text-white truncate">{node.label}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-gray-500">
                {node.type === "trigger" ? "Tetikleyici" :
                 node.type === "condition" ? "Koşul" :
                 node.type === "delay" ? "Bekleme" :
                 actionTypeLabels[node.actionType] || node.actionType || "Aksiyon"}
              </span>
              {node.maxRetries && node.maxRetries > 0 && (
                <Badge variant="outline" className="text-[9px] border-gray-700 text-gray-500 px-1 py-0">
                  <RotateCcw className="w-2 h-2 mr-0.5" />{node.maxRetries}
                </Badge>
              )}
              {result && (
                <span className={`text-[10px] ml-auto ${result.status === "success" ? "text-green-400" : result.status === "error" ? "text-red-400" : "text-blue-400"}`}>
                  {result.duration ? `${result.duration}ms` : ""}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {selectedNodeId && (
        <NodeDetailPanel
          node={positionedNodes.find((n: any) => n.id === selectedNodeId)}
          result={getNodeResult(selectedNodeId)}
          onClose={() => setSelectedNodeId(null)}
          allNodes={positionedNodes}
          onChange={onChange ? (updatedNode: any) => {
            const newNodes = positionedNodes.map((n: any) => n.id === updatedNode.id ? updatedNode : n);
            onChange(newNodes);
          } : undefined}
        />
      )}
    </div>
  );
}

function NodeDetailPanel({ node, result, onClose, onChange, allNodes }: {
  node: any;
  result?: any;
  onClose: () => void;
  onChange?: (node: any) => void;
  allNodes?: any[];
}) {
  if (!node) return null;

  const otherNodes = (allNodes || []).filter((n: any) => n.id !== node.id);

  return (
    <div
      className="absolute right-0 top-0 w-80 h-full bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto z-10"
      data-testid="node-detail-panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{node.label}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-panel">
          <XCircle className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tür</label>
          <p className="text-sm text-white capitalize">
            {node.type === "trigger" ? "Tetikleyici" :
             node.type === "condition" ? "Koşul" :
             node.type === "delay" ? "Bekleme" : "Aksiyon"}
          </p>
        </div>

        {node.actionType && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Aksiyon</label>
            <p className="text-sm text-white">{actionTypeLabels[node.actionType] || node.actionType}</p>
          </div>
        )}

        {onChange && (
          <>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Etiket</label>
              <Input
                value={node.label}
                onChange={(e) => onChange({ ...node, label: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                data-testid="input-node-label"
              />
            </div>
            {node.type === "action" && (actionConfigFields[node.actionType] || Object.keys(node.config || {})).map((key: string) => (
              <div key={key}>
                <label className="text-xs text-gray-400 block mb-1">{configFieldLabels[key] || key}</label>
                {key === "body" || key === "message" || key === "description" ? (
                  <Textarea
                    value={String(node.config?.[key] || "")}
                    onChange={(e) => onChange({ ...node, config: { ...node.config, [key]: e.target.value } })}
                    className="bg-gray-800 border-gray-700 text-white text-xs min-h-[60px]"
                    placeholder={configFieldPlaceholders[key] || ""}
                    data-testid={`input-config-${key}`}
                  />
                ) : (
                  <Input
                    value={String(node.config?.[key] || "")}
                    onChange={(e) => onChange({ ...node, config: { ...node.config, [key]: e.target.value } })}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                    placeholder={configFieldPlaceholders[key] || ""}
                    data-testid={`input-config-${key}`}
                  />
                )}
              </div>
            ))}
            {node.type === "delay" && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Bekleme Süresi (saniye)</label>
                <Input
                  type="number"
                  min="1"
                  value={node.config?.delaySeconds || 5}
                  onChange={(e) => onChange({ ...node, config: { ...node.config, delaySeconds: parseInt(e.target.value) || 5 } })}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-config-delay"
                />
              </div>
            )}
          </>
        )}

        {onChange && node.type === "condition" && (
          <div className="border-t border-gray-800 pt-3">
            <h4 className="text-xs text-gray-400 mb-2">Koşul Ayarları</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-500">Mantık:</label>
                <Select
                  value={node.conditionLogic || "and"}
                  onValueChange={(val) => onChange({ ...node, conditionLogic: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-7 w-20" data-testid="select-condition-logic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">VE</SelectItem>
                    <SelectItem value="or">VEYA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(node.conditions && node.conditions.length > 0 ? node.conditions : [{ field: node.config?.field || "", operator: node.config?.operator || "equals", value: node.config?.value || "" }]).map((cond: any, idx: number) => (
                <div key={idx} className="bg-gray-800/50 rounded p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Kural {idx + 1}</span>
                    {(node.conditions?.length || 1) > 1 && (
                      <button
                        className="text-[10px] text-red-400 hover:text-red-300"
                        onClick={() => {
                          const conds = [...(node.conditions || [])];
                          conds.splice(idx, 1);
                          onChange({ ...node, conditions: conds, config: conds[0] ? { field: conds[0].field, operator: conds[0].operator, value: conds[0].value } : node.config });
                        }}
                        data-testid={`button-remove-condition-${idx}`}
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  <Input
                    value={cond.field || ""}
                    onChange={(e) => {
                      const conds = [...(node.conditions || [{ field: node.config?.field || "", operator: node.config?.operator || "equals", value: node.config?.value || "" }])];
                      conds[idx] = { ...conds[idx], field: e.target.value };
                      onChange({ ...node, conditions: conds, config: { ...node.config, field: conds[0]?.field, operator: conds[0]?.operator, value: conds[0]?.value } });
                    }}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-7"
                    placeholder="Alan adı"
                    data-testid={`input-condition-field-${idx}`}
                  />
                  <Select
                    value={cond.operator || "equals"}
                    onValueChange={(val) => {
                      const conds = [...(node.conditions || [{ field: node.config?.field || "", operator: node.config?.operator || "equals", value: node.config?.value || "" }])];
                      conds[idx] = { ...conds[idx], operator: val };
                      onChange({ ...node, conditions: conds, config: { ...node.config, field: conds[0]?.field, operator: conds[0]?.operator, value: conds[0]?.value } });
                    }}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-7" data-testid={`select-condition-operator-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(conditionOperatorLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={String(cond.value || "")}
                    onChange={(e) => {
                      const conds = [...(node.conditions || [{ field: node.config?.field || "", operator: node.config?.operator || "equals", value: node.config?.value || "" }])];
                      conds[idx] = { ...conds[idx], value: e.target.value };
                      onChange({ ...node, conditions: conds, config: { ...node.config, field: conds[0]?.field, operator: conds[0]?.operator, value: conds[0]?.value } });
                    }}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-7"
                    placeholder="Değer"
                    data-testid={`input-condition-value-${idx}`}
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] border-gray-700 text-gray-400 w-full h-7"
                onClick={() => {
                  const existing = node.conditions || [{ field: node.config?.field || "", operator: node.config?.operator || "equals", value: node.config?.value || "" }];
                  onChange({ ...node, conditions: [...existing, { field: "", operator: "equals", value: "" }] });
                }}
                data-testid="button-add-condition-rule"
              >
                <Plus className="w-3 h-3 mr-1" /> Kural Ekle
              </Button>
            </div>
          </div>
        )}

        {onChange && otherNodes.length > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <h4 className="text-xs text-gray-400 mb-2">Bağlantılar</h4>
            <div className="space-y-2">
              {node.type !== "condition" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Sonraki Düğüm</label>
                  <Select value={node.nextNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, nextNodeId: val === "__none__" ? null : val })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-next-node">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Yok —</SelectItem>
                      {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {node.type === "condition" && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Evet → Düğüm</label>
                    <Select value={node.conditionTrueNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, conditionTrueNodeId: val === "__none__" ? null : val })}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-true-node">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Yok —</SelectItem>
                        {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Hayır → Düğüm</label>
                    <Select value={node.conditionFalseNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, conditionFalseNodeId: val === "__none__" ? null : val })}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-false-node">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Yok —</SelectItem>
                        {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hata → Düğüm</label>
                <Select value={node.onErrorNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, onErrorNodeId: val === "__none__" ? null : val })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-error-node">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Yok —</SelectItem>
                    {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {onChange && (
          <div className="border-t border-gray-800 pt-3">
            <h4 className="text-xs text-gray-400 mb-2">Hata Yönetimi</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tekrar Deneme Sayısı</label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  value={node.maxRetries || 0}
                  onChange={(e) => onChange({ ...node, maxRetries: parseInt(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-max-retries"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tekrar Aralığı (ms)</label>
                <Input
                  type="number"
                  min="0"
                  value={node.retryDelayMs || 1000}
                  onChange={(e) => onChange({ ...node, retryDelayMs: parseInt(e.target.value) || 1000 })}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-retry-delay"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Zaman Aşımı (ms)</label>
                <Input
                  type="number"
                  min="0"
                  max="60000"
                  value={node.timeoutMs || 0}
                  onChange={(e) => onChange({ ...node, timeoutMs: parseInt(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  placeholder="0 = sınırsız"
                  data-testid="input-timeout"
                />
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="border-t border-gray-800 pt-3">
            <h4 className="text-xs text-gray-400 mb-2">Çalışma Sonucu</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {result.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs ${result.status === "success" ? "text-green-400" : "text-red-400"}`}>
                  {result.status === "success" ? "Başarılı" : "Başarısız"}
                </span>
                {result.duration && (
                  <span className="text-xs text-gray-500 ml-auto">{result.duration}ms</span>
                )}
              </div>
              {result.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                  <p className="text-xs text-red-400">{result.error}</p>
                </div>
              )}
              {result.input && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Girdi</label>
                  <pre className="text-[10px] text-gray-400 bg-gray-800 rounded p-2 max-h-24 overflow-auto">
                    {JSON.stringify(result.input, null, 2).substring(0, 500)}
                  </pre>
                </div>
              )}
              {result.output && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Çıktı</label>
                  <pre className="text-[10px] text-gray-400 bg-gray-800 rounded p-2 max-h-24 overflow-auto">
                    {JSON.stringify(result.output, null, 2).substring(0, 500)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutionTimeline({ execution }: { execution: Execution }) {
  const [expanded, setExpanded] = useState(false);
  const results = execution.nodeResults || [];

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50" data-testid={`execution-timeline-${execution.id}`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid={`execution-toggle-${execution.id}`}
      >
        {execution.status === "completed" ? (
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
        ) : execution.status === "failed" ? (
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium">
              {execution.status === "completed" ? "Başarılı" : execution.status === "failed" ? "Başarısız" : "Çalışıyor"}
            </span>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-500">
              {results.length} adım
            </Badge>
          </div>
          {execution.error && <p className="text-xs text-red-400 mt-0.5 truncate">{execution.error}</p>}
        </div>
        <p className="text-xs text-gray-500 flex-shrink-0">{new Date(execution.startedAt).toLocaleString("tr-TR")}</p>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </div>

      {expanded && results.length > 0 && (
        <div className="px-3 pb-3">
          <div className="border-l-2 border-gray-700 ml-2 pl-4 space-y-3">
            {results.map((result: any, i: number) => (
              <div key={i} className="relative" data-testid={`execution-step-${i}`}>
                <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 ${
                  result.status === "success" ? "bg-green-500 border-green-400" :
                  result.status === "error" ? "bg-red-500 border-red-400" :
                  "bg-gray-500 border-gray-400"
                }`} />
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{result.label}</span>
                    <div className="flex items-center gap-2">
                      {result.duration != null && (
                        <span className="text-[10px] text-gray-500">{result.duration}ms</span>
                      )}
                      <span className={`text-[10px] ${result.status === "success" ? "text-green-400" : "text-red-400"}`}>
                        {result.status === "success" ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                  {result.error && (
                    <p className="text-[10px] text-red-400 mt-1">{result.error}</p>
                  )}
                  {result.input && (
                    <div className="mt-1">
                      <span className="text-[9px] text-gray-600 font-medium">Girdi:</span>
                      <pre className="text-[10px] text-gray-500 max-h-12 overflow-auto">
                        {JSON.stringify(result.input, null, 2).substring(0, 200)}
                      </pre>
                    </div>
                  )}
                  {result.output && (
                    <div className="mt-1">
                      <span className="text-[9px] text-gray-600 font-medium">Çıktı:</span>
                      <pre className="text-[10px] text-gray-500 max-h-12 overflow-auto">
                        {JSON.stringify(result.output, null, 2).substring(0, 200)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const dayLabels = ["Pzr", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function TriggerConfigEditor({ triggerType, triggerConfig, onChange }: {
  triggerType: string;
  triggerConfig: Record<string, any>;
  onChange: (type: string, config: Record<string, any>) => void;
}) {
  return (
    <Card className="bg-gray-900/50 border-gray-800 mb-4">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-white mb-3">Tetikleyici Ayarları</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tetikleyici Türü</label>
            <Select value={triggerType} onValueChange={(val) => onChange(val, triggerConfig)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-trigger-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(triggerTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {triggerType === "agent_tool_complete" && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Ajan Türü</label>
                <Input
                  value={triggerConfig.agentType || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, agentType: e.target.value })}
                  placeholder="örn: bookkeeping, sales-sdr"
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-trigger-agent-type"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Araç Adı</label>
                <Input
                  value={triggerConfig.toolName || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, toolName: e.target.value })}
                  placeholder="örn: send_email, generate_pdf"
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-trigger-tool-name"
                />
              </div>
            </>
          )}

          {triggerType === "schedule" && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Zamanlama Türü</label>
                <Select
                  value={triggerConfig.scheduleType || "daily"}
                  onValueChange={(val) => onChange(triggerType, { ...triggerConfig, scheduleType: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-schedule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Her Gün</SelectItem>
                    <SelectItem value="weekly">Haftalık</SelectItem>
                    <SelectItem value="monthly">Aylık</SelectItem>
                    <SelectItem value="custom">Özel (Cron)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerConfig.scheduleType !== "custom" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">Saat</label>
                    <Select
                      value={String(triggerConfig.scheduleHour ?? 9)}
                      onValueChange={(val) => onChange(triggerType, { ...triggerConfig, scheduleHour: parseInt(val) })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-schedule-hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">Dakika</label>
                    <Select
                      value={String(triggerConfig.scheduleMinute ?? 0)}
                      onValueChange={(val) => onChange(triggerType, { ...triggerConfig, scheduleMinute: parseInt(val) })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-schedule-minute">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                          <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {triggerConfig.scheduleType === "weekly" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Günler</label>
                  <div className="flex gap-1">
                    {dayLabels.map((label, i) => {
                      const selected = (triggerConfig.scheduleDaysOfWeek || []).includes(i);
                      return (
                        <button
                          key={i}
                          className={`px-2 py-1 text-[10px] rounded border ${
                            selected ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400"
                          }`}
                          onClick={() => {
                            const days = triggerConfig.scheduleDaysOfWeek || [];
                            const next = selected ? days.filter((d: number) => d !== i) : [...days, i];
                            onChange(triggerType, { ...triggerConfig, scheduleDaysOfWeek: next });
                          }}
                          data-testid={`button-day-${i}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {triggerConfig.scheduleType === "monthly" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Ayın Günü</label>
                  <Select
                    value={String(triggerConfig.scheduleDayOfMonth || 1)}
                    onValueChange={(val) => onChange(triggerType, { ...triggerConfig, scheduleDayOfMonth: parseInt(val) })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-schedule-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {triggerConfig.scheduleType === "custom" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Cron İfadesi</label>
                  <Input
                    value={triggerConfig.cronExpression || ""}
                    onChange={(e) => onChange(triggerType, { ...triggerConfig, cronExpression: e.target.value })}
                    placeholder="*/5 * * * *"
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono"
                    data-testid="input-cron-expression"
                  />
                </div>
              )}
            </>
          )}

          {triggerType === "webhook" && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Webhook Yolu</label>
              <Input
                value={triggerConfig.webhookPath || ""}
                onChange={(e) => onChange(triggerType, { ...triggerConfig, webhookPath: e.target.value })}
                placeholder="/my-webhook"
                className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                data-testid="input-webhook-path"
              />
            </div>
          )}

          {triggerType === "email_received" && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Gönderen Filtresi</label>
                <Input
                  value={triggerConfig.senderFilter || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, senderFilter: e.target.value })}
                  placeholder="örn: @example.com veya john@example.com"
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-email-sender-filter"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Konu Filtresi</label>
                <Input
                  value={triggerConfig.subjectFilter || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, subjectFilter: e.target.value })}
                  placeholder="örn: Fatura, Sipariş"
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-email-subject-filter"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Hedef E-posta</label>
                <Input
                  value={triggerConfig.targetEmail || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, targetEmail: e.target.value })}
                  placeholder="info@company.com"
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-email-target"
                />
              </div>
            </>
          )}

          {triggerType === "threshold" && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Alan Adı</label>
                <Input
                  value={triggerConfig.thresholdField || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, thresholdField: e.target.value })}
                  placeholder="örn: amount, count"
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-threshold-field"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Karşılaştırma</label>
                <Select
                  value={triggerConfig.thresholdOperator || "gt"}
                  onValueChange={(val) => onChange(triggerType, { ...triggerConfig, thresholdOperator: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-threshold-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">Büyüktür (&gt;)</SelectItem>
                    <SelectItem value="lt">Küçüktür (&lt;)</SelectItem>
                    <SelectItem value="gte">Büyük Eşit (&gt;=)</SelectItem>
                    <SelectItem value="lte">Küçük Eşit (&lt;=)</SelectItem>
                    <SelectItem value="eq">Eşittir (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Eşik Değeri</label>
                <Input
                  type="number"
                  value={triggerConfig.thresholdValue || 0}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, thresholdValue: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-threshold-value"
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowBuilderView({ workflow, onBack }: {
  workflow: AutomationWorkflow;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [nodes, setNodes] = useState(workflow.nodes || []);
  const [triggerType, setTriggerType] = useState(workflow.triggerType || "manual");
  const [triggerConfig, setTriggerConfig] = useState(workflow.triggerConfig || {});
  const [hasChanges, setHasChanges] = useState(false);

  const handleNodesChange = (newNodes: any[]) => {
    setNodes(newNodes);
    setHasChanges(true);
  };

  const handleTriggerChange = (type: string, config: Record<string, any>) => {
    setTriggerType(type);
    setTriggerConfig(config);
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/automations/${workflow.id}`, { nodes, triggerType, triggerConfig });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setHasChanges(false);
      toast({ title: "Workflow kaydedildi" });
    },
    onError: () => toast({ title: "Kaydetme başarısız", variant: "destructive" }),
  });

  const addNodeMutation = (type: string, actionType?: string) => {
    const id = `${type}-${Date.now()}`;
    const maxY = Math.max(0, ...nodes.map((n: any) => (n.position?.y || 0)));
    const newNode: any = {
      id,
      type,
      label: type === "trigger" ? "Tetikleyici" :
             type === "condition" ? "Koşul" :
             type === "delay" ? "Bekleme" :
             actionTypeLabels[actionType || ""] || "Aksiyon",
      config: {},
      nextNodeId: null,
      position: { x: 250, y: maxY + 130 },
    };
    if (actionType) newNode.actionType = actionType;
    if (type === "delay") newNode.config = { delaySeconds: 5 };
    if (type === "condition") {
      newNode.config = { field: "", operator: "equals", value: "" };
      newNode.conditionTrueNodeId = null;
      newNode.conditionFalseNodeId = null;
    }

    const updatedNodes = [...nodes];
    const lastNode = updatedNodes.filter((n: any) => n.type !== "trigger").pop() || updatedNodes[updatedNodes.length - 1];
    if (lastNode && !lastNode.nextNodeId && lastNode.type !== "condition") {
      lastNode.nextNodeId = id;
    }
    updatedNodes.push(newNode);
    handleNodesChange(updatedNodes);
  };

  const removeNode = (nodeId: string) => {
    const updatedNodes = nodes
      .filter((n: any) => n.id !== nodeId)
      .map((n: any) => ({
        ...n,
        nextNodeId: n.nextNodeId === nodeId ? null : n.nextNodeId,
        conditionTrueNodeId: n.conditionTrueNodeId === nodeId ? null : n.conditionTrueNodeId,
        conditionFalseNodeId: n.conditionFalseNodeId === nodeId ? null : n.conditionFalseNodeId,
        onErrorNodeId: n.onErrorNodeId === nodeId ? null : n.onErrorNodeId,
      }));
    handleNodesChange(updatedNodes);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-builder">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{workflow.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">Görsel Düzenleyici</p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-xs"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-workflow"
              >
                {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Kaydet
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "send_email")} data-testid="button-add-email-node">
            <Mail className="w-3 h-3 mr-1" /> E-posta
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "create_task")} data-testid="button-add-task-node">
            <FileText className="w-3 h-3 mr-1" /> Görev
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "notify_boss")} data-testid="button-add-notify-node">
            <Bell className="w-3 h-3 mr-1" /> Bildirim
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "http_request")} data-testid="button-add-http-node">
            <Globe className="w-3 h-3 mr-1" /> HTTP
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "set_variable")} data-testid="button-add-variable-node">
            <Variable className="w-3 h-3 mr-1" /> Değişken
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("condition")} data-testid="button-add-condition-node">
            <AlertTriangle className="w-3 h-3 mr-1" /> Koşul
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("delay")} data-testid="button-add-delay-node">
            <Timer className="w-3 h-3 mr-1" /> Bekleme
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "whatsapp_message")} data-testid="button-add-whatsapp-node">
            <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "format_data")} data-testid="button-add-format-node">
            <Database className="w-3 h-3 mr-1" /> Veri Dönüştür
          </Button>
        </div>

        <TriggerConfigEditor
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onChange={handleTriggerChange}
        />

        <VisualWorkflowEditor nodes={nodes} onChange={handleNodesChange} />

        {nodes.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Düğümler ({nodes.length})</h3>
            <div className="space-y-1">
              {nodes.map((node: any) => (
                <div key={node.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/30 rounded text-xs">
                  <span className="text-gray-400 font-mono w-24 truncate">{node.id}</span>
                  <span className="text-white flex-1 truncate">{node.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    onClick={() => removeNode(node.id)}
                    data-testid={`button-remove-node-${node.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Automations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "templates" | "detail" | "create" | "builder">("list");
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
          { id: "trigger-1", type: "trigger", label: "Manuel Tetikleyici", config: {}, nextNodeId: "action-1", position: { x: 250, y: 50 } },
          { id: "action-1", type: "action", actionType: "log_action", label: "Aksiyon Kaydet", config: { description: "Manuel otomasyon çalıştırıldı" }, nextNodeId: null, position: { x: 250, y: 180 } },
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

  if (view === "builder" && selectedWorkflow) {
    return (
      <WorkflowBuilderView
        workflow={selectedWorkflow}
        onBack={() => { setView("detail"); }}
      />
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
        <div className="max-w-5xl mx-auto">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

          <div className="flex gap-3 mb-6">
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
              variant="outline"
              className="border-gray-700 text-gray-300 hover:text-white"
              onClick={() => setView("builder")}
              data-testid="button-open-builder"
            >
              <Settings className="w-4 h-4 mr-2" />
              Görsel Düzenleyici
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
              <CardTitle className="text-white text-lg">Workflow Görünümü</CardTitle>
            </CardHeader>
            <CardContent>
              <VisualWorkflowEditor
                nodes={selectedWorkflow.nodes || []}
                executionResults={executions.length > 0 ? executions[0].nodeResults : undefined}
              />
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
                    <ExecutionTimeline key={exec.id} execution={exec} />
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
