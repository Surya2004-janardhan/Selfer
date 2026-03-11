#!/usr/bin/env ts-node
/**
 * Quick test script to verify Ollama integration with streaming
 */
import { OllamaProvider } from './src/core/LLMProvider';

async function main() {
    console.log('Testing Ollama integration with streaming...\n');

    const provider = new OllamaProvider({
        model: 'llama3:8b',
        baseUrl: 'http://localhost:11434'
    });

    console.log('Testing streaming...');
    console.log('---');
    
    try {
        const response = await provider.generateResponseStream(
            [
                { role: 'system', content: 'You are a helpful assistant. Be concise.' },
                { role: 'user', content: 'What is 2+2? Answer in one word.' }
            ],
            (chunk) => {
                process.stdout.write(chunk);
            }
        );
        
        console.log('\n---');
        console.log('\nStreaming complete!');
        console.log('Full response:', response.content);
        console.log('Token usage:', response.usage);
        console.log('\n✅ Ollama streaming works!');
    } catch (err: any) {
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    }
}

main();
