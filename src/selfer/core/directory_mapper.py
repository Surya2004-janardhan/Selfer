import os
import json
from pathlib import Path
from typing import Dict, Any, List

try:
    from selfer.core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")

class DirectoryMapper:
    """
    Constructs a lightweight dict interface representing the filesystem.
    Excludes explicitly ignored directories to save LLM context window tokens.
    """

    DEFAULT_IGNORES = {
        ".git", ".venv", "env", "venv", "__pycache__", 
        "node_modules", ".selfer", "dist", "build", ".next", ".nuxt"
    }

    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.ignore_patterns = self._load_custom_ignores()
        
    def _load_custom_ignores(self) -> set:
        config_path = self.root_dir / ".selfer" / "config.json"
        ignores = set(self.DEFAULT_IGNORES)
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    custom_ignores = config.get("ignore_patterns", [])
                    ignores.update(custom_ignores)
            except Exception as e:
                logger.warning(f"Could not parse custom ignore rules: {e}")
        return ignores
        
    def _should_ignore(self, path: Path) -> bool:
        if path.name in self.ignore_patterns:
            return True
        if path.name.startswith('.') and path.name not in [".github", ".gitignore", ".env"]:
            return True
        return False

    def build_tree(self, max_depth: int = 5) -> Dict[str, Any]:
        """
        Recursively builds a dictionary representation of the directory.
        """
        def _traverse(current_path: Path, current_depth: int) -> Dict[str, Any]:
            if current_depth > max_depth:
                return {"_type": "directory", "_status": "truncated (max depth reached)"}
                
            tree = {}
            try:
                for item in current_path.iterdir():
                    if self._should_ignore(item):
                        continue
                        
                    if item.is_dir():
                        tree[item.name] = _traverse(item, current_depth + 1)
                    else:
                        # Append rough size or type metadata for LLM assistance
                        size_kb = round(item.stat().st_size / 1024, 1)
                        tree[item.name] = f"file ({size_kb} KB)"
            except PermissionError:
                return {"_type": "directory", "_status": "permission denied"}
                
            return tree

        logger.info(f"Mapping directory tree from {self.root_dir}")
        return {
            "_root": str(self.root_dir),
            "structure": _traverse(self.root_dir, current_depth=0)
        }

    def save_map(self) -> str:
        """
        Saves the compressed JSON tree payload to .selfer/map.json 
        so agents can quickly retrieve it without re-crawling.
        """
        tree_data = self.build_tree()
        map_path = self.root_dir / ".selfer" / "map.json"
        
        try:
            with open(map_path, 'w') as f:
                json.dump(tree_data, f, indent=2)
            logger.info(f"Directory map saved strictly to {map_path}")
            return str(map_path)
        except Exception as e:
            logger.error(f"Failed to save map payload: {e}")
            return ""

if __name__ == "__main__":
    mapper = DirectoryMapper(os.getcwd())
    mapper.save_map()
