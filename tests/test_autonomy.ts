import { Router } from '../src/core/Router';
import { LLMProvider, LLMMessage, LLMResponse } from '../src/core/LLMProvider';
import { GitAgent } from '../src/agents/GitAgent';
import { PlanAgent } from '../src/agents/PlanAgent';
import { CLIGui } from '../src/utils/CLIGui';

class MockProvider extends LLMProvider {
    private callCount = 0;
    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        this.callCount++;
        const lastMessage = messages[messages.length - 1].content;

        // 1. Test Plan Retry
        if (lastMessage.includes('USER REQUEST: Commit changes')) {
            if (this.callCount === 1) return { content: "I will plan to commit your changes." }; // Bad plan
            return { content: JSON.stringify([{ agent: 'GitAgent', task: 'commit changes' }]) }; // Good plan
        }

        // 2. Test Zero-Tool Detection
        if (lastMessage.includes('--- CURRENT INSTRUCTION ---')) {
            if (!lastMessage.includes('[SYSTEM ALERT]')) {
                return { content: "You should run git commit -m 'message'" }; // No tool call (First turn)
            }
            // Second turn after SYSTEM ALERT
            return { content: JSON.stringify({ tool: 'git_commit', args: { message: 'chore: update gitignore' } }) };
        }

        return { content: "OK" };
    }
}

async function test() {
    const provider = new MockProvider();
    const router = new Router(provider as any);

    router.registerAgent(new PlanAgent(provider as any));
    router.registerAgent(new GitAgent(provider as any));

    console.log("--- AUTONOMY TEST: Plan Retry & Zero-Tool Detection ---");
    const result = await router.routeTask("Commit changes", { sessionId: 'test' });
    console.log("\nFINAL RESULT:\n", result);
}

test().catch(console.error);
