import { cn } from "@/lib/utils";

/** The circular "ر" mark used beside assistant messages. */
export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary font-[var(--font-nastaliq)] text-[13px] leading-none text-[#E8B931]",
        "h-7 w-7 pb-0.5",
        className,
      )}
    >
      ر
    </span>
  );
}
