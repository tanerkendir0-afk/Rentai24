import { useState } from "react";
import { Copy, Check, Download, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface PublishAssistantData {
  type: "publish_assistant";
  platform: string;
  content: string;
  hashtags: string;
  imageUrl: string;
  deepLink: string;
  webLink: string;
}

const ALLOWED_DEEP_LINKS = ["instagram://", "twitter://", "tiktok://", "fb://", "linkedin://", "youtube://"];
const ALLOWED_WEB_DOMAINS = ["instagram.com", "twitter.com", "tiktok.com", "facebook.com", "linkedin.com", "youtube.com", "studio.youtube.com"];

function isAllowedLink(url: string, type: "deep" | "web"): boolean {
  if (!url) return false;
  if (type === "deep") return ALLOWED_DEEP_LINKS.some(dl => url.startsWith(dl));
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_WEB_DOMAINS.some(d => parsed.hostname.endsWith(d));
  } catch { return false; }
}

const platformConfig: Record<string, { icon: string; color: string; bg: string; name: string }> = {
  instagram: { icon: "📸", color: "text-pink-400", bg: "bg-pink-500/10", name: "Instagram" },
  twitter: { icon: "𝕏", color: "text-sky-400", bg: "bg-sky-500/10", name: "X (Twitter)" },
  linkedin: { icon: "💼", color: "text-blue-400", bg: "bg-blue-500/10", name: "LinkedIn" },
  facebook: { icon: "📘", color: "text-indigo-400", bg: "bg-indigo-500/10", name: "Facebook" },
  tiktok: { icon: "🎵", color: "text-purple-400", bg: "bg-purple-500/10", name: "TikTok" },
  youtube: { icon: "▶️", color: "text-red-400", bg: "bg-red-500/10", name: "YouTube" },
};

export function parsePublishAssistant(text: string): { data: PublishAssistantData | null; cleanText: string } {
  const regex = /<!--PUBLISH_ASSISTANT:(.*?):END_PUBLISH_ASSISTANT-->/s;
  const match = text.match(regex);
  if (!match) return { data: null, cleanText: text };

  try {
    const data = JSON.parse(match[1]) as PublishAssistantData;
    const cleanText = text.replace(regex, "").trim();
    return { data, cleanText };
  } catch {
    return { data: null, cleanText: text };
  }
}

export default function PublishAssistantCard({ data }: { data: PublishAssistantData }) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation("pages");
  const cfg = platformConfig[data.platform] || { icon: "📱", color: "text-gray-400", bg: "bg-gray-500/10", name: data.platform };

  const copyToClipboard = async (text: string, type: "caption" | "hashtags") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "caption") {
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
      } else {
        setCopiedHashtags(true);
        setTimeout(() => setCopiedHashtags(false), 2000);
      }
      toast({ title: t("publishCard.copied"), description: t(type === "caption" ? "publishCard.captionCopied" : "publishCard.hashtagsCopied") });
    } catch {
      toast({ title: t("publishCard.error"), description: t("publishCard.copyFailed"), variant: "destructive" });
    }
  };

  const openApp = () => {
    if (data.deepLink && isAllowedLink(data.deepLink, "deep")) {
      window.open(data.deepLink, "_blank");
      setTimeout(() => {
        if (data.webLink && isAllowedLink(data.webLink, "web")) window.open(data.webLink, "_blank");
      }, 1500);
    } else if (data.webLink && isAllowedLink(data.webLink, "web")) {
      window.open(data.webLink, "_blank");
    }
  };

  return (
    <div className="my-3 rounded-xl border border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-purple-500/5 overflow-hidden" data-testid="card-publish-assistant">
      <div className={`px-4 py-2.5 flex items-center gap-2 ${cfg.bg} border-b border-pink-500/20`}>
        <span className="text-lg">{cfg.icon}</span>
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.name} — {t("publishCard.publishAssistant")}</span>
      </div>

      <div className="p-4 space-y-3">
        {data.imageUrl && (
          <div className="relative rounded-lg overflow-hidden border border-border/30 bg-black/20">
            <img
              src={data.imageUrl}
              alt={t("publishCard.postImageAlt")}
              className="w-full max-h-48 object-cover"
              data-testid="img-publish-preview"
            />
            <a
              href={data.imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs transition-colors"
              data-testid="button-download-image"
            >
              <Download className="w-3 h-3" />
              {t("publishCard.download")}
            </a>
          </div>
        )}

        <div className="space-y-2">
          <div className="relative">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-sm text-foreground whitespace-pre-wrap max-h-32 overflow-y-auto" data-testid="text-publish-caption">
              {data.content}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 h-7 text-[10px] gap-1 border-pink-500/30 hover:bg-pink-500/10"
              onClick={() => copyToClipboard(data.content, "caption")}
              data-testid="button-copy-caption"
            >
              {copiedCaption ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copiedCaption ? t("publishCard.copied") : t("publishCard.copyCaption")}
            </Button>
          </div>

          {data.hashtags && (
            <div className="relative">
              <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 break-words" data-testid="text-publish-hashtags">
                {data.hashtags}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-1.5 right-1.5 h-6 text-[10px] gap-1 border-blue-500/30 hover:bg-blue-500/10"
                onClick={() => copyToClipboard(data.hashtags, "hashtags")}
                data-testid="button-copy-hashtags"
              >
                {copiedHashtags ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copiedHashtags ? t("publishCard.copied") : t("publishCard.copyHashtags")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 text-xs h-9"
            onClick={async () => {
              const fullText = data.hashtags ? `${data.content}\n\n${data.hashtags}` : data.content;
              await copyToClipboard(fullText, "caption");
              setTimeout(openApp, 500);
            }}
            data-testid="button-copy-and-open"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            {t("publishCard.copyAndOpen", { name: cfg.name })}
          </Button>
          {data.webLink && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs border-border/50"
              onClick={() => window.open(data.webLink, "_blank")}
              data-testid="button-open-web"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
          <span>1. {data.imageUrl ? t("publishCard.step1Download") : t("publishCard.step1Ready")}</span>
          <span>2. {t("publishCard.step2")}</span>
          <span>3. {t("publishCard.step3")}</span>
          <span>4. {t("publishCard.step4")}</span>
        </div>
      </div>
    </div>
  );
}
