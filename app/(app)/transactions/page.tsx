"use client";

import * as React from "react";
import Link from "next/link";
import {
  TransactionFormDialog,
  type TransactionFormData,
} from "@/components/transactions/TransactionFormDialog";
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import {
  ListSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";

const gridCols =
  "grid-cols-[100px_minmax(150px,1.6fr)_minmax(120px,1fr)_110px_120px_90px]";

function pkr(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "آج";
  if (diffDays === 1) return "کل";
  return d.toLocaleDateString("ur-PK", { day: "numeric", month: "short" });
}

export default function TransactionsPage() {
  const {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const { categories } = useCategories();

  /* ── Dialog state ── */
  const [formOpen, setFormOpen] = React.useState(false);
  const [editData, setEditData] =
    React.useState<Partial<TransactionFormData>>();
  const [editId, setEditId] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string;
    desc: string;
    amount: string;
  } | null>(null);

  const getCategoryName = (catId: string): string => {
    const cat = categories.find((c) => c.id === catId || c.name === catId);
    return cat?.nameUr ?? catId;
  };

  const handleAdd = () => {
    setEditData(undefined);
    setEditId(null);
    setFormOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setEditData({
      type: tx.type,
      amount: String(tx.amount),
      categoryId: tx.categoryId,
      description: tx.descriptionUr ?? tx.description ?? "",
      date: new Date(tx.date).toISOString().slice(0, 10),
      notes: tx.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleDelete = (tx: Transaction) => {
    setDeleteTarget({
      id: tx.id,
      desc: tx.descriptionUr ?? tx.description ?? "",
      amount: pkr(tx.amount),
    });
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: TransactionFormData) => {
    const amount = parseFloat(data.amount);
    const dateMs = new Date(data.date).getTime();
    if (editId) {
      await updateTransaction({
        id: editId,
        type: data.type,
        amount,
        categoryId: data.categoryId,
        date: dateMs,
        description: data.description,
        notes: data.notes,
        source: "manual",
      });
    } else {
      await createTransaction({
        type: data.type,
        amount,
        categoryId: data.categoryId,
        date: dateMs,
        description: data.description,
        notes: data.notes,
        source: "manual",
      });
    }
    setFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteTransaction(deleteTarget.id);
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">لین دین</h1>
          <p className="text-[14px] text-[#6B7A70]">
            {transactions.length > 0
              ? `${transactions.length} اندراج · نئے پہلے`
              : "کوئی اندراج نہیں"}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/import"
            className="hidden rounded-[10px] border border-[#DCD6C8] bg-white px-4 py-[11px] text-[14px] hover:bg-[#FBF9F4] sm:block"
          >
            اسٹیٹمنٹ درآمد
          </Link>
          <button
            onClick={handleAdd}
            className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]"
          >
            + نیا لین دین
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex flex-col gap-[18px] px-6 pb-12 pt-6 sm:px-10">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#E7E2D6] bg-white p-4 px-[18px]">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5">
            <span className="text-[#8A9690]">⌕</span>
            <span className="text-[14px] text-[#9BA79F]">
              تفصیل میں تلاش کریں…
            </span>
          </div>
          <div className="flex overflow-hidden rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4]">
            <span className="bg-[#0F5132] px-3.5 py-2.5 text-[14px] text-white">
              سب
            </span>
            <span className="border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px]">
              خرچ
            </span>
            <span className="border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px]">
              آمدنی
            </span>
          </div>
          <button className="text-[14px] text-[#0F5132]">فلٹر ہٹائیں</button>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="overflow-x-auto rounded-2xl border border-[#E7E2D6] bg-white">
            <ListSkeleton rows={6} />
          </div>
        )}

        {/* ── Error ── */}
        {error && <ErrorState />}

        {/* ── Empty ── */}
        {!loading && !error && transactions.length === 0 && (
          <EmptyState
            icon="💸"
            title="کوئی لین دین نہیں"
            description="ابھی تک کوئی لین دین درج نہیں ہوا۔ اپنا پہلا لین دین شامل کریں یا بینک اسٹیٹمنٹ درآمد کریں۔"
            actionLabel="+ نیا لین دین"
            onAction={handleAdd}
          />
        )}

        {/* ── Data table ── */}
        {!loading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#E7E2D6] bg-white">
            {/* Table header */}
            <div
              className={`hidden min-w-[800px] ${gridCols} grid gap-3.5 border-b border-[#E7E2D6] bg-[#FBF9F4] px-5 py-3.5 font-[var(--font-manrope)] text-[11px] tracking-[.12em] text-[#8A9690] md:grid`}
            >
              <span>تاریخ</span>
              <span>تفصیل</span>
              <span>زمرہ</span>
              <span>ذریعہ</span>
              <span>رقم</span>
              <span></span>
            </div>
            {/* Table rows */}
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                className={`hidden min-w-[800px] ${gridCols} grid items-center gap-3.5 px-5 py-[15px] text-[15px] hover:bg-[#FBF9F4] md:grid ${i < transactions.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
              >
                <span className="text-[14px] text-[#6B7A70]">
                  {formatDate(tx.date)}
                </span>
                <span>{tx.descriptionUr ?? tx.description ?? "—"}</span>
                <span className="text-[#4C5A52]">
                  {getCategoryName(tx.categoryId)}
                </span>
                <span className="justify-self-start rounded-full bg-[#F1EEE4] px-2.5 py-1 text-[12px] text-[#6B7A70]">
                  {tx.source === "manual"
                    ? "دستی"
                    : tx.source === "conversational"
                      ? "معاون"
                      : tx.source === "voice"
                        ? "آواز"
                        : tx.source === "receipt"
                          ? "رسید"
                          : "درآمد"}
                </span>
                <span
                  className={`font-[var(--font-manrope)] font-semibold ${tx.type === "income" ? "text-[#0F5132]" : ""}`}
                >
                  {tx.type === "income" ? "+" : "−"} {pkr(tx.amount)}
                </span>
                <span className="flex gap-3 text-[14px]">
                  <button
                    onClick={() => handleEdit(tx)}
                    className="text-[#0F5132]"
                  >
                    تبدیلی
                  </button>
                  <button
                    onClick={() => handleDelete(tx)}
                    className="text-[#B3261E]"
                  >
                    حذف
                  </button>
                </span>
              </div>
            ))}
            {/* Mobile card layout */}
            <div className="flex flex-col md:hidden">
              {transactions.map((tx, i) => (
                <div
                  key={`m-${tx.id}`}
                  className={`flex items-center gap-3.5 px-4 py-3 ${i < transactions.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium">
                        {tx.descriptionUr ?? tx.description ?? "—"}
                      </span>
                      <span className="rounded-full bg-[#F1EEE4] px-2 py-0.5 text-[11px] text-[#6B7A70]">
                        {tx.source === "manual" ? "دستی" : tx.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#8A9690]">
                        {formatDate(tx.date)} · {getCategoryName(tx.categoryId)}
                      </span>
                      <button
                        onClick={() => handleEdit(tx)}
                        className="text-[12px] text-[#0F5132]"
                      >
                        تبدیلی
                      </button>
                      <button
                        onClick={() => handleDelete(tx)}
                        className="text-[12px] text-[#B3261E]"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                  <span
                    className={`font-[var(--font-manrope)] text-[15px] font-semibold ${tx.type === "income" ? "text-[#0F5132]" : ""}`}
                  >
                    {tx.type === "income" ? "+" : "−"} {pkr(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Transaction Dialog ── */}
      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editData}
        onSubmit={handleFormSubmit}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transactionDescription={deleteTarget?.desc}
        transactionAmount={deleteTarget?.amount}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
