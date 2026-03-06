import os
import logging
from rich.logging import RichHandler

def setup_logger():
    """
    Sets up a centralized logger that outputs beautifully to the CLI via Rich,
    but also strictly logs all transactions into `.selfer/logs/audit.log`
    so the terminal isn't totally overwhelmed.
    """
    
    # Try to resolve root dir to place logs
    root_dir = os.getcwd()
    log_dir = os.path.join(root_dir, '.selfer', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'audit.log')

    # Configure bare python logging wrapper
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            RichHandler(rich_tracebacks=True, markup=True)
        ]
    )
    return logging.getLogger("selfer")

logger = setup_logger()
