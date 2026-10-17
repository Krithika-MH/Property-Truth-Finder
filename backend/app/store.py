import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory stores
INVESTIGATIONS: Dict[str, Dict[str, Any]] = {}
EVENT_STREAMS: Dict[str, List[Dict[str, Any]]] = {}

def get_data_dir() -> Path:
    p = Path(settings.DATA_DIR) / "investigations"
    p.mkdir(parents=True, exist_ok=True)
    return p

def save_investigation(inv_id: str, data: Dict[str, Any]) -> None:
    INVESTIGATIONS[inv_id] = data
    try:
        file_path = get_data_dir() / f"{inv_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to persist investigation {inv_id} to disk: {e}")

def get_investigation(inv_id: str) -> Optional[Dict[str, Any]]:
    # Check disk first to ensure freshly saved data is returned
    file_path = get_data_dir() / f"{inv_id}.json"
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                INVESTIGATIONS[inv_id] = data
                return data
        except Exception as e:
            logger.error(f"Failed to read investigation {inv_id} from disk: {e}")
            
    if inv_id in INVESTIGATIONS:
        return INVESTIGATIONS[inv_id]
    return None

def delete_investigation(inv_id: str) -> bool:
    INVESTIGATIONS.pop(inv_id, None)
    EVENT_STREAMS.pop(inv_id, None)
    file_path = get_data_dir() / f"{inv_id}.json"
    if file_path.exists():
        try:
            file_path.unlink()
            return True
        except Exception as e:
            logger.error(f"Failed to delete {inv_id} file: {e}")
    return True

def record_event(inv_id: str, event_name: str, data: Any) -> None:
    if inv_id not in EVENT_STREAMS:
        EVENT_STREAMS[inv_id] = []
    EVENT_STREAMS[inv_id].append({
        "event": event_name,
        "data": data,
        "index": len(EVENT_STREAMS[inv_id])
    })

def get_events(inv_id: str) -> List[Dict[str, Any]]:
    return EVENT_STREAMS.get(inv_id, [])
