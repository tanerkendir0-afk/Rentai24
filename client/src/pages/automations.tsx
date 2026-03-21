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
  Plug, Search, X, Sparkles,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
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

const getCategoryLabels = (t: any): Record<string, string> => ({
  finance: t("automations.catFinance"), sales: t("automations.catSales"), ecommerce: t("automations.catEcommerce"),
  management: t("automations.catManagement"), communication: t("automations.catCommunication"), support: t("automations.catSupport"),
  hr: t("automations.catHR"), marketing: t("automations.catMarketing"),
});

const getTriggerTypeLabels = (t: any): Record<string, string> => ({
  agent_tool_complete: t("automations.triggerAgentAction"), webhook: t("automations.triggerWebhook"),
  schedule: t("automations.triggerScheduled"), manual: t("automations.triggerManual"), threshold: t("automations.triggerThreshold"),
  email_received: t("automations.triggerEmailReceived"), event_monitor: t("automations.triggerEventMonitor"),
});

const triggerTypeIcons: Record<string, any> = {
  agent_tool_complete: Bot, webhook: Webhook, schedule: Timer,
  manual: Play, threshold: AlertTriangle, email_received: Mail,
  event_monitor: Activity,
};

const getActionTypeLabels = (t: any): Record<string, string> => ({
  send_email: t("automations.actionSendEmail"), create_task: t("automations.actionCreateTask"),
  notify_owner: t("automations.actionNotifyOwner"), notify_boss: t("automations.actionNotifyBoss"), update_lead: t("automations.actionUpdateLead"),
  webhook_call: t("automations.actionWebhookCall"), log_action: t("automations.actionLogAction"),
  calculate: t("automations.actionCalculate"), http_request: t("automations.actionHttpRequest"),
  set_variable: t("automations.actionSetVariable"), format_data: t("automations.actionFormatData"),
  whatsapp_message: t("automations.actionWhatsapp"), multi_email: t("automations.actionMultiEmail"),
  db_query: t("automations.actionDbQuery"),
  integration: t("automations.actionIntegration"),
  run_skill: t("automations.actionRunSkill"),
});

const actionTypeIcons: Record<string, any> = {
  send_email: Mail, create_task: FileText, notify_owner: Bell, notify_boss: Bell,
  update_lead: Target, webhook_call: Webhook, log_action: Activity,
  calculate: Hash, http_request: Globe, set_variable: Variable,
  format_data: Database, whatsapp_message: MessageSquare,
  multi_email: Users, db_query: Database,
  integration: Plug,
  run_skill: Sparkles,
};

const getConditionOperatorLabels = (t: any): Record<string, string> => ({
  equals: t("automations.opEquals"), not_equals: t("automations.opNotEquals"), contains: t("automations.opContains"),
  not_contains: t("automations.opNotContains"), greater_than: t("automations.opGreaterThan"), less_than: t("automations.opLessThan"),
  greater_than_or_equal: t("automations.opGte"), less_than_or_equal: t("automations.opLte"),
  exists: t("automations.opExists"), not_exists: t("automations.opNotExists"), regex: t("automations.opRegex"),
  between: t("automations.opBetween"), contains_any_of: t("automations.opContainsAny"),
  starts_with: t("automations.opStartsWith"), ends_with: t("automations.opEndsWith"),
});

