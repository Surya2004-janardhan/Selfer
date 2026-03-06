from langchain_core.messages import SystemMessage, HumanMessage
from selfer.core.llm import LLMFactory
from selfer.core.state import SelferState
from selfer.memory.compaction import extract_safe_context

try:
    from selfer.core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")

SUMMARY_PROMPT = """
You are the Summarization Agent for Selfer. 
Read the context of the recent task execution steps. Condense the entire history into a strict 3-to-4 line bulleted recap of what was accomplished, ignoring the noise.

This ensures the orchestrator doesn't overflow its token limit.

Recent History:
{history}
"""

# OpenClaw token limits
LANGGRAPH_LLM_MAX_CONTEXT_TOKENS = 64000 # Configurable
BUFFER_RATIO = 0.5 # Wait until 50% capacity before squashing

def summarize_context(state: SelferState) -> dict:
    """
    Compacts the conversation history to prevent token exhaustion.
    Uses sliding window compaction logic to slice older messages out of context bounds.
    """
    messages = state.get("messages", [])
    
    # We trigger a trim only if estimating the budget yields > 50% max window size
    max_budget = int(LANGGRAPH_LLM_MAX_CONTEXT_TOKENS * BUFFER_RATIO)
    compaction_result = extract_safe_context(messages, max_budget)
    
    kept_messages = compaction_result["messages"]
    dropped_messages = compaction_result["dropped"]
    
    if not dropped_messages:
        return {} # Token pool is safely within budget
        
    logger.info(f"Summary Agent identified {len(dropped_messages)} oversized messages for compaction.")
    
    recent = "\n".join([str(m.content) for m in dropped_messages if getattr(m, 'content', None)])
    
    llm = LLMFactory.create_llm()
    system_msg = SystemMessage(content=SUMMARY_PROMPT.format(history=recent))
    
    response = llm.invoke([system_msg])
    compressed_text = response.content
    
    logger.info("Context compressed successfully. Replacing truncated bounds.")
    
    # Inject the summarized drop-block into the bounds of the newest array preserving history
    squashed_msg = SystemMessage(content=f"[Previous Context Summarized due to Limits]:\n{compressed_text}")
    new_messages = [squashed_msg] + kept_messages
    
    # We overwrite the LangGraph list
    return {"messages": new_messages}


