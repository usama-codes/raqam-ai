// lib/ai/prompts/action.ts — Action intent handling with confirmation gate (Phase 9)

/**
 * Prompt appended when intent = "act".
 * Instructs the AI to propose an action as a JSON block that will be shown
 * to the user for confirmation before execution.
 */
export const ACTION_PROMPT = `
## Response Format: Action Proposal

The user wants to create, edit, or delete a financial record.

You can propose the following actions:
- \`createTransaction\` — add a new income or expense
- \`deleteTransaction\` — remove an existing transaction (by matching description)
- \`createSavingsGoal\` — create a new savings goal

### Available categories

Use one of these English category names for \`categoryName\`:
salary, freelance, food, transportation, utilities, rent, health, education, shopping, entertainment, savings, gifts, phone, other

### Response format

ALWAYS include a fenced JSON block in your response. The JSON block contains the action details and a user-facing message in the user's language. After the JSON block, you may add a brief conversational note.

Example (Urdu):

\`\`\`json
{
  "action": "createTransaction",
  "params": {
    "type": "expense",
    "amount": 500,
    "description": "Petrol",
    "categoryName": "transportation",
    "date": "2026-08-30"
  },
  "userFacingMessage": "میں نے سمجھا ہے کہ آپ Rs. 500 کا petrol خرچ شامل کرنا چاہتے ہیں۔ براہ کرم تصدیق کریں۔"
}
\`\`\`

Example (Roman Urdu — user typed in English letters, respond in Urdu script):

\`\`\`json
{
  "action": "createTransaction",
  "params": {
    "type": "expense",
    "amount": 500,
    "description": "Petrol",
    "categoryName": "transportation",
    "date": "2026-08-30"
  },
  "userFacingMessage": "میں نے سمجھا ہے کہ آپ Rs. 500 کا petrol خرچ شامل کرنا چاہتے ہیں۔ براہ کرم تصدیق کریں۔"
}
\`\`\`

Example (English):

\`\`\`json
{
  "action": "createSavingsGoal",
  "params": {
    "name": "Emergency Fund",
    "targetAmount": 100000
  },
  "userFacingMessage": "I understand you want to create a savings goal of Rs. 100,000 for an Emergency Fund. Please confirm."
}
\`\`\`

### Rules

1. **Always include the JSON block** — the confirmation card is generated from it.
2. **Use today's date** if the user does not specify one (today is {{CURRENT_DATE}}).
3. **Map categories carefully** — "petrol" → transportation, "biryani" / "khana" → food, "bijli" → utilities, "kiraya" → rent, etc.
4. **If the request is ambiguous** (missing amount, unclear category, etc.), do NOT include a JSON block. Instead, ask a clarifying question in the user's language.
5. **userFacingMessage** must be in the same language as the user's message.
6. **amount** must be a positive number (no commas, no currency symbols).
7. For \`deleteTransaction\`, include a \`description\` to match the transaction. Optionally include \`amount\` to narrow the match.
`.trim();
