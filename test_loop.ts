import { ThinkingCore } from './src/ThinkingCore.js';

async function testLoop() {
  const core = new ThinkingCore({
    model: 'llama3.2', // Defaults to Ollama
    cwd: process.cwd()
  });

  await core.initialize();

  console.log('--- Starting Test Loop ---');
  const generator = core.submitMessage('Please check the project pulse and then create a file named "TEST_SUCCESS.md" with the text "Selfer is Alive".');

  for await (const chunk of generator) {
    if (chunk.type === 'thinking') console.log(`[Thinking] ${chunk.content}`);
    if (chunk.type === 'assistant') console.log(`[Assistant] ${chunk.content}`);
    if (chunk.type === 'progress') console.log(`[Progress] ${chunk.content}`);
    if (chunk.type === 'result') console.log(`[Result] ${chunk.content}`);
  }
  console.log('--- Test Loop Finished ---');
}

testLoop().catch(console.error);
