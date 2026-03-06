from pydantic import BaseModel, Field
from selfer.agents.runner import execute_command
from typing import Optional

class GitInput(BaseModel):
    action: str = Field(description="The git action. Valid inputs: 'status', 'diff', 'commit', 'branch'.")
    message: Optional[str] = Field(None, description="The commit message if action is 'commit'")
    branch_name: Optional[str] = Field(None, description="The branch name if action is 'branch'")

def handle_git(action: str, message: str = None, branch_name: str = None) -> str:
    """
    Pre-packaged git abstractions for Selfer so it doesn't need to manually type raw git commands.
    """
    if action == "status":
        return execute_command("git status")
    elif action == "diff":
        return execute_command("git diff")
    elif action == "commit":
        if not message:
            return "Error: Commit message required."
        return execute_command(f'git add . && git commit -m "{message}"')
    elif action == "branch":
        if not branch_name:
            return "Error: Branch name required."
        return execute_command(f"git checkout -b {branch_name}")
    else:
        return f"Error: Unknown git action: {action}"


