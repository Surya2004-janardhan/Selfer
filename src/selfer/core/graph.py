from langgraph.graph import StateGraph, END
from selfer.core.state import SelferState
from selfer.agents.router import router_node, route_edge, casual_node
from selfer.agents.planner import planner_node

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
    
    # Execution sub-nodes like 'executor' will be added in Phase 8, 
    # for now we'll route to END from planner.
    
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
    
    workflow.add_edge("planner", END)
    workflow.add_edge("casual", END)
    
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
