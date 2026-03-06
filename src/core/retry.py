"""
LLM Retry + Exponential Backoff — inspired by OpenClaw's `retryAsync` utility.

Wraps any async coroutine (typically a LangChain `ainvoke`) with:
  - Configurable max attempts
  - Exponential backoff with optional jitter
  - Abort on non-retryable errors (auth, content policy, etc.)
"""

import asyncio
import random
import logging
from typing import Callable, Awaitable, TypeVar, Type

T = TypeVar("T")

try:
    from core.logger import audit_logger as logger
except Exception:
    logger = logging.getLogger("selfer.retry")

# Errors that should NOT be retried
NON_RETRYABLE_SUBSTRINGS = [
    "invalid api key",
    "403",
    "401",
    "content policy",
    "quota exceeded",
    "context length exceeded",
]


def _is_retryable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return not any(substr in msg for substr in NON_RETRYABLE_SUBSTRINGS)


async def retry_async(
    coro_fn: Callable[[], Awaitable[T]],
    *,
    attempts: int = 3,
    min_delay_ms: int = 500,
    max_delay_ms: int = 10_000,
    jitter: float = 0.2,
    label: str = "retry",
) -> T:
    """
    Retry an async callable with exponential backoff.

    Usage:
        result = await retry_async(
            lambda: llm.ainvoke(messages),
            attempts=3, label="router/ainvoke"
        )
    """
    last_exc: Exception = RuntimeError("No attempts made.")

    for attempt in range(1, attempts + 1):
        try:
            return await coro_fn()
        except Exception as exc:
            last_exc = exc

            if not _is_retryable(exc):
                logger.error(f"[{label}] Non-retryable error on attempt {attempt}: {exc}")
                raise

            if attempt == attempts:
                break

            # Exponential backoff with jitter
            base_delay = min(min_delay_ms * (2 ** (attempt - 1)), max_delay_ms)
            delay_ms = base_delay * (1 + random.uniform(-jitter, jitter))
            delay_s = delay_ms / 1000

            logger.warning(
                f"[{label}] Attempt {attempt}/{attempts} failed — retrying in {delay_s:.1f}s. "
                f"Error: {exc}"
            )
            await asyncio.sleep(delay_s)

    logger.error(f"[{label}] All {attempts} attempts exhausted.")
    raise last_exc

