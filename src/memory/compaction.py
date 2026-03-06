import os
from typing import List, Dict, Any
from langchain_core.messages import BaseMessage, SystemMessage

try:
    from core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")

# OpenClaw-inspired token tuning parameters
SAFETY_MARGIN = 1.2
DEFAULT_CONTEXT_TOKENS = 128000
BASE_CHUNK_RATIO = 0.4

def estimate_tokens(message: BaseMessage) -> int:
    """
    Very crude token estimation heuristic (4 chars = 1 token).
    OpenClaw uses a stripped safe heuristic scaling it by a SAFETY_MARGIN.
    """
    text = str(message.content)
    return max(1, int((len(text) / 4) * SAFETY_MARGIN))

def estimate_messages_tokens(messages: List[BaseMessage]) -> int:
    return sum(estimate_tokens(m) for m in messages)

def chunk_messages_by_max_tokens(messages: List[BaseMessage], max_tokens: int) -> List[List[BaseMessage]]:
    """
    Splits an array of messages into blocks that sequentially fit under `max_tokens`.
    """
    chunks = []
    current_chunk = []
    current_tokens = 0

    effective_max = max(1, int(max_tokens / SAFETY_MARGIN))

    for msg in messages:
        msg_tokens = estimate_tokens(msg)
        if current_chunk and (current_tokens + msg_tokens > effective_max):
            chunks.append(current_chunk)
            current_chunk = []
            current_tokens = 0

        current_chunk.append(msg)
        current_tokens += msg_tokens

        # If a single message exceeds effective max, force chunk isolation
        if msg_tokens > effective_max:
            chunks.append(current_chunk)
            current_chunk = []
            current_tokens = 0

    if current_chunk:
        chunks.append(current_chunk)

    return chunks

def extract_safe_context(messages: List[BaseMessage], max_context_share_tokens: int) -> Dict[str, Any]:
    """
    Trims the conversation to stay under the token budget.
    We isolate the oldest messages iteratively until the array fits gracefully within the budget.
    """
    total_tokens = estimate_messages_tokens(messages)
    
    if total_tokens <= max_context_share_tokens:
        return {
            "messages": messages,
            "dropped": []
        }
        
    logger.warning(f"COMPACTION: History overloaded ({total_tokens} > {max_context_share_tokens} tokens). Evicting old chat blocks.")
    
    kept = []
    dropped = []
    
    current_tokens = 0
    # Reverse iterate: keep the newest tools and user intents 
    for msg in reversed(messages):
        tks = estimate_tokens(msg)
        if current_tokens + tks < max_context_share_tokens:
            kept.insert(0, msg)
            current_tokens += tks
        else:
            dropped.insert(0, msg)
            
    return {
        "messages": kept,
        "dropped": dropped  # Pass to summarize_with_fallback if desired
    }

