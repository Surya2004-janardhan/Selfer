import logging
from rich.logging import RichHandler
from rich.console import Console

console = Console()

def setup_logger(name: str = "selfer", level: int = logging.INFO) -> logging.Logger:
    """Setup a rich logger for Selfer."""
    logging.basicConfig(
        level=level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, console=console, show_path=False)]
    )
    return logging.getLogger(name)

logger = setup_logger()
