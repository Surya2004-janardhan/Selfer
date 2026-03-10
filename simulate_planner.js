const { FallbackLLMProvider, GeminiProvider, OllamaProvider } = require('./dist/core/LLMProvider');
const { PlanAgent } = require('./dist/agents/PlanAgent');
require('dotenv').config();

async function testPlan() {
    const config = require('./.selfer/config.json');
    const providers = [];
    if (config.gemini?.apiKey) providers.push({ name: 'Gemini', provider: new GeminiProvider(config.gemini) });
    if (config.ollama?.model) providers.push({ name: 'Ollama', provider: new OllamaProvider(config.ollama) });
    const provider = new FallbackLLMProvider(providers);

    const planner = new PlanAgent(provider);
    const messages = [{ role: 'user', content: "Rewrite the readme.md file with meaningful content describing Selfer as a multi-agent framework. Then, git commit the changes with an appropriate message and try to git push them." }];
    const res = await planner.run(messages, { directory: process.cwd(), sessionMemory: {}, config });
    require('fs').writeFileSync('planner_output.json', JSON.stringify(res, null, 2), 'utf-8');
    console.log("Wrote to planner_output.json");
}

testPlan();
