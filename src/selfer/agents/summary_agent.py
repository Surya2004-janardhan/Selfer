from langchain_core.messages import SystemMessage, HumanMessage
from selfer.core.llm import LLMFactory
from selfer.core.state import SelferState

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

def summarize_context(state: SelferState) -> dict:
    """
    Compacts the conversation history to prevent token exhaustion.
    """
    messages = state.get("messages", [])
    if len(messages) < 10:
        return {} # Not enough history to warrant compressing
        
    logger.info("Executing periodic Summary compression...")
    
    # Grab the last 10 messages except the very first system message if present
    recent = "\n".join([m.content for m in messages[-10:] if hasattr(m, 'content') and m.content])
    
    llm = LLMFactory.create_llm()
    system_msg = SystemMessage(content=SUMMARY_PROMPT.format(history=recent))
    
    response = llm.invoke([system_msg])
    compressed_text = response.content
    
    logger.info("Context compressed successfully.")
    
    # Future LangGraph design: This state overwrite mechanism would replace 
    # the middle of the 'messages' array with the Summary AI message to preserve limits.
    # For now, we return it into variables.
    variables = state.get("variables", {})
    variables["latest_summary"] = compressed_text
    
    return {"variables": variables}
