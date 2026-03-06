"""
Per-Agent Terminal — venv-aware isolated subprocess manager.

Each sub-agent that needs CLI access gets its own `AgentTerminal` instance.
The terminal resolves:
  - The active Python venv (from `.venv` or `.selfer` folder)
  - The correct PATH so `uv run`, `pip`, etc. all resolve correctly
  - An async subprocess shell that streams stdout/stderr back in real time

Background terminal:
  - Main agent gets a persistent background shell via `BackgroundTerminal`
  - Runs long-lived operations (e.g. `npm run dev`) without blocking the LangGraph loop.
"""

import os
import asyncio
import subprocess
import sys
from typing import Optional, AsyncGenerator

try:
    from selfer.core.logger import audit_logger as logger
except Exception:
    import logging
    logger = logging.getLogger("selfer.terminal")


def resolve_venv_env(root_dir: str) -> dict:
    """
    Resolves the correct OS environment dict for the active virtual environment.
    Checks `.venv`, `venv`, then falls back to current sys.prefix.
    """
    env = os.environ.copy()
    
    # Priority order for finding the venv
    candidates = [
        os.path.join(root_dir, ".venv"),
        os.path.join(root_dir, "venv"),
        os.path.join(root_dir, ".selfer", ".venv"),
    ]
    
    venv_dir = None
    for c in candidates:
        if os.path.isdir(c):
            venv_dir = c
            break
    
    if venv_dir:
        if sys.platform == "win32":
            bin_dir = os.path.join(venv_dir, "Scripts")
        else:
            bin_dir = os.path.join(venv_dir, "bin")
        
        env["VIRTUAL_ENV"] = venv_dir
        env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")
        env.pop("PYTHONHOME", None)  # Clear to avoid conflicts
        logger.info(f"AgentTerminal resolved venv at: {venv_dir}")
    else:
        logger.warning("No venv found. Using system Python environment.")

    return env


class AgentTerminal:
    """
    Venv-aware terminal for a specific sub-agent.
    Runs one-shot commands asynchronously, streaming output line by line.
    """
    
    def __init__(self, agent_name: str, root_dir: Optional[str] = None):
        self.agent_name = agent_name
        self.root_dir = root_dir or os.getcwd()
        self._env = resolve_venv_env(self.root_dir)
    
    async def run(self, command: str, timeout: int = 60) -> dict:
        """
        Runs a shell command in the correct venv context.
        Returns {'stdout': str, 'stderr': str, 'returncode': int}.
        """
        logger.info(f"[{self.agent_name}] Executing: {command}")
        
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                cwd=self.root_dir,
                env=self._env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            except asyncio.TimeoutError:
                proc.kill()
                return {
                    "stdout": "",
                    "stderr": f"Command timed out after {timeout}s.",
                    "returncode": -1
                }
            
            result = {
                "stdout": stdout.decode("utf-8", errors="replace").strip(),
                "stderr": stderr.decode("utf-8", errors="replace").strip(),
                "returncode": proc.returncode,
            }
            
            logger.info(f"[{self.agent_name}] Exit code: {proc.returncode}")
            return result
            
        except Exception as e:
            logger.error(f"[{self.agent_name}] Terminal error: {e}")
            return {"stdout": "", "stderr": str(e), "returncode": -1}

    async def stream(self, command: str) -> AsyncGenerator[str, None]:
        """
        Streams output line-by-line (for long-running commands like test suites).
        """
        proc = await asyncio.create_subprocess_shell(
            command,
            cwd=self.root_dir,
            env=self._env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        async for line in proc.stdout:
            decoded = line.decode("utf-8", errors="replace").rstrip()
            logger.info(f"[{self.agent_name}] {decoded}")
            yield decoded
        await proc.wait()


class BackgroundTerminal:
    """
    A persistent background shell for the main agent.
    Launches a process and keeps reading output forever until cancelled.
    Good for: `npm run dev`, `uvicorn main:app`, watching file changes, etc.
    """
    
    def __init__(self, root_dir: Optional[str] = None):
        self.root_dir = root_dir or os.getcwd()
        self._env = resolve_venv_env(self.root_dir)
        self._proc: Optional[asyncio.subprocess.Process] = None
        self._task: Optional[asyncio.Task] = None
    
    async def start(self, command: str):
        """Launch a long-running background command."""
        logger.info(f"[BackgroundTerminal] Launching: {command}")
        self._proc = await asyncio.create_subprocess_shell(
            command,
            cwd=self.root_dir,
            env=self._env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        self._task = asyncio.create_task(self._read_output())
    
    async def _read_output(self):
        if self._proc and self._proc.stdout:
            async for line in self._proc.stdout:
                decoded = line.decode("utf-8", errors="replace").rstrip()
                logger.info(f"[BG] {decoded}")
    
    async def stop(self):
        if self._proc:
            self._proc.terminate()
            try:
                await asyncio.wait_for(self._proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                self._proc.kill()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[BackgroundTerminal] Stopped.")


# ─── Per-Agent Terminal Registry ──────────────────────────────────────────────

class TerminalRegistry:
    """Singleton registry so each agent always gets the same terminal instance."""
    _instance = None
    _terminals: dict = {}
    _bg: Optional[BackgroundTerminal] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._terminals = {}
        return cls._instance

    def get(self, agent_name: str, root_dir: Optional[str] = None) -> AgentTerminal:
        if agent_name not in self._terminals:
            self._terminals[agent_name] = AgentTerminal(agent_name, root_dir)
        return self._terminals[agent_name]

    def get_background(self, root_dir: Optional[str] = None) -> BackgroundTerminal:
        if self._bg is None:
            self._bg = BackgroundTerminal(root_dir)
        return self._bg


terminal_registry = TerminalRegistry()


