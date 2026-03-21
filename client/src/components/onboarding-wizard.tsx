import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, MessageSquare, Settings, BarChart3, Zap } from "lucide-react";

const AGENTS = [
  { id: "customer-support", name: "Ava", role: "Customer Support", emoji: "🎧", description: "Live chat, email, ticket management" },
  { id: "sales-sdr", name: "Rex", role: "Sales & CRM", emoji: "💼", description: "Lead generation, CRM, B2B outreach" },
  { id: "social-media", name: "Maya", role: "Social Media", emoji: "📱", description: "Content creation, scheduling" },
  { id: "bookkeeping", name: "Finn", role: "Accounting", emoji: "📊", description: "Invoicing, KDV, financial reports" },
  { id: "scheduling", name: "Cal", role: "Calendar", emoji: "📅", description: "Appointments, meeting management" },
  { id: "hr-recruiting", name: "Harper", role: "HR & Recruiting", emoji: "👥", description: "CV screening, job postings" },
  { id: "data-analyst", name: "DataBot", role: "Data Analysis", emoji: "📈", description: "Excel/CSV analysis, charts" },
  { id: "ecommerce-ops", name: "ShopBot", role: "E-Commerce", emoji: "🛒", description: "Trendyol, Shopify integration" },
  { id: "real-estate", name: "Reno", role: "Real Estate", emoji: "🏠", description: "Property search, valuations" },
];

const INDUSTRIES = [
  "Technology", "E-Commerce", "Finance", "Real Estate", "Healthcare",
  "Education", "Manufacturing", "Retail", "Services", "Other",
];

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

export default function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const queryClient = useQueryClient();

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAgents, industry, companySize }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onComplete();
    },
  });

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="px-6 pt-6">
          <Progress value={progress} className="h-2 bg-slate-800" />
          <p className="text-xs text-slate-400 mt-2">Step {step + 1} of {totalSteps}</p>
        </div>

        <div className="p-6 min-h-[400px] flex flex-col">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Welcome to RentAI24!</h2>
              <p className="text-slate-400 max-w-md mb-6">
                Let's set up your AI workforce in just a few steps. We'll help you pick the right agents for your business.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3">
                  <MessageSquare className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Chat with AI Agents</p>
                </div>
                <div className="p-3">
                  <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Automate Workflows</p>
                </div>
                <div className="p-3">
                  <BarChart3 className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Track Performance</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Industry */}
          {step === 1 && (
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">What's your industry?</h2>
              <p className="text-slate-400 text-sm mb-6">This helps us recommend the right agents for you.</p>
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      industry === ind
                        ? "bg-blue-500/20 border-blue-500 text-white"
                        : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-400 mb-2">Company size</p>
                <div className="flex gap-2">
                  {["1-10", "11-50", "51-200", "200+"].map(size => (
                    <button
                      key={size}
                      onClick={() => setCompanySize(size)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                        companySize === size
                          ? "bg-violet-500/20 border-violet-500"
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Agents */}
          {step === 2 && (
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Choose your AI agents</h2>
              <p className="text-slate-400 text-sm mb-4">Select the agents you want to work with. You can always add more later.</p>
              <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-2">
                {AGENTS.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`p-3 rounded-lg flex items-center gap-3 transition-all border ${
                      selectedAgents.includes(agent.id)
                        ? "bg-blue-500/15 border-blue-500/50"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{agent.name}</span>
                        <Badge variant="secondary" className="text-xs">{agent.role}</Badge>
                      </div>
                      <p className="text-xs text-slate-400">{agent.description}</p>
                    </div>
                    {selectedAgents.includes(agent.id) && (
                      <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">{selectedAgents.length} agent(s) selected</p>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">You're all set!</h2>
              <p className="text-slate-400 max-w-md mb-6">
                Your AI workforce is ready. Head to the dashboard to start chatting with your agents.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedAgents.map(id => {
                  const agent = AGENTS.find(a => a.id === id);
                  return agent ? (
                    <Badge key={id} className="bg-slate-800 text-white px-3 py-1">
                      {agent.emoji} {agent.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-slate-800">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-slate-400">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            ) : (
              <div />
            )}
            {step < totalSteps - 1 ? (
              <Button onClick={() => setStep(s => s + 1)}
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                {saveMutation.isPending ? "Saving..." : "Go to Dashboard"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
