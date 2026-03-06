from langchain_core.messages import HumanMessage
from selfer.core.graph import run_agent

if __name__ == "__main__":
    # Test 1: Casual
    # print("Testing Casual Route...")
    # result_casual = run_agent([HumanMessage(content="Hello! How are you doing?")])
    # print(result_casual["messages"][-1].content)
    
    # Test 2: Planner
    print("\nTesting Planner Route...")
    result_planner = run_agent([HumanMessage(content="Create a python script that prints hello world to the console.")])
    print("\nPlanner Array Output:")
    print(result_planner.get("current_plan"))
