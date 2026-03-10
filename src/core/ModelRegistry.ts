/**
 * ModelRegistry – metadata about supported LLM models.
 *
 * Each entry specifies:
 *   - contextWindow:  maximum tokens the model accepts (input + output combined)
 *   - maxOutputTokens: maximum tokens for the completion
 *   - provider:      which LLM provider class to use
 */

export interface ModelInfo {
    contextWindow: number;
    maxOutputTokens: number;
    provider: 'openai' | 'claude' | 'gemini' | 'ollama';
}

const registry: Record<string, ModelInfo> = {
    // ── OpenAI ──────────────────────────────────────────────────────────────
    'gpt-4o':                  { contextWindow: 128_000, maxOutputTokens: 4_096, provider: 'openai' },
    'gpt-4o-mini':             { contextWindow: 128_000, maxOutputTokens: 16_384, provider: 'openai' },
    'gpt-4-turbo':             { contextWindow: 128_000, maxOutputTokens: 4_096, provider: 'openai' },
    'gpt-4':                   { contextWindow:  8_192,  maxOutputTokens: 8_192,  provider: 'openai' },
    'gpt-3.5-turbo':           { contextWindow: 16_385,  maxOutputTokens: 4_096, provider: 'openai' },
    'o1':                      { contextWindow: 200_000, maxOutputTokens: 100_000, provider: 'openai' },
    'o1-mini':                 { contextWindow: 128_000, maxOutputTokens:  65_536, provider: 'openai' },
    'o3-mini':                 { contextWindow: 200_000, maxOutputTokens: 100_000, provider: 'openai' },

    // ── Anthropic Claude ────────────────────────────────────────────────────
    'claude-3-5-sonnet-20241022': { contextWindow: 200_000, maxOutputTokens: 8_192, provider: 'claude' },
    'claude-3-5-sonnet-20240620': { contextWindow: 200_000, maxOutputTokens: 8_192, provider: 'claude' },
    'claude-3-5-haiku-20241022':  { contextWindow: 200_000, maxOutputTokens: 8_192, provider: 'claude' },
    'claude-3-opus-20240229':     { contextWindow: 200_000, maxOutputTokens: 4_096, provider: 'claude' },
    'claude-3-haiku-20240307':    { contextWindow: 200_000, maxOutputTokens: 4_096, provider: 'claude' },
    'claude-opus-4-5':            { contextWindow: 200_000, maxOutputTokens: 8_192, provider: 'claude' },
    'claude-sonnet-4-5':          { contextWindow: 200_000, maxOutputTokens: 8_192, provider: 'claude' },

    // ── Google Gemini ────────────────────────────────────────────────────────
    'gemini-1.5-pro':          { contextWindow: 2_000_000, maxOutputTokens:  8_192, provider: 'gemini' },
    'gemini-1.5-flash':        { contextWindow: 1_000_000, maxOutputTokens:  8_192, provider: 'gemini' },
    'gemini-2.0-flash':        { contextWindow: 1_000_000, maxOutputTokens:  8_192, provider: 'gemini' },
    'gemini-2.0-flash-exp':    { contextWindow: 1_000_000, maxOutputTokens:  8_192, provider: 'gemini' },
    'gemini-2.5-pro':          { contextWindow: 2_000_000, maxOutputTokens: 65_536, provider: 'gemini' },
    'gemini-pro':              { contextWindow:  32_768,   maxOutputTokens:  2_048, provider: 'gemini' },

    // ── Ollama (local models – conservative defaults) ────────────────────────
    'llama3:8b':               { contextWindow:  8_192, maxOutputTokens: 4_096, provider: 'ollama' },
    'llama3:70b':              { contextWindow:  8_192, maxOutputTokens: 4_096, provider: 'ollama' },
    'llama3.1:8b':             { contextWindow: 128_000, maxOutputTokens: 4_096, provider: 'ollama' },
    'llama3.2:3b':             { contextWindow: 128_000, maxOutputTokens: 4_096, provider: 'ollama' },
    'mistral:7b':              { contextWindow: 32_768, maxOutputTokens: 4_096, provider: 'ollama' },
    'codellama:7b':            { contextWindow: 16_384, maxOutputTokens: 4_096, provider: 'ollama' },
    'deepseek-coder:6.7b':     { contextWindow: 16_384, maxOutputTokens: 4_096, provider: 'ollama' },
};

/** Fallback for unknown model names. */
const DEFAULT_INFO: ModelInfo = {
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    provider: 'openai'
};

export class ModelRegistry {
    static get(modelName: string): ModelInfo {
        return registry[modelName] ?? DEFAULT_INFO;
    }

    static getContextWindow(modelName: string): number {
        return this.get(modelName).contextWindow;
    }

    static getMaxOutputTokens(modelName: string): number {
        return this.get(modelName).maxOutputTokens;
    }

    /** Returns 0.80 of the context window as a safe budget for input tokens. */
    static getSafeBudget(modelName: string): number {
        return Math.floor(this.getContextWindow(modelName) * 0.80);
    }

    static isKnown(modelName: string): boolean {
        return modelName in registry;
    }

    static list(): string[] {
        return Object.keys(registry);
    }
}
