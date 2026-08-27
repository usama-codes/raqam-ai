// lib/i18n/en.ts — English fallback string map

export const en = {
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.transactions": "Transactions",
  "nav.budgets": "Budgets",
  "nav.goals": "Goals",
  "nav.assistant": "Assistant",
  "nav.settings": "Settings",

  // Dashboard
  "dashboard.balance.label": "Total Balance",
  "dashboard.income.label": "Monthly Income",
  "dashboard.expenses.label": "Monthly Expenses",
  "dashboard.savingsRate.label": "Savings Rate",
  "dashboard.recentTransactions": "Recent Transactions",

  // Transactions
  "transactions.title": "Transactions",
  "transactions.add": "New Transaction",
  "transactions.allTypes": "All Types",
  "transactions.income": "Income",
  "transactions.expense": "Expense",
  "transactions.allCategories": "All Categories",

  // Budgets
  "budgets.title": "Budgets",
  "budgets.add": "New Budget",
  "budgets.utilization": "utilized",

  // Goals
  "goals.title": "Savings Goals",
  "goals.add": "New Goal",
  "goals.completed": "Completed",
  "goals.progress": "complete",
  "goals.targetDate": "Target Date",

  // Assistant
  "assistant.title": "Assistant",
  "assistant.placeholder": "Type your question here...",

  // Settings
  "settings.title": "Settings",
  "settings.language": "Language / زبان",
  "settings.currency": "Currency",
  "settings.account": "Account",

  // Auth
  "auth.login": "Log In",
  "auth.signup": "Sign Up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.name": "Name",
  "auth.noAccount": "Don't have an account?",
  "auth.hasAccount": "Already have an account?",
  "auth.signupHere": "Sign up",
  "auth.loginHere": "Log in",
  "auth.tagline": "Improve your financial life",
  "auth.createAccount": "Create your account",

  // Common
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.confirm": "Confirm",
  "common.loading": "Loading...",
  "common.error": "Something went wrong, please try again.",
  "common.empty": "No data available",

  // AI responses
  "ai.insufficientData": "Your data is not sufficient for this analysis yet.",
  "ai.error": "Something went wrong, please try again.",
  "ai.dataReference": "According to your transactions...",
} as const;
