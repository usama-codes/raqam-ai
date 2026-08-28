"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SYSTEM_CATEGORIES } from "@/lib/finance/categories";

/* ── Types ── */
export interface TransactionFormData {
  type: "income" | "expense";
  amount: string;
  categoryId: string;
  date: string;
  description: string;
  notes: string;
}

const EMPTY: TransactionFormData = {
  type: "expense",
  amount: "",
  categoryId: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass existing data to enter "edit" mode */
  initialData?: Partial<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => void;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: Props) {
  const isEdit = !!initialData?.amount;
  const [formKey, setFormKey] = React.useState(0);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) setFormKey((k) => k + 1);
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg border-[#E7E2D6] bg-white p-0 shadow-lg">
        {open && (
          <TransactionFormInner
            key={formKey}
            isEdit={isEdit}
            initialData={initialData}
            onSubmit={onSubmit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Inner form (remounts on each open via key) ── */
function TransactionFormInner({
  isEdit,
  initialData,
  onSubmit,
  onClose,
}: {
  isEdit: boolean;
  initialData?: Partial<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<TransactionFormData>({
    ...EMPTY,
    ...initialData,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const set = <K extends keyof TransactionFormData>(
    key: K,
    val: TransactionFormData[K],
  ) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[key];
      return copy;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0)
      errs.amount = "درست رقم درج کریں";
    if (!form.categoryId) errs.categoryId = "زمرہ منتخب کریں";
    if (!form.date) errs.date = "تاریخ درج کریں";
    if (!form.description.trim()) errs.description = "تفصیل درج کریں";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const categories = SYSTEM_CATEGORIES.filter(
    (c) => c.type === form.type || c.type === "both",
  );

  const inputCls =
    "h-10 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20";
  const errorCls = "text-[12px] text-[#B3261E] mt-1";
  const labelCls = "text-[13px] font-medium text-[#4C5A52] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Header */}
      <DialogHeader className="border-b border-[#E7E2D6] bg-[#FBF9F4] px-6 py-4">
        <DialogTitle className="text-[20px] font-bold text-[#14231B]">
          {isEdit ? "لین دین میں تبدیلی" : "نیا لین دین"}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-[#6B7A70]">
          {isEdit
            ? "تفصیلات تبدیل کریں اور محفوظ کریں"
            : "تمام ضروری فیلڈز پُر کریں"}
        </DialogDescription>
      </DialogHeader>

      {/* Body */}
      <div className="flex flex-col gap-4 px-6 py-5">
        {/* Type toggle */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>قسم</Label>
          <div className="flex overflow-hidden rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4]">
            <button
              type="button"
              onClick={() => set("type", "expense")}
              className={`flex-1 px-3.5 py-2.5 text-[14px] transition-colors ${
                form.type === "expense"
                  ? "bg-[#B3261E] text-white"
                  : "hover:bg-[#F1EEE4]"
              }`}
            >
              خرچ
            </button>
            <button
              type="button"
              onClick={() => set("type", "income")}
              className={`flex-1 border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px] transition-colors ${
                form.type === "income"
                  ? "bg-[#0F5132] text-white"
                  : "hover:bg-[#F1EEE4]"
              }`}
            >
              آمدنی
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>رقم (PKR)</Label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="مثلاً 1,500"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className={`${inputCls} font-[var(--font-manrope)] text-[16px] font-semibold ${errors.amount ? "border-[#B3261E]" : ""}`}
            dir="ltr"
          />
          {errors.amount && <span className={errorCls}>{errors.amount}</span>}
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>زمرہ</Label>
          <Select
            value={form.categoryId}
            onValueChange={(val) => set("categoryId", val as string)}
          >
            <SelectTrigger
              className={`h-10 w-full rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 text-[14px] ${errors.categoryId ? "border-[#B3261E]" : ""}`}
            >
              <SelectValue placeholder="زمرہ منتخب کریں" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  <span>{cat.icon}</span>
                  <span>{cat.nameUr}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <span className={errorCls}>{errors.categoryId}</span>
          )}
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>تاریخ</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={`${inputCls} ${errors.date ? "border-[#B3261E]" : ""}`}
            dir="ltr"
          />
          {errors.date && <span className={errorCls}>{errors.date}</span>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>تفصیل</Label>
          <Input
            type="text"
            placeholder="مثلاً: بجلی کا بل — اگست"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={`${inputCls} ${errors.description ? "border-[#B3261E]" : ""}`}
          />
          {errors.description && (
            <span className={errorCls}>{errors.description}</span>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <Label className={labelCls}>
            نوٹس <span className="text-[#9BA79F] font-normal">(اختیاری)</span>
          </Label>
          <textarea
            placeholder="اضافی تفصیلات…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            className="w-full resize-none rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20 focus-visible:outline-none"
          />
        </div>
      </div>

      {/* Footer */}
      <DialogFooter className="flex-row gap-2.5 border-t border-[#E7E2D6] bg-[#FBF9F4] px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-[10px] border-[#DCD6C8] bg-white px-5 py-2.5 text-[14px] hover:bg-[#FBF9F4]"
        >
          منسوخ
        </Button>
        <Button
          type="submit"
          className="rounded-[10px] border-0 bg-[#0F5132] px-6 py-2.5 text-[14px] text-white hover:bg-[#14231B]"
        >
          {isEdit ? "تبدیلی محفوظ کریں" : "محفوظ کریں"}
        </Button>
      </DialogFooter>
    </form>
  );
}
