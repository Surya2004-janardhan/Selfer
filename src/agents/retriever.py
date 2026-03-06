import os
import re
from pydantic import BaseModel, Field
from typing import Optional

try:
    from core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")
    
from memory.memory_search import query_memory

class RetrieverInput(BaseModel):
    query: str = Field(description="The search string, regex, or semantic query to look for in the codebase.")

def search_codebase(query: str, root_dir: Optional[str] = None) -> str:
    """
    OpenClaw Parity Retriever:
    Queries the SQLite VectorMemory mapped by `selfer init` / `memory_search.py`.
    Limits max token exhaustion natively.
    """
    if root_dir is None:
        root_dir = os.getcwd()
        
    logger.info(f"Retrieving references for: '{query}'")
    
    try:
        # 1. Check mapped VectorMemory first
        db_results = query_memory(query, root_dir=root_dir)
        if db_results:
            results = []
            for db_row in db_results:
                results.append(f"[{db_row['file_path']}]:\n{db_row['chunk_content']}")
            return "Search Results:\n\n" + "\n\n---\n\n".join(results)
            
        logger.info("Semantic DB search yielded zero results. Falling back to direct AST Regex scan...")
        
        # 2. Fallback to raw Regex traversal if DB isn't indexed properly
        results = []
        pattern = re.compile(query, re.IGNORECASE)
        for dirpath, dirnames, filenames in os.walk(root_dir):
            if ".git" in dirnames: dirnames.remove(".git")
            if ".venv" in dirnames: dirnames.remove(".venv")
            if "node_modules" in dirnames: dirnames.remove("node_modules")
            if ".selfer" in dirnames: dirnames.remove(".selfer")
                
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            if pattern.search(line):
                                rel_path = os.path.relpath(file_path, root_dir)
                                results.append(f"{rel_path}:{i+1}: {line.strip()}")
                                if len(results) > 6: # Adhere to OpenClaw 6-item max Results limits!
                                    break
                except Exception:
                    pass
            if len(results) > 6:
                break
                
        if not results:
            return "No matches found in the codebase."
            
        return "Search Results (Regex Fallback):\n" + "\n".join(results)
        
    except Exception as e:
        logger.error(f"Retriever failed processing query: {e}")
        return f"Retrieval failed: {e}"

