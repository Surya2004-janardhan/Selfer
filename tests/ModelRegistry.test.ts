import { describe, it, expect } from 'vitest';
import { ModelRegistry } from '../src/core/ModelRegistry';

describe('ModelRegistry', () => {
    it('returns known model info for gpt-4o', () => {
        const info = ModelRegistry.get('gpt-4o');
        expect(info.contextWindow).toBe(128_000);
        expect(info.provider).toBe('openai');
    });

    it('returns default info for unknown model', () => {
        const info = ModelRegistry.get('unknown-model-xyz');
        expect(info.contextWindow).toBeGreaterThan(0);
    });

    it('getContextWindow returns correct window for gemini-1.5-pro', () => {
        expect(ModelRegistry.getContextWindow('gemini-1.5-pro')).toBe(2_000_000);
    });

    it('getSafeBudget returns 80% of context window', () => {
        const window = ModelRegistry.getContextWindow('gpt-4o');
        expect(ModelRegistry.getSafeBudget('gpt-4o')).toBe(Math.floor(window * 0.80));
    });

    it('isKnown returns true for known models', () => {
        expect(ModelRegistry.isKnown('gpt-4o')).toBe(true);
        expect(ModelRegistry.isKnown('claude-3-5-sonnet-20241022')).toBe(true);
    });

    it('isKnown returns false for unknown models', () => {
        expect(ModelRegistry.isKnown('totally-fake-model')).toBe(false);
    });

    it('list returns all known model names', () => {
        const models = ModelRegistry.list();
        expect(models.length).toBeGreaterThan(10);
        expect(models).toContain('gpt-4o');
        expect(models).toContain('gemini-1.5-pro');
    });
});
