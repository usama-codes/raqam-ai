import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raqam-AI — Urdu AI Financial Literacy & Budgeting Platform",
  description:
    "A financially literate Pakistani friend who understands your finances, explains them in Urdu, helps you make better decisions, and safely performs a small set of useful actions on your behalf.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ur"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} ${notoNaskhArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-[var(--font-noto-naskh-arabic)]">
        {children}
      </body>
    </html>
  );
}
