export class ContextGuard {
    private static readonly DEFAULT_MAX_LENGTH = 5000;

    /**
     * Truncates a string if it exceeds the specified maximum length.
     * Provides a summary of the truncation.
     */
    static truncate(text: string, maxLength: number = this.DEFAULT_MAX_LENGTH): string {
        if (!text || text.length <= maxLength) {
            return text;
        }

        const truncatedPart = text.length - maxLength;
        const result = text.substring(0, maxLength);

        return `${result}\n\n[... TRUNCATED ${truncatedPart} characters for context efficiency ...]`;
    }

    /**
     * Wraps a tool output with truncation logic.
     */
    static wrapOutput(output: string, maxLength: number = this.DEFAULT_MAX_LENGTH): string {
        return this.truncate(output, maxLength);
    }
}
