"""
Pydantic configuration model for Selfer.
Validates `.selfer/config.json` at startup — fails fast with clear errors
instead of crashing mid-task with a KeyError.
"""

import os
import json
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ValidationError
from rich.console import Console

console = Console()


class SelferConfig(BaseModel):
    """Validated configuration model for `.selfer/config.json`."""
    bot_name: str = Field(default="Selfer", description="The AI bot persona name.")
    user_name: str = Field(default="Master", description="The user/master name.")
    preferred_model: str = Field(default="llama3", description="Primary LLM model ID.")
    fallback_model: str = Field(default="gpt-4o", description="Fallback LLM model ID.")
    ignore_patterns: List[str] = Field(
        default_factory=lambda: [".env", ".git", "node_modules", ".venv", "__pycache__"],
        description="File/dir patterns to exclude from indexing.",
    )
    authorized_telegram_users: List[str] = Field(
        default_factory=list,
        description="Telegram usernames (without @) allowed to interact with the bot.",
    )
    max_context_tokens: int = Field(default=64000, ge=1000, le=200000)
    max_retries: int = Field(default=3, ge=1, le=10)
    command_timeout_seconds: int = Field(default=60, ge=5, le=600)
    enable_git_agent: bool = Field(default=True)
    enable_summary_agent: bool = Field(default=True)
    chroma_collection_name: str = Field(default="selfer_memory")

    @field_validator("preferred_model", "fallback_model")
    @classmethod
    def model_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Model ID cannot be empty.")
        return v.strip()


def load_config(workspace_root: Optional[str] = None) -> SelferConfig:
    """
    Loads and validates `.selfer/config.json`. Returns defaults if file is missing.
    Raises `SystemExit` with a clear message on schema violations.
    """
    root = workspace_root or os.getcwd()
    cfg_path = os.path.join(root, ".selfer", "config.json")

    raw: dict = {}
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except json.JSONDecodeError as e:
            console.print(f"[bold red]✘ config.json is malformed:[/bold red] {e}")
            raise SystemExit(1)

    try:
        cfg = SelferConfig(**raw)
    except ValidationError as e:
        console.print("[bold red]✘ config.json validation failed:[/bold red]")
        for err in e.errors():
            loc = " → ".join(str(x) for x in err["loc"])
            console.print(f"  [red]• {loc}:[/red] {err['msg']}")
        raise SystemExit(1)

    return cfg


def save_config(cfg: SelferConfig, workspace_root: Optional[str] = None):
    """Persists the config model back to `.selfer/config.json`."""
    root = workspace_root or os.getcwd()
    cfg_path = os.path.join(root, ".selfer", "config.json")
    os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(cfg.model_dump(), f, indent=4)


