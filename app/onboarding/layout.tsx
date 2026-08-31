import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ConvexGuardWrapper } from "@/components/ConvexGuardWrapper";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ToastProvider } from "@/components/shared/Toast";

/**
 * First-run onboarding — the authenticated providers minus the app chrome
 * (no sidebar / bottom nav). Phase 15.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <ConvexGuardWrapper>
        <LanguageProvider>
          <ToastProvider>
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EC] px-4 py-10 text-[#14231B]">
              {children}
            </div>
          </ToastProvider>
        </LanguageProvider>
      </ConvexGuardWrapper>
    </ConvexClientProvider>
  );
}
