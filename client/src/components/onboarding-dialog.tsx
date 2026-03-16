import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAnalytics } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles } from "lucide-react";

const AGENTS = [
  { slug: "customer-support", persona: "Ava" },
  { slug: "sales-sdr", persona: "Rex" },
  { slug: "social-media", persona: "Maya" },
  { slug: "bookkeeping", persona: "Finn" },
  { slug: "scheduling", persona: "Cal" },
  { slug: "hr-recruiting", persona: "Harper" },
  { slug: "data-analyst", persona: "DataBot" },
  { slug: "ecommerce-ops", persona: "ShopBot" },
  { slug: "real-estate", persona: "Reno" },
];

export default function OnboardingDialog() {
  const { user } = useAuth();
  const { t } = useTranslation("pages");
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  const [intendedAgents, setIntendedAgents] = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState("");

  if (!user || user.onboardingCompleted) return null;

  const toggleAgent = (slug: string) => {
    setIntendedAgents((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      const res = await apiRequest("PATCH", "/api/auth/onboarding", { onboardingCompleted: true });
      const data = await res.json();
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      trackEvent("onboarding_skipped", "onboarding");
    } catch {
    }
    setSaving(false);
    setOpen(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (industry) payload.industry = industry;
      if (companySize) payload.companySize = companySize;
      if (country) payload.country = country;
      if (intendedAgents.length > 0) payload.intendedAgents = intendedAgents;
      if (referralSource) payload.referralSource = referralSource;

      const res = await apiRequest("PATCH", "/api/auth/onboarding", payload);
      const data = await res.json();
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      trackEvent("onboarding_completed", "onboarding", {
        fieldsCompleted: Object.keys(payload).length,
      });
      toast({
        title: t("onboarding.successTitle"),
        description: t("onboarding.successDescription"),
      });
    } catch {
      toast({
        title: t("onboarding.errorTitle"),
        description: t("onboarding.errorDescription"),
        variant: "destructive",
      });
    }
    setSaving(false);
    setOpen(false);
  };

  const industries = [
    "technology",
    "finance",
    "healthcare",
    "ecommerce",
    "realEstate",
    "marketing",
    "manufacturing",
    "education",
    "consulting",
    "other",
  ];

  const companySizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

  const referralSources = [
    "socialMedia",
    "searchEngine",
    "friendColleague",
    "blogArticle",
    "advertisement",
    "other",
  ];

  const countries = [
    "TR", "US", "GB", "DE", "FR", "NL", "AE", "SA", "JP", "KR",
    "IN", "BR", "CA", "AU", "ES", "IT", "SE", "NO", "DK", "FI",
    "PL", "CZ", "AT", "CH", "BE", "PT", "GR", "RO", "BG", "HR",
    "other",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-onboarding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            {t("onboarding.title")}
          </DialogTitle>
          <DialogDescription>
            {t("onboarding.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>{t("onboarding.industry")}</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger data-testid="select-onboarding-industry">
                <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {t(`onboarding.industries.${ind}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("onboarding.companySize")}</Label>
            <Select value={companySize} onValueChange={setCompanySize}>
              <SelectTrigger data-testid="select-onboarding-company-size">
                <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {companySizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {t(`onboarding.companySizes.${size}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("onboarding.country")}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger data-testid="select-onboarding-country">
                <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`onboarding.countries.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("onboarding.intendedAgents")}</Label>
            <p className="text-xs text-muted-foreground">{t("onboarding.intendedAgentsHint")}</p>
            <div className="grid grid-cols-2 gap-2">
              {AGENTS.map((agent) => (
                <label
                  key={agent.slug}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                  data-testid={`checkbox-agent-${agent.slug}`}
                >
                  <Checkbox
                    checked={intendedAgents.includes(agent.slug)}
                    onCheckedChange={() => toggleAgent(agent.slug)}
                  />
                  <span className="text-sm">{agent.persona}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("onboarding.referralSource")}</Label>
            <Select value={referralSource} onValueChange={setReferralSource}>
              <SelectTrigger data-testid="select-onboarding-referral">
                <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {referralSources.map((src) => (
                  <SelectItem key={src} value={src}>
                    {t(`onboarding.referralSources.${src}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={saving}
            data-testid="button-onboarding-skip"
          >
            {t("onboarding.skip")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
            data-testid="button-onboarding-submit"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t("onboarding.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
