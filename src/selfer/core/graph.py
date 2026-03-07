from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from selfer.core.state import SelferState
from selfer.agents.router import router_node, route_edge, casual_node
from selfer.agents.planner import planner_node
from selfer.agents.interrogate import user_interrogation_node
from selfer.agents.executor import executor_node
from selfer.agents.tools import selfer_tools
from selfer.core.session import session_manager
from selfer.core.logger import get_query_logger, teardown_query_logger, audit_logger

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
        def warning(self, msg): print(msg)
        def error(self, msg): print(msg)
    logger = DummyLogger()

def create_selfer_graph() -> StateGraph:
    """
    Compiles the Master Selfer LangGraph orchestrated execution loop.
    Currently integrates Phase 6 & 7: Router and Planner.
    """
    workflow = StateGraph(SelferState)

    # Add Nodes
    workflow.add_node("router", router_node)
    workflow.add_node("planner", planner_node)
    workflow.add_node("casual", casual_node)
    workflow.add_node("interrogate", user_interrogation_node)
    workflow.add_node("executor", executor_node)
    
    # Use prebuilt LangGraph ToolNode for executing bounded tools
    tool_node = ToolNode(selfer_tools)
    workflow.add_node("tools", tool_node)
    
    async def planner_edge(state: SelferState):
        """ Checks if the Planner array requires execution, or asks user for validation """
        v = state.get("variables", {})
        if v.get("blocked_on_user"):
            return "interrogate"
        return "executor"
        
    async def executor_edge(state: SelferState):
        """ Routes between Executor, Tools, and End """
        messages = state.get("messages", [])
        v = state.get("variables", {})
        
        if v.get("plan_finished"):
            return END
            
        last_message = messages[-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
            
        # If no tool calls and not finished, loop back or end
        # In a robust system we check if step incremented
        return "executor"

    # Add Edges
    workflow.set_entry_point("router")
    
    # Conditional edge from router based on Route Decision
    workflow.add_conditional_edges(
        "router",
        route_edge,
        {
            "planner": "planner",
            "casual": "casual"
        }
    )
    
    workflow.add_edge("casual", END)
    
    # Conditional exit from planner
    workflow.add_conditional_edges(
        "planner",
        planner_edge,
        {
            "interrogate": "interrogate",
            "executor": "executor",
            END: END
        }
    )
    workflow.add_edge("interrogate", END) # The process stops until user re-triggers entry via router
    
    # Executor loops
    workflow.add_conditional_edges(
        "executor",
        executor_edge,
        {
            "tools": "tools",
            "executor": "executor",
            END: END
        }
    )
    workflow.add_edge("tools", "executor")
    
    # Compile with memory (sqlite saver missing natively so just regular compile for now)
    app = workflow.compile()
    return app

import asyncio

async def run_agent_async(messages: list, repo_state: str = "{}"):
    """
    Primary async graph runner. Creates a fresh QuerySession per call,
    injects the global RepoSession shared context as a minimal LLM prefix,
    and flushes both sessions on completion.
    """
    import os
    root_dir = os.getcwd()

    # Initialize global session (no-op if already loaded)
    session_manager.initialize(root_dir)

    # Create a fresh per-query session
    user_query = messages[-1].content if messages else ""
    qs = session_manager.new_query_session(user_query)
    qs.log("graph", f"Starting query session [{qs.session_id}]")

    # Per-query logger for this invocation
    log = get_query_logger(qs.session_id, "graph")
    log.info(f"Starting graph execution [{qs.session_id}]")
    audit_logger.info(f"Graph invocation start — query: {user_query[:80]}")

    app = create_selfer_graph()
    initial_state = {
        "messages": messages,
        "current_plan": [],
        "current_step": 0,
        "repository_state": repo_state,
        "variables": {},
        "query_session_id": qs.session_id,
        "shared_context": qs.context_summary,  # Pre-built minimal repo context prefix
        "agent_name": "graph",
    }

    result = None
    try:
        result = await app.ainvoke(initial_state)
        qs.finished = True
        qs.log("graph", "Execution completed successfully.")
        audit_logger.info(f"Graph completed [{qs.session_id}]")
    except Exception as e:
        qs.log("graph", f"Execution failed: {e}")
        audit_logger.error(f"Graph failed [{qs.session_id}]: {e}")
        raise
    finally:
        # Flush query session to disk
        qs.flush(session_manager.get_sessions_dir(root_dir))
        # Flush repo session with updated plan state
        plan = result.get("current_plan", []) if isinstance(result, dict) else []
        session_manager.repo.active_plan = plan
        session_manager.flush_repo(root_dir)
        # Tear down the per-query logger to prevent handler leaks
        teardown_query_logger(qs.session_id, "graph")

    return result

def run_agent(messages: list, repo_state: str = "{}"):
    """Synchronous entry wrapper."""
    return asyncio.run(run_agent_async(messages, repo_state))


