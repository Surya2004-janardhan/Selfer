/**
 * Test: Can Selfer handle 5+ tool calls in one session?
 */
import * as fs from 'fs';
import * as path from 'path';
import { Orchestrator } from '../src/core/Orchestrator';
import { OllamaProvider } from '../src/core/LLMProvider';
import { ToolRegistry } from '../src/core/ToolRegistry';
import { FileAgent } from '../src/agents/FileAgent';
import { McpManager } from '../src/core/McpManager';

const TEST_DIR = path.join(process.cwd(), 'test_multi_tool');

async function setup() {
    // Clean up
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    
    // Create test files
    fs.mkdirSync(path.join(TEST_DIR, 'src'));
    fs.writeFileSync(path.join(TEST_DIR, 'README.md'), '# Multi Tool Test\n\nTesting multiple tool calls.');
    fs.writeFileSync(path.join(TEST_DIR, 'src/main.ts'), 'export function main() { console.log("hello"); }');
    fs.writeFileSync(path.join(TEST_DIR, 'src/utils.ts'), 'export function add(a: number, b: number) { return a + b; }');
    fs.writeFileSync(path.join(TEST_DIR, 'config.json'), '{"debug": false, "version": "1.0.0"}');
}

async function runTest() {
    console.log('='.repeat(60));
    console.log('MULTI-TOOL TEST: Testing 5+ tool calls in one query');
    console.log('='.repeat(60));
    
    await setup();
    
    const provider = new OllamaProvider({
        model: 'qwen2.5:14b-instruct-q4_K_M',
        baseUrl: 'http://localhost:11434'
    });
    
    const mcpManager = new McpManager(TEST_DIR);
    const registry = new ToolRegistry(mcpManager);
    
    // Pass TEST_DIR to FileAgent so it resolves paths correctly
    const fileAgent = new FileAgent(provider, TEST_DIR);
    
    // Register tools
    for (const tool of fileAgent.getTools()) {
        registry.registerNativeTool({
            ...tool,
            source: 'native',
            execute: (args) => fileAgent.executeTool(tool.name, args)
        });
    }
    
    const orchestrator = new Orchestrator(provider, registry, 'qwen2.5:14b-instruct-q4_K_M');
    
    // The test query - requires 5 tool calls:
    // 1. list_files (src folder)
    // 2. read_file (README.md)
    // 3. read_file (src/main.ts)
    // 4. read_file (src/utils.ts)
    // 5. read_file (config.json)
    const query = `I need you to do all of these in order:
1. List all files in the src folder
2. Read README.md and tell me what it says
3. Read src/main.ts and describe the function
4. Read src/utils.ts and describe what it does
5. Read config.json and tell me the debug value

Do all of these and then summarize what you found.`;

    console.log('\n📝 Query:');
    console.log(query);
    console.log('\n' + '-'.repeat(60) + '\n');
    
    const startTime = Date.now();
    let toolCallCount = 0;
    
    // Track tool calls by wrapping executeTool
    const originalExecute = registry.executeTool.bind(registry);
    registry.executeTool = async (name: string, args: any) => {
        toolCallCount++;
        console.log(`\n🔧 Tool call #${toolCallCount}: ${name}`);
        return originalExecute(name, args);
    };
    
    try {
        const result = await orchestrator.execute(query, {});
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log('\n' + '='.repeat(60));
        console.log('RESULTS');
        console.log('='.repeat(60));
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`🔧 Tool calls made: ${toolCallCount}`);
        console.log(`✅ Success: ${toolCallCount >= 4 ? 'YES' : 'NO (expected at least 4 tool calls)'}`);
        
        if (result) {
            console.log('\n📄 Final response excerpt:');
            console.log(result.slice(0, 500) + (result.length > 500 ? '...' : ''));
        }
        
        // Verdict
        console.log('\n' + '='.repeat(60));
        if (toolCallCount >= 4) {
            console.log('✅ TEST PASSED: Selfer handled multiple tool calls!');
        } else {
            console.log('❌ TEST FAILED: Not enough tool calls made');
        }
        console.log('='.repeat(60));
        
    } catch (error: any) {
        console.error('\n❌ ERROR:', error.message);
    }
    
    // Cleanup
    fs.rmSync(TEST_DIR, { recursive: true });
}

runTest().catch(console.error);
