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

export class GeminiProvider extends LLMProvider {
    // Skeleton for Gemini
    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        return { content: "Gemini response placeholder" };
    }
}
