import { describe, it, expect } from 'vitest';
import { withRetry } from '../src/utils/RetryHandler';

describe('RetryHandler', () => {
    it('returns the result immediately on success', async () => {
        let calls = 0;
        const result = await withRetry(async () => {
            calls++;
            return 42;
        });
        expect(result).toBe(42);
        expect(calls).toBe(1);
    });

    it('retries on failure and succeeds on second attempt', async () => {
        let calls = 0;
        const result = await withRetry(async () => {
            calls++;
            if (calls < 2) throw new Error('transient error');
            return 'ok';
        }, { maxAttempts: 3, initialDelayMs: 1 });
        expect(result).toBe('ok');
        expect(calls).toBe(2);
    });

    it('throws after maxAttempts exhausted', async () => {
        let calls = 0;
        await expect(
            withRetry(async () => {
                calls++;
                throw new Error('always fails');
            }, { maxAttempts: 3, initialDelayMs: 1 })
        ).rejects.toThrow('always fails');
        expect(calls).toBe(3);
    });

    it('does not retry on 401 Unauthorized', async () => {
        let calls = 0;
        const authError: any = new Error('Unauthorized');
        authError.response = { status: 401 };

        await expect(
            withRetry(async () => {
                calls++;
                throw authError;
            }, { maxAttempts: 3, initialDelayMs: 1 })
        ).rejects.toThrow('Unauthorized');
        expect(calls).toBe(1);
    });

    it('does not retry on 400 Bad Request', async () => {
        let calls = 0;
        const badReqError: any = new Error('Bad Request');
        badReqError.response = { status: 400 };

        await expect(
            withRetry(async () => {
                calls++;
                throw badReqError;
            }, { maxAttempts: 3, initialDelayMs: 1 })
        ).rejects.toThrow('Bad Request');
        expect(calls).toBe(1);
    });

    it('calls onRetry callback on each retry', async () => {
        const retryCalls: number[] = [];
        await expect(
            withRetry(
                async () => { throw new Error('fail'); },
                {
                    maxAttempts: 3,
                    initialDelayMs: 1,
                    onRetry: (_, attempt) => retryCalls.push(attempt)
                }
            )
        ).rejects.toThrow();
        expect(retryCalls).toEqual([1, 2]);
    });
});
