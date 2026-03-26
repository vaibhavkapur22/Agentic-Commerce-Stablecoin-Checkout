"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, ChatResponse, PurchaseRequest } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ApprovalPrompt from "./ApprovalPrompt";

const SUGGESTED_PROMPTS = [
  "Buy me a coffee",
  "Book me a $50 ride to JFK",
  "Pay this invoice for $100",
  "What's my balance?",
  "For the next 1 hour, allow rides under $60",
  "Show my transaction history",
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to **Agentic Commerce**. I can help you make payments using USDC.\n\nTry saying:\n- \"Buy me a coffee\"\n- \"Book me a $50 ride to JFK\"\n- \"Pay this invoice for $100\"\n- \"Show my balance\"",
      timestamp: new Date().toISOString(),
      metadata: { type: "text" },
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<PurchaseRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, user_id: "usr_1" }),
      });

      const data: ChatResponse = await res.json();

      if (data.messages) {
        setMessages((prev) => [...prev, ...data.messages]);
      }

      if (data.requires_approval && data.pending_purchase) {
        setPendingPurchase(data.pending_purchase);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: new Date().toISOString(),
          metadata: { type: "error" },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(response: "approve" | "deny") {
    if (!pendingPurchase) return;
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "",
          user_id: "usr_1",
          approval_response: response,
          pending_purchase_id: pendingPurchase.purchase_id,
        }),
      });

      const data: ChatResponse = await res.json();
      if (data.messages) {
        setMessages((prev) => [...prev, ...data.messages]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "Failed to process approval. Please try again.",
          timestamp: new Date().toISOString(),
          metadata: { type: "error" },
        },
      ]);
    } finally {
      setPendingPurchase(null);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Agentic Commerce</h1>
            <p className="text-xs text-zinc-500">AI-Powered Stablecoin Checkout</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-400">USDC on Base</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {pendingPurchase && (
            <ApprovalPrompt
              purchase={pendingPurchase}
              onRespond={handleApproval}
              loading={loading}
            />
          )}

          {loading && !pendingPurchase && (
            <div className="flex justify-start mb-3">
              <div className="bg-zinc-800 rounded-xl px-4 py-3 rounded-bl-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested prompts */}
      {messages.length <= 1 && (
        <div className="px-6 pb-2">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Book me a ride, buy coffee, pay an invoice..."
              disabled={loading}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Send
            </button>
          </form>
          <p className="text-[10px] text-zinc-600 mt-2 text-center">
            Connected as Alice (usr_1) • Wallet: $500.00 USDC • Auto-approve limit: $25
          </p>
        </div>
      </div>
    </div>
  );
}
