import readline from "node:readline";
import { runDaemonStart } from "../cli/daemon-cli/lifecycle.js";
import { defaultRuntime } from "../runtime.js";
import { agentCliCommand } from "./agent-via-gateway.js";
import { createDefaultDeps } from "../cli/deps.js";

async function runChatLoop(runtime = defaultRuntime, local = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question("You: ", async (query) => {
      if (!query.trim()) {
        ask();
        return;
      }
      if (query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
        rl.close();
        return;
      }
      try {
        const deps = createDefaultDeps();
        // Route exactly like `selfer agent` with a dedicated chat session
        await agentCliCommand({
          message: query,
          local, // If true, runs embedded. If false, tries gateway.
          sessionId: "cli-chat-session",
        }, runtime, deps);
      } catch (err) {
        runtime.error?.(`Error: ${String(err)}`);
      }
      ask();
    });
  };

  runtime.log("Entering Selfer Chat Mode. Type 'exit' or 'quit' to stop.");
  ask();

  return new Promise(resolve => rl.on("close", resolve));
}

export async function startCommand(opts: { mode?: string }, runtime = defaultRuntime) {
  const mode = opts.mode;

  if (mode === "1" || mode === "chat") {
    await runChatLoop(runtime, true);
  } else if (mode === "2" || mode === "daemon") {
    runtime.log("Starting gateway daemon for Telegram + CLI...");
    await runDaemonStart();
    await runChatLoop(runtime, false);
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question("Select mode:\n1. Chat Mode (Local CLI)\n2. CLI + Telegram Bot (Daemon)\nEnter 1 or 2: ", async (answer) => {
      rl.close();
      const choice = answer.trim();
      if (choice === "1") {
        await runChatLoop(runtime, true);
      } else if (choice === "2") {
        runtime.log("Starting gateway daemon for Telegram + CLI...");
        await runDaemonStart();
        await runChatLoop(runtime, false);
      } else {
        runtime.log("Invalid selection.");
      }
    });
  }
}
