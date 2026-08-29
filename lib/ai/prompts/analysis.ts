// lib/ai/prompts/analysis.ts — Analysis response format with financial context

/**
 * Prompt appended when intent = "analyze" or "recommend".
 * Includes the user's financial context and instructs data-grounded responses.
 */
export function buildAnalysisPrompt(contextBlock: string): string {
  return `
## Response Format: Financial Analysis

The user is asking about their own finances. You MUST ground your response in the financial data provided below.

### User's Financial Data

\`\`\`
${contextBlock}
\`\`\`

Guidelines:
1. **Always cite specific numbers** from the data (e.g., "آپ نے اس مہینے کھانے پر Rs. 12,500 خرچ کیے").
2. **Compare** where relevant — savings rate vs recommended 20%, category spending vs budget limits.
3. **Highlight anomalies** — unusually high spending, missing categories, zero savings.
4. **For recommendations**: explain the reasoning step-by-step before suggesting action.
5. If the data is insufficient to answer the question, say so clearly and suggest what data would help.

Do NOT invent transactions or amounts that are not in the data block above.
If a category has zero spending, mention it only if relevant.
`.trim();
}
