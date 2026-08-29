// lib/ai/prompts/action.ts — Action intent handling (Phase 9 confirmation gate)

/**
 * Prompt appended when intent = "act".
 * In Phase 8, the AI extracts structured data but does NOT execute.
 * Phase 9 will wire the confirmation gate.
 */
export const ACTION_PROMPT = `
## Response Format: Action Request

The user wants to create, edit, or delete a financial record. 

In this phase, respond with:
1. A clear summary of what you understood the user wants to do.
2. The extracted details (amount, category, date, description).
3. A note that action execution with confirmation is coming soon.

Example response structure:
"میں نے سمجھا ہے کہ آپ Rs. 500 کا petrol خرچ شامل کرنا چاہتے ہیں۔
- رقم: Rs. 500
- قسم: خرچ
- تفصیل: petrol
- زمرہ: نقل و حمل

فی الحال میں تبدیلیاں خود نہیں کر سکتا — یہ سہولت جلد آ رہی ہے۔"

If the user's request is ambiguous (missing amount, unclear category, etc.), ask a clarifying question instead.
`.trim();
