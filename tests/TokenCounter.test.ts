import { describe, it, expect } from 'vitest';
import { TokenCounter } from '../src/utils/TokenCounter';

describe('TokenCounter', () => {
    it('returns 0 for empty string', () => {
        expect(TokenCounter.estimate('')).toBe(0);
    });

    it('estimates tokens proportionally to string length', () => {
        const text = 'a'.repeat(400);
        expect(TokenCounter.estimate(text)).toBe(100);
    });

    it('rounds up partial tokens', () => {
        expect(TokenCounter.estimate('abc')).toBe(1); // 3/4 = 0.75 → ceil → 1
    });

    it('estimateMessages adds per-message overhead', () => {
        const messages = [
            { role: 'user', content: 'hello' },
            { role: 'assistant', content: 'world' }
        ];
        const total = TokenCounter.estimateMessages(messages);
        // 3 (primer) + 4+2 (user msg) + 4+2 (assistant msg) = 15
        expect(total).toBeGreaterThan(10);
        expect(total).toBeLessThan(50);
    });

    it('usedFraction returns 0 when contextWindow is 0', () => {
        expect(TokenCounter.usedFraction([], 0)).toBe(0);
    });

    it('usedFraction returns fraction between 0 and 1 for reasonable input', () => {
        const messages = [{ role: 'user', content: 'x'.repeat(400) }];
        const fraction = TokenCounter.usedFraction(messages, 10_000);
        expect(fraction).toBeGreaterThan(0);
        expect(fraction).toBeLessThanOrEqual(1);
    });
});
