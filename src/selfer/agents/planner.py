import json
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from selfer.core.state import SelferState
from selfer.core.llm import LLMFactory
from selfer.core.directory_mapper import DirectoryMapper
from selfer.core.retry import retry_async

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
        def warning(self, msg): print(msg)
        def error(self, msg): print(msg)
    logger = DummyLogger()

PLANNER_SYSTEM_PROMPT = """
You are the Master Planner for Selfer, an autonomous AI orchestration system.
Your job is to read the user's objective and the current Repository State tree, and break the objective down into a rigid JSON array of step-by-step tasks.

Your output MUST be ONLY valid JSON in the following format, with NO markdown formatting, NO backticks, and NO extra text:
[
  "Step 1 Description",
  "Step 2 Description",
  "Step N Description"
]

Repository Environment Context:
{repo_state}
"""

async def planner_node(state: SelferState):
    """
    The Planner Agent reads the user intent and environment, then outputs a strict JSON step array.
    """
    logger.info("PLANNER: Devising execution plan...")
    
    messages = state.get("messages", [])
    repo_state = state.get("repository_state", "{}")
    user_intent = messages[-1].content if messages else "No objective."

    llm = LLMFactory.create_llm()
    system_msg = SystemMessage(content=PLANNER_SYSTEM_PROMPT.format(repo_state=repo_state))
    human_msg = HumanMessage(content=user_intent)

    response = await retry_async(
        lambda: llm.ainvoke([system_msg, human_msg]),
        attempts=3, label="planner/ainvoke"
    )
    
    content = response.content.strip()
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()
        
    try:
        plan_array = json.loads(content)
        if not isinstance(plan_array, list):
            raise ValueError("Output is not a generic list")
    except Exception as e:
        logger.error(f"PLANNER: Failed to parse JSON array! Error: {e}\nContent was: {content}")
        plan_array = [f"Directly execute: {user_intent}"] # fallback

    logger.info(f"PLANNER: Generated {len(plan_array)} steps.")
    
    msg = AIMessage(content=f"I have created a plan with {len(plan_array)} steps:\n" + "\n".join([f"{i+1}. {s}" for i,s in enumerate(plan_array)]))
    
    return {
        "current_plan": plan_array,
        "current_step": 0,
        "messages": [msg]
    }


