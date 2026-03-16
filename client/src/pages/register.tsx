import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, Eye, EyeOff } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation("pages");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    company: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kvkkConsent, setKvkkConsent] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kvkkConsent) {
      toast({ title: t("register.registerFailed"), description: t("register.kvkkRequired"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, kvkkConsent: true, dataProcessingConsent: true });
      toast({ title: t("register.welcome"), description: t("register.registerSuccess") });
      setTimeout(() => setLocation("/dashboard"), 100);
    } catch (err: any) {
      toast({ title: t("register.registerFailed"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 bg-card border-border/50">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-register-title">{t("register.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("register.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">{t("register.fullName")}</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={update("fullName")}
              placeholder={t("register.fullNamePlaceholder")}
              required
              data-testid="input-register-fullname"
            />
          </div>

          <div>
            <Label htmlFor="username">{t("register.username")}</Label>
            <Input
              id="username"
              value={form.username}
              onChange={update("username")}
              placeholder={t("register.usernamePlaceholder")}
              required
              data-testid="input-register-username"
            />
          </div>

          <div>
            <Label htmlFor="email">{t("register.email")}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder={t("register.emailPlaceholder")}
              required
              data-testid="input-register-email"
            />
          </div>

          <div>
            <Label htmlFor="password">{t("register.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder={t("register.passwordPlaceholder")}
                required
                minLength={6}
                data-testid="input-register-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="company">{t("register.company")}</Label>
            <Input
              id="company"
              value={form.company}
              onChange={update("company")}
              placeholder={t("register.companyPlaceholder")}
              data-testid="input-register-company"
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="kvkkConsent"
              checked={kvkkConsent}
              onChange={(e) => setKvkkConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border accent-blue-500"
              data-testid="checkbox-kvkk-consent"
            />
            <label htmlFor="kvkkConsent" className="text-xs text-muted-foreground leading-relaxed">
              {t("register.kvkkConsent")}{" "}
              <Link href="/privacy" className="text-blue-400 hover:underline">
                {t("register.kvkkLink")}
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !kvkkConsent}
            className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
            data-testid="button-register-submit"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t("register.submit")}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("register.or")}</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          asChild
          data-testid="button-google-register"
        >
          <a href="/api/auth/google">
            <SiGoogle className="w-4 h-4 mr-2" />
            {t("register.google")}
          </a>
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("register.hasAccount")}{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300" data-testid="link-login">
            {t("register.signIn")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
