"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageProvider";
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";

/** The "assistant is composing a reply" placeholder. */
export function ThinkingBubble() {
  const { t } = useLanguage();

  return (
    <motion.div
      className="flex items-end gap-2 self-end"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 rounded-[16px_16px_4px_16px] border border-border bg-card px-4 py-3.5">
        <span className="text-[13px] text-muted-foreground">
          {t("assistant.thinking")}
        </span>
        <span className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A9690]"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
      <AssistantAvatar />
    </motion.div>
  );
}
