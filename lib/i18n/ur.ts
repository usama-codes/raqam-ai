// lib/i18n/ur.ts — Urdu string map
// All UI text in Urdu. Keys use flat dot notation as specified in AGENTS.md §5.

export const ur = {
  // Navigation
  "nav.dashboard": "ڈیش بورڈ",
  "nav.transactions": "لین دین",
  "nav.budgets": "بجٹ",
  "nav.goals": "اہداف",
  "nav.assistant": "معاون",
  "nav.settings": "ترتیبات",

  // Dashboard
  "dashboard.balance.label": "کل بیلنس",
  "dashboard.income.label": "ماہانہ آمدنی",
  "dashboard.expenses.label": "ماہانہ اخراجات",
  "dashboard.savingsRate.label": "بچت کی شرح",
  "dashboard.recentTransactions": "حالیہ لین دین",

  // Transactions
  "transactions.title": "لین دین",
  "transactions.add": "نیا لین دین",
  "transactions.allTypes": "تمام اقسام",
  "transactions.income": "آمدنی",
  "transactions.expense": "اخراجات",
  "transactions.allCategories": "تمام زمرے",

  // Budgets
  "budgets.title": "بجٹ",
  "budgets.add": "نیا بجٹ",
  "budgets.utilization": "استعمال",

  // Goals
  "goals.title": "بچت کے اہداف",
  "goals.add": "نیا ہدف",
  "goals.completed": "مکمل",
  "goals.progress": "مکمل",
  "goals.targetDate": "ہدف کی تاریخ",

  // Assistant
  "assistant.title": "معاون",
  "assistant.placeholder": "اپنا سوال یہاں لکھیں...",

  // Settings
  "settings.title": "ترتیبات",
  "settings.language": "زبان / Language",
  "settings.currency": "کرنسی",
  "settings.account": "اکاؤنٹ",

  // Auth
  "auth.login": "لاگ ان",
  "auth.signup": "سائن اپ",
  "auth.email": "ای میل",
  "auth.password": "پاس ورڈ",
  "auth.name": "نام",
  "auth.noAccount": "اکاؤنٹ نہیں ہے؟",
  "auth.hasAccount": "پہلے سے اکاؤنٹ ہے؟",
  "auth.signupHere": "سائن اپ کریں",
  "auth.loginHere": "لاگ ان کریں",
  "auth.tagline": "اپنی مالیاتی زندگی کو بہتر بنائیں",
  "auth.createAccount": "اپنا اکاؤنٹ بنائیں",

  // Common
  "common.save": "محفوظ کریں",
  "common.cancel": "منسوخ",
  "common.delete": "حذف",
  "common.edit": "ترمیم",
  "common.confirm": "تصدیق",
  "common.loading": "لوڈ ہو رہا ہے...",
  "common.error": "کچھ masla aa gaya، please dobara koshish karein.",
  "common.empty": "کوئی ڈیٹا نہیں",

  // AI responses
  "ai.insufficientData":
    "Aap ka data abhi is analysis ke liye kaafi nahin hai.",
  "ai.error": "Kuch masla aa gaya, please dobara koshish karein.",
  "ai.dataReference": "Aap ke transactions ke mutabiq...",
} as const;
