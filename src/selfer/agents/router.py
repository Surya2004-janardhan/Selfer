import json
from typing import Literal

from langchain_core.messages import SystemMessage, HumanMessage
from selfer.core.state import SelferState
from selfer.core.llm import LLMFactory
from selfer.core.retry import retry_async

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
        def warning(self, msg): print(msg)
        def error(self, msg): print(msg)
    logger = DummyLogger()


async def router_node(state: SelferState):
    """
    Router node acts as the Master Supervisor.
    It checks if there's an active plan or if the new message requires execution/planning.
    """
    logger.info("ROUTER: Evaluating current state...")
    messages = state.get("messages", [])
    if not messages:
        return {"messages": []}

    # Simplistic routing: if the user just said "hi" or it's a casual remark without actionable instruction,
    # it might just answer directly. If there is a plan active, it routes to executor.
    
    # In a full LangGraph, we'd use an LLM with tool bindings to classification.
    # We will build a small routing prompt.
    llm = LLMFactory.create_llm()
    prompt = f"""You are the Master Supervisor Router for Selfer.
Your job is to read the latest user message and decide if it needs 'planning' (building a step-by-step array of tasks) or if it's just 'casual' chat.
Return strictly a JSON object: {{"route": "planner"}} or {{"route": "casual"}}

Latest message: {messages[-1].content}
"""
    
    response = await retry_async(
        lambda: llm.ainvoke([HumanMessage(content=prompt)]),
        attempts=3, label="router/ainvoke"
    )
    try:
        decision = json.loads(response.content).get("route", "casual")
    except Exception:
        decision = "planner" # default to planner if json parsing fails

    logger.info(f"ROUTER Decision: {decision}")
    
    # We don't overwrite messages here, just return nothing, edges will use decision
    # Wait, the node itself should maybe just be a conditional edge function.
    # Let's return a dummy message to track routing if needed, or state variable.
    # For now, we'll store the `route_decision` in variables.
    variables = state.get("variables", {})
    variables["route_decision"] = decision
    return {"variables": variables}

def route_edge(state: SelferState) -> Literal["planner", "casual"]:
    variables = state.get("variables", {})
    return variables.get("route_decision", "casual")

async def casual_node(state: SelferState):
    """
    Handles casual non-actionable conversation natively.
    """
    logger.info("CASUAL: Generating conversational reply.")
    llm = LLMFactory.create_llm()
    response = await llm.ainvoke(state.get("messages", []))
    return {"messages": [response]}


