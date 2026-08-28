import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ConvexGuardWrapper } from "@/components/ConvexGuardWrapper";
import { Sidebar, MobileBottomNav } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <ConvexGuardWrapper>
        <div className="flex min-h-screen flex-row bg-[#F7F4EC] text-[#14231B]">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      </ConvexGuardWrapper>
    </ConvexClientProvider>
  );
}
