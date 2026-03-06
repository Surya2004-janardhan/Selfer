import os
from typing import TypedDict, Annotated, Sequence, List, Any
from langchain_core.messages import BaseMessage
import operator

class SelferState(TypedDict):
    """
    The Global State passed around Selfer's LangGraph ecosystem.
    """
    messages: Annotated[Sequence[BaseMessage], operator.add]
    current_plan: List[str]
    current_step: int
    repository_state: str  # Stringified JSON tree from DirectoryMapper
    variables: dict
