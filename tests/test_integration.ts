import { Router } from '../src/core/Router';
import { PlanAgent } from '../src/agents/PlanAgent';
import { FileAgent } from '../src/agents/FileAgent';
import { LLMProvider, LLMMessage, LLMResponse } from '../src/core/LLMProvider';
import * as fs from 'fs';
import * as path from 'path';

// Mock LLM Provider for deterministic testing
class MockProvider implements LLMProvider {
    name = "Mock";
    async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
        const lastMessage = messages[messages.length - 1].content;

        if (lastMessage.includes("USER REQUEST: test task")) {
            return {
                content: JSON.stringify([
                    { agent: "FileAgent", task: "write 'hello' to test_file.txt" }
                ]),
                usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
            };
        }

        if (lastMessage.includes("write 'hello' to test_file.txt")) {
            return {
                content: JSON.stringify({
                    tool: "write_file",
                    args: { path: "test_file.txt", content: "hello" }
                }),
                usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
            };
        }

        return {
            content: "Task complete.",
            usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
        };
    }
}

async function testIntegration() {
    console.log("--- INTEGRATION TEST: Router -> FileAgent ---");
    const provider = new MockProvider();
    const router = new Router(provider);

    router.registerAgent(new PlanAgent(provider));
    router.registerAgent(new FileAgent(provider));

    const context = { directory: process.cwd(), sessionMemory: {}, config: {} };

    try {
        const result = await router.routeTask("test task", context);
        console.log("Result:", result);

        const testFilePath = path.join(process.cwd(), 'test_file.txt');
        if (fs.existsSync(testFilePath)) {
            const content = fs.readFileSync(testFilePath, 'utf-8');
            if (content === "hello") {
                console.log("SUCCESS: File was written by agent!");
            } else {
                console.log("FAILURE: File content mismatch:", content);
            }
            fs.unlinkSync(testFilePath);
        } else {
            console.log("FAILURE: File was NOT created.");
        }
    } catch (e: any) {
        console.error("Test error:", e.message);
    }
}

testIntegration();
