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

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation("pages");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: t("login.welcomeBack"), description: t("login.loginSuccess") });
      setTimeout(() => setLocation("/dashboard"), 100);
    } catch (err: any) {
      toast({ title: t("login.loginFailed"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 bg-card border-border/50">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-login-title">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
              required
              data-testid="input-login-email"
            />
          </div>

          <div>
            <Label htmlFor="password">{t("login.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.passwordPlaceholder")}
                required
                data-testid="input-login-password"
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0"
            data-testid="button-login-submit"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t("login.submit")}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("login.or")}</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          asChild
          data-testid="button-google-login"
        >
          <a href="/api/auth/google">
            <SiGoogle className="w-4 h-4 mr-2" />
            {t("login.google")}
          </a>
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("login.noAccount")}{" "}
          <Link href="/register" className="text-blue-400 hover:text-blue-300" data-testid="link-register">
            {t("login.createOne")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
