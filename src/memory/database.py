import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

logger = None  # Intentionally avoiding circular imports early
try:
    from core.logger import logger
except ImportError:
    pass

Base = declarative_base()

def get_engine(db_path: str):
    return create_engine(f"sqlite:///{db_path}")

def init_db(workspace_dir: str):
    """Initialize the SQLite database schema inside the .selfer folder."""
    db_path = os.path.join(workspace_dir, ".selfer", "memory.db")
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)
    if logger:
        logger.info(f"Database initialized successfully at {db_path}")
    return engine

def get_session(engine):
    Session = sessionmaker(bind=engine)
    return Session()

