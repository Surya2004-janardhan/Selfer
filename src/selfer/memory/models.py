from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone

from .database import Base

class InteractionHistory(Base):
    """Stores the chronological conversation and execution logs of the agent."""
    __tablename__ = 'interaction_history'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # e.g., 'user', 'assistant', 'system', 'tool'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class VectorMemory(Base):
    """Rudimentary storage for RAG embeddings mapping file context."""
    __tablename__ = 'vector_memory'
    
    id = Column(Integer, primary_key=True)
    file_path = Column(String(1024), nullable=False, index=True)
    chunk_content = Column(Text, nullable=False)
    # Storing simplified vector as JSON or separate table pending DB array support.
    embedding_json = Column(Text, nullable=True) 
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
