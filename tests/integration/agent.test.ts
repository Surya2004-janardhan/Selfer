/**
 * Agent Integration Tests
 * 
 * Tests FileAgent, EditsAgent, GitAgent with real Ollama LLM
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestHarness, containsExpected, hasToolCall } from './TestHarness';
import { OllamaProvider } from '../../src/core/LLMProvider';
import { FileAgent } from '../../src/agents/FileAgent';
import { EditsAgent } from '../../src/agents/EditsAgent';
import { GitAgent } from '../../src/agents/GitAgent';
import { EditParser } from '../../src/utils/EditParser';

const TEST_DIR = path.join(process.cwd(), 'test_workspace');

// Setup test workspace
function setupTestWorkspace() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    
    // Create test files
    fs.writeFileSync(path.join(TEST_DIR, 'hello.txt'), 'Hello World!\nThis is a test file.\n');
    fs.writeFileSync(path.join(TEST_DIR, 'sample.ts'), `function greet(name: string) {
    console.log("Hello, " + name);
}

greet("World");
`);
    fs.mkdirSync(path.join(TEST_DIR, 'subdir'), { recursive: true });
    fs.writeFileSync(path.join(TEST_DIR, 'subdir', 'nested.txt'), 'Nested file content\n');
}

// Cleanup test workspace
function cleanupTestWorkspace() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}

export async function runAgentTests(): Promise<void> {
    const harness = new TestHarness('Agent_Tests');
    harness.start();

    // Setup
    const originalCwd = process.cwd();
    setupTestWorkspace();
    process.chdir(TEST_DIR);

    const provider = new OllamaProvider({
        model: 'llama3:8b',
        baseUrl: 'http://localhost:11434'
    });

    try {
        // ═══════════════════════════════════════════════════════════════════
        // FileAgent Tests
        // ═══════════════════════════════════════════════════════════════════
        
        const fileAgent = new FileAgent(provider);

        await harness.runTest('list_files - root directory', 'FileAgent', async () => {
            const result = await fileAgent.executeTool('list_files', { path: '.' });
            const hasFiles = result.output?.includes('hello.txt') && result.output?.includes('sample.ts');
            return {
                passed: result.success && hasFiles,
                actual: result.output,
                expected: 'Should list hello.txt and sample.ts',
                error: result.error
            };
        });

        await harness.runTest('list_files - subdirectory', 'FileAgent', async () => {
            const result = await fileAgent.executeTool('list_files', { path: 'subdir' });
            const hasNested = result.output?.includes('nested.txt');
            return {
                passed: result.success && hasNested,
                actual: result.output,
                expected: 'Should list nested.txt',
                error: result.error
            };
        });

        await harness.runTest('read_file - existing file', 'FileAgent', async () => {
            const result = await fileAgent.executeTool('read_file', { path: 'hello.txt' });
            const hasContent = result.output?.includes('Hello World!');
            return {
                passed: result.success && hasContent,
                actual: result.output,
                expected: 'Should contain "Hello World!"',
                error: result.error
            };
        });

        await harness.runTest('read_file - non-existent file', 'FileAgent', async () => {
            const result = await fileAgent.executeTool('read_file', { path: 'nonexistent.txt' });
            return {
                passed: !result.success && result.error?.includes('not found'),
                actual: result.error,
                expected: 'Should fail with "not found" error',
                error: result.success ? 'Expected failure but got success' : undefined
            };
        });

        await harness.runTest('write_file - create new file', 'FileAgent', async () => {
            const result = await fileAgent.executeTool('write_file', { 
                path: 'new_file.txt', 
                content: 'New file content!' 
            });
            const fileExists = fs.existsSync(path.join(TEST_DIR, 'new_file.txt'));
            const content = fileExists ? fs.readFileSync(path.join(TEST_DIR, 'new_file.txt'), 'utf-8') : '';
            return {
                passed: result.success && fileExists && content === 'New file content!',
                actual: content,
                expected: 'New file content!',
                error: result.error
            };
        });

        await harness.runTest('write_file - overwrite existing file', 'FileAgent', async () => {
            const result = await fileAgent.executeTool('write_file', { 
                path: 'hello.txt', 
                content: 'Updated content!' 
            });
            const content = fs.readFileSync(path.join(TEST_DIR, 'hello.txt'), 'utf-8');
            return {
                passed: result.success && content === 'Updated content!',
                actual: content,
                expected: 'Updated content!',
                error: result.error
            };
        });

        await harness.runTest('write_file - path traversal blocked', 'FileAgent', async () => {
            const result = await fileAgent.executeTool('write_file', { 
                path: '../../../dangerous.txt', 
                content: 'Should not write!' 
            });
            return {
                passed: !result.success && result.error?.includes('outside'),
                actual: result.error,
                expected: 'Should be blocked with "outside" error',
                error: result.success ? 'Expected failure but path traversal succeeded!' : undefined
            };
        });

        // ═══════════════════════════════════════════════════════════════════
        // EditsAgent Tests (EditParser)
        // ═══════════════════════════════════════════════════════════════════

        // Restore sample.ts for edit tests
        fs.writeFileSync(path.join(TEST_DIR, 'sample.ts'), `function greet(name: string) {
    console.log("Hello, " + name);
}

greet("World");
`);

        await harness.runTest('EditParser - parse single block', 'EditsAgent', async () => {
            const editText = `sample.ts
<<<<<<< SEARCH
function greet(name: string) {
    console.log("Hello, " + name);
}
=======
function greet(name: string) {
    console.log(\`Hello, \${name}!\`);
}
>>>>>>> REPLACE`;

            const blocks = EditParser.parseBlocks(editText);
            return {
                passed: blocks.length === 1 && blocks[0].filePath === 'sample.ts',
                actual: JSON.stringify(blocks, null, 2),
                expected: '1 block for sample.ts',
                error: blocks.length !== 1 ? `Expected 1 block, got ${blocks.length}` : undefined
            };
        });

        await harness.runTest('EditParser - apply exact match', 'EditsAgent', async () => {
            // Reset file
            fs.writeFileSync(path.join(TEST_DIR, 'sample.ts'), `function greet(name: string) {
    console.log("Hello, " + name);
}

greet("World");
`);

            const editText = `sample.ts
<<<<<<< SEARCH
function greet(name: string) {
    console.log("Hello, " + name);
}
=======
function greet(name: string) {
    console.log(\`Hello, \${name}!\`);
}
>>>>>>> REPLACE`;

            const blocks = EditParser.parseBlocks(editText);
            const results = EditParser.applyBlocks(blocks);
            const newContent = fs.readFileSync(path.join(TEST_DIR, 'sample.ts'), 'utf-8');
            const hasNewSyntax = newContent.includes('${name}!');

            return {
                passed: results[0].success && hasNewSyntax,
                actual: newContent,
                expected: 'Should contain template literal syntax',
                error: results[0].error
            };
        });

        await harness.runTest('EditParser - apply fuzzy match with whitespace differences', 'EditsAgent', async () => {
            // Create file with slightly different whitespace
            fs.writeFileSync(path.join(TEST_DIR, 'fuzzy.ts'), `  function add(a: number, b: number) {
      return a + b;
  }
`);

            // Search with different indentation
            const editText = `fuzzy.ts
<<<<<<< SEARCH
function add(a: number, b: number) {
    return a + b;
}
=======
function add(a: number, b: number): number {
    return a + b;
}
>>>>>>> REPLACE`;

            const blocks = EditParser.parseBlocks(editText);
            const results = EditParser.applyBlocks(blocks);

            return {
                passed: results[0].success,
                actual: results[0].success ? 'Fuzzy match succeeded' : results[0].error,
                expected: 'Should succeed with fuzzy matching',
                error: results[0].error
            };
        });

        await harness.runTest('EditParser - backup and validation', 'EditsAgent', async () => {
            // Create a TypeScript file
            fs.writeFileSync(path.join(TEST_DIR, 'validate.ts'), `export function test() {
    return 42;
}
`);

            const editsAgent = new EditsAgent(provider);
            const result = await editsAgent.executeTool('write_file_full', {
                path: 'validate.ts',
                content: `export function test(): number {
    return 42;
}
`
            });

            // Check backup was created
            const backupExists = fs.existsSync(path.join(TEST_DIR, 'validate.ts.bak'));

            return {
                passed: result.success && backupExists,
                actual: `Success: ${result.success}, Backup: ${backupExists}`,
                expected: 'Success with backup created',
                error: result.error
            };
        });

        // ═══════════════════════════════════════════════════════════════════
        // GitAgent Tests (mocked - no actual git ops in test workspace)
        // ═══════════════════════════════════════════════════════════════════

        await harness.runTest('GitAgent - tools registered', 'GitAgent', async () => {
            const gitAgent = new GitAgent(provider);
            const tools = gitAgent.getTools();
            const hasAllTools = tools.some(t => t.name === 'git_status') &&
                               tools.some(t => t.name === 'git_diff') &&
                               tools.some(t => t.name === 'git_commit') &&
                               tools.some(t => t.name === 'git_push');
            return {
                passed: hasAllTools,
                actual: tools.map(t => t.name).join(', '),
                expected: 'git_status, git_diff, git_commit, git_push',
                error: hasAllTools ? undefined : 'Missing some git tools'
            };
        });

    } finally {
        // Cleanup
        process.chdir(originalCwd);
        cleanupTestWorkspace();
    }

    harness.finish();
}

// Run if called directly
if (require.main === module) {
    runAgentTests().catch(console.error);
}
