import asyncio
import uuid
from datetime import datetime
from typing import Dict, Optional
from .schemas import ReindexJobRequest, ReindexJobStatus

# In-memory registry of asynchronous re-indexing jobs
REINDEX_JOBS: Dict[str, ReindexJobStatus] = {}

async def run_reindex_task(job_id: str, request: ReindexJobRequest):
    """
    Background worker that simulates the versioned re-indexing workflow:
    1. Pending -> In Progress
    2. Read source texts
    3. Generate candidate vectors using new model/dimension
    4. Validate integrity & dimensionality
    5. Atomic activation simulation
    """
    job = REINDEX_JOBS[job_id]
    job.status = "in_progress"
    
    try:
        # Fast non-blocking async simulation
        job.processed_entities = job.total_entities
        job.status = "validating"
        await asyncio.sleep(0.01)

        # Atomic Activation
        job.status = "activated"
        job.completed_at = datetime.utcnow().isoformat()
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.utcnow().isoformat()

def start_reindex_job(request: ReindexJobRequest) -> ReindexJobStatus:
    job_id = f"reindex-{uuid.uuid4().hex[:8]}"
    status = ReindexJobStatus(
        job_id=job_id,
        status="pending",
        target_embedding_model=request.target_embedding_model,
        target_dimensions=request.target_dimensions,
        total_entities=50,  # Simulated entity pool
        processed_entities=0,
        failed_entities=0,
        started_at=datetime.utcnow().isoformat(),
        completed_at=None,
        error_message=None,
    )
    REINDEX_JOBS[job_id] = status
    # Fire and forget in asyncio event loop
    asyncio.create_task(run_reindex_task(job_id, request))
    return status

def get_reindex_status(job_id: str) -> Optional[ReindexJobStatus]:
    return REINDEX_JOBS.get(job_id)
