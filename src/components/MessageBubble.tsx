"use client";

import { ChatMessage } from "@/lib/types";

interface Props {
  message: ChatMessage;
}

const TYPE_STYLES: Record<string, string> = {
  intent: "border-l-4 border-blue-400 pl-3",
  quote: "border-l-4 border-green-400 pl-3",
  policy: "border-l-4 border-yellow-400 pl-3",
  approval_request: "border-l-4 border-orange-400 pl-3 bg-orange-950/20",
  payment: "border-l-4 border-purple-400 pl-3",
  receipt: "border-l-4 border-emerald-400 pl-3 bg-emerald-950/20",
  error: "border-l-4 border-red-400 pl-3 bg-red-950/20",
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const metaType = message.metadata?.type || "text";
  const typeStyle = TYPE_STYLES[metaType] || "";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : `bg-zinc-800 text-zinc-100 rounded-bl-sm ${typeStyle}`
        }`}
      >
        <div className="prose prose-sm prose-invert max-w-none">
          <FormattedContent content={message.content} />
        </div>
        <div className={`text-[10px] mt-1.5 ${isUser ? "text-blue-200" : "text-zinc-500"}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
          {metaType !== "text" && !isUser && (
            <span className="ml-2 uppercase tracking-wider">{metaType.replace("_", " ")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Simple markdown-like rendering for bold, code, tables, and line breaks
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("|") && line.endsWith("|")) {
          // Table row
          if (line.includes("---")) return null; // separator
          const cells = line.split("|").filter(Boolean).map((c) => c.trim());
          return (
            <div key={i} className="flex gap-3 text-xs font-mono">
              {cells.map((cell, j) => (
                <span key={j} className={j === 0 ? "text-zinc-400 w-32 shrink-0" : "text-zinc-200"}>
                  <InlineFormat text={cell} />
                </span>
              ))}
            </div>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-zinc-500">•</span>
              <span><InlineFormat text={line.slice(2)} /></span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <div key={i}>
            <InlineFormat text={line} />
          </div>
        );
      })}
    </div>
  );
}

function InlineFormat({ text }: { text: string }) {
  // Handle **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="bg-zinc-700 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-300">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
