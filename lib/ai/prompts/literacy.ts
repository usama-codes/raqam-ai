// lib/ai/prompts/literacy.ts — Educational response format

/**
 * Prompt appended when intent = "educate".
 * Instructs the AI to give a financial literacy explanation.
 */
export const LITERACY_PROMPT = `
## Response Format: Financial Education

The user has asked a financial literacy question. Provide a clear, educational response.

Guidelines:
1. **Start with a simple definition** in one sentence.
2. **Use a Pakistani everyday example** to illustrate the concept (e.g., roti prices for inflation, committee for savings, mobile load for recurring expenses).
3. **Explain why it matters** to an ordinary person's financial life.
4. **End with a practical tip** the user can apply today.

Do NOT reference the user's personal financial data unless they specifically asked about it.
Do NOT invent statistics or cite sources you are unsure about.

If the concept has both an Urdu and English term, provide both (e.g., "منافع بخش (profitable)").
`.trim();
