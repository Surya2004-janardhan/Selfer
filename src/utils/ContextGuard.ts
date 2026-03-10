export class ContextGuard {
    private static readonly DEFAULT_MAX_LENGTH = 15_000;

    /**
     * Truncates a string if it exceeds the specified maximum length.
     * Keeps the first 60 % and last 20 % of the allowed characters so that
     * both the beginning (file header, imports) and the end (recent changes)
     * are visible to the LLM.
     */
    static truncate(text: string, maxLength: number = this.DEFAULT_MAX_LENGTH): string {
        if (!text || text.length <= maxLength) {
            return text;
        }

        const truncatedChars = text.length - maxLength;
        const keepHead = Math.floor(maxLength * 0.6);
        const keepTail = maxLength - keepHead;

        const head = text.substring(0, keepHead);
        const tail = text.substring(text.length - keepTail);

        return `${head}\n\n[... TRUNCATED ${truncatedChars} characters — showing first ${keepHead} and last ${keepTail} characters ...]\n\n${tail}`;
    }

    /**
     * Wraps a tool output with truncation logic.
     */
    static wrapOutput(output: string, maxLength: number = this.DEFAULT_MAX_LENGTH): string {
        return this.truncate(output, maxLength);
    }
}
