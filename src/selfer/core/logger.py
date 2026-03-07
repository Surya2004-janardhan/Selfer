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

class _LazyAuditLogger:
    """
    Lazy wrapper: defers creating `.selfer/logs/audit.log` until the first
    actual log call, so importing `logger.py` never touches the filesystem.
    This fixes the bug where `_build_audit_logger()` at import-time created
    `.selfer/logs/` before `selfer init` ran, causing init to bail early.
    """
    def __init__(self):
        self._real: logging.Logger | None = None

    def _ensure(self):
        if self._real is None:
            log_dir = os.path.join(os.getcwd(), ".selfer", "logs")
            os.makedirs(log_dir, exist_ok=True)
            real = logging.getLogger("selfer.audit")
            if not real.handlers:
                real.setLevel(logging.DEBUG)
                fh = logging.FileHandler(
                    os.path.join(log_dir, "audit.log"), encoding="utf-8"
                )
                fh.setFormatter(logging.Formatter(
                    "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
                    datefmt="%Y-%m-%dT%H:%M:%S"
                ))
                real.addHandler(fh)
                real.propagate = False
            self._real = real

    def info(self, msg, *a, **k):    self._ensure(); self._real.info(msg, *a, **k)
    def debug(self, msg, *a, **k):   self._ensure(); self._real.debug(msg, *a, **k)
    def warning(self, msg, *a, **k): self._ensure(); self._real.warning(msg, *a, **k)
    def error(self, msg, *a, **k):   self._ensure(); self._real.error(msg, *a, **k)

# Singleton global audit logger
audit_logger = _LazyAuditLogger()


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

    # Mirror into global audit file — but only if the dir exists/can be created
    try:
        log_dir = os.path.join(os.getcwd(), ".selfer", "logs")
        os.makedirs(log_dir, exist_ok=True)  # Always safe — creates dirs if missing
        audit_fh = logging.FileHandler(
            os.path.join(log_dir, "audit.log"),
            encoding="utf-8"
        )
        audit_fh.setLevel(logging.DEBUG)
        audit_fh.setFormatter(logging.Formatter(
            f"[%(asctime)s] [%(levelname)s] [query:{query_id}] [{agent_name}] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S"
        ))
        log.addHandler(audit_fh)
    except Exception:
        pass  # Silently skip file logging if filesystem isn't ready

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


