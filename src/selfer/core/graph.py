from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from selfer.core.state import SelferState
from selfer.agents.router import router_node, route_edge, casual_node
from selfer.agents.planner import planner_node
from selfer.agents.interrogate import user_interrogation_node
from selfer.agents.executor import executor_node
from selfer.agents.tools import selfer_tools

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
    
    def planner_edge(state: SelferState):
        """ Checks if the Planner array requires execution, or asks user for validation """
        v = state.get("variables", {})
        if v.get("blocked_on_user"):
            return "interrogate"
        return "executor"
        
    def executor_edge(state: SelferState):
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

def run_agent(messages: list, repo_state: str = "{}"):
    """
    Utility wrapper to run the graph and debug outputs.
    """
    app = create_selfer_graph()
    initial_state = {
        "messages": messages,
        "current_plan": [],
        "current_step": 0,
        "repository_state": repo_state,
        "variables": {}
    }
    logger.info("Starting Graph Execution...")
    result = app.invoke(initial_state)
    logger.info("Graph Execution Complete.")
    return result
