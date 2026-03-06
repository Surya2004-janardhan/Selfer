from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from selfer.core.state import SelferState
from selfer.core.llm import LLMFactory
from selfer.agents.tools import selfer_tools

try:
    from selfer.core.logger import get_query_logger, audit_logger
except ImportError:
    import logging
    audit_logger = logging.getLogger("selfer")
    def get_query_logger(qid, name): return audit_logger

EXECUTOR_PROMPT = """
You are the Executor Agent for Selfer.
Your task is to complete the CURRENT STEP from the overall plan.
You have access to tools that can read/write files, search the codebase, run terminal commands, and manage git.

Current Step to Execute:
{current_step_desc}

Overall Plan Context:
{plan}

Use the provided tools to accomplish the current step. 
If you have successfully completed the step (after seeing tool outputs), respond with the exact phrase "STEP_COMPLETE".
If you need to use tools, call them. Do not ask the user for permission.
"""

async def executor_node(state: SelferState):
    """
    The Executor calls tools to complete the current step of the plan.
    Publishes minimal logs to query-scoped console, full trace to audit.
    """
    qid = state.get("query_session_id", "global")
    log = get_query_logger(qid, "executor")
    audit_logger.info(f"[executor] node entered, session={qid}")
    log.info("Evaluating step execution...")
    
    current_plan = state.get("current_plan", [])
    current_step_idx = state.get("current_step", 0)
    messages = state.get("messages", [])
    
    if current_step_idx >= len(current_plan):
        # We are done with the plan
        logger.info("EXECUTOR: All steps in the plan are completed.")
        return {"variables": {"plan_finished": True}}
        
    step_desc = current_plan[current_step_idx]
    plan_str = "\n".join([f"{i+1}. {s}" for i,s in enumerate(current_plan)])
    
    llm = LLMFactory.create_llm().bind_tools(selfer_tools)
    
    # We create a focused context for the Executor, containing the recent tool messages
    # and the system prompt. We don't want to pass the entire chat history necessarily,
    # but for LangGraph standard setups, we append to `messages`.
    
    # Let's see if the last message is from the Executor and has tool calls, 
    # we just pass the messages list so it sees the ToolMessage responses.
    
    # However, we need to ensure the system prompt is present.
    # We can inject it dynamically.
    # Inject shared_context as a token-saving prefix (avoids re-sending full repo tree)
    shared_context = state.get("shared_context", "")
    context_prefix = f"{shared_context}\n\n" if shared_context else ""
    system_msg = SystemMessage(content=context_prefix + EXECUTOR_PROMPT.format(
        current_step_desc=step_desc, plan=plan_str
    ))
    
    # LangGraph expects us to just invoke the LLM with the messages
    # But we want to prepend the system_msg.
    # To keep it safe, we'll build a temporary list for LLM invocation
    invoke_messages = [system_msg] + messages
    
    response = await llm.ainvoke(invoke_messages)
    
    logger.info(f"EXECUTOR: LLM responded. Tool calls: {len(response.tool_calls)}")
    
    # If the LLM says STEP_COMPLETE, we advance the step index
    if "STEP_COMPLETE" in response.content:
        logger.info(f"EXECUTOR: Step {current_step_idx + 1} completed!")
        return {
            "current_step": current_step_idx + 1,
            "messages": [response]
        }
        
    return {"messages": [response]}


