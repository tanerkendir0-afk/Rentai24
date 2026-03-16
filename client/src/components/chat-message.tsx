import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Components } from "react-markdown";
import { Download, X, ImageOff, Loader2, FileText, FileSpreadsheet, File } from "lucide-react";
import { useTranslation } from "react-i18next";

function getDownloadUrl(src: string): string {
  const match = src?.match(/\/api\/images\/([^/]+)$/);
  if (match) {
    return `/api/images/${match[1]}/download`;
  }
  return src;
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          data-testid="lightbox-image"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <a
            href={getDownloadUrl(src)}
            download
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
            data-testid="lightbox-download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
            data-testid="lightbox-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatImage({ src, alt, isUser }: { src?: string; alt?: string; isUser: boolean }) {
  const { t } = useTranslation("pages");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setError(false);
    setLoading(true);
  }, [src]);

  if (!src) return null;

  if (error) {
    return (
      <div className="my-2 flex items-center gap-2 p-3 rounded-lg border border-border/30 bg-muted/30 text-muted-foreground text-xs" data-testid="image-error">
        <ImageOff className="w-4 h-4 shrink-0 opacity-60" />
        <span>{t("chatMessage.imageLoadError")}</span>
      </div>
    );
  }

  return (
    <>
      <div className="my-2">
        <div className="relative inline-block">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-muted/50 border border-border/30 min-h-[64px] min-w-[64px]" data-testid="status-image-loading">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={src}
            alt={alt || ""}
            className="rounded-lg max-w-full max-h-64 object-contain border border-border/30 cursor-pointer hover:opacity-90 transition-opacity"
            onError={() => { setError(true); setLoading(false); }}
            onLoad={() => setLoading(false)}
            onClick={() => setLightboxOpen(true)}
            data-testid="chat-image"
          />
        </div>
        <a
          href={getDownloadUrl(src)}
          download
          className={`inline-flex items-center gap-1 mt-1.5 text-xs ${isUser ? "text-blue-100 hover:text-white" : "text-blue-400 hover:text-blue-300"}`}
          data-testid="image-download-link"
        >
          <Download className="w-3 h-3" /> {t("chatMessage.download")}
        </a>
      </div>
      {lightboxOpen && (
        <ImageLightbox src={src} alt={alt || ""} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls", "csv", "numbers"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "docx", "pages", "txt", "md"].includes(ext)) return FileText;
  return File;
}

function DocumentCard({ filename, sizeInfo, isUser }: { filename: string; sizeInfo?: string; isUser: boolean }) {
  const { t } = useTranslation("pages");
  const Icon = getFileIcon(filename);
  const ext = filename.split(".").pop()?.toUpperCase() || "FILE";
  return (
    <div
      className={`my-2 inline-flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
        isUser
          ? "bg-white/10 border-white/15"
          : "bg-muted/40 border-border/30"
      }`}
      data-testid="document-card"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        isUser ? "bg-white/10" : "bg-blue-500/10"
      }`}>
        <Icon className={`w-4 h-4 ${isUser ? "text-blue-200" : "text-blue-400"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate max-w-[200px]">{filename}</p>
        <p className={`text-[10px] ${isUser ? "text-blue-200/60" : "text-muted-foreground"}`}>
          {t("chatMessage.fileType", { ext })}{sizeInfo ? ` · ${sizeInfo}` : ""}
        </p>
      </div>
    </div>
  );
}

const createComponents = (isUser: boolean): Components => ({
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h4 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h4>,
  h2: ({ children }) => <h4 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h4>,
  h3: ({ children }) => <h4 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="mb-2 last:mb-0 space-y-1 ml-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 last:mb-0 space-y-1 ml-1 counter-reset-item">{children}</ol>,
  li: ({ children, ...props }) => {
    const parent = (props as any).node?.parentNode?.tagName;
    const isOrdered = parent === "ol";
    return (
      <li className="flex items-start gap-2 text-sm">
        {isOrdered ? (
          <span className="mt-0.5 text-xs font-semibold opacity-50 shrink-0 min-w-[1rem] text-right">{(props as any).index != null ? (props as any).index + 1 + "." : "·"}</span>
        ) : (
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-current opacity-30 shrink-0" />
        )}
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className={`my-2 rounded-lg overflow-x-auto ${isUser ? "bg-white/10 border border-white/10" : "bg-black/20 border border-white/5"}`}>
          <code className="block px-3 py-2.5 text-xs font-mono leading-relaxed">{children}</code>
        </pre>
      );
    }
    return (
      <code className={`px-1.5 py-0.5 rounded text-[0.85em] font-mono ${isUser ? "bg-white/15" : "bg-black/10"}`}>{children}</code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-current/20 pl-3 my-2 opacity-80 italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-current/10" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline underline-offset-2 decoration-1 ${isUser ? "text-blue-100 hover:text-white" : "text-blue-400 hover:text-blue-300"}`}
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => <ChatImage src={src} alt={alt} isUser={isUser} />,
  table: ({ children }) => (
    <div className={`my-2 overflow-x-auto rounded-lg border ${isUser ? "border-white/15" : "border-border/30"}`}>
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={isUser ? "bg-white/10" : "bg-muted/50"}>{children}</thead>,
  th: ({ children }) => <th className={`px-3 py-2 text-left font-semibold border-b ${isUser ? "border-white/15" : "border-border/30"}`}>{children}</th>,
  td: ({ children }) => <td className={`px-3 py-1.5 border-b ${isUser ? "border-white/10" : "border-border/20"}`}>{children}</td>,
  tr: ({ children }) => <tr>{children}</tr>,
});

interface ChatMessageContentProps {
  content: string;
  isUser: boolean;
}

export default function ChatMessageContent({ content, isUser }: ChatMessageContentProps) {
  const docMatch = content.match(/📎 \*\*(.+?)\*\*(?:\s*\((.+?)\))?$/m);
  const textWithoutDoc = docMatch ? content.replace(/\n*📎 \*\*.+$/m, "").trim() : content;

  return (
    <div className="prose-chat text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={createComponents(isUser)}
      >
        {textWithoutDoc}
      </ReactMarkdown>
      {docMatch && <DocumentCard filename={docMatch[1]} sizeInfo={docMatch[2]} isUser={isUser} />}
    </div>
  );
}
