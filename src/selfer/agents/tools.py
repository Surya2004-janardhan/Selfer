import os
from langchain_core.tools import tool

from selfer.agents.file_creator import create_file
from selfer.agents.file_editor import edit_file
from selfer.agents.retriever import search_codebase
from selfer.agents.runner import execute_command
from selfer.agents.git_agent import handle_git

@tool
def tool_create_file(file_path: str, content: str) -> str:
    """
    Creates a new file or overwrites an existing one with the given content.
    Provide the relative or absolute path within the repository.
    """
    try:
        return create_file(file_path, content, root_dir=os.getcwd())
    except Exception as e:
        return f"Error creating file: {str(e)}"

@tool
def tool_edit_file(file_path: str, target_text: str, replacement_text: str) -> str:
    """
    Surgically edits a file by finding a specific text block and replacing it.
    The `target_text` must match the file content exactly.
    """
    try:
        return edit_file(file_path, target_text, replacement_text, root_dir=os.getcwd())
    except Exception as e:
        return f"Error editing file: {str(e)}"

@tool
def tool_search_codebase(query: str) -> str:
    """
    Searches the entire repository for a regex or string match.
    Useful for finding where functions or variables are defined.
    """
    try:
        return search_codebase(query, root_dir=os.getcwd())
    except Exception as e:
        return f"Error searching codebase: {str(e)}"

@tool
def tool_execute_command(command: str) -> str:
    """
    Executes a shell command in the repository root.
    Use this for running tests, listing files, building, or querying system state.
    """
    try:
        return execute_command(command, root_dir=os.getcwd())
    except Exception as e:
        return f"Error executing command: {str(e)}"

@tool
def tool_handle_git(action: str, message: str = None, branch_name: str = None) -> str:
    """
    Performs git operations cleanly.
    Valid actions: 'status', 'diff', 'commit', 'branch'.
    Provide `message` for commit, `branch_name` for new branch.
    """
    try:
        return handle_git(action, message, branch_name)
    except Exception as e:
        return f"Error handling git: {str(e)}"

# The array of tools available to the Executor LLM
selfer_tools = [
    tool_create_file,
    tool_edit_file,
    tool_search_codebase,
    tool_execute_command,
    tool_handle_git
]


