import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation("pages");
  return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="text-center px-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <Bot className="w-10 h-10 text-blue-400" />
        </div>
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-4" data-testid="text-404">
          {t("notFound.title")}
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">{t("notFound.heading")}</h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          {t("notFound.description")}
        </p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0" data-testid="button-go-home">
            {t("notFound.goHome")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
