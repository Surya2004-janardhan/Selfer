const { Router } = require('../dist/core/Router');
const { LLMProvider } = require('../dist/core/LLMProvider');
const { GitAgent } = require('../dist/agents/GitAgent');
    const { PlanAgent } = require('../dist/agents/PlanAgent');
    const { FileAgent } = require('../dist/agents/FileAgent');
    const { EditsAgent } = require('../dist/agents/EditsAgent');
    require('dotenv').config();
    
    // We use the real provider here to see how it behaves with the user's setup (Gemini/Ollama)
    // But for a safe "self-test", we'll use a harness that logs the flow.
    async function verifyQuery(query) {
        console.log(`\n\n=== TESTING QUERY: "${query}" ===`);
        
        // Using the real provider from config if possible, else mock for logic check
        const config = require('../.selfer/config.json');
        const { GeminiProvider, OllamaProvider, FallbackLLMProvider } = require('../dist/core/LLMProvider');
        
        const providers = [];
        if (config.gemini?.apiKey) providers.push({ name: 'Gemini', provider: new GeminiProvider(config.gemini) });
        if (config.ollama?.model) providers.push({ name: 'Ollama', provider: new OllamaProvider(config.ollama) });
        
        const provider = new FallbackLLMProvider(providers);
        const router = new Router(provider);
        
        router.registerAgent(new PlanAgent(provider));
        router.registerAgent(new GitAgent(provider));
        router.registerAgent(new FileAgent(provider));
        router.registerAgent(new EditsAgent(provider));

    const result = await router.routeTask(query, { directory: process.cwd(), sessionMemory: {}, config });
    console.log("\n--- FINAL SUMMARY ---\n", result);
}

async function runTests() {
    try {
        // Test 1: Content Modification + Git (The "Aider" Flow)
        await verifyQuery("Add a line 'Verified by Antigravity' to the bottom of README.md, then commit it.");
        
    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTests();
