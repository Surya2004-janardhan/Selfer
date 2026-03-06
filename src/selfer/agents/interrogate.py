import json
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from selfer.core.state import SelferState

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
    logger = DummyLogger()

def user_interrogation_node(state: SelferState):
    """
    Halts the graph and routes a question directly to the user (via CLI or Telegram).
    The system waits until the user adds a new HumanMessage to unblock the sequence.
    """
    variables = state.get("variables", {})
    pending_question = variables.get("pending_user_question")
    
    if not pending_question:
        logger.info("INTERROGATE: No question found, resuming generic flow.")
        return {"variables": {"blocked_on_user": False}}
        
    logger.info(f"INTERROGATE: Escalating to User: {pending_question}")
    
    # In full reality, this node returns END or interrupts the LangGraph checkpoint until
    # an external event occurs. For MVP, we insert the system prompt requesting a fix, 
    # flag the state, and let the loop end so the CLI handler knows to wait for input.
    
    msg = AIMessage(content=f"[SYSTEM: BLOCKED ON USER]\nSelfer requires assistance:\n{pending_question}")
    variables["blocked_on_user"] = True
    
    return {
        "messages": [msg],
        "variables": variables
    }


