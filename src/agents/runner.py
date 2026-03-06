import os
import asyncio
from pydantic import BaseModel, Field
from core.terminal import terminal_registry

try:
    from core.logger import get_query_logger, audit_logger
except ImportError:
    import logging
    audit_logger = logging.getLogger("selfer")
    def get_query_logger(qid, name): return audit_logger

BLOCKED_PATTERNS = [
    "rm -rf /",
    "mkfs",
    "dd if=",
    "> /dev/sda",
    ":(){ :|:& };:",
    "format c:",
    "deltree",
]

class CommandInput(BaseModel):
    command: str = Field(description="The shell command to execute in the repository.")

async def execute_command_async(
    command: str,
    root_dir: str = None,
    query_session_id: str = "global",
    agent_name: str = "runner",
) -> str:
    """
    Production-grade async command executor using AgentTerminal (venv-aware).
    Logs to both the per-query stack and the global audit trail.
    """
    if root_dir is None:
        root_dir = os.getcwd()

    log = get_query_logger(query_session_id, agent_name)
    audit_logger.info(f"[runner] Evaluating command: `{command}`")

    # Security heuristics
    for pattern in BLOCKED_PATTERNS:
        if pattern.lower() in command.lower():
            msg = f"Execution blocked — prohibited pattern: `{pattern}`"
            log.warning(msg)
            audit_logger.warning(f"[runner] BLOCKED: {msg}")
            return f"Error: {msg}"

    terminal = terminal_registry.get(agent_name, root_dir)
    result = await terminal.run(command, timeout=60)

    output_parts = []
    if result["stdout"]:
        output_parts.append(f"STDOUT:\n{result['stdout']}")
    if result["stderr"]:
        output_parts.append(f"STDERR:\n{result['stderr']}")

    status = "✔ completed" if result["returncode"] == 0 else f"✘ exit {result['returncode']}"
    log.info(f"Command {status}")
    audit_logger.info(f"[runner] command exit={result['returncode']}: {command[:80]}")

    combined = "\n".join(output_parts) if output_parts else "(no output)"
    return f"Command {status}.\n{combined}"


def execute_command(command: str, root_dir: str = None) -> str:
    """Sync wrapper around the async executor for tool compatibility."""
    return asyncio.run(execute_command_async(command, root_dir))

