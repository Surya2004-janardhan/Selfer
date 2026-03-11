import axios from 'axios';
import { withRetry } from '../utils/RetryHandler';
import { Logger } from '../utils/Logger';

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/** Default request timeout in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

export abstract class LLMProvider {
    abstract generateResponse(messages: LLMMessage[]): Promise<LLMResponse>;
}

export class OllamaProvider extends LLMProvider {
    constructor(private config: { model: string; baseUrl: string; timeoutMs?: number }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        return withRetry(async () => {
            const response = await axios.post(
                `${this.config.baseUrl}/api/chat`,
                { model: this.config.model, messages, stream: false },
                { timeout: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS }
            );

            if (!response.data || !response.data.message) {
                throw new Error(`Invalid response from Ollama: ${JSON.stringify(response.data)}`);
            }

            return {
                content: response.data.message.content,
                usage: {
                    promptTokens: response.data.prompt_eval_count || 0,
                    completionTokens: response.data.eval_count || 0,
                    totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
                }
            };
        }, {
            onRetry: (err, attempt) =>
                Logger.warn(`Ollama retry ${attempt}: ${err.message}`, { provider: 'ollama', model: this.config.model })
        });
    }
}

export class OpenAIProvider extends LLMProvider {
    constructor(private config: { apiKey: string; model: string; timeoutMs?: number }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        return withRetry(async () => {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                { model: this.config.model, messages },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS
                }
            );

            return {
                content: response.data.choices[0].message.content,
                usage: {
                    promptTokens: response.data.usage.prompt_tokens,
                    completionTokens: response.data.usage.completion_tokens,
                    totalTokens: response.data.usage.total_tokens
                }
            };
        }, {
            onRetry: (err, attempt) =>
                Logger.warn(`OpenAI retry ${attempt}: ${err.message}`, { provider: 'openai', model: this.config.model })
        });
    }
}

export class GeminiProvider extends LLMProvider {
    constructor(private config: { apiKey: string; model: string; timeoutMs?: number }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        return withRetry(async () => {
            // Gemini separates the system instruction from the conversation turns.
            const systemMsg = messages.find(m => m.role === 'system');
            const conversationMsgs = messages.filter(m => m.role !== 'system');

            const body: any = {
                contents: conversationMsgs.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }))
            };

            if (systemMsg) {
                body.systemInstruction = { parts: [{ text: systemMsg.content }] };
            }

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
                body,
                { timeout: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS }
            );

            const candidate = response.data.candidates?.[0];
            if (!candidate?.content?.parts?.[0]?.text) {
                throw new Error(`Invalid response from Gemini: ${JSON.stringify(response.data)}`);
            }

            return {
                content: candidate.content.parts[0].text,
                usage: response.data.usageMetadata
                    ? {
                        promptTokens: response.data.usageMetadata.promptTokenCount || 0,
                        completionTokens: response.data.usageMetadata.candidatesTokenCount || 0,
                        totalTokens: response.data.usageMetadata.totalTokenCount || 0
                    }
                    : undefined
            };
        }, {
            onRetry: (err, attempt) =>
                Logger.warn(`Gemini retry ${attempt}: ${err.message}`, { provider: 'gemini', model: this.config.model })
        });
    }
}

export class ClaudeProvider extends LLMProvider {
    constructor(private config: { apiKey: string; model: string; timeoutMs?: number }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        return withRetry(async () => {
            const systemMessage = messages.find(m => m.role === 'system')?.content;
            const filteredMessages = messages.filter(m => m.role !== 'system');

            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: this.config.model,
                    system: systemMessage,
                    messages: filteredMessages.map(m => ({
                        role: m.role === 'assistant' ? 'assistant' : 'user',
                        content: m.content
                    })),
                    max_tokens: 8192
                },
                {
                    headers: {
                        'x-api-key': this.config.apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    },
                    timeout: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS
                }
            );

            return {
                content: response.data.content[0].text,
                usage: {
                    promptTokens: response.data.usage.input_tokens,
                    completionTokens: response.data.usage.output_tokens,
                    totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
                }
            };
        }, {
            onRetry: (err, attempt) =>
                Logger.warn(`Claude retry ${attempt}: ${err.message}`, { provider: 'claude', model: this.config.model })
        });
    }
}

export class FallbackLLMProvider extends LLMProvider {
    constructor(private providers: { name: string; provider: LLMProvider }[]) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        let lastError: Error | null = null;

        for (const { name, provider } of this.providers) {
            try {
                Logger.debug(`Trying provider: ${name}`);
                const response = await provider.generateResponse(messages);
                Logger.debug(`Provider succeeded: ${name}`);
                return response;
            } catch (error: any) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.warn(`Provider ${name} failed: ${lastError.message}`);
            }
        }

        throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
    }
}
