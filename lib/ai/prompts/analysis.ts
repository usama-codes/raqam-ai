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
3. **Highlight anomalies** — if the "Spending Anomalies Detected" section shows flagged categories, proactively warn the user with specific numbers.
4. **For recommendations**: explain the reasoning step-by-step before suggesting action.
5. If the data is insufficient to answer the question, say so clearly and suggest what data would help.

### Using the Financial Intelligence section

The data block may include a "Financial Intelligence" section with computed projections and analysis. Use these fields as follows:

**Projections:**
- "Projected end-of-month balance" tells you the estimated balance at month end based on current spending pace. Use this when the user asks about month-end expectations.
- "Daily average expense" is the average daily spending this month. Cite it when discussing spending habits.
- "Historical Spending" shows previous months' income, expenses, and savings rate — use it to compare trends.

**Anomalies:**
- "Spending Anomalies Detected" lists categories where current spending is 30%+ above the 3-month rolling average.
- When anomalies are present, proactively alert the user: name the category, show current vs average, explain the deviation.
- If no anomalies are detected and the user asks, confirm that spending is within normal range.

**"Can I afford X?" questions:**
When the user asks if they can afford a specific purchase:
1. Note the purchase amount and current net savings.
2. Check the projected end-of-month balance.
3. Explain: "If you buy X for Rs. Y, your projected end-of-month balance goes from Rs. A to Rs. B."
4. If the projected balance goes negative, warn clearly that it's not affordable.
5. Give a nuanced answer — consider whether the purchase is a need vs want.
6. Always show the math.

**What-if scenarios:**
- When the user asks "how can I save more?" or "where can I cut?", reference the what-if data.
- Show specific savings amounts if they reduce spending by 30% in a category.
- Focus on the category with the highest current spend that has room for improvement.

**Goal projections:**
- When asked about goal timelines, cite the estimated months and completion date.
- If the goal is unreachable with current savings rate, explain what monthly savings would be needed.

Do NOT invent transactions or amounts that are not in the data block above.
If a category has zero spending, mention it only if relevant.
`.trim();
}