const actionConfigFields: Record<string, string[]> = {
  send_email: ["to", "subject", "body"],
  create_task: ["title", "description", "agentType", "priority"],
  notify_owner: ["summary", "notificationType"],
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

const getConfigFieldLabels = (t: any): Record<string, string> => ({
  to: t("automations.fieldTo"), subject: t("automations.fieldSubject"), body: t("automations.fieldBody"), title: t("automations.fieldTitle"),
  description: t("automations.fieldDescription"), agentType: t("automations.fieldAgentType"), priority: t("automations.fieldPriority"),
  summary: t("automations.fieldSummary"), notificationType: t("automations.fieldNotificationType"), leadId: t("automations.fieldLeadId"),
  status: t("automations.fieldStatus"), notes: t("automations.fieldNotes"), url: t("automations.fieldUrl"), method: t("automations.fieldMethod"),
  expression: t("automations.fieldExpression"), resultVariable: t("automations.fieldResultVariable"),
  authType: t("automations.fieldAuthType"), authToken: t("automations.fieldAuthToken"), authUsername: t("automations.fieldAuthUsername"),
  variableName: t("automations.fieldVariableName"), value: t("automations.fieldValue"),
  valueType: t("automations.fieldValueType"), format: t("automations.fieldFormat"), sourceField: t("automations.fieldSourceField"),
  phone: t("automations.fieldPhone"), message: t("automations.fieldMessage"), recipients: t("automations.fieldRecipients"),
  table: t("automations.fieldTable"), queryType: t("automations.fieldQueryType"),
});

const getConfigFieldPlaceholders = (t: any): Record<string, string> => ({
  to: "ornek@email.com", subject: t("automations.phSubject"), body: t("automations.phBody"),
  title: t("automations.phTitle"), description: t("automations.phDescription"),
  agentType: "bookkeeping, sales-sdr...", priority: "high, medium, low",
  summary: t("automations.phSummary"), url: "https://api.example.com/endpoint",
  method: "GET, POST, PUT", variableName: "myVar",
  value: "{{data}}", valueType: "string, number, boolean, json",
  format: "json, csv, text",
  sourceField: "data", phone: "+905551234567", message: t("automations.phMessage"),
  recipients: "a@b.com, c@d.com", table: "agent_tasks, leads...",
  queryType: "count",
});

const getAgentTypeOptions = (t: any) => [
  { value: "customer-support", label: t("automations.agentAva") },
  { value: "sales-sdr", label: t("automations.agentRex") },
  { value: "social-media", label: t("automations.agentMaya") },
  { value: "bookkeeping", label: t("automations.agentFinn") },
  { value: "scheduling", label: t("automations.agentCal") },
  { value: "hr-recruiting", label: t("automations.agentHarper") },
  { value: "data-analyst", label: t("automations.agentDataBot") },
  { value: "ecommerce-ops", label: t("automations.agentShopBot") },
  { value: "real-estate", label: t("automations.agentReno") },
  { value: "manager", label: t("automations.agentManager") },
];

const getPriorityOptions = (t: any) => [
  { value: "high", label: t("automations.priorityHigh") },
  { value: "medium", label: t("automations.priorityMedium") },
  { value: "low", label: t("automations.priorityLow") },
];

const NODE_W = 200;
const NODE_H = 64;

function getNodeColor(node: any): string {
  if (node.type === "trigger") return "border-yellow-500/50 bg-yellow-500/10";
  if (node.type === "condition") return "border-purple-500/50 bg-purple-500/10";
  if (node.type === "delay") return "border-orange-500/50 bg-orange-500/10";
  if (node.actionType === "integration") return "border-cyan-500/50 bg-cyan-500/10";
  if (node.actionType === "run_skill") return "border-emerald-500/50 bg-emerald-500/10";
  return "border-blue-500/50 bg-blue-500/10";
}

function getNodeIconColor(node: any): string {
  if (node.type === "trigger") return "text-yellow-400";
  if (node.type === "condition") return "text-purple-400";
  if (node.actionType === "integration") return "text-cyan-400";
  if (node.actionType === "run_skill") return "text-emerald-400";
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
  const { t } = useTranslation("pages");
  const actionTypeLabels = getActionTypeLabels(t);
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
      if (target) connections.push({ from: node, to: target, label: "yes" });
    }
    if (node.conditionFalseNodeId) {
      const target = positionedNodes.find((n: any) => n.id === node.conditionFalseNodeId);
      if (target) connections.push({ from: node, to: target, label: "no" });
    }
    if (node.onErrorNodeId) {
      const target = positionedNodes.find((n: any) => n.id === node.onErrorNodeId);
      if (target) connections.push({ from: node, to: target, label: "error" });
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
          const strokeColor = conn.label === "yes" ? "#22C55E" : conn.label === "no" ? "#EF4444" : conn.label === "error" ? "#F97316" : "#4B5563";
          const markerId = conn.label === "yes" ? "arrowhead-green" : conn.label === "no" ? "arrowhead-red" : "arrowhead";
          const connDisplayLabels: Record<string, string> = { yes: t("automations.yes"), no: t("automations.no"), error: t("automations.connError") };

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
                  x={(fromX + toX) / 2 + (conn.label === "yes" ? -30 : conn.label === "no" ? 20 : 0)}
                  y={midY - 5}
                  fill={strokeColor}
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {connDisplayLabels[conn.label] || conn.label}
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
                {node.type === "trigger" ? t("automations.trigger") :
                 node.type === "condition" ? t("automations.condition") :
                 node.type === "delay" ? t("automations.delay") :
                 node.actionType === "integration" ? (node.config?._integrationLabel || t("automations.actionIntegration")) :
                 node.actionType === "run_skill" ? (node.config?._skillLabel || t("automations.actionRunSkill")) :
                 actionTypeLabels[node.actionType] || node.actionType || t("automations.action")}
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
  const { t } = useTranslation("pages");
  const actionTypeLabels = getActionTypeLabels(t);
  const conditionOperatorLabels = getConditionOperatorLabels(t);
  const configFieldLabels = getConfigFieldLabels(t);
  const configFieldPlaceholders = getConfigFieldPlaceholders(t);
  const AGENT_TYPE_OPTIONS = getAgentTypeOptions(t);
  const PRIORITY_OPTIONS = getPriorityOptions(t);
  if (!node) return null;

  const otherNodes = (allNodes || []).filter((n: any) => n.id !== node.id);

  return (
    <div
      className="absolute right-0 top-0 w-80 h-full bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto z-20"
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
          <label className="text-xs text-gray-400 block mb-1">{t("automations.nodeType")}</label>
          <p className="text-sm text-white capitalize">
            {node.type === "trigger" ? t("automations.trigger") :
             node.type === "condition" ? t("automations.condition") :
             node.type === "delay" ? t("automations.delay") : t("automations.action")}
          </p>
        </div>

        {node.actionType && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t("automations.action")}</label>
            <p className="text-sm text-white">{actionTypeLabels[node.actionType] || node.actionType}</p>
          </div>
        )}

        {onChange && (
          <>
            <div>
              <label className="text-xs text-gray-400 block mb-1">{t("automations.label")}</label>
              <Input
                value={node.label}
                onChange={(e) => onChange({ ...node, label: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                data-testid="input-node-label"
              />
            </div>
            {node.type === "action" && node.actionType !== "integration" && node.actionType !== "run_skill" && (actionConfigFields[node.actionType] || Object.keys(node.config || {})).map((key: string) => (
              <div key={key}>
                <label className="text-xs text-gray-400 block mb-1">{configFieldLabels[key] || key}</label>
                {key === "agentType" ? (
                  <Select
                    value={node.config?.[key] || ""}
                    onValueChange={(v) => onChange({ ...node, config: { ...node.config, [key]: v } })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid={`select-config-${key}`}>
                      <SelectValue placeholder={t("automations.selectAgent")} />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : key === "priority" ? (
                  <Select
                    value={node.config?.[key] || ""}
                    onValueChange={(v) => onChange({ ...node, config: { ...node.config, [key]: v } })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid={`select-config-${key}`}>
                      <SelectValue placeholder={t("automations.selectPriority")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : key === "body" || key === "message" || key === "description" ? (
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
            {node.type === "action" && node.actionType === "integration" && (
              <IntegrationConfigPanel
                config={node.config || {}}
                onChange={(config: any) => onChange({ ...node, config, label: config._integrationLabel || node.label })}
              />
            )}
            {node.type === "action" && node.actionType === "run_skill" && (
              <SkillConfigPanel
                config={node.config || {}}
                onChange={(config: any) => onChange({ ...node, config, label: config._skillLabel || node.label })}
              />
            )}
            {node.type === "delay" && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.delaySeconds")}</label>
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
            <h4 className="text-xs text-gray-400 mb-2">{t("automations.conditionSettings")}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-500">{t("automations.logic")}:</label>
                <Select
                  value={node.conditionLogic || "and"}
                  onValueChange={(val) => onChange({ ...node, conditionLogic: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-7 w-20" data-testid="select-condition-logic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">{t("automations.and")}</SelectItem>
                    <SelectItem value="or">{t("automations.or")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(node.conditions && node.conditions.length > 0 ? node.conditions : [{ field: node.config?.field || "", operator: node.config?.operator || "equals", value: node.config?.value || "" }]).map((cond: any, idx: number) => (
                <div key={idx} className="bg-gray-800/50 rounded p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{t("automations.rule")} {idx + 1}</span>
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
                        {t("automations.remove")}
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
                    placeholder={t("automations.fieldName")}
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
                    placeholder={t("automations.valuePlaceholder")}
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
                <Plus className="w-3 h-3 mr-1" /> {t("automations.addRule")}
              </Button>
            </div>
          </div>
        )}

        {onChange && otherNodes.length > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <h4 className="text-xs text-gray-400 mb-2">{t("automations.connections")}</h4>
            <div className="space-y-2">
              {node.type !== "condition" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t("automations.nextNode")}</label>
                  <Select value={node.nextNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, nextNodeId: val === "__none__" ? null : val })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-next-node">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("automations.none")}</SelectItem>
                      {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {node.type === "condition" && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{t("automations.yesNode")}</label>
                    <Select value={node.conditionTrueNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, conditionTrueNodeId: val === "__none__" ? null : val })}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-true-node">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("automations.none")}</SelectItem>
                        {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{t("automations.noNode")}</label>
                    <Select value={node.conditionFalseNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, conditionFalseNodeId: val === "__none__" ? null : val })}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-false-node">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("automations.none")}</SelectItem>
                        {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">{t("automations.errorNode")}</label>
                <Select value={node.onErrorNodeId || "__none__"} onValueChange={(val) => onChange({ ...node, onErrorNodeId: val === "__none__" ? null : val })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-error-node">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("automations.none")}</SelectItem>
                    {otherNodes.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {onChange && (
          <div className="border-t border-gray-800 pt-3">
            <h4 className="text-xs text-gray-400 mb-2">{t("automations.errorHandling")}</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">{t("automations.retryCount")}</label>
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
                <label className="text-xs text-gray-500 block mb-1">{t("automations.retryDelay")}</label>
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
                <label className="text-xs text-gray-500 block mb-1">{t("automations.timeout")}</label>
                <Input
                  type="number"
                  min="0"
                  max="60000"
                  value={node.timeoutMs || 0}
                  onChange={(e) => onChange({ ...node, timeoutMs: parseInt(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  placeholder={t("automations.noLimit")}
                  data-testid="input-timeout"
                />
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="border-t border-gray-800 pt-3">
            <h4 className="text-xs text-gray-400 mb-2">{t("automations.executionResult")}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {result.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs ${result.status === "success" ? "text-green-400" : "text-red-400"}`}>
                  {result.status === "success" ? t("automations.successful") : t("automations.failed")}
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
                  <label className="text-xs text-gray-500 block mb-1">{t("automations.input")}</label>
                  <pre className="text-[10px] text-gray-400 bg-gray-800 rounded p-2 max-h-24 overflow-auto">
                    {JSON.stringify(result.input, null, 2).substring(0, 500)}
                  </pre>
                </div>
              )}
              {result.output && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t("automations.output")}</label>
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
  const { t, i18n } = useTranslation("pages");
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
              {execution.status === "completed" ? t("automations.successful") : execution.status === "failed" ? t("automations.failed") : t("automations.running")}
            </span>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-500">
              {results.length} {t("automations.step")}
            </Badge>
          </div>
          {execution.error && <p className="text-xs text-red-400 mt-0.5 truncate">{execution.error}</p>}
        </div>
        <p className="text-xs text-gray-500 flex-shrink-0">{new Date(execution.startedAt).toLocaleString(i18n.language === "tr" ? "tr-TR" : "en-US")}</p>
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
                      <span className="text-[9px] text-gray-600 font-medium">{t("automations.input")}:</span>
                      <pre className="text-[10px] text-gray-500 max-h-12 overflow-auto">
                        {JSON.stringify(result.input, null, 2).substring(0, 200)}
                      </pre>
                    </div>
                  )}
                  {result.output && (
                    <div className="mt-1">
                      <span className="text-[9px] text-gray-600 font-medium">{t("automations.output")}:</span>
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

function SkillConfigPanel({ config, onChange }: { config: Record<string, any>; onChange: (config: Record<string, any>) => void }) {
  const { t } = useTranslation("pages");
  const { data: skillsData } = useQuery<any>({
    queryKey: ["/api/automations/skills"],
  });
  const skills = skillsData?.skills || [];
  const selectedSkill = skills.find((s: any) => s.name === config.skillName || String(s.id) === String(config.skillId));

  return (
    <div className="space-y-2" data-testid="skill-config-panel">
      <label className="text-xs text-gray-400 block">{t("automations.selectSkill")}</label>
      <Select
        value={config.skillName || ""}
        onValueChange={(val) => {
          const skill = skills.find((s: any) => s.name === val);
          if (skill) {
            onChange({
              ...config,
              skillName: skill.name,
              skillId: skill.id,
              _skillLabel: `⚡ ${skill.nameTr}`,
            });
          }
        }}
      >
        <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs" data-testid="select-skill">
          <SelectValue placeholder={t("automations.selectSkillPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {skills.map((s: any) => (
            <SelectItem key={s.name} value={s.name}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>{s.nameTr}</span>
                <Badge variant="outline" className="text-[9px] ml-1">{s.category}</Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedSkill && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500">{selectedSkill.descriptionTr || selectedSkill.description}</p>
          {selectedSkill.parameters && selectedSkill.parameters.length > 0 && (
            <>
              <label className="text-xs text-emerald-400 block mt-2">{t("automations.parameters")}</label>
              {selectedSkill.parameters.map((p: any) => (
                <div key={p.name}>
                  <label className="text-[10px] text-gray-400 block mb-0.5">
                    {p.name}{p.required ? " *" : ""} <span className="text-gray-600">({p.type})</span>
                  </label>
                  <Input
                    value={String(config[p.name] || "")}
                    onChange={(e) => onChange({ ...config, [p.name]: e.target.value })}
                    placeholder={p.description || p.name}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-7"
                    data-testid={`skill-param-${p.name}`}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IntegrationConfigPanel({ config, onChange }: { config: Record<string, any>; onChange: (config: Record<string, any>) => void }) {
  const { t } = useTranslation("pages");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: catalogData } = useQuery<any>({
    queryKey: ["/api/automations/integrations"],
  });

  const integrations = catalogData?.integrations || [];
  const categoryLabels = catalogData?.categoryLabels || {};
  const selectedIntegration = integrations.find((i: any) => i.id === config.integrationId);
  const selectedAction = selectedIntegration?.actions?.find((a: any) => a.id === config.integrationAction);

  if (!config.integrationId) {
    const byCategory: Record<string, any[]> = {};
    integrations.forEach((i: any) => {
      if (searchTerm && !i.nameTr.toLowerCase().includes(searchTerm.toLowerCase()) && !i.name.toLowerCase().includes(searchTerm.toLowerCase())) return;
      if (!byCategory[i.category]) byCategory[i.category] = [];
      byCategory[i.category].push(i);
    });

    return (
      <div className="space-y-2" data-testid="integration-picker">
        <label className="text-xs text-gray-400 block">{t("automations.selectIntegration")}</label>
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("automations.searchIntegration")}
            className="bg-gray-800 border-gray-700 text-white text-xs h-7 pl-7"
            data-testid="input-integration-search"
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">{categoryLabels[cat] || cat}</p>
              {(items as any[]).map((integration: any) => (
                <button
                  key={integration.id}
                  onClick={() => onChange({ ...config, integrationId: integration.id, integrationAction: "", _integrationLabel: integration.nameTr })}
                  className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-gray-800 text-left"
                  data-testid={`btn-integration-${integration.id}`}
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: integration.color }}>
                    {integration.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-white">{integration.nameTr}</p>
                    <p className="text-[10px] text-gray-500">{integration.actions?.length || 0} {t("automations.actionCount")}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {Object.keys(byCategory).length === 0 && (
            <p className="text-xs text-gray-500 py-2 text-center">{t("automations.noResults")}</p>
          )}
        </div>
        <p className="text-[10px] text-gray-600 text-center">{integrations.length} {t("automations.integrationCount")} • {catalogData?.totalActions || 0} {t("automations.actionCount")}</p>
      </div>
    );
  }

  if (!config.integrationAction && selectedIntegration) {
    return (
      <div className="space-y-2" data-testid="integration-action-picker">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: selectedIntegration.color }}>
              {selectedIntegration.name.charAt(0)}
            </div>
            <span className="text-xs text-white font-medium">{selectedIntegration.nameTr}</span>
          </div>
          <button onClick={() => onChange({ ...config, integrationId: "", integrationAction: "" })} className="text-gray-500 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
        <label className="text-xs text-gray-400 block">{t("automations.selectAction")}</label>
        {selectedIntegration.actions.map((action: any) => (
          <button
            key={action.id}
            onClick={() => onChange({ ...config, integrationAction: action.id, _integrationLabel: `${selectedIntegration.nameTr}: ${action.labelTr}` })}
            className="w-full p-2 rounded bg-gray-800 hover:bg-gray-700 text-left"
            data-testid={`btn-action-${action.id}`}
          >
            <p className="text-xs text-white">{action.labelTr}</p>
            <p className="text-[10px] text-gray-500">{action.method} {action.pathTemplate.substring(0, 40)}</p>
          </button>
        ))}
      </div>
    );
  }

  if (selectedIntegration && selectedAction) {
    return (
      <div className="space-y-2" data-testid="integration-config-fields">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: selectedIntegration.color }}>
              {selectedIntegration.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-white">{selectedIntegration.nameTr}</p>
              <p className="text-[10px] text-gray-500">{selectedAction.labelTr}</p>
            </div>
          </div>
          <button onClick={() => onChange({ ...config, integrationAction: "" })} className="text-gray-500 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">{selectedIntegration.authLabel}</label>
          <Input
            type="password"
            value={config.apiKey || ""}
            onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
            placeholder={selectedIntegration.authPlaceholder}
            className="bg-gray-800 border-gray-700 text-white text-xs h-7"
            data-testid="input-integration-apikey"
          />
        </div>

        {Object.keys(selectedAction.fieldLabels || {}).map((field: string) => (
          <div key={field}>
            <label className="text-xs text-gray-400 block mb-1">
              {selectedAction.fieldLabels[field]}
              {selectedAction.requiredFields?.includes(field) && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {selectedAction.fieldTypes?.[field] === "textarea" ? (
              <Textarea
                value={config[field] || ""}
                onChange={(e) => onChange({ ...config, [field]: e.target.value })}
                placeholder={selectedAction.fieldPlaceholders?.[field] || ""}
                className="bg-gray-800 border-gray-700 text-white text-xs min-h-[50px]"
                data-testid={`input-integration-${field}`}
              />
            ) : (
              <Input
                value={config[field] || ""}
                onChange={(e) => onChange({ ...config, [field]: e.target.value })}
                placeholder={selectedAction.fieldPlaceholders?.[field] || ""}
                className="bg-gray-800 border-gray-700 text-white text-xs h-7"
                data-testid={`input-integration-${field}`}
              />
            )}
          </div>
        ))}

        <a href={selectedIntegration.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1">
          <ExternalLink className="w-3 h-3" /> {t("automations.apiDocs")}
        </a>
      </div>
    );
  }

  return null;
}

function EventMonitorPanel({ workflowId: _workflowId }: { workflowId: number }) {
  const { t } = useTranslation("pages");
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<any>({
    queryKey: ["/api/automations/event-monitor/status"],
    refetchInterval: 30000,
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/automations/event-monitor/check", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const total = (data.results || []).reduce((acc: number, r: any) => acc + (r.triggeredWorkflows || 0), 0);
        toast({
          title: t("automations.eventCheckComplete"),
          description: `${total} ${t("automations.workflowTriggered")}`,
        });
      }
    },
    onError: () => toast({ title: t("automations.checkFailed"), variant: "destructive" }),
  });

  if (isLoading) return null;

  const monitors = status?.activeMonitors || [];

  return (
    <Card className="bg-gray-900/50 border-gray-800 mb-6" data-testid="event-monitor-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            {t("automations.triggerEventMonitor")}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-700 text-gray-300 text-xs"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            data-testid="button-run-event-check"
          >
            {checkMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Play className="w-3 h-3 mr-1" />
            )}
            {t("automations.checkNow")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500 mb-3">
          {t("automations.eventMonitorDesc")}
        </p>
        {monitors.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-xs text-gray-500">{t("automations.noActiveMonitors")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monitors.map((monitor: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white">{monitor.label}</p>
                  <p className="text-xs text-gray-400">{monitor.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {checkMutation.data?.results && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-gray-400">{t("automations.lastCheckResults")}:</p>
            {checkMutation.data.results.map((r: any, i: number) => (
              <div key={i} className={`p-2 rounded text-xs ${r.triggeredWorkflows > 0 ? "bg-green-500/10 text-green-400" : "bg-gray-800/50 text-gray-500"}`}>
                <span className="font-medium">{r.description}</span>
                {r.triggeredWorkflows > 0 && ` — ${r.triggeredWorkflows} ${t("automations.triggered")}`}
                {r.errors?.length > 0 && <span className="text-red-400 ml-2">{r.errors[0]}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NaturalLanguageRuleBuilder({ onWorkflowCreated, onClose }: {
  onWorkflowCreated: (workflow: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("pages");
  const triggerTypeLabels = getTriggerTypeLabels(t);
  const actionTypeLabels = getActionTypeLabels(t);
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [step, setStep] = useState<"input" | "preview">("input");

  const nlMutation = useMutation({
    mutationFn: async (desc: string) => {
      const res = await apiRequest("POST", "/api/automations/nl-to-workflow", { description: desc });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.workflow) {
        setGeneratedWorkflow(data.workflow);
        setStep("preview");
      } else {
        toast({ title: t("automations.ruleCreationFailed"), description: data.error, variant: "destructive" });
      }
    },
    onError: () => toast({ title: t("automations.errorOccurred"), variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/automations", {
        name: generatedWorkflow.name,
        description: generatedWorkflow.description,
        triggerType: generatedWorkflow.triggerType,
        triggerConfig: generatedWorkflow.triggerConfig || {},
        nodes: generatedWorkflow.nodes,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      onWorkflowCreated(data);
      toast({ title: t("automations.ruleCreated"), description: t("automations.dontForgetActivate") });
    },
    onError: () => toast({ title: t("automations.saveFailed"), variant: "destructive" }),
  });

  const EXAMPLES = [
    t("automations.nlExample1"),
    t("automations.nlExample2"),
    t("automations.nlExample3"),
    t("automations.nlExample4"),
    t("automations.nlExample5"),
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" data-testid="nl-rule-builder-modal">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t("automations.aiRuleBuilder")}</h2>
                <p className="text-gray-400 text-xs">{t("automations.describeRuleNl")}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-nl-builder">
              <X className="w-4 h-4 text-gray-400" />
            </Button>
          </div>

          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-2">{t("automations.describeYourRule")}</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("automations.nlPlaceholder")}
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  data-testid="input-nl-description"
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">{t("automations.examplesClickToSelect")}:</p>
                <div className="space-y-1">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setDescription(ex)}
                      className="w-full text-left text-xs text-gray-400 hover:text-white hover:bg-gray-800 px-3 py-2 rounded border border-gray-800 hover:border-gray-700 transition-colors"
                      data-testid={`button-nl-example-${i}`}
                    >
                      💡 {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-gray-900 pb-2">
                <Button
                  className="bg-purple-600 hover:bg-purple-700 flex-1 min-h-[44px]"
                  onClick={() => nlMutation.mutate(description)}
                  disabled={description.trim().length < 5 || nlMutation.isPending}
                  data-testid="button-generate-workflow"
                >
                  {nlMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("automations.generating")}</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />{t("automations.createRule")}</>
                  )}
                </Button>
                <Button variant="outline" className="border-gray-700 text-gray-300" onClick={onClose}>
                  {t("automations.cancel")}
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && generatedWorkflow && (
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-xs text-purple-400 font-medium mb-2">{t("automations.createdByAI")}</p>
                <h3 className="text-white font-semibold">{generatedWorkflow.name}</h3>
                {generatedWorkflow.description && (
                  <p className="text-gray-400 text-sm mt-1">{generatedWorkflow.description}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                    {triggerTypeLabels[generatedWorkflow.triggerType] || generatedWorkflow.triggerType}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                    {generatedWorkflow.nodes?.length || 0} {t("automations.step")}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">{t("automations.steps")}:</p>
                <div className="space-y-2">
                  {(generatedWorkflow.nodes || []).map((node: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 rounded-lg">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                        node.type === "trigger" ? "bg-yellow-500/20 text-yellow-400" :
                        node.type === "condition" ? "bg-purple-500/20 text-purple-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm text-white">{node.label}</p>
                        <p className="text-[10px] text-gray-500">
                          {node.type === "trigger" ? t("automations.trigger") :
                           node.type === "condition" ? t("automations.condition") :
                           actionTypeLabels[node.actionType] || t("automations.action")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-gray-900 pb-2">
                <Button
                  className="bg-green-600 hover:bg-green-700 flex-1 min-h-[44px]"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-nl-workflow"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {t("automations.saveAndUse")}
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => { setStep("input"); setGeneratedWorkflow(null); }}
                  data-testid="button-nl-back"
                >
                  {t("automations.back")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RuleWizard({ onComplete, onClose }: {
  onComplete: (workflow: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("pages");
  const conditionOperatorLabels = getConditionOperatorLabels(t);
  const AGENT_TYPE_OPTIONS = getAgentTypeOptions(t);
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [triggerType, setTriggerType] = useState("event_monitor");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({ eventType: "lead_inactivity", daysThreshold: 3 });
  const [conditions, setConditions] = useState<Array<{ field: string; operator: string; value: string }>>([]);
  const [conditionLogic, setConditionLogic] = useState<"and" | "or">("and");
  const [actionType, setActionType] = useState("notify_owner");
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});
  const [workflowName, setWorkflowName] = useState("");

  const TRIGGER_OPTIONS = [
    { value: "event_monitor", label: t("automations.triggerEventMonitor"), description: t("automations.wizTriggerEventDesc"), icon: "⏱️" },
    { value: "email_received", label: t("automations.triggerEmailReceived"), description: t("automations.wizTriggerEmailDesc"), icon: "📧" },
    { value: "schedule", label: t("automations.triggerScheduled"), description: t("automations.wizTriggerScheduleDesc"), icon: "⏰" },
    { value: "agent_tool_complete", label: t("automations.triggerAgentAction"), description: t("automations.wizTriggerAgentDesc"), icon: "🤖" },
    { value: "threshold", label: t("automations.triggerThreshold"), description: t("automations.wizTriggerThresholdDesc"), icon: "📊" },
  ];

  const ACTION_OPTIONS = [
    { value: "notify_owner", label: t("automations.actionNotifyOwner"), description: t("automations.wizActionNotifyDesc"), icon: "🔔" },
    { value: "send_email", label: t("automations.actionSendEmail"), description: t("automations.wizActionEmailDesc"), icon: "📧" },
    { value: "create_task", label: t("automations.actionCreateTask"), description: t("automations.wizActionTaskDesc"), icon: "📋" },
    { value: "update_lead", label: t("automations.actionUpdateLead"), description: t("automations.wizActionLeadDesc"), icon: "🎯" },
    { value: "log_action", label: t("automations.actionLogAction"), description: t("automations.wizActionLogDesc"), icon: "📝" },
    { value: "webhook_call", label: t("automations.actionWebhookCall"), description: t("automations.wizActionWebhookDesc"), icon: "🔗" },
  ];

  const EVENT_TYPE_LABELS: Record<string, string> = {
    lead_inactivity: t("automations.eventLeadInactivity"),
    overdue_invoice: t("automations.eventOverdueInvoice"),
    uncompleted_tasks: t("automations.eventUncompletedTasks"),
  };

  const buildWorkflow = () => {
    const triggerNode: any = {
      id: "trigger-1",
      type: "trigger",
      label: TRIGGER_OPTIONS.find(tr => tr.value === triggerType)?.label || t("automations.trigger"),
      config: {},
      position: { x: 250, y: 50 },
    };

    const nodes: any[] = [triggerNode];
    let lastNodeId = "trigger-1";

    if (conditions.length > 0) {
      const condNode: any = {
        id: "condition-1",
        type: "condition",
        label: t("automations.conditionCheck"),
        config: {
          field: conditions[0]?.field || "",
          operator: conditions[0]?.operator || "equals",
          value: conditions[0]?.value || "",
        },
        conditions: conditions,
        conditionLogic,
        conditionTrueNodeId: "action-1",
        conditionFalseNodeId: null,
        nextNodeId: null,
        position: { x: 250, y: 180 },
      };
      nodes.push(condNode);
      triggerNode.nextNodeId = "condition-1";
      lastNodeId = "condition-1";
    } else {
      triggerNode.nextNodeId = "action-1";
    }

    const defaultActionConfig: Record<string, any> = { ...actionConfig };
    if (actionType === "notify_owner" && !defaultActionConfig.summary) {
      defaultActionConfig.summary = t("automations.automationRuleTriggered");
      defaultActionConfig.notificationType = "automation_rule";
    } else if (actionType === "create_task" && !defaultActionConfig.title) {
      defaultActionConfig.title = t("automations.automationTask");
      defaultActionConfig.agentType = "data-analyst";
      defaultActionConfig.priority = "medium";
    } else if (actionType === "log_action" && !defaultActionConfig.description) {
      defaultActionConfig.description = t("automations.automationRuleTriggered");
      defaultActionConfig.agentType = "automation";
    }

    const actionNode: any = {
      id: "action-1",
      type: "action",
      actionType,
      label: ACTION_OPTIONS.find(a => a.value === actionType)?.label || t("automations.action"),
      config: defaultActionConfig,
      nextNodeId: null,
      position: { x: 250, y: conditions.length > 0 ? 310 : 180 },
    };
    nodes.push(actionNode);

    const name = workflowName || `${TRIGGER_OPTIONS.find(tr => tr.value === triggerType)?.label || t("automations.rule")} → ${ACTION_OPTIONS.find(a => a.value === actionType)?.label || t("automations.action")}`;

    return {
      name,
      description: `${triggerType === "event_monitor" ? `${triggerConfig.daysThreshold || 3} ${t("automations.dayThresholdRule")}` : t("automations.createdWithWizard")}`,
      triggerType,
      triggerConfig,
      nodes,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const workflow = buildWorkflow();
      const res = await apiRequest("POST", "/api/automations", workflow);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      onComplete(data);
      toast({ title: t("automations.ruleCreated"), description: t("automations.dontForgetActivate") });
    },
    onError: () => toast({ title: t("automations.saveFailed"), variant: "destructive" }),
  });

  const stepTitles = [t("automations.wizStep1"), t("automations.wizStep2"), t("automations.wizStep3"), t("automations.wizStep4")];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" data-testid="rule-wizard-modal">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">{t("automations.ruleWizard")}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-wizard">
              <X className="w-4 h-4 text-gray-400" />
            </Button>
          </div>

          <div className="flex items-center gap-1 mb-6">
            {stepTitles.map((title, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 ${i + 1 <= step ? "text-blue-400" : "text-gray-600"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i + 1 < step ? "bg-green-500 text-white" :
                    i + 1 === step ? "bg-blue-500 text-white" :
                    "bg-gray-700 text-gray-500"
                  }`}>
                    {i + 1 < step ? "✓" : i + 1}
                  </div>
                  <span className="text-[10px] hidden md:block">{title}</span>
                </div>
                {i < stepTitles.length - 1 && <div className={`flex-1 h-px ${i + 1 < step ? "bg-green-500" : "bg-gray-700"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">{t("automations.whenTrigger")}</p>
              <div className="grid grid-cols-1 gap-2">
                {TRIGGER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTriggerType(opt.value);
                      if (opt.value === "event_monitor") {
                        setTriggerConfig({ eventType: "lead_inactivity", daysThreshold: 3 });
                      } else if (opt.value === "schedule") {
                        setTriggerConfig({ scheduleType: "daily", scheduleHour: 9, scheduleMinute: 0 });
                      } else {
                        setTriggerConfig({});
                      }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      triggerType === opt.value
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white"
                    }`}
                    data-testid={`button-trigger-option-${opt.value}`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {triggerType === "event_monitor" && (
                <div className="mt-3 space-y-2 bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 font-medium">{t("automations.eventSettings")}</p>
                  <Select
                    value={triggerConfig.eventType || "lead_inactivity"}
                    onValueChange={(v) => setTriggerConfig({ ...triggerConfig, eventType: v })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-wizard-event-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead_inactivity">{t("automations.eventLeadInactivity")}</SelectItem>
                      <SelectItem value="overdue_invoice">{t("automations.eventOverdueInvoice")}</SelectItem>
                      <SelectItem value="uncompleted_tasks">{t("automations.eventUncompletedTasks")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 whitespace-nowrap">{t("automations.dayThreshold")}:</label>
                    <Input
                      type="number"
                      min="1"
                      value={triggerConfig.daysThreshold || 3}
                      onChange={(e) => setTriggerConfig({ ...triggerConfig, daysThreshold: parseInt(e.target.value) || 3 })}
                      className="bg-gray-800 border-gray-700 text-white text-xs h-8 flex-1"
                      data-testid="input-wizard-days"
                    />
                    <span className="text-xs text-gray-500">{t("automations.days")}</span>
                  </div>
                </div>
              )}

              {triggerType === "email_received" && (
                <div className="mt-3 space-y-2 bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 font-medium">{t("automations.emailFilterOptional")}</p>
                  <Input
                    value={triggerConfig.senderFilter || ""}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, senderFilter: e.target.value })}
                    placeholder={t("automations.senderFilterPh")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                  <Input
                    value={triggerConfig.subjectFilter || ""}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, subjectFilter: e.target.value })}
                    placeholder={t("automations.subjectFilterPh")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{t("automations.addConditionsOptional")}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t("automations.logic")}:</span>
                  <Select value={conditionLogic} onValueChange={(v) => setConditionLogic(v as "and" | "or")}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-7 w-20" data-testid="select-wizard-logic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="and">{t("automations.and")}</SelectItem>
                      <SelectItem value="or">{t("automations.or")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {conditions.map((cond, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{t("automations.rule")} {idx + 1}</span>
                    <button
                      onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                      className="text-xs text-red-400 hover:text-red-300"
                      data-testid={`button-wizard-remove-cond-${idx}`}
                    >
                      {t("automations.remove")}
                    </button>
                  </div>
                  <Input
                    value={cond.field}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...next[idx], field: e.target.value };
                      setConditions(next);
                    }}
                    placeholder={t("automations.fieldNamePlaceholderWizard")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-7"
                    data-testid={`input-wizard-field-${idx}`}
                  />
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => {
                      const next = [...conditions];
                      next[idx] = { ...next[idx], operator: v };
                      setConditions(next);
                    }}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-7" data-testid={`select-wizard-op-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(conditionOperatorLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={cond.value}
                    onChange={(e) => {
                      const next = [...conditions];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setConditions(next);
                    }}
                    placeholder={t("automations.valuePh")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-7"
                    data-testid={`input-wizard-value-${idx}`}
                  />
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed border-gray-700 text-gray-400 hover:text-white text-xs"
                onClick={() => setConditions([...conditions, { field: "", operator: "equals", value: "" }])}
                data-testid="button-wizard-add-condition"
              >
                <Plus className="w-3 h-3 mr-1" /> {t("automations.addCondition")}
              </Button>

              {conditions.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">{t("automations.noConditionsHint")}</p>
                  <p className="text-xs text-gray-600">{t("automations.allEventsWillTrigger")}</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">{t("automations.whatShouldHappen")}</p>
              <div className="grid grid-cols-1 gap-2">
                {ACTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActionType(opt.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      actionType === opt.value
                        ? "border-green-500 bg-green-500/10 text-white"
                        : "border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white"
                    }`}
                    data-testid={`button-action-option-${opt.value}`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {actionType === "send_email" && (
                <div className="mt-3 space-y-2 bg-gray-800/50 rounded-lg p-3">
                  <Input
                    value={actionConfig.to || ""}
                    onChange={(e) => setActionConfig({ ...actionConfig, to: e.target.value })}
                    placeholder={t("automations.recipientEmailPh")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                  <Input
                    value={actionConfig.subject || ""}
                    onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })}
                    placeholder={t("automations.emailSubjectPh")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                </div>
              )}
              {actionType === "notify_owner" && (
                <div className="mt-3 bg-gray-800/50 rounded-lg p-3">
                  <Input
                    value={actionConfig.summary || ""}
                    onChange={(e) => setActionConfig({ ...actionConfig, summary: e.target.value })}
                    placeholder={t("automations.notifySummaryPh")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                </div>
              )}
              {actionType === "create_task" && (
                <div className="mt-3 space-y-2 bg-gray-800/50 rounded-lg p-3">
                  <Input
                    value={actionConfig.title || ""}
                    onChange={(e) => setActionConfig({ ...actionConfig, title: e.target.value })}
                    placeholder={t("automations.taskTitlePh")}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                  <Select
                    value={actionConfig.agentType || "data-analyst"}
                    onValueChange={(v) => setActionConfig({ ...actionConfig, agentType: v })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">{t("automations.ruleName")}</label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder={`${TRIGGER_OPTIONS.find(tr => tr.value === triggerType)?.label || t("automations.rule")} → ${ACTION_OPTIONS.find(a => a.value === actionType)?.label || t("automations.action")}`}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-wizard-workflow-name"
                />
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-white">{t("automations.wizSummary")}</h4>
                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-gray-500 text-xs w-20 flex-shrink-0">{t("automations.triggerLabel")}:</span>
                    <span className="text-white text-xs">
                      {TRIGGER_OPTIONS.find(tr => tr.value === triggerType)?.label}
                      {triggerType === "event_monitor" && ` — ${EVENT_TYPE_LABELS[triggerConfig.eventType] || ""} (${triggerConfig.daysThreshold || 3} ${t("automations.daysUnit")})`}
                    </span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-gray-500 text-xs w-20 flex-shrink-0">{t("automations.conditionsLabel")}:</span>
                    <span className="text-white text-xs">
                      {conditions.length === 0 ? t("automations.noneAlways") : `${conditions.length} ${t("automations.conditionWord")} (${conditionLogic.toUpperCase()})`}
                    </span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-gray-500 text-xs w-20 flex-shrink-0">{t("automations.actionLabel")}:</span>
                    <span className="text-white text-xs">{ACTION_OPTIONS.find(a => a.value === actionType)?.label}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-800 mt-4 sticky bottom-0 bg-gray-900 pb-2">
            {step > 1 && (
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setStep(step - 1)}>
                {t("automations.goBack")}
              </Button>
            )}
            {step < 4 ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700 flex-1 min-h-[44px]"
                onClick={() => setStep(step + 1)}
                data-testid={`button-wizard-next-${step}`}
              >
                {step === 2 && conditions.length === 0 ? t("automations.continueWithout") : t("automations.next")}
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 flex-1 min-h-[44px]"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-wizard-save"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {t("automations.create")}
              </Button>
            )}
            {step === 1 && (
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={onClose}>
                {t("automations.cancel")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const getDayLabels = (t: any) => [
  t("automations.daySun"), t("automations.dayMon"), t("automations.dayTue"),
  t("automations.dayWed"), t("automations.dayThu"), t("automations.dayFri"), t("automations.daySat")
];

function TriggerConfigEditor({ triggerType, triggerConfig, onChange }: {
  triggerType: string;
  triggerConfig: Record<string, any>;
  onChange: (type: string, config: Record<string, any>) => void;
}) {
  const { t } = useTranslation("pages");
  const triggerTypeLabels = getTriggerTypeLabels(t);
  const AGENT_TYPE_OPTIONS = getAgentTypeOptions(t);
  const dayLabels = getDayLabels(t);
  return (
    <Card className="bg-gray-900/50 border-gray-800 mb-4">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-white mb-3">{t("automations.triggerSettings")}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">{t("automations.triggerTypeLabel")}</label>
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
                <label className="text-xs text-gray-400 block mb-1">{t("automations.agentTypeLabel")}</label>
                <Select
                  value={triggerConfig.agentType || ""}
                  onValueChange={(v) => onChange(triggerType, { ...triggerConfig, agentType: v })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-trigger-agent-type">
                    <SelectValue placeholder={t("automations.selectAgentPh")} />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.toolNameLabel")}</label>
                <Input
                  value={triggerConfig.toolName || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, toolName: e.target.value })}
                  placeholder={t("automations.toolNamePh")}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-trigger-tool-name"
                />
              </div>
            </>
          )}

          {triggerType === "schedule" && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.scheduleTypeLabel")}</label>
                <Select
                  value={triggerConfig.scheduleType || "daily"}
                  onValueChange={(val) => onChange(triggerType, { ...triggerConfig, scheduleType: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-schedule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("automations.scheduleDaily")}</SelectItem>
                    <SelectItem value="weekly">{t("automations.scheduleWeekly")}</SelectItem>
                    <SelectItem value="monthly">{t("automations.scheduleMonthly")}</SelectItem>
                    <SelectItem value="custom">{t("automations.scheduleCustom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerConfig.scheduleType !== "custom" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">{t("automations.hour")}</label>
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
                    <label className="text-xs text-gray-400 block mb-1">{t("automations.minute")}</label>
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
                  <label className="text-xs text-gray-400 block mb-1">{t("automations.daysOfWeek")}</label>
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
                  <label className="text-xs text-gray-400 block mb-1">{t("automations.dayOfMonth")}</label>
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
                  <label className="text-xs text-gray-400 block mb-1">{t("automations.cronExpression")}</label>
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
              <label className="text-xs text-gray-400 block mb-1">{t("automations.webhookPath")}</label>
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
                <label className="text-xs text-gray-400 block mb-1">{t("automations.senderFilter")}</label>
                <Input
                  value={triggerConfig.senderFilter || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, senderFilter: e.target.value })}
                  placeholder={t("automations.senderFilterPh2")}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-email-sender-filter"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.subjectFilter")}</label>
                <Input
                  value={triggerConfig.subjectFilter || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, subjectFilter: e.target.value })}
                  placeholder={t("automations.subjectFilterPh2")}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-email-subject-filter"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.targetEmail")}</label>
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
                <label className="text-xs text-gray-400 block mb-1">{t("automations.fieldNameLabel")}</label>
                <Input
                  value={triggerConfig.thresholdField || ""}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, thresholdField: e.target.value })}
                  placeholder={t("automations.fieldNamePh2")}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  data-testid="input-threshold-field"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.comparison")}</label>
                <Select
                  value={triggerConfig.thresholdOperator || "gt"}
                  onValueChange={(val) => onChange(triggerType, { ...triggerConfig, thresholdOperator: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-threshold-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">{t("automations.greaterThan")}</SelectItem>
                    <SelectItem value="lt">{t("automations.lessThan")}</SelectItem>
                    <SelectItem value="gte">{t("automations.greaterEqual")}</SelectItem>
                    <SelectItem value="lte">{t("automations.lessEqual")}</SelectItem>
                    <SelectItem value="eq">{t("automations.equalTo")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.thresholdValue")}</label>
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

          {triggerType === "event_monitor" && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.eventTypeLabel")}</label>
                <Select
                  value={triggerConfig.eventType || "lead_inactivity"}
                  onValueChange={(val) => onChange(triggerType, { ...triggerConfig, eventType: val })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8" data-testid="select-event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_inactivity">{t("automations.eventLeadInactivitySelect")}</SelectItem>
                    <SelectItem value="overdue_invoice">{t("automations.eventOverdueInvoiceSelect")}</SelectItem>
                    <SelectItem value="uncompleted_tasks">{t("automations.eventUncompletedTasksSelect")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t("automations.dayThresholdLabel")}</label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={triggerConfig.daysThreshold || 3}
                  onChange={(e) => onChange(triggerType, { ...triggerConfig, daysThreshold: parseInt(e.target.value) || 3 })}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  placeholder="3"
                  data-testid="input-days-threshold"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  {triggerConfig.eventType === "lead_inactivity" && t("automations.leadInactivityHelp")}
                  {triggerConfig.eventType === "overdue_invoice" && t("automations.overdueInvoiceHelp")}
                  {triggerConfig.eventType === "uncompleted_tasks" && t("automations.uncompletedTasksHelp")}
                  {!triggerConfig.eventType && t("automations.eventNotOccurredHelp")}
                </p>
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
  const { t } = useTranslation("pages");
  const actionTypeLabels = getActionTypeLabels(t);
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
      toast({ title: t("automations.workflowSaved") });
    },
    onError: () => toast({ title: t("automations.saveFailedToast"), variant: "destructive" }),
  });

  const addNodeMutation = (type: string, actionType?: string) => {
    const id = `${type}-${Date.now()}`;
    const maxY = Math.max(0, ...nodes.map((n: any) => (n.position?.y || 0)));
    const newNode: any = {
      id,
      type,
      label: type === "trigger" ? t("automations.trigger") :
             type === "condition" ? t("automations.condition") :
             type === "delay" ? t("automations.delay") :
             actionTypeLabels[actionType || ""] || t("automations.action"),
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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pt-16 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-builder">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{workflow.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{t("automations.visualEditor")}</p>
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
                {t("automations.save")}
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "send_email")} data-testid="button-add-email-node">
            <Mail className="w-3 h-3 mr-1" /> {t("automations.emailNode")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "create_task")} data-testid="button-add-task-node">
            <FileText className="w-3 h-3 mr-1" /> {t("automations.taskNode")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "notify_owner")} data-testid="button-add-notify-node">
            <Bell className="w-3 h-3 mr-1" /> {t("automations.notificationNode")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "http_request")} data-testid="button-add-http-node">
            <Globe className="w-3 h-3 mr-1" /> HTTP
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "set_variable")} data-testid="button-add-variable-node">
            <Variable className="w-3 h-3 mr-1" /> {t("automations.variableNode")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("condition")} data-testid="button-add-condition-node">
            <AlertTriangle className="w-3 h-3 mr-1" /> {t("automations.condition")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("delay")} data-testid="button-add-delay-node">
            <Timer className="w-3 h-3 mr-1" /> {t("automations.delay")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "whatsapp_message")} data-testid="button-add-whatsapp-node">
            <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-gray-700 text-gray-300" onClick={() => addNodeMutation("action", "format_data")} data-testid="button-add-format-node">
            <Database className="w-3 h-3 mr-1" /> {t("automations.dataTransform")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-blue-700 text-blue-300 bg-blue-500/10" onClick={() => addNodeMutation("action", "integration")} data-testid="button-add-integration-node">
            <Plug className="w-3 h-3 mr-1" /> {t("automations.integrationNode")}
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
            <h3 className="text-sm font-medium text-gray-400 mb-2">{t("automations.nodes")} ({nodes.length})</h3>
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
  const { t, i18n } = useTranslation("pages");
  const categoryLabels = getCategoryLabels(t);
  const triggerTypeLabels = getTriggerTypeLabels(t);
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "templates" | "detail" | "create" | "builder">("list");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showNLBuilder, setShowNLBuilder] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

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
      toast({ title: t("automations.automationUpdated") });
    },
    onError: () => toast({ title: t("automations.updateFailed"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setView("list");
      toast({ title: t("automations.automationDeleted") });
    },
    onError: () => toast({ title: t("automations.deleteFailed"), variant: "destructive" }),
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", "/api/automations/from-template", { templateId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setView("list");
      toast({ title: t("automations.automationCreated"), description: t("automations.createdFromTemplateDesc") });
    },
    onError: () => toast({ title: t("automations.templateCreateFailed"), variant: "destructive" }),
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
        title: data.success ? t("automations.automationExecuted") : t("automations.automationFailed"),
        description: data.error || t("automations.completedSuccessfully"),
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => toast({ title: t("automations.executionFailed"), variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/automations", {
        name: newName,
        description: newDescription || null,
        triggerType: "manual",
        triggerConfig: {},
        nodes: [
          { id: "trigger-1", type: "trigger", label: t("automations.manualTrigger"), config: {}, nextNodeId: "action-1", position: { x: 250, y: 50 } },
          { id: "action-1", type: "action", actionType: "log_action", label: t("automations.logAction"), config: { description: t("automations.manualAutomationRan") }, nextNodeId: null, position: { x: 250, y: 180 } },
        ],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setView("list");
      setNewName("");
      setNewDescription("");
      toast({ title: t("automations.automationCreated") });
    },
    onError: () => toast({ title: t("automations.createFailed"), variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pt-16 flex items-center justify-center" data-testid="automations-login-prompt">
        <Card className="bg-gray-900/50 border-gray-800 max-w-md">
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">{t("automations.pageTitle")}</h2>
            <p className="text-gray-400 mb-6">{t("automations.loginRequired")}</p>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 min-h-[44px]" data-testid="link-login-automations">{t("automations.login")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showNLBuilder) {
    return (
      <NaturalLanguageRuleBuilder
        onWorkflowCreated={() => { setShowNLBuilder(false); setView("list"); }}
        onClose={() => setShowNLBuilder(false)}
      />
    );
  }

  if (showWizard) {
    return (
      <RuleWizard
        onComplete={() => { setShowWizard(false); setView("list"); }}
        onClose={() => setShowWizard(false)}
      />
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
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pt-16 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setView("list")} data-testid="button-back-templates">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{t("automations.templateGallery")}</h1>
              <p className="text-gray-400 text-sm">{t("automations.selectFromTemplates")}</p>
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
                              {template.nodeCount} {t("automations.step")}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                            onClick={() => createFromTemplateMutation.mutate(template.id)}
                            disabled={createFromTemplateMutation.isPending}
                            data-testid={`button-use-template-${template.id}`}
                          >
                            {createFromTemplateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : t("automations.use")}
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
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pt-16 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setView("list")} data-testid="button-back-create">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Button>
            <h1 className="text-2xl font-bold text-white">{t("automations.newAutomation")}</h1>
          </div>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">{t("automations.nameLabel")}</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("automations.automationNamePh")}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-automation-name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">{t("automations.descriptionLabel")}</label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t("automations.automationDescPh")}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                  data-testid="input-automation-description"
                />
              </div>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-gray-900 pb-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 flex-1 min-h-[44px]"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName.trim() || createMutation.isPending}
                  data-testid="button-create-automation"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {t("automations.create")}
                </Button>
                <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setView("list")} data-testid="button-cancel-create">
                  {t("automations.cancel")}
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
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pt-16 p-4 md:p-8">
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
              <span className="text-sm text-gray-400">{selectedWorkflow.isActive ? t("automations.active") : t("automations.inactive")}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{selectedWorkflow.runCount}</p>
                  <p className="text-xs text-gray-400">{t("automations.totalRuns")}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedWorkflow.lastRunAt ? new Date(selectedWorkflow.lastRunAt).toLocaleString(i18n.language === "tr" ? "tr-TR" : "en-US") : t("automations.never")}
                  </p>
                  <p className="text-xs text-gray-400">{t("automations.lastRun")}</p>
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
                  <p className="text-xs text-gray-400">{t("automations.triggerTypeLabel")}</p>
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
              {t("automations.manualRun")}
            </Button>
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:text-white"
              onClick={() => setView("builder")}
              data-testid="button-open-builder"
            >
              <Settings className="w-4 h-4 mr-2" />
              {t("automations.visualEditor")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm(t("automations.deleteConfirm"))) {
                  deleteMutation.mutate(selectedWorkflow.id);
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-workflow"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("automations.delete")}
            </Button>
          </div>

          <Card className="bg-gray-900/50 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">{t("automations.workflowView")}</CardTitle>
            </CardHeader>
            <CardContent>
              <VisualWorkflowEditor
                nodes={selectedWorkflow.nodes || []}
                executionResults={executions.length > 0 ? executions[0].nodeResults : undefined}
              />
            </CardContent>
          </Card>

          {selectedWorkflow.triggerType === "event_monitor" && (
            <EventMonitorPanel workflowId={selectedWorkflow.id} />
          )}

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">{t("automations.executionHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-gray-500 text-sm">{t("automations.noExecutions")}</p>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pt-16 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              {t("automations.pageTitle")}
            </h1>
            <p className="text-gray-400 text-sm mt-1">{t("automations.pageDescription")}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:text-white"
              onClick={() => setView("templates")}
              data-testid="button-view-templates"
            >
              <LayoutTemplate className="w-4 h-4 mr-2" />
              {t("automations.templates")}
            </Button>
            <Button
              variant="outline"
              className="border-purple-700 text-purple-300 hover:text-white hover:bg-purple-500/10"
              onClick={() => setShowNLBuilder(true)}
              data-testid="button-nl-builder"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t("automations.createWithAI")}
            </Button>
            <Button
              variant="outline"
              className="border-blue-700 text-blue-300 hover:text-white hover:bg-blue-500/10"
              onClick={() => setShowWizard(true)}
              data-testid="button-open-wizard"
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              {t("automations.wizard")}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setView("create")}
              data-testid="button-new-automation"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("automations.new")}
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
              <h2 className="text-xl font-semibold text-white mb-2">{t("automations.noAutomationsYet")}</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {t("automations.noAutomationsDesc")}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => setView("templates")}
                  data-testid="button-browse-templates-empty"
                >
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  {t("automations.browseTemplates")}
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
                  onClick={() => setView("create")}
                  data-testid="button-create-first-automation"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("automations.createFirst")}
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
                          {workflow.isActive ? t("automations.active") : t("automations.inactive")}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                          {workflow.runCount} {t("automations.runs")}
                        </Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                    {workflow.lastRunAt && (
                      <p className="text-xs text-gray-600 mt-2">
                        {t("automations.lastPrefix")} {new Date(workflow.lastRunAt).toLocaleString(i18n.language === "tr" ? "tr-TR" : "en-US")}
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
