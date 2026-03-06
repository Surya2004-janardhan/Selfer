import os
from typing import TypedDict, Annotated, Sequence, List, Any, Optional
from langchain_core.messages import BaseMessage
import operator

class SelferState(TypedDict):
    """
    The Global State passed around Selfer's LangGraph ecosystem.
    """
    messages: Annotated[Sequence[BaseMessage], operator.add]
    current_plan: List[str]
    current_step: int
    repository_state: str     # Stringified JSON tree from DirectoryMapper
    variables: dict
    query_session_id: str     # Unique ID for per-query logger + session flush
    shared_context: str       # Minimal context prefix from RepoSession (token-efficient)
    agent_name: Optional[str] # Name of the currently active agent for per-agent logger


