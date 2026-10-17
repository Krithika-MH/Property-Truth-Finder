import asyncio
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import uuid

from app.store import save_investigation, record_event

logger = logging.getLogger(__name__)

def get_recordings_dir() -> Path:
    p = Path(__file__).resolve().parent.parent / "fixtures" / "recordings"
    p.mkdir(parents=True, exist_ok=True)
    return p

def get_newest_recording() -> Optional[Dict[str, Any]]:
    rec_dir = get_recordings_dir()
    files = list(rec_dir.glob("*.json"))
    if not files:
        return None
    # Sort by mtime
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    try:
        with open(files[0], "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading recording file {files[0]}: {e}")
        return None

async def start_replay_stream(investigation_id: str, recording_data: Dict[str, Any], speed: float = 2.0):
    """
    Replays past events into the event stream of investigation_id with accelerated relative timing (speed 2x).
    Sets mode to REPLAY and preserves original evidence and run timestamps.
    """
    report = recording_data.get("report", {})
    events = recording_data.get("events", [])
    
    report["id"] = investigation_id
    report["mode"] = "REPLAY"
    save_investigation(investigation_id, report)
    
    for ev in events:
        event_name = ev.get("event")
        data = ev.get("data")
        if data and isinstance(data, dict):
            if "id" in data:
                data["id"] = investigation_id
            if "report_id" in data:
                data["report_id"] = investigation_id
        record_event(investigation_id, event_name, data)
        await asyncio.sleep(0.15 / speed)
