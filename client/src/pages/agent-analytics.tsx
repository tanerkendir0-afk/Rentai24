import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Activity, Download, BarChart3, Users, MessageSquare, Clock, AlertTriangle, TrendingUp, FileText } from "lucide-react";

const AGENT_COLORS: Record<string, string> = {
  "customer-support": "#3B82F6",
  "sales-sdr": "#EF4444",
  "social-media": "#8B5CF6",
  "bookkeeping": "#10B981",
  "scheduling": "#F59E0B",
  "hr-recruiting": "#EC4899",
  "data-analyst": "#6366F1",
  "ecommerce-ops": "#14B8A6",
  "real-estate": "#F97316",
};

const AGENT_NAMES: Record<string, string> = {
  "customer-support": "Ava",
  "sales-sdr": "Rex",
  "social-media": "Maya",
  "bookkeeping": "Finn",
  "scheduling": "Cal",
  "hr-recruiting": "Harper",
  "data-analyst": "DataBot",
  "ecommerce-ops": "ShopBot",
  "real-estate": "Reno",
};

export default function AgentAnalytics() {
  const [timeRange, setTimeRange] = useState("30");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/conversations", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/conversations?days=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
  });

  const { data: agentPerformance } = useQuery({
    queryKey: ["/api/analytics/agents"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/agents");
      if (!res.ok) throw new Error("Failed to load agent performance");
      return res.json();
    },
  });

  const { data: systemHealth } = useQuery({
    queryKey: ["/api/analytics/health"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/health");
      if (!res.ok) throw new Error("Failed to load system health");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const { data: heartbeat } = useQuery({
    queryKey: ["/api/heartbeat"],
    queryFn: async () => {
      const res = await fetch("/api/heartbeat");
      if (!res.ok) throw new Error("Failed to load heartbeat");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const { data: scheduledReports } = useQuery({
    queryKey: ["/api/reports/scheduled"],
    queryFn: async () => {
      const res = await fetch("/api/reports/scheduled");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (format: "csv" | "pdf") => {
      const res = await fetch(`/api/conversations/export?format=${format}&days=${timeRange}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversations.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast({ title: "Export complete" }),
    onError: () => toast({ title: "Export failed", variant: "destructive" }),
  });

  const pieData = analytics?.agentDistribution
    ? Object.entries(analytics.agentDistribution).map(([key, value]) => ({
        name: AGENT_NAMES[key] || key,
        value: value as number,
        fill: AGENT_COLORS[key] || "#94A3B8",
      }))
    : [];

  const agentPerformanceData = agentPerformance
    ? Object.entries(agentPerformance).map(([key, value]: [string, any]) => ({
        agent: AGENT_NAMES[key] || key,
        requests: value.totalRequests,
        avgTime: value.avgResponseTime,
        errors: value.totalErrors,
        fill: AGENT_COLORS[key] || "#94A3B8",
      }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Agent Analytics & Performance
            </h1>
            <p className="text-slate-400 mt-1">Monitor your AI agents in real-time</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36 bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportMutation.mutate("csv")}
              className="border-slate-700 hover:bg-slate-800">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportMutation.mutate("pdf")}
              className="border-slate-700 hover:bg-slate-800">
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.totalConversations || 0}</p>
                  <p className="text-xs text-slate-400">Total Conversations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.totalMessages || 0}</p>
                  <p className="text-xs text-slate-400">Total Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analytics?.avgMessagesPerConv || 0}</p>
                  <p className="text-xs text-slate-400">Avg Messages/Conv</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  systemHealth?.status === "healthy" ? "bg-green-500/20" :
                  systemHealth?.status === "degraded" ? "bg-yellow-500/20" : "bg-red-500/20"
                }`}>
                  <Activity className={`w-5 h-5 ${
                    systemHealth?.status === "healthy" ? "text-green-400" :
                    systemHealth?.status === "degraded" ? "text-yellow-400" : "text-red-400"
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white capitalize">{systemHealth?.status || "..."}</p>
                  <p className="text-xs text-slate-400">System Health</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="conversations" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="performance">Agent Performance</TabsTrigger>
            <TabsTrigger value="status">Agent Status</TabsTrigger>
            <TabsTrigger value="reports">Scheduled Reports</TabsTrigger>
          </TabsList>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Daily Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.dailyActivity?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickFormatter={d => d.split("-").slice(1).join("/")} />
                        <YAxis stroke="#94A3B8" fontSize={11} />
                        <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #475569", borderRadius: 8 }} />
                        <Line type="monotone" dataKey="count" stroke="#818CF8" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-500">No data available</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Agent Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                          paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #475569", borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-500">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Agent Response Time (ms)</CardTitle>
              </CardHeader>
              <CardContent>
                {agentPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={agentPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="agent" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #475569", borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="avgTime" name="Avg Response (ms)" radius={[4, 4, 0, 0]}>
                        {agentPerformanceData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-slate-500">No performance data yet</div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agentPerformanceData.map((agent) => (
                <Card key={agent.agent} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{agent.agent}</span>
                      <Badge variant={agent.errors > 0 ? "destructive" : "default"} className="text-xs">
                        {agent.errors > 0 ? `${agent.errors} errors` : "Healthy"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-400">Requests</p>
                        <p className="text-white font-mono">{agent.requests}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Avg Time</p>
                        <p className="text-white font-mono">{agent.avgTime}ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Agent Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {heartbeat && Object.entries(heartbeat).map(([agentId, status]: [string, any]) => (
                <Card key={agentId} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          status.status === "healthy" ? "bg-green-500 animate-pulse" :
                          status.status === "degraded" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                        }`} />
                        <span className="font-semibold text-white">{AGENT_NAMES[agentId] || agentId}</span>
                      </div>
                      <Badge variant={
                        status.status === "healthy" ? "default" :
                        status.status === "degraded" ? "secondary" : "destructive"
                      } className="text-xs capitalize">
                        {status.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Response Time</span>
                        <span className="text-white font-mono">{status.responseTimeMs}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Check</span>
                        <span className="text-white text-xs">
                          {status.lastCheck ? new Date(status.lastCheck).toLocaleTimeString("tr-TR") : "-"}
                        </span>
                      </div>
                      {status.lastError && (
                        <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {status.lastError}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!heartbeat && (
                <div className="col-span-3 text-center py-12 text-slate-500">Loading agent status...</div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Scheduled Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledReports && scheduledReports.length > 0 ? (
                  <div className="space-y-3">
                    {scheduledReports.map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{report.report_type}</p>
                          <p className="text-xs text-slate-400">
                            {report.frequency} | Agent: {AGENT_NAMES[report.agent_type] || report.agent_type}
                          </p>
                        </div>
                        <Badge variant={report.is_active ? "default" : "secondary"}>
                          {report.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No scheduled reports yet.</p>
                    <p className="text-xs mt-1">Create reports from the Settings page.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
