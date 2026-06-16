"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_QUESTIONS = [
  "How can I reduce my expenses?",
  "What are my biggest spending areas?",
  "Am I saving enough?",
  "Compare my spending vs last month",
  "Where can I cut unnecessary costs?",
];

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response ?? data.error ?? "Sorry, I couldn't process that request.",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Network error. Please try again." },
      ]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex h-[600px] flex-col rounded-xl border border-slate-800 bg-slate-900/50">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 animate-float">
              <svg className="h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200">AI Financial Advisor</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Ask me anything about your finances. I'll analyze your spending data and provide personalized advice.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-violet-500/50 hover:text-violet-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-emerald-500/20 text-emerald-100 rounded-br-md"
                  : "bg-slate-800/80 text-slate-200 rounded-bl-md border border-slate-700/50"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="ai-markdown text-sm" dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }} />
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-slide-up">
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-800/80 px-4 py-3 border border-slate-700/50">
              <span className="h-2 w-2 rounded-full bg-violet-400 typing-dot" />
              <span className="h-2 w-2 rounded-full bg-violet-400 typing-dot" />
              <span className="h-2 w-2 rounded-full bg-violet-400 typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 p-4">
        {messages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="rounded-full border border-slate-700/50 px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-violet-500/50 hover:text-violet-300"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="rounded-xl"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple markdown to HTML converter for AI responses
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}
