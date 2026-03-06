"""
Session Memory Manager for Selfer — inspired by OpenClaw's `session-manager-init.ts` pattern.

Each LangGraph invocation gets a fresh `QuerySession` (per-query scoped),
while a global `RepoSession` persists across all queries in the workspace.

Design:
  - QuerySession  → stores messages, plan, step, agent logs for ONE user request
  - RepoSession   → aggregated JSON tracking the overall repo context, completed tasks, etc.
Both flush atomically to `.selfer/sessions/` to survive restarts (OpenClaw parity).
"""

import os
import json
import uuid
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict


# ─── QuerySession ─────────────────────────────────────────────────────────────

@dataclass
class AgentLog:
    agent: str
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@dataclass
class QuerySession:
    """
    Scoped to a single user query. Acts like OpenClaw's per-request session,
    flushed atomically. Carries agent logs, task steps, and the compacted context.
    """
    session_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    user_query: str = ""
    agent_logs: List[AgentLog] = field(default_factory=list)
    plan: List[str] = field(default_factory=list)
    current_step: int = 0
    completed_steps: List[str] = field(default_factory=list)
    context_summary: str = ""  # Compacted prior context from compaction.py
    variables: Dict[str, Any] = field(default_factory=dict)
    finished: bool = False

    def log(self, agent: str, message: str):
        self.agent_logs.append(AgentLog(agent=agent, message=message))

    def flush(self, sessions_dir: str):
        """Atomic write to disk — same pattern as OpenClaw session manager flush."""
        os.makedirs(sessions_dir, exist_ok=True)
        path = os.path.join(sessions_dir, f"{self.session_id}.json")
        data = asdict(self)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)


# ─── RepoSession ──────────────────────────────────────────────────────────────

@dataclass
class RepoSession:
    """
    Global, persisted session living in `.selfer/repo_session.json`.
    Tracks overall task history across queries.
    Shared by ALL sub-agents as a read-only context prefix, minimizing re-sending
    large repo state on every LLM call.
    """
    workspace_root: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_updated: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_tasks: List[str] = field(default_factory=list)
    active_plan: List[str] = field(default_factory=list)
    current_step: int = 0
    repo_summary: str = ""  # LLM-compacted repo overview (refreshed periodically)
    known_files: List[str] = field(default_factory=list)  # Top-level tracked files
    agent_capabilities: Dict[str, str] = field(default_factory=lambda: {
        "router": "Classifies user intent and routes to planner or casual.",
        "planner": "Breaks down objectives into a JSON step array.",
        "executor": "Uses tools to complete each step.",
        "retriever": "Searches ChromaDB for relevant code context.",
        "summarizer": "Compacts oversized histories to save tokens.",
        "git": "Executes git operations on the repo.",
        "runner": "Executes safe shell commands.",
    })

    def mark_task_done(self, task: str):
        if task not in self.completed_tasks:
            self.completed_tasks.append(task)
        self.last_updated = datetime.now(timezone.utc).isoformat()

    def flush(self, workspace_root: str):
        path = os.path.join(workspace_root, ".selfer", "repo_session.json")
        self.last_updated = datetime.now(timezone.utc).isoformat()
        with open(path, "w") as f:
            json.dump(asdict(self), f, indent=2)

    def build_shared_context_prompt(self) -> str:
        """
        Builds the minimal context prefix injected at the top of every LLM call.
        This avoids re-sending full repo trees on every request — OpenClaw's key trick.
        """
        tasks_done = "\n".join(f"  ✓ {t}" for t in self.completed_tasks[-5:]) or "  None yet."
        return (
            f"[SHARED REPO CONTEXT]\n"
            f"Root: {self.workspace_root}\n"
            f"Recent Completed Tasks:\n{tasks_done}\n"
            f"Active Plan Step: {self.current_step + 1} / {len(self.active_plan)}\n"
            f"Repo Summary: {self.repo_summary or 'Not yet generated.'}\n"
            f"[END SHARED CONTEXT]"
        )


# ─── SessionManager ───────────────────────────────────────────────────────────

class SessionManager:
    """
    Central singleton that manages the repo-global session and creates/destroys per-query sessions.
    """
    _instance = None
    _repo_session: Optional[RepoSession] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self, workspace_root: str):
        """Load or create the global RepoSession."""
        path = os.path.join(workspace_root, ".selfer", "repo_session.json")
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
                self._repo_session = RepoSession(**{
                    k: v for k, v in data.items()
                    if k in RepoSession.__dataclass_fields__
                })
        else:
            self._repo_session = RepoSession(workspace_root=workspace_root)
            self._repo_session.flush(workspace_root)

    @property
    def repo(self) -> RepoSession:
        if not self._repo_session:
            self.initialize(os.getcwd())
        return self._repo_session

    def new_query_session(self, user_query: str) -> QuerySession:
        qs = QuerySession(user_query=user_query)
        # Pre-populate plan from global session if one is active
        qs.context_summary = self.repo.build_shared_context_prompt()
        return qs

    def flush_repo(self, workspace_root: str):
        if self._repo_session:
            self._repo_session.flush(workspace_root)

    def get_sessions_dir(self, workspace_root: str) -> str:
        return os.path.join(workspace_root, ".selfer", "sessions")


# Global singleton
session_manager = SessionManager()


