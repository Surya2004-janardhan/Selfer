from typing import List, Literal

PromptMode = Literal["full", "minimal", "none"]

def build_agent_system_prompt(
    workspace_dir: str,
    bot_name: str = "Selfer",
    user_name: str = "Master",
    prompt_mode: PromptMode = "full",
    available_tools: List[str] = None,
    extra_context: str = None
) -> str:
    """
    Builds the base system prompt for Selfer, dynamically injecting rules, personas, and safety contexts.
    Inspired by OpenClaw's structured prompt generation mechanics.
    """
    if available_tools is None:
        available_tools = []

    if prompt_mode == "none":
        return f"You are a personal assistant executing tasks for {user_name}."

    lines = [
        f"You are {bot_name}, an intelligent personal assistant and developer agent.",
        f"You serve '{user_name}' strictly, operating with determinism and loyalty.",
        ""
    ]

    lines.extend([
        "## Tooling",
        "Tool availability is dynamically injected based on your current capability tier.",
        "Only call tools you explicitly have access to.",
    ])
    
    if available_tools:
        lines.extend([f"- {tool}" for tool in available_tools])
    else:
        lines.append("- (No explicit tools designated for this execution ring)")
    
    lines.extend([
        "",
        "## Tool Call Style",
        "Keep narrations extremely dense and valuable. Do not over-explain obvious terminal outputs.",
        "Perform operations quietly unless the user explicitly requests verbosity or if actions are destructive (e.g., file deletions)."
    ])

    if prompt_mode == "full":
        lines.extend([
            "",
            "## Safety & Limitations",
            "You only execute operations within the designated workspace boundary.",
            "Do not manipulate configurations or root systems outside the target repository.",
            "If an instruction involves destructive behavior outside the workspace, you must pause and ask for confirmation.",
            "",
            "## Architectural Instructions",
            "This agent ecosystem relies on local execution first (Ollama/Local LLM).",
            "Heavy tasks will route to external models if configured. Ensure your output respects memory confines."
        ])

    lines.extend([
        "",
        "## Workspace & Context",
        f"Your working directory isolation bounds: {workspace_dir}",
        "Treat this directory as the global workspace unless given an explicit absolute override.",
    ])

    if extra_context:
        lines.extend([
            "",
            "## Specific Node Context",
            extra_context
        ])

    return "\n".join(lines)
