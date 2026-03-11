/**
 * RetryHandler – wraps an async operation with exponential backoff.
 *
 * Retries on transient failures (rate limits, network errors, 5xx).
 * Does NOT retry on 4xx client errors (auth failures, bad requests).
 */

export interface RetryOptions {
    /** Maximum number of attempts (including the first). Default: 3 */
    maxAttempts?: number;
    /** Initial delay in milliseconds before the first retry. Default: 1000 */
    initialDelayMs?: number;
    /** Multiplier applied to the delay on each retry. Default: 2 */
    backoffFactor?: number;
    /** Maximum delay cap in milliseconds. Default: 30000 */
    maxDelayMs?: number;
    /** Optional callback called on each failure with (error, attempt). */
    onRetry?: (error: Error, attempt: number) => void;
}

/** HTTP status codes that should NOT be retried. */
const FATAL_STATUS_CODES = new Set([400, 401, 403, 404, 422]);

function isRetryable(error: any): boolean {
    // Axios-style error
    const status: number | undefined = error?.response?.status ?? error?.status;
    if (status !== undefined) {
        return !FATAL_STATUS_CODES.has(status);
    }
    // Network errors (ECONNRESET, ETIMEDOUT, etc.) are always retryable
    return true;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3;
    const initialDelayMs = options.initialDelayMs ?? 1000;
    const backoffFactor = options.backoffFactor ?? 2;
    const maxDelayMs = options.maxDelayMs ?? 30_000;

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err instanceof Error ? err : new Error(String(err));

            if (!isRetryable(err) || attempt === maxAttempts) {
                throw lastError;
            }

            const waitMs = Math.min(initialDelayMs * Math.pow(backoffFactor, attempt - 1), maxDelayMs);

            if (options.onRetry) {
                options.onRetry(lastError, attempt);
            }

            await delay(waitMs);
        }
    }

    throw lastError;
}
