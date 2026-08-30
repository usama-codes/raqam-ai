"use client";

// hooks/useAutoResizeTextarea.ts — grow a <textarea> with its content, capped.
// Height only, so it is RTL-safe. Adapted from the reference AnimatedAIChat.

import * as React from "react";

interface UseAutoResizeTextareaOptions {
  minHeight: number;
  maxHeight?: number;
}

export function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaOptions) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(
    (reset?: boolean) => {
      const el = textareaRef.current;
      if (!el) return;

      if (reset) {
        el.style.height = `${minHeight}px`;
        return;
      }

      el.style.height = `${minHeight}px`;
      const next = Math.max(
        minHeight,
        Math.min(el.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY),
      );
      el.style.height = `${next}px`;
    },
    [minHeight, maxHeight],
  );

  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) el.style.height = `${minHeight}px`;
  }, [minHeight]);

  React.useEffect(() => {
    const onResize = () => adjustHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}
