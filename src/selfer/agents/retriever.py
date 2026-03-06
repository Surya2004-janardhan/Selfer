import os
import re
from pydantic import BaseModel, Field
from typing import Optional

try:
    from selfer.core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")


class RetrieverInput(BaseModel):
    query: str = Field(description="The search string, regex, or semantic query to look for in the codebase.")

def search_codebase(query: str, root_dir: Optional[str] = None) -> str:
    """
    A simple regex/string retriever across all files mapped in `.selfer/map.json`.
    In a fully fleshed app, this would use vector embeddings from `memory.db`.
    """
    if root_dir is None:
        root_dir = os.getcwd()
        
    results = []
    logger.info(f"Retrieving references for: '{query}'")
    
    try:
        # Regex compilation
        pattern = re.compile(query, re.IGNORECASE)
        
        # Traverse safely
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Ignore standard build/cache directories
            if ".git" in dirnames:
                dirnames.remove(".git")
            if ".venv" in dirnames:
                dirnames.remove(".venv")
            if "node_modules" in dirnames:
                dirnames.remove("node_modules")
            if ".selfer" in dirnames:
                dirnames.remove(".selfer")
                
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            if pattern.search(line):
                                rel_path = os.path.relpath(file_path, root_dir)
                                results.append(f"{rel_path}:{i+1}: {line.strip()}")
                                if len(results) > 20: # Limit results to not overflow token context
                                    break
                except Exception:
                    pass
            if len(results) > 20:
                break
    except Exception as e:
        logger.error(f"Retriever failed parsing query: {e}")
        return f"Retrieval failed: {e}"
        
    if not results:
        return "No matches found in the codebase."
        
    return "Search Results:\n" + "\n".join(results)
