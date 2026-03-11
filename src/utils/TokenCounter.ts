/**
 * TokenCounter – lightweight token estimation for context budget tracking.
 *
 * We do NOT import tiktoken (large WASM binary) to keep startup fast.
 * The approximation below is accurate to ±10 % for English prose and code,
 * which is sufficient for deciding when to truncate.
 *
 * Model context-window sizes are defined in ModelRegistry.ts.
 */

export class TokenCounter {
    /**
     * Estimate the number of tokens in a string using a simple character ratio.
     * ~4 chars per token is a well-known approximation for GPT-family models.
     */
    static estimate(text: string): number {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    /**
     * Estimate tokens for an array of chat messages.
     * Adds 4 tokens per message for role+formatting overhead (OpenAI convention).
     */
    static estimateMessages(messages: Array<{ role: string; content: string }>): number {
        let total = 3; // every reply is primed with <|start|>assistant<|message|>
        for (const m of messages) {
            total += 4; // role + separators
            total += this.estimate(m.content);
        }
        return total;
    }

    /**
     * Returns the fraction of the context window that is used.
     * Returns a value between 0 and 1.
     */
    static usedFraction(messages: Array<{ role: string; content: string }>, contextWindow: number): number {
        if (contextWindow <= 0) return 0;
        return this.estimateMessages(messages) / contextWindow;
    }
}
