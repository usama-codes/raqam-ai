"use client";

import * as React from "react";

// ─── Loading Skeleton ────────────────────────────────────────────────────────────

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-[#EDEAE0] ${className ?? ""}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E7E2D6] bg-white p-5">
      <Pulse className="h-3.5 w-24" />
      <Pulse className="h-7 w-32" />
      <Pulse className="h-3 w-36" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-3.5 border-b border-[#F4F1E8] px-5 py-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Pulse key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProgressBarSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <Pulse className="h-4 w-24" />
        <Pulse className="h-4 w-16" />
      </div>
      <Pulse className="h-2.5 w-full" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6">
      <div className="flex items-start justify-between">
        <Pulse className="h-5 w-28" />
        <Pulse className="h-5 w-10 rounded-full" />
      </div>
      <ProgressBarSkeleton />
      <div className="flex flex-col gap-2">
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-3/4" />
        <Pulse className="h-4 w-1/2" />
      </div>
      <Pulse className="h-10 w-full" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
      <Pulse className="h-5 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-4 w-16" />
            </div>
            <Pulse className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-2">
          <Pulse className="h-7 w-40" />
          <Pulse className="h-4 w-56" />
        </div>
        <Pulse className="h-10 w-32" />
      </div>
      <div className="flex flex-col gap-[22px] px-6 pb-12 pt-7 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ListSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty States ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = "📋",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#CBD9CF] bg-white px-6 py-12 text-center">
      <span className="text-[40px]">{icon}</span>
      <h3 className="text-[18px] font-bold">{title}</h3>
      <p className="max-w-sm text-[14px] leading-[2] text-[#6B7A70]">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-[10px] border-0 bg-[#0F5132] px-5 py-2.5 text-[14px] text-white hover:bg-[#14231B]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#E7D6D4] bg-white px-6 py-12 text-center">
      <span className="text-[40px]">⚠️</span>
      <h3 className="text-[18px] font-bold">کچھ غلط ہو گیا</h3>
      <p className="max-w-sm text-[14px] leading-[2] text-[#6B7A70]">
        {message ?? "ڈیٹا لوڈ کرنے میں مسئلہ ہوا۔ براہ کرم دوبارہ کوشش کریں۔"}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-[10px] border-0 bg-[#0F5132] px-5 py-2.5 text-[14px] text-white hover:bg-[#14231B]"
        >
          دوبارہ کوشش کریں
        </button>
      )}
    </div>
  );
}
