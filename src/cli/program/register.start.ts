import type { Command } from "commander";
import { startCommand } from "../../commands/start.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerStartCommand(program: Command) {
  program
    .command("start")
    .description("Start Selfer in interactive chat or daemon mode")
    .option("--mode <mode>", "1 for Chat UI, 2 for Daemon + CLI")
    .action(async (opts, command) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await startCommand({ mode: opts.mode as string | undefined }, defaultRuntime);
      });
    });
}
