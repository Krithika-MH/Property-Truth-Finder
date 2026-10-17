import asyncio
import json
import logging
import uuid
from ipaddress import ip_address
from pathlib import Path
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.models import (
    RunOutcome, InvestigationCreateRequest, Report, ListingData
)
from app.tinyfish import run_agent
from app.orchestrator import InvestigationOrchestrator
from app.store import (
    save_investigation, get_investigation, delete_investigation,
    get_events
)
from app.replay import get_newest_recording, start_replay_stream

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("property-truth-finder")

app = FastAPI(
    title="Property Truth Finder API",
    description="Evidence-first property due-diligence agent powered by TinyFish",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active orchestrators in-memory
ACTIVE_ORCHESTRATORS: Dict[str, InvestigationOrchestrator] = {}

def validate_public_url(url_str: str) -> str:
    """Validates that URL is valid http/https, <= 2048 chars, and not private/localhost."""
    if not url_str or len(url_str) > 2048:
        raise HTTPException(status_code=400, detail="Invalid URL: URL is empty or exceeds 2048 characters.")
    
    try:
        parsed = urlparse(url_str.strip())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL format.")
        
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Invalid URL: Scheme must be http or https.")
        
    host = parsed.hostname
    if not host:
        raise HTTPException(status_code=400, detail="Invalid URL: Host is missing.")
        
    # Block localhost and private IP addresses
    if host.lower() in ("localhost", "127.0.0.1", "::1"):
        raise HTTPException(status_code=400, detail="Security error: Localhost URLs are not allowed.")
        
    try:
        ip = ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
            raise HTTPException(status_code=400, detail="Security error: Private and loopback IP addresses are rejected.")
    except ValueError:
        pass # Host is a domain name, which is normal
        
    return url_str.strip()

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "tinyfish_key_present": bool(settings.TINYFISH_API_KEY and settings.TINYFISH_API_KEY != "mock_key_for_dev"),
        "llm_key_present": bool(settings.LLM_API_KEY),
        "mock_mode": settings.is_mock_mode,
        "version": "1.0.0"
    }

@app.post("/api/tinyfish/selftest", response_model=RunOutcome)
async def tinyfish_selftest():
    """Phase 0 spike: executes one lightweight TinyFish run to prove API connectivity."""
    logger.info("Executing /api/tinyfish/selftest spike...")
    outcome = await run_agent(
        agent_id="SELFTEST",
        url="https://example.com",
        goal="Extract the page title and the first paragraph text. Return JSON.",
        schema={
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "paragraph": {"type": "string"}
            },
            "required": ["title"]
        },
        stealth=False,
        max_seconds=30
    )
    return outcome

