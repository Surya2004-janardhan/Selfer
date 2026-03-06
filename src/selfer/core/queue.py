import asyncio
import uuid
from typing import Any, Callable, Coroutine, Dict
from dataclasses import dataclass
from enum import Enum

try:
    from selfer.core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")

class TaskStatus(Enum):
    PENDING = "Pending"
    RUNNING = "Running"
    COMPLETED = "Completed"
    FAILED = "Failed"

@dataclass
class AsyncJob:
    job_id: str
    description: str
    coro: Coroutine
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error: str = None

class SelferEventQueue:
    """
    Singleton mimicking a Node.js-style Background Event Loop managing concurrent
    task executions (e.g., executing OS commands or API calls) without blocking user IO.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SelferEventQueue, cls).__new__(cls)
            cls._instance._init_queue()
        return cls._instance

    def _init_queue(self):
        self._queue = asyncio.Queue()
        self._jobs: Dict[str, AsyncJob] = {}
        self._worker_task = None

    def enqueue(self, description: str, coro: Coroutine) -> str:
        job_id = str(uuid.uuid4())[:8]
        job = AsyncJob(job_id=job_id, description=description, coro=coro)
        self._jobs[job_id] = job
        self._queue.put_nowait(job)
        logger.info(f"Enqueued background job [{job_id}]: {description}")
        return job_id
        
    def get_job_status(self, job_id: str) -> dict:
        job = self._jobs.get(job_id)
        if not job:
            return {"error": "Job not found"}
        return {
            "id": job.job_id,
            "description": job.description,
            "status": job.status.value,
            "result": job.result,
            "error": job.error
        }
        
    def get_all_jobs(self) -> list:
        return [self.get_job_status(jid) for jid in self._jobs]

    async def _worker(self):
        while True:
            job: AsyncJob = await self._queue.get()
            job.status = TaskStatus.RUNNING
            logger.info(f"Worker dequeued job [{job.job_id}]")
            try:
                # Await the actual coroutine attached (e.g. Langchain ainvoke)
                res = await job.coro
                job.result = res
                job.status = TaskStatus.COMPLETED
                logger.info(f"Worker completed job [{job.job_id}] successfully.")
            except Exception as e:
                job.error = str(e)
                job.status = TaskStatus.FAILED
                logger.error(f"Worker failed job [{job.job_id}]: {e}")
            finally:
                self._queue.task_done()

    def start_worker(self):
        if self._worker_task is None or self._worker_task.done():
            self._worker_task = asyncio.create_task(self._worker())
            logger.info("Selfer Event Queue Worker online.")

    async def stop_worker(self):
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            logger.info("Selfer Event Queue Worker stopped.")
            
# Global Export
queue_manager = SelferEventQueue()


