import { ThinkingCore } from './src/ThinkingCore.js';

async function testLoop() {
  const core = new ThinkingCore({
    model: 'mock', 
    cwd: process.cwd()
  });

  await core.initialize();

  console.log('--- Starting Selfer v3.1.0 Streaming Test ---');
  const generator = core.submitMessage('Please check the project pulse and then create a file named "TEST_SUCCESS.md" with the text "Selfer is Alive".');

  for await (const chunk of generator) {
    if (chunk.type === 'thinking') console.log(`\n[⟳ Thinking] ${chunk.content}`);
    if (chunk.type === 'chunk')    process.stdout.write(chunk.content);  // Liquid streaming
    if (chunk.type === 'assistant') console.log(`\n[δ Assistant] ${chunk.content}`);
    if (chunk.type === 'progress') console.log(`\n[↻ Progress] ${chunk.content}`);
    if (chunk.type === 'result')   console.log(`[✓ Result] ${chunk.content}`);
  }

  console.log('\n--- Test Loop Finished ---');
  const stats = core.getCostStats();
  console.log(`📊 Cost Stats: ${stats.totalInput} in / ${stats.totalOutput} out / $${stats.totalCost}`);
  const tasks = core.getTaskManager().getTasks();
  console.log(`📋 Tasks: ${tasks.length} stored`);
}

testLoop().catch(console.error);
