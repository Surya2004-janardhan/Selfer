import { describe, it, expect } from 'vitest';
import { ContextGuard } from '../src/utils/ContextGuard';

describe('ContextGuard', () => {
    it('returns the original string when below the limit', () => {
        const text = 'hello world';
        expect(ContextGuard.truncate(text, 100)).toBe(text);
    });

    it('returns empty string unchanged', () => {
        expect(ContextGuard.truncate('')).toBe('');
    });

    it('truncates a string that exceeds maxLength', () => {
        const text = 'a'.repeat(20_000);
        const result = ContextGuard.truncate(text, 15_000);
        expect(result.length).toBeLessThan(text.length);
        expect(result).toContain('TRUNCATED');
    });

    it('keeps head and tail content when truncating', () => {
        const head = 'HEAD_CONTENT';
        const middle = 'x'.repeat(20_000);
        const tail = 'TAIL_CONTENT';
        const text = head + middle + tail;
        const result = ContextGuard.truncate(text, 200);
        expect(result).toContain(head);
        expect(result).toContain(tail);
    });

    it('wrapOutput delegates to truncate', () => {
        const text = 'a'.repeat(20_000);
        const wrapped = ContextGuard.wrapOutput(text);
        const truncated = ContextGuard.truncate(text);
        expect(wrapped).toBe(truncated);
    });

    it('truncates exactly at the boundary', () => {
        const text = 'a'.repeat(15_000);
        expect(ContextGuard.truncate(text)).toBe(text); // exactly at limit, no truncation
    });

    it('truncates one character over the boundary', () => {
        const text = 'a'.repeat(15_001);
        const result = ContextGuard.truncate(text);
        expect(result).toContain('TRUNCATED');
    });
});