@app.get("/api/samples")
async def get_samples():
    samples_path = Path(__file__).resolve().parent.parent / "fixtures" / "samples.json"
    if samples_path.exists():
        with open(samples_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.post("/api/investigations")
async def create_investigation(payload: InvestigationCreateRequest, background_tasks: BackgroundTasks):
    validated_url = validate_public_url(payload.listing_url)
    validated_builder_url = validate_public_url(payload.builder_url) if payload.builder_url else None
    
    inv_id = str(uuid.uuid4())[:8]
    mode = "MOCK" if settings.is_mock_mode else "LIVE"

    orchestrator = InvestigationOrchestrator(
        investigation_id=inv_id,
        listing_url=validated_url,
        builder_url=validated_builder_url,
        manual_data=payload.manual,
        mode=mode
    )
    ACTIVE_ORCHESTRATORS[inv_id] = orchestrator
    
    # Run orchestrator in background task
    background_tasks.add_task(orchestrator.run)
    
    return {"id": inv_id, "mode": mode}

@app.get("/api/investigations/{inv_id}")
async def get_investigation_report(inv_id: str):
    data = get_investigation(inv_id)
    if not data:
        # Check active orchestrator for partial in-flight state
        orch = ACTIVE_ORCHESTRATORS.get(inv_id)
        if orch:
            return {
                "id": inv_id,
                "status": "RUNNING",
                "listing_url": orch.listing_url,
                "mode": orch.mode,
                "agents": [a.model_dump() for a in orch.active_agent_runs.values()]
            }
        raise HTTPException(status_code=404, detail="Investigation not found")
    return data

@app.get("/api/investigations/{inv_id}/events")
async def stream_investigation_events(inv_id: str):
    """
    Server-Sent Events endpoint streaming real-time agent updates to the UI.
    Replays past events upon connection to preserve state across page refreshes.
    """
    async def event_generator():
        last_index = 0
        terminal_events = {"report.ready", "investigation.failed"}
        is_finished = False

        while not is_finished:
            current_events = get_events(inv_id)
            while last_index < len(current_events):
                ev = current_events[last_index]
                event_name = ev.get("event")
                data_str = json.dumps(ev.get("data", {}))
                yield f"event: {event_name}\ndata: {data_str}\n\n"
                
                if event_name in terminal_events:
                    is_finished = True
                last_index += 1

            if is_finished:
                break
                
            await asyncio.sleep(0.2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/investigations/{inv_id}/cancel")
async def cancel_investigation(inv_id: str):
    orch = ACTIVE_ORCHESTRATORS.get(inv_id)
    if orch:
        await orch.cancel()
        return {"status": "CANCELLED"}
    return {"status": "NOT_FOUND"}

@app.post("/api/investigations/{inv_id}/rerun")
async def rerun_investigation(inv_id: str, payload: Dict[str, Any], background_tasks: BackgroundTasks):
    builder_url = payload.get("builder_url")
    existing = get_investigation(inv_id)
    listing_url = existing.get("listing_url") if existing else ""
    if not listing_url:
        raise HTTPException(status_code=404, detail="Original investigation not found")
        
    new_id = f"{inv_id}-rerun"
    mode = "MOCK" if settings.is_mock_mode else "LIVE"
    orch = InvestigationOrchestrator(
        investigation_id=new_id,
        listing_url=listing_url,
        builder_url=builder_url,
        mode=mode
    )
    ACTIVE_ORCHESTRATORS[new_id] = orch
    background_tasks.add_task(orch.run)
    return {"id": new_id, "mode": mode}

@app.get("/api/demo/replay")
async def replay_demo(background_tasks: BackgroundTasks):
    """
    Starts a replay of the newest recorded real run through the exact same UI stream path.
    """
    recording = get_newest_recording()
    replay_id = f"replay-{str(uuid.uuid4())[:6]}"
    
    if not recording:
        # Fallback to simulated clean recording fixture if none exists yet
        mock_rec_path = Path(__file__).resolve().parent.parent / "fixtures" / "recordings" / "demo_run_recording.json"
        if mock_rec_path.exists():
            with open(mock_rec_path, "r", encoding="utf-8") as f:
                recording = json.load(f)
        else:
            # Generate a replayable recording from mock clean pipeline
            orch = InvestigationOrchestrator(
                investigation_id=replay_id,
                listing_url="https://www.magicbricks.com/propertyDetails/2-BHK-1150-Sq-ft-Multistorey-Apartment-FOR-Sale-Whitefield-in-Bangalore&id=4d4235333633393139",
                mode="REPLAY"
            )
            background_tasks.add_task(orch.run)
            return {"id": replay_id, "mode": "REPLAY"}

    background_tasks.add_task(start_replay_stream, replay_id, recording)
    return {"id": replay_id, "mode": "REPLAY"}

@app.delete("/api/investigations/{inv_id}")
async def delete_investigation_endpoint(inv_id: str):
    delete_investigation(inv_id)
    ACTIVE_ORCHESTRATORS.pop(inv_id, None)
    return {"status": "DELETED", "id": inv_id}

# Static file serving and SPA client-side fallback
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.responses import FileResponse
    
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build index not found")
