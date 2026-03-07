import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
        def warning(self, msg): print(msg)
    logger = DummyLogger()

# OpenClaw Defaults
DEFAULT_CHUNK_TOKENS = 400
DEFAULT_CHUNK_OVERLAP = 80
DEFAULT_MAX_RESULTS = 6
DEFAULT_MIN_SCORE = 0.35

def get_chroma_db(root_dir: str) -> Chroma:
    """
    Returns the Chroma vector store instance. 
    Uses a highly optimized local embedding model (all-MiniLM-L6-v2 is the default for HF but we can specify it).
    """
    db_path = os.path.join(root_dir, ".selfer", "chroma_db")
    # Utilizing a fast, CPU-friendly HuggingFace embedding model
    embedding_func = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    return Chroma(
        collection_name="selfer_memory",
        embedding_function=embedding_func,
        persist_directory=db_path
    )

def chunk_text(text: str, chunk_size=DEFAULT_CHUNK_TOKENS, overlap=DEFAULT_CHUNK_OVERLAP) -> list:
    """
    Splits larger files into token sliding windows. 
    (Approximating tokens: 4 chars = 1 token)
    """
    char_chunk = chunk_size * 4
    char_overlap = overlap * 4
    
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + char_chunk, text_len)
        chunk = text[start:end]
        chunks.append(chunk)
        if end == text_len:
            break
        start += (char_chunk - char_overlap)
        
    return chunks

def index_repository(root_dir: str):
    """
    Scans the repository, chunks valid code files,
    and inserts them into the Chroma local Vector DB.
    """
    logger.info(f"Indexing repository into high-speed local ChromaDB: {root_dir}")
    
    db = get_chroma_db(root_dir)
    
    # Optional: Clear existing collection if we want a fresh index on init
    # For MVP, we'll just add. In production you might want `db.delete_collection()` first.
    
    documents = []
    metadata = []
    ids = []
    indexed_files = 0
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Ignore bounds
        if ".git" in dirnames: dirnames.remove(".git")
        if ".venv" in dirnames: dirnames.remove(".venv")
        if "node_modules" in dirnames: dirnames.remove("node_modules")
        if ".selfer" in dirnames: dirnames.remove(".selfer")
            
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(file_path, root_dir)
            
            # Basic sanity filter for code files
            if not any(rel_path.endswith(ext) for ext in [".py", ".ts", ".js", ".md", ".json", ".txt", ".html", ".css", ".go", ".rs", ".java", ".cpp", ".c"]):
                continue

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if not content.strip():
                        continue
                    
                    chunks = chunk_text(content)
                    for i, c in enumerate(chunks):
                        documents.append(c)
                        metadata.append({"source": rel_path, "chunk_index": i})
                        ids.append(f"{rel_path}_{i}")
                    
                    indexed_files += 1
            except Exception:
                pass

    if documents:
        # Batch insert into ChromaDB
        db.add_texts(texts=documents, metadatas=metadata, ids=ids)
        logger.info(f"Indexed {indexed_files} source files into {len(documents)} high-speed vector chunks.")
    else:
        logger.info("No text files found to index.")

def query_memory(query_text: str, root_dir: str, max_results=DEFAULT_MAX_RESULTS) -> list:
    """
    Performs a high-speed similarity search using ChromaDB.
    """
    db = get_chroma_db(root_dir)
    
    # Use mmr (Maximal Marginal Relevance) or similarity search. We'll use similarity.
    results = db.similarity_search_with_score(query_text, k=max_results)
    
    # Results is a list of tuples (Document, score)
    # Different distances exist, chroma defaults to l2 distance (lower is better) or cosine depending on config.
    
    formatted_results = []
    for doc, score in results:
        # If we wanted to enforce MIN_SCORE we could, but L2 distance varies wildly. 
        # For MVP we trust the top-K.
        formatted_results.append({
            "file_path": doc.metadata.get("source", "unknown"),
            "chunk_content": doc.page_content,
            "score": score
        })
        
    return formatted_results


