const { Router } = require('./dist/core/Router');
const { FallbackLLMProvider, GeminiProvider, OllamaProvider } = require('./dist/core/LLMProvider');
const { PlanAgent } = require('./dist/agents/PlanAgent');
const { FileAgent } = require('./dist/agents/FileAgent');
const { EditsAgent } = require('./dist/agents/EditsAgent');
const { CodeAgent } = require('./dist/agents/CodeAgent');
const { GitAgent } = require('./dist/agents/GitAgent');
const { ErrorRecoveryAgent } = require('./dist/agents/ErrorRecoveryAgent');
require('dotenv').config();

async function runScenario(query) {
    console.log(`\n\n======================================================`);
    console.log(`=== SCENARIO: "${query}" ===`);
    console.log(`======================================================\n`);
    
    const config = require('./.selfer/config.json');
    const providers = [];
    if (config.gemini?.apiKey) providers.push({ name: 'Gemini', provider: new GeminiProvider(config.gemini) });
    if (config.ollama?.model) providers.push({ name: 'Ollama', provider: new OllamaProvider(config.ollama) });
    
    const provider = new FallbackLLMProvider(providers);
    const router = new Router(provider);
    
    router.registerAgent(new PlanAgent(provider));
    router.registerAgent(new FileAgent(provider));
    router.registerAgent(new EditsAgent(provider));
    router.registerAgent(new CodeAgent(provider));
    router.registerAgent(new GitAgent(provider));
    router.registerAgent(new ErrorRecoveryAgent(provider));

    const result = await router.routeTask(query, { directory: process.cwd(), sessionMemory: {}, config });
    console.log("\n--- SCENARIO RESULT ---\n", result);
}

async function runAll() {
    try {
        // Scenario 1: CodeAgent capability
        await runScenario("What are the exact method signatures inside src/agents/CodeAgent.ts?");
        
        // Scenario 2: EditsAgent capability (fuzzy match + formatting)
        // We first need a dummy file
        const fs = require('fs');
        fs.writeFileSync('dummy_edit_test.ts', `function hello() {\n  console.log("hello world");\n  // some comment\n}\n`);
        
        await runScenario("In dummy_edit_test.ts, change 'hello world' to 'hello robust selfer' using the EditsAgent.");
        
        // Cleanup
        if (fs.existsSync('dummy_edit_test.ts')) {
             fs.unlinkSync('dummy_edit_test.ts');
        }

    } catch (e) {
        console.error("Test blocked by error:", e);
    }
}

runAll();
