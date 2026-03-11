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

/** Callback for streaming chunks */
export type StreamCallback = (chunk: string) => void;

/** Default request timeout in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Long timeout for streaming (3 minutes) */
const STREAMING_TIMEOUT_MS = 180_000;

export abstract class LLMProvider {
    abstract generateResponse(messages: LLMMessage[]): Promise<LLMResponse>;
    
    /** Whether this provider supports streaming */
    supportsStreaming(): boolean {
        return false;
    }
    
    /** Generate a streaming response (override in subclasses that support it) */
    async generateResponseStream(
        messages: LLMMessage[],
        onChunk: StreamCallback
    ): Promise<LLMResponse> {
        // Default: fall back to non-streaming
        const response = await this.generateResponse(messages);
        onChunk(response.content);
        return response;
    }
}

export class OllamaProvider extends LLMProvider {
    constructor(private config: { model: string; baseUrl: string; timeoutMs?: number }) {
        super();
    }

    supportsStreaming(): boolean {
        return true;
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

    async generateResponseStream(
        messages: LLMMessage[],
        onChunk: StreamCallback
    ): Promise<LLMResponse> {
        let fullContent = '';
        let promptTokens = 0;
        let completionTokens = 0;

        const response = await axios.post(
            `${this.config.baseUrl}/api/chat`,
            { model: this.config.model, messages, stream: true },
            {
                timeout: this.config.timeoutMs ?? STREAMING_TIMEOUT_MS,
                responseType: 'stream'
            }
        );

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk: Buffer) => {
                try {
                    const lines = chunk.toString().split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            fullContent += data.message.content;
                            onChunk(data.message.content);
                        }
                        if (data.done) {
                            promptTokens = data.prompt_eval_count || 0;
                            completionTokens = data.eval_count || 0;
                        }
                    }
                } catch (e) {
                    // Ignore parse errors for partial chunks
                }
            });

            response.data.on('end', () => {
                resolve({
                    content: fullContent,
                    usage: {
                        promptTokens,
                        completionTokens,
                        totalTokens: promptTokens + completionTokens
                    }
                });
            });

            response.data.on('error', (err: Error) => {
                reject(err);
            });
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

export class GroqProvider extends LLMProvider {
    constructor(private config: { apiKey: string; model: string; timeoutMs?: number }) {
        super();
    }

    supportsStreaming(): boolean {
        return true;
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        return withRetry(async () => {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                { model: this.config.model, messages, stream: false },
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
                    promptTokens: response.data.usage?.prompt_tokens || 0,
                    completionTokens: response.data.usage?.completion_tokens || 0,
                    totalTokens: response.data.usage?.total_tokens || 0
                }
            };
        }, {
            onRetry: (err, attempt) =>
                Logger.warn(`Groq retry ${attempt}: ${err.message}`, { provider: 'groq', model: this.config.model })
        });
    }

    async generateResponseStream(
        messages: LLMMessage[],
        onChunk: StreamCallback
    ): Promise<LLMResponse> {
        let fullContent = '';
        let promptTokens = 0;
        let completionTokens = 0;

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            { model: this.config.model, messages, stream: true },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.config.timeoutMs ?? STREAMING_TIMEOUT_MS,
                responseType: 'stream'
            }
        );

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk: Buffer) => {
                try {
                    const lines = chunk.toString().split('\n').filter(line => line.trim() && line.startsWith('data: '));
                    for (const line of lines) {
                        const jsonStr = line.replace('data: ', '');
                        if (jsonStr === '[DONE]') continue;
                        const data = JSON.parse(jsonStr);
                        const delta = data.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullContent += delta;
                            onChunk(delta);
                        }
                        if (data.usage) {
                            promptTokens = data.usage.prompt_tokens || 0;
                            completionTokens = data.usage.completion_tokens || 0;
                        }
                    }
                } catch (e) {
                    // Ignore parse errors for partial chunks
                }
            });

            response.data.on('end', () => {
                resolve({
                    content: fullContent,
                    usage: {
                        promptTokens,
                        completionTokens,
                        totalTokens: promptTokens + completionTokens
                    }
                });
            });

            response.data.on('error', (err: Error) => {
                reject(err);
            });
        });
    }
}

export class FallbackLLMProvider extends LLMProvider {
    private activeProvider: { name: string; provider: LLMProvider } | null = null;

    constructor(private providers: { name: string; provider: LLMProvider }[]) {
        super();
    }

    supportsStreaming(): boolean {
        // If we have an active provider that succeeded before, check if it supports streaming
        if (this.activeProvider) {
            return this.activeProvider.provider.supportsStreaming();
        }
        // Otherwise, check if any provider supports streaming
        return this.providers.some(p => p.provider.supportsStreaming());
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        let lastError: Error | null = null;

        for (const { name, provider } of this.providers) {
            try {
                Logger.debug(`Trying provider: ${name}`);
                const response = await provider.generateResponse(messages);
                Logger.debug(`Provider succeeded: ${name}`);
                this.activeProvider = { name, provider };
                return response;
            } catch (error: any) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.warn(`Provider ${name} failed: ${lastError.message}`);
            }
        }

        throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
    }

    async generateResponseStream(
        messages: LLMMessage[],
        onChunk: StreamCallback
    ): Promise<LLMResponse> {
        let lastError: Error | null = null;

        for (const { name, provider } of this.providers) {
            try {
                Logger.debug(`Trying provider (stream): ${name}`);
                if (provider.supportsStreaming()) {
                    const response = await provider.generateResponseStream(messages, onChunk);
                    Logger.debug(`Provider succeeded (stream): ${name}`);
                    this.activeProvider = { name, provider };
                    return response;
                } else {
                    const response = await provider.generateResponse(messages);
                    onChunk(response.content);
                    Logger.debug(`Provider succeeded (non-stream fallback): ${name}`);
                    this.activeProvider = { name, provider };
                    return response;
                }
            } catch (error: any) {
                lastError = error instanceof Error ? error : new Error(String(error));
                Logger.warn(`Provider ${name} failed: ${lastError.message}`);
            }
        }

        throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
    }

    /** Get the name of the currently active provider */
    getActiveProviderName(): string | null {
        return this.activeProvider?.name || null;
    }
}
