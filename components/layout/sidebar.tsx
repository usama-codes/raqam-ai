"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  MessageSquare,
  Settings,
  Upload,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pitchNav = [
  { href: "/", label: "مسئلہ اور حل", en: "PITCH", icon: Rocket },
];

const appNav = [
  { href: "/dashboard", label: "ڈیش بورڈ", en: "HOME", icon: LayoutDashboard },
  { href: "/transactions", label: "لین دین", en: "TXNS", icon: ArrowLeftRight },
  { href: "/budgets", label: "بجٹ", en: "BUDGET", icon: Wallet },
  { href: "/goals", label: "بچت کے اہداف", en: "GOALS", icon: Target },
  { href: "/assistant", label: "رقم معاون", en: "AI", icon: MessageSquare },
  { href: "/import", label: "اسٹیٹمنٹ درآمد", en: "IMPORT", icon: Upload },
  { href: "/settings", label: "ترتیبات", en: "SETTINGS", icon: Settings },
];

const mobileNav = appNav.slice(0, 5);

function NavItem({
  href,
  label,
  en,
  active,
}: {
  href: string;
  label: string;
  en: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2 rounded-[10px] px-3 py-[11px] text-[15px] transition-colors",
        active
          ? "bg-[#E8B931] text-[#0B3B26] font-semibold"
          : "bg-transparent text-[#C4D6C9] hover:bg-white/9",
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span className="font-[var(--font-manrope)] text-[10px] tracking-[.1em] opacity-55">
        {en}
      </span>
    </Link>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: typeof appNav;
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-2.5 pb-1.5 font-[var(--font-manrope)] text-[10px] tracking-[.18em] text-[#5F8C74]">
        {title}
      </span>
      {items.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          en={item.en}
          active={pathname === item.href}
        />
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col gap-7 overflow-y-auto bg-[#0B3B26] px-5 py-[26px] text-[#DCE7DF] lg:flex">
      {/* Logo */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#E8B931] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[19px] font-bold text-[#0B3B26]">
            ر
          </div>
          <div className="flex flex-col">
            <span className="font-[var(--font-noto-nastaliq-urdu)] text-[20px] font-bold leading-[1.6] text-white">
              رقم
            </span>
            <span className="font-[var(--font-manrope)] text-[10px] tracking-[.22em] text-[#8FB49E]">
              RAQAM&nbsp;AI
            </span>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-[1.9] text-[#8FB49E]">
          اردو بولنے والوں کے لیے مالی معاون
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-[22px] overflow-y-auto">
        <NavSection title="PITCH" items={pitchNav} pathname={pathname} />
        <NavSection title="PRODUCT" items={appNav} pathname={pathname} />
      </nav>

      {/* User profile */}
      <div className="flex items-center gap-2.5 border-t border-white/[.12] pt-4">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#1E5B3E] text-[14px] text-[#DCE7DF]">
          ز
        </div>
        <div className="flex flex-col leading-[1.5]">
          <span className="text-[14px] text-white">زینب اقبال</span>
          <span className="font-[var(--font-manrope)] text-[11px] text-[#8FB49E]">
            zainab@raqam.pk
          </span>
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-[#E7E2D6] bg-white lg:hidden">
      {mobileNav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 text-[10px] transition-colors",
              active ? "text-[#0F5132] font-semibold" : "text-[#6B7A70]",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
