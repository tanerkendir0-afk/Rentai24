import React from "react";
import { Text, View, Linking } from "react-native";
import Markdown from "react-native-markdown-display";

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

const markdownStyles = {
  body: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 20,
  },
  heading1: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700" as const,
    marginTop: 12,
    marginBottom: 6,
  },
  heading2: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700" as const,
    marginTop: 10,
    marginBottom: 4,
  },
  heading3: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600" as const,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  link: {
    color: "#60a5fa",
    textDecorationLine: "underline" as const,
  },
  blockquote: {
    backgroundColor: "#1e293b",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 4,
  },
  code_inline: {
    backgroundColor: "#1e293b",
    color: "#e879f9",
    fontFamily: "monospace",
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  code_block: {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "monospace",
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "monospace",
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 4,
  },
  thead: {
    backgroundColor: "#1e293b",
  },
  th: {
    color: "#f8fafc",
    fontWeight: "600" as const,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#334155",
  },
  td: {
    color: "#cbd5e1",
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#334155",
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  strong: {
    fontWeight: "700" as const,
    color: "#f8fafc",
  },
  em: {
    fontStyle: "italic" as const,
  },
  hr: {
    backgroundColor: "#334155",
    height: 1,
    marginVertical: 12,
  },
  image: {
    borderRadius: 8,
    marginVertical: 4,
  },
};

const userMarkdownStyles = {
  ...markdownStyles,
  body: {
    ...markdownStyles.body,
    color: "#ffffff",
  },
  link: {
    color: "#bfdbfe",
    textDecorationLine: "underline" as const,
  },
  code_inline: {
    ...markdownStyles.code_inline,
    backgroundColor: "rgba(255,255,255,0.15)",
    color: "#ffffff",
  },
  code_block: {
    ...markdownStyles.code_block,
    backgroundColor: "rgba(0,0,0,0.2)",
    color: "#ffffff",
  },
  fence: {
    ...markdownStyles.fence,
    backgroundColor: "rgba(0,0,0,0.2)",
    color: "#ffffff",
  },
  strong: {
    fontWeight: "700" as const,
    color: "#ffffff",
  },
};

export default function MarkdownRenderer({
  content,
  isUser = false,
}: MarkdownRendererProps) {
  // Simple messages (no markdown syntax) - render as plain text for performance
  const hasMarkdown = /[#*`\[\]|>_~-]{2}|```|\n\n/.test(content);

  if (!hasMarkdown) {
    return (
      <Text
        className={`text-sm leading-5 ${isUser ? "text-white" : "text-foreground"}`}
      >
        {content}
      </Text>
    );
  }

  return (
    <Markdown
      style={isUser ? userMarkdownStyles : markdownStyles}
      onLinkPress={(url: string) => {
        Linking.openURL(url);
        return false;
      }}
    >
      {content}
    </Markdown>
  );
}
