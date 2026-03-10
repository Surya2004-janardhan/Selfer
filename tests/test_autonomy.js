const { Router } = require('../dist/core/Router');
const { LLMProvider } = require('../dist/core/LLMProvider');
const { GitAgent } = require('../dist/agents/GitAgent');
const { PlanAgent } = require('../dist/agents/PlanAgent');

class MockProvider extends LLMProvider {
    constructor() {
        super();
        this.callCount = 0;
    }
    async generateResponse(messages) {
        this.callCount++;
        const lastMessage = messages[messages.length - 1].content;

        // Simulate a planning response as a string (with markdown)
        if (lastMessage.includes('USER REQUEST: Commit changes')) {
            return { 
                content: "Sure, I'll help with that.\n```json\n" + 
                         JSON.stringify([{ agent: 'GitAgent', task: 'commit changes' }]) + 
                         "\n```" 
            };
        }

        // Simulate a worker response as a string with a tool call
        if (lastMessage.includes('--- CURRENT INSTRUCTION ---')) {
            if (!lastMessage.includes('[SYSTEM ALERT]')) {
                // First turn: give instructions (Should be caught by Zero-Tool Detection)
                return { content: "To commit, you should use the git_commit tool." };
            }
            // Second turn: actually use the tool
            return { 
                content: JSON.stringify({ 
                    tool: 'git_status', 
                    args: {} 
                }) 
            };
        }

        return { content: "Task completed successfully." };
    }
}

async function test() {
    const provider = new MockProvider();
    const router = new Router(provider);
    
    router.registerAgent(new PlanAgent(provider));
    router.registerAgent(new GitAgent(provider));

    console.log("--- AUTONOMY TEST: Plan Parsing & Zero-Tool Enforcement ---");
    try {
        const result = await router.routeTask("Commit changes", { sessionId: 'test' });
        console.log("\nFINAL RESULT:\n", result);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
