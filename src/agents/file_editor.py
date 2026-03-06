import os
from pydantic import BaseModel, Field
from typing import Optional

try:
    from selfer.core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")

class FileEditInput(BaseModel):
    file_path: str = Field(description="The relative or absolute path of the file to edit.")
    target_text: str = Field(description="The exact text block to replace. Must match exactly.")
    replacement_text: str = Field(description="The new text to replace the target block with.")

def edit_file(file_path: str, target_text: str, replacement_text: str, root_dir: Optional[str] = None) -> str:
    """
    Surgically edits a file by finding a specific text block and replacing it.
    Uses AST/Regex compatible replacement paradigms.
    """
    if root_dir is None:
        root_dir = os.getcwd()
        
    target_path = os.path.abspath(os.path.join(root_dir, file_path))
    if not target_path.startswith(os.path.abspath(root_dir)):
        raise PermissionError(f"Access denied: path '{file_path}' resolves outside the repository root.")
        
    if not os.path.exists(target_path):
        raise FileNotFoundError(f"File not found: {target_path}")
        
    with open(target_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if target_text not in content:
        raise ValueError("Target text not found in the file. Ensure the text matches exactly, including whitespace.")
        
    new_content = content.replace(target_text, replacement_text, 1)
    
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    logger.info(f"Successfully edited file: {target_path}")
    return f"File successfully updated: {target_path}"
