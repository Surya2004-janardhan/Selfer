"""
Dual-Stack Logger for Selfer.

Stack 1 — Per-Query Logger (ephemeral):
  - Created fresh for every user query.
  - Outputs minimal Rich-formatted logs to console (what the user sees in real time).
  - Discarded after query completes — no storage overhead.

Stack 2 — Global Audit Logger (persistent):
  - One logger for the entire Selfer process lifetime.
  - Appends all events to `.selfer/logs/audit.log`.
  - Never printed to console (silent background audit trail).

This mirrors OpenClaw's `createSubsystemLogger` pattern where each subsystem
gets its own labelled logger writing to a shared sink.
"""

import os
import logging
from datetime import datetime, timezone
from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme
from rich.highlighter import RegexHighlighter

# ─── Selfer Console Theme ─────────────────────────────────────────────────────

selfer_theme = Theme({
    "info":     "bold cyan",
    "success":  "bold green",
    "warning":  "bold yellow",
    "error":    "bold red",
    "step":     "bold blue",
    "dim":      "dim white",
    "agent":    "bold bright_cyan",
    "title":    "bold bright_cyan on dark_blue",
})

console = Console(theme=selfer_theme)


# ─── Global Audit Logger ──────────────────────────────────────────────────────

def _build_audit_logger() -> logging.Logger:
    """Persistent silent audit logger. Writes to .selfer/logs/audit.log."""
    log_dir = os.path.join(os.getcwd(), ".selfer", "logs")
    os.makedirs(log_dir, exist_ok=True)

    audit_logger = logging.getLogger("selfer.audit")
    if audit_logger.handlers:
        return audit_logger  # Already configured, singleton-safe

    audit_logger.setLevel(logging.DEBUG)
    fh = logging.FileHandler(os.path.join(log_dir, "audit.log"), encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S"
    ))
    audit_logger.addHandler(fh)
    audit_logger.propagate = False  # Do NOT bubble to root console handler
    return audit_logger

# Singleton global audit logger (all sub-agents write here)
audit_logger = _build_audit_logger()


# ─── Per-Query Logger Factory ─────────────────────────────────────────────────

def get_query_logger(query_id: str, agent_name: str = "selfer") -> logging.Logger:
    """
    Creates a fresh labelled logger for a single query + agent combination.
    Logs are printed to the console in a minimal, colored format.
    After query completion the caller should call `teardown_query_logger()`.

    Usage:
        log = get_query_logger(session_id, "executor")
        log.info("Starting step 3...")
    """
    logger_name = f"selfer.query.{query_id}.{agent_name}"
    log = logging.getLogger(logger_name)

    if log.handlers:
        return log  # Already set up

    log.setLevel(logging.INFO)

    # Minimal Rich console handler
    rich_handler = RichHandler(
        console=console,
        show_time=False,
        show_path=False,
        rich_tracebacks=False,
        markup=True,
    )
    rich_handler.setLevel(logging.INFO)
    rich_handler.setFormatter(logging.Formatter(
        f"[bold cyan][{agent_name}][/bold cyan] %(message)s"
    ))

    log.addHandler(rich_handler)
    log.propagate = False  # Don't bubble to audit or root

    # Also mirror into the global audit file for permanent record
    audit_fh = logging.FileHandler(
        os.path.join(os.getcwd(), ".selfer", "logs", "audit.log"),
        encoding="utf-8"
    )
    audit_fh.setLevel(logging.DEBUG)
    audit_fh.setFormatter(logging.Formatter(
        f"[%(asctime)s] [%(levelname)s] [query:{query_id}] [{agent_name}] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S"
    ))
    log.addHandler(audit_fh)

    return log


def teardown_query_logger(query_id: str, agent_name: str = "selfer"):
    """
    Removes handlers from a per-query logger to prevent memory leaks.
    Call this at the end of each query lifecycle.
    """
    logger_name = f"selfer.query.{query_id}.{agent_name}"
    log = logging.getLogger(logger_name)
    for handler in log.handlers[:]:
        handler.close()
        log.removeHandler(handler)


# ─── Default logger (used by modules that don't get a fresh per-query logger) ─

logger = get_query_logger("global", "selfer")
