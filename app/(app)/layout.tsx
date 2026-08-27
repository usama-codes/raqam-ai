import Link from "next/link";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  MessageSquare,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ڈیش بورڈ", labelEn: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "لین دین", labelEn: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "بجٹ", labelEn: "Budgets", icon: Wallet },
  { href: "/goals", label: "اہداف", labelEn: "Goals", icon: Target },
  { href: "/assistant", label: "معاون", labelEn: "Assistant", icon: MessageSquare },
  { href: "/settings", label: "ترتیبات", labelEn: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-e border-border bg-sidebar">
        <div className="flex h-16 items-center justify-center border-b border-border px-6">
          <h1 className="text-xl font-bold">Raqam-AI</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-border bg-background h-16">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
