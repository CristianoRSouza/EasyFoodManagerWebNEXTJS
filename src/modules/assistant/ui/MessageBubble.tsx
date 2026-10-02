"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Sparkles } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import type { ChatMessage } from "../domain/chat";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
      aria-label="Copiar"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

const PROSE = cn(
  "prose prose-sm dark:prose-invert max-w-none break-words",
  "prose-p:my-1.5 prose-p:leading-relaxed",
  "prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1.5",
  "prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-h4:text-xs",
  "prose-ul:my-1.5 prose-ul:pl-5 prose-ol:my-1.5 prose-ol:pl-5",
  "prose-li:my-0.5 prose-li:marker:text-muted-foreground",
  "prose-strong:text-foreground prose-strong:font-semibold",
  "prose-a:text-primary prose-a:font-medium hover:prose-a:underline",
  "prose-code:text-xs prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:bg-background/80 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg prose-pre:p-2.5 prose-pre:my-2 prose-pre:text-xs prose-pre:overflow-x-auto",
  "[&_pre>code]:bg-transparent [&_pre>code]:p-0",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
);

/**
 * `components.a` do `ReactMarkdown` — cópia do legado (`components/ai-chat/AIChatPanel.tsx`): links
 * internos (`/rota` ou `#âncora`) navegam no próprio painel e fecham o chat; externos abrem em nova
 * aba. Única troca: `navigate` (react-router) → `router.push` (next/navigation).
 */
function useMarkdownComponents(onNavigate: () => void): Components {
  const router = useRouter();
  return {
    a: ({ href, children, ...rest }) => {
      // `node` (a árvore hast) não é atributo HTML: o legado o separa na desestruturação.
      const { node, ...props } = rest;
      void node;
      const isPath = typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
      const isHashOnly = typeof href === "string" && href.startsWith("#");
      if (isPath || isHashOnly) {
        return (
          <a
            {...props}
            href={href}
            onClick={(e) => {
              e.preventDefault();
              const target = href!;
              const hashIdx = target.indexOf("#");
              const hash = hashIdx >= 0 ? target.slice(hashIdx + 1) : "";
              const scrollToHash = () => {
                if (!hash) return;
                requestAnimationFrame(() => {
                  const el = document.getElementById(hash);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              };
              if (isHashOnly) {
                onNavigate();
                setTimeout(scrollToHash, 50);
                return;
              }
              router.push(target);
              onNavigate();
              setTimeout(scrollToHash, 150);
            }}
          >
            {children}
          </a>
        );
      }
      return (
        <a {...props} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };
}

export function MessageBubble({ msg, onNavigate }: { msg: ChatMessage; onNavigate: () => void }) {
  const isUser = msg.role === "user";
  const components = useMarkdownComponents(onNavigate);
  return (
    <div className={cn("group flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div className={cn("flex flex-col gap-1 max-w-[85%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted/70 text-foreground rounded-bl-md border border-border/40",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          ) : msg.content ? (
            <div className={PROSE}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {msg.content}
              </ReactMarkdown>
            </div>
          ) : (
            <span className="inline-flex gap-1 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>
        {!isUser && msg.content && <CopyBtn text={msg.content} />}
      </div>
    </div>
  );
}
