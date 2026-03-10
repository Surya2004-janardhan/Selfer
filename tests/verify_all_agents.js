const { Router } = require('../dist/core/Router');
const { LLMProvider, GeminiProvider, OllamaProvider, FallbackLLMProvider } = require('../dist/core/LLMProvider');
const { GitAgent } = require('../dist/agents/GitAgent');
const { PlanAgent } = require('../dist/agents/PlanAgent');
const { FileAgent } = require('../dist/agents/FileAgent');
const { EditsAgent } = require('../dist/agents/EditsAgent');
const { ContextAgent } = require('../dist/agents/ContextAgent');
require('dotenv').config();

async function verifyQuery(query, name) {
    console.log(`\n\n=== [${name}] TESTING QUERY: "${query}" ===`);
    
    const config = require('../.selfer/config.json');
    const providers = [];
    if (config.gemini?.apiKey) providers.push({ name: 'Gemini', provider: new GeminiProvider(config.gemini) });
    if (config.ollama?.model) providers.push({ name: 'Ollama', provider: new OllamaProvider(config.ollama) });
    
    const provider = new FallbackLLMProvider(providers);
    const router = new Router(provider);
    
    router.registerAgent(new PlanAgent(provider));
    router.registerAgent(new GitAgent(provider));
    router.registerAgent(new FileAgent(provider));
    router.registerAgent(new EditsAgent(provider));
    router.registerAgent(new ContextAgent(provider));

    const context = { directory: process.cwd(), sessionMemory: {}, config };
    const result = await router.routeTask(query, context);
    console.log(`\n--- [${name}] FINAL SUMMARY ---\n`, result);
}

async function runTests() {
    try {
        // Test 1: FileAgent - Direct creation
        await verifyQuery("Create a file called 'autonomy_test.txt' with the content 'Autonomy is working' in the root folder.", "FILE_CREATION");

        // Test 2: EditsAgent - Modification
        await verifyQuery("Append a line ' - Verified.' to the end of 'autonomy_test.txt'.", "FILE_EDIT");

        // Test 3: GitAgent - Commit
        await verifyQuery("Commit the file 'autonomy_test.txt' with a message 'test: verify autonomy hardening'", "GIT_COMMIT");

        // Test 4: ContextAgent - Directory deep dive
        await verifyQuery("What are the files in src/core and what does Router.ts do?", "CONTEXT_EXPLORATION");

    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTests();
