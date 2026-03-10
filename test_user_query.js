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
    const fs = require('fs');
    fs.writeFileSync('clean_output.txt', result, 'utf-8');
    console.log("Output saved to clean_output.txt");
}

runScenario("Rewrite the readme.md file with meaningful content describing Selfer as a multi-agent framework. Then, git commit the changes with an appropriate message and try to git push them.");
