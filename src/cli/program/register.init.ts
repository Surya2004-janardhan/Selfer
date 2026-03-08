import type { Command } from "commander";
import { initCommand } from "../../commands/init.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Initialize ~/.selfer/selfer.json with Ollama defaults and create workspace")
    .option(
      "--workspace <dir>",
      "Agent workspace directory (default: ~/.selfer/workspace; stored as agents.defaults.workspace)",
    )
    .action(async (opts, command) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await initCommand({ workspace: opts.workspace as string | undefined }, defaultRuntime);
      });
    });
}
