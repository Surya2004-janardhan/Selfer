import axios from 'axios';

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

export abstract class LLMProvider {
    abstract generateResponse(messages: LLMMessage[]): Promise<LLMResponse>;
}

export class OllamaProvider extends LLMProvider {
    constructor(private config: { model: string; baseUrl: string }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        try {
            const response = await axios.post(`${this.config.baseUrl}/api/chat`, {
                model: this.config.model,
                messages: messages,
                stream: false
            });

            return {
                content: response.data.message.content,
                usage: {
                    promptTokens: response.data.prompt_eval_count || 0,
                    completionTokens: response.data.eval_count || 0,
                    totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
                }
            };
        } catch (error: any) {
            throw new Error(`Ollama generation failed: ${error.message}`);
        }
    }
}

export class OpenAIProvider extends LLMProvider {
    constructor(private config: { apiKey: string; model: string }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: this.config.model,
                messages: messages
            }, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                content: response.data.choices[0].message.content,
                usage: {
                    promptTokens: response.data.usage.prompt_tokens,
                    completionTokens: response.data.usage.completion_tokens,
                    totalTokens: response.data.usage.total_tokens
                }
            };
        } catch (error: any) {
            throw new Error(`OpenAI generation failed: ${error.message}`);
        }
    }
}

export class GeminiProvider extends LLMProvider {
    constructor(private config: { apiKey: string; model: string }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        try {
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
                contents: messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }))
            });

            return {
                content: response.data.candidates[0].content.parts[0].text
            };
        } catch (error: any) {
            throw new Error(`Gemini generation failed: ${error.message}`);
        }
    }
}

export class ClaudeProvider extends LLMProvider {
    constructor(private config: { apiKey: string; model: string }) {
        super();
    }

    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        try {
            // Extract system message if present
            const systemMessage = messages.find(m => m.role === 'system')?.content;
            const filteredMessages = messages.filter(m => m.role !== 'system');

            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: this.config.model,
                system: systemMessage,
                messages: filteredMessages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                max_tokens: 4096
            }, {
                headers: {
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                }
            });

            return {
                content: response.data.content[0].text,
                usage: {
                    promptTokens: response.data.usage.input_tokens,
                    completionTokens: response.data.usage.output_tokens,
                    totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
                }
            };
        } catch (error: any) {
            throw new Error(`Claude generation failed: ${error.message}`);
        }
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
                const response = await provider.generateResponse(messages);
                return response;
            } catch (error: any) {
                lastError = error;
                // Log the failure silently or to a debug log
            }
        }

        throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
    }
}
