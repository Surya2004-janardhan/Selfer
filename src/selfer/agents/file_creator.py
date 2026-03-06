import os
from pydantic import BaseModel, Field
from typing import Optional

try:
    from selfer.core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")

class FileCreateInput(BaseModel):
    file_path: str = Field(description="The relative or absolute path of the file to create or overwrite.")
    content: str = Field(description="The complete content to write into the file.")
    
def create_file(file_path: str, content: str, root_dir: Optional[str] = None) -> str:
    """
    Creates a new file with the given content. Safely resolves paths using Pydantic validated input structure.
    """
    if root_dir is None:
        root_dir = os.getcwd()
        
    # Security: Ensure path doesn't escape the root directory
    target_path = os.path.abspath(os.path.join(root_dir, file_path))
    if not target_path.startswith(os.path.abspath(root_dir)):
        raise PermissionError(f"Access denied: path '{file_path}' resolves outside the repository root.")
        
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    logger.info(f"Successfully created file: {target_path}")
    return f"File successfully written to {target_path}"


