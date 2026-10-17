import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Callable, Awaitable, List
from pathlib import Path
import httpx

from app.config import settings
from app.models import RunOutcome, ProgressItem

logger = logging.getLogger(__name__)

# Active runs tracking for cancellation
ACTIVE_RUNS: Dict[str, str] = {} # agent_id -> run_id or investigation_id -> list of run_ids

class RateLimited(Exception):
    def __init__(self, retry_after: float = 5.0):
        self.retry_after = retry_after
        super().__init__(f"Rate limited. Retry after {retry_after}s")

def get_now_ist_str() -> str:
    # IST is UTC+5:30
    now = datetime.now(timezone.utc)
    # Return formatted ISO string
    return now.isoformat()

async def cancel_run(run_id: str) -> bool:
    """Cancels a running TinyFish run via POST /v1/runs/{run_id}/cancel"""
    if not run_id:
        return False
    if settings.is_mock_mode:
        logger.info(f"[MOCK] Cancelled run {run_id}")
        return True
    
    url = f"{settings.TINYFISH_BASE_URL}/v1/runs/{run_id}/cancel"
    headers = {"X-API-Key": settings.TINYFISH_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers)
            return resp.status_code in (200, 204)
    except Exception as e:
        logger.error(f"Error cancelling run {run_id}: {e}")
        return False

async def fetch_run_details(run_id: str) -> Dict[str, Any]:
    """Polls or gets run details from GET /v1/runs/{run_id}"""
    if not run_id or settings.is_mock_mode:
        return {}
    
    url = f"{settings.TINYFISH_BASE_URL}/v1/runs/{run_id}"
    headers = {"X-API-Key": settings.TINYFISH_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"Failed to fetch run details for {run_id}: {e}")
    return {}

async def poll_run(
    run_id: str,
    on_event: Optional[Callable[[str, Dict[str, Any]], Awaitable[None]]],
    agent_id: str,
    max_seconds: int = 300
) -> RunOutcome:
    """Polls run status if SSE stream dropped prematurely."""
    start_time = time.time()
    url = f"{settings.TINYFISH_BASE_URL}/v1/runs/{run_id}"
    headers = {"X-API-Key": settings.TINYFISH_API_KEY}
    
    while time.time() - start_time < max_seconds:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status", "RUNNING")
                    if status in ("COMPLETED", "FAILED", "CANCELLED"):
                        outcome = RunOutcome(
                            agent_id=agent_id,
                            run_id=run_id,
                            status=status,
                            result=data.get("result"),
                            error=data.get("error"),
                            num_of_steps=data.get("num_of_steps", 0),
                            duration_s=round(time.time() - start_time, 2),
                            streaming_url=data.get("streaming_url"),
                            video_url=data.get("video_url")
                        )
                        if on_event:
                            await on_event(agent_id, {"type": "COMPLETE", "status": status, "result": outcome.result, "error": outcome.error})
                        return outcome
        except Exception as e:
            logger.warning(f"Poll error for run {run_id}: {e}")
        
        await asyncio.sleep(3)
        
    return RunOutcome(
        agent_id=agent_id,
        run_id=run_id,
        status="TIMEOUT",
        error={"category": "SYSTEM_FAILURE", "message": "Poll timeout exceeded"}
    )

async def _simulate_mock_agent(
    agent_id: str,
    url: str,
    goal: str,
    on_event: Optional[Callable[[str, Dict[str, Any]], Awaitable[None]]],
    mock_fixture_path: Optional[str] = None,
    mock_scenario: str = "clean"
) -> RunOutcome:
    """Simulates realistic SSE progress events and returns fixture data for offline testing."""
    run_id = f"mock-run-{agent_id.lower()}-{int(time.time()*1000)%100000}"
    streaming_url = f"https://mock-agent.tinyfish.ai/stream/{run_id}"
    started_at = get_now_ist_str()
    progress_log: List[ProgressItem] = []
    
    # 1. STARTED
    start_ev = {"type": "STARTED", "run_id": run_id, "start_url": url}
    if on_event:
        await on_event(agent_id, start_ev)
    await asyncio.sleep(0.15)
    
    # 2. STREAMING_URL
    stream_ev = {"type": "STREAMING_URL", "run_id": run_id, "streaming_url": streaming_url}
    if on_event:
        await on_event(agent_id, stream_ev)
    await asyncio.sleep(0.15)
    
    # Realistic progress steps depending on agent type
    purposes = []
    if agent_id == "L":
        purposes = [
            f"Navigating to listing page: {url[:60]}...",
            "Accepting cookies and dismissing banners",
            "Expanding 'More details' and 'Project specifications'",
            "Extracting property title, builder name, and price",
            "Reading carpet/built-up area, BHK configuration and possession date",
            "Searching page content for Karnataka RERA registration numbers",
            "Parsing advertised amenity checklist"
        ]
    elif agent_id == "D":
        purposes = [
            f"Searching official builder web presence on DuckDuckGo",
            "Analyzing organic search ranking results",
            "Filtering out property aggregator domains (Magicbricks, 99acres)",
            "Scoring builder domain candidate URLs"
        ]
    elif agent_id == "B":
        purposes = [
            f"Opening official builder portal: {url[:60]}...",
            "Navigating residential project catalog",
            "Locating specific project landing page",
            "Extracting developer legal entity and verified project location",
            "Reading floor plans, super built-up specs, and starting prices",
            "Cataloging builder amenity status (available vs planned)",
            "Extracting builder-declared RERA registration number"
        ]
    elif agent_id == "R":
        purposes = [
            "Connecting to Karnataka RERA portal (rera.karnataka.gov.in)",
            "Navigating to Services > Registered Projects Search",
            "Entering registration number / project name into portal search",
            "Parsing project record detail modal",
            "Extracting promoter name, sanctioned completion date, and carpet area schedule",
            "Verifying project approval status and registration timestamp"
        ]
    else:
        purposes = ["Initiating browser session", "Navigating target URL", "Extracting required schema fields"]

    for p in purposes:
        ts = datetime.now().strftime("%H:%M:%S")
        progress_log.append(ProgressItem(ts=ts, purpose=p))
        if on_event:
            await on_event(agent_id, {"type": "PROGRESS", "purpose": p, "ts": ts})
        await asyncio.sleep(0.3)

    # Load fixture
    fixture_data: Dict[str, Any] = {}
    fixtures_dir = Path(__file__).resolve().parent.parent / "fixtures" / "mock"
    
    target_filename = f"{agent_id}_clean.json"
    if mock_fixture_path and Path(mock_fixture_path).exists():
        with open(mock_fixture_path, "r", encoding="utf-8") as f:
            fixture_data = json.load(f)
    else:
        file_path = fixtures_dir / target_filename
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                fixture_data = json.load(f)
        else:
            fixture_data = {"status": "success", "note": "fallback mock"}

    finished_at = get_now_ist_str()
    duration = len(purposes) * 0.3 + 0.3
    
    complete_ev = {
        "type": "COMPLETE",
        "status": "COMPLETED",
        "result": fixture_data
    }
    if on_event:
        await on_event(agent_id, complete_ev)
        
    return RunOutcome(
        agent_id=agent_id,
        run_id=run_id,
        status="COMPLETED",
        result=fixture_data,
        num_of_steps=len(purposes) + 2,
        started_at=started_at,
        finished_at=finished_at,
        duration_s=round(duration, 2),
        streaming_url=streaming_url,
        start_url=url,
        final_page_url=fixture_data.get("page_url", url),
        progress_log=progress_log
    )

async def run_agent(
    *,
    agent_id: str,
    url: str,
    goal: str,
    schema: Optional[Dict[str, Any]] = None,
    stealth: bool = False,
    max_seconds: int = 150,
    on_event: Optional[Callable[[str, Dict[str, Any]], Awaitable[None]]] = None,
    fallback_goal: Optional[str] = None,
    mock_fixture_path: Optional[str] = None
) -> RunOutcome:
    """
    Executes a TinyFish web agent using POST /v1/automation/run-sse with raw httpx async streaming.
    Handles rate limiting, automatic stealth escalation on blocks, simplified goal retries,
    stream drop polling fallback, and offline mock execution.
    """
    if settings.is_mock_mode:
        return await _simulate_mock_agent(
            agent_id=agent_id,
            url=url,
            goal=goal,
            on_event=on_event,
            mock_fixture_path=mock_fixture_path
        )

    # LIVE TinyFish call
    headers = {
        "X-API-Key": settings.TINYFISH_API_KEY,
        "Content-Type": "application/json"
    }
    
    current_stealth = stealth
    current_goal = goal
    current_schema = schema
    attempts = 0
    max_retries = 2

    while attempts <= max_retries:
        attempts += 1
        body: Dict[str, Any] = {
            "url": url,
            "goal": current_goal,
            "browser_profile": "stealth" if current_stealth else "lite",
            "agent_config": {"max_duration_seconds": max_seconds}
        }
        if current_schema:
            body["output_schema"] = current_schema

        run_id: Optional[str] = None
        streaming_url: Optional[str] = None
        progress_log: List[ProgressItem] = []
        started_at = get_now_ist_str()
        start_time = time.time()

        try:
            timeout_cfg = httpx.Timeout(connect=15.0, read=max_seconds + 30.0, write=15.0, pool=30.0)
            async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                async with client.stream(
                    "POST",
                    f"{settings.TINYFISH_BASE_URL}/v1/automation/run-sse",
                    headers=headers,
                    json=body
                ) as response:
                    
                    if response.status_code == 429:
                        retry_after = float(response.headers.get("Retry-After", 5.0))
                        logger.warning(f"TinyFish 429 Rate limited. Waiting {retry_after}s before retry.")
                        if on_event:
                            await on_event(agent_id, {"type": "RETRY", "reason": "RATE_LIMITED", "attempt": attempts})
                        await asyncio.sleep(retry_after)
                        continue

                    if response.status_code == 400 and current_schema is not None:
                        # Schema rejected (400 INVALID_INPUT), retry without schema per Section 4.4
                        logger.warning(f"Schema rejected with 400. Retrying once without schema with JSON requested in goal text.")
                        current_schema = None
                        current_goal = f"{goal} Return your final response as valid raw JSON."
                        continue

                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw_data = line[6:].strip()
                        if not raw_data:
                            continue
                        
                        try:
                            ev = json.loads(raw_data)
                        except json.JSONDecodeError:
                            continue

                        ev_type = ev.get("type")

                        if ev_type == "STARTED":
                            run_id = ev.get("run_id")
                            if run_id:
                                ACTIVE_RUNS[agent_id] = run_id
                            if on_event:
                                await on_event(agent_id, ev)

                        elif ev_type == "STREAMING_URL":
                            streaming_url = ev.get("streaming_url")
                            if on_event:
                                await on_event(agent_id, ev)

                        elif ev_type == "PROGRESS":
                            purpose = ev.get("purpose", "")
                            ts = datetime.now().strftime("%H:%M:%S")
                            progress_log.append(ProgressItem(ts=ts, purpose=purpose))
                            ev["ts"] = ts
                            if on_event:
                                await on_event(agent_id, ev)

                        elif ev_type == "HEARTBEAT":
                            pass

                        elif ev_type == "COMPLETE":
                            status = ev.get("status", "COMPLETED")
                            result_data = ev.get("result")
                            raw_error = ev.get("error")
                            if isinstance(raw_error, dict):
                                error_data = raw_error
                            elif raw_error:
                                error_data = {"category": "AGENT_ERROR", "message": str(raw_error)}
                            else:
                                error_data = None

                            duration = round(time.time() - start_time, 2)
                            finished_at = get_now_ist_str()

                            # Check for block/CAPTCHA failures to escalate to stealth
                            is_blocked = False
                            if isinstance(result_data, dict) and (result_data.get("blocked") or result_data.get("status") == "failure"):
                                is_blocked = True
                            if error_data and (error_data.get("category") == "SITE_BLOCKED" or "blocked" in str(error_data.get("message", "")).lower()):
                                is_blocked = True

                            if is_blocked and not current_stealth and attempts <= max_retries:
                                logger.info(f"Agent {agent_id} encountered block. Escalating to stealth profile.")
                                current_stealth = True
                                if on_event:
                                    await on_event(agent_id, {"type": "RETRY", "reason": "SITE_BLOCKED_ESCALATE_STEALTH", "attempt": attempts})
                                break # break SSE loop to retry

                            # Check for goal failure to retry with fallback goal
                            if (status == "FAILED" or (isinstance(result_data, dict) and result_data.get("status") == "failure")) and fallback_goal and current_goal != fallback_goal and attempts <= max_retries:
                                logger.info(f"Agent {agent_id} goal not achieved. Retrying with simplified fallback goal.")
                                current_goal = fallback_goal
                                if on_event:
                                    await on_event(agent_id, {"type": "RETRY", "reason": "SIMPLIFIED_GOAL", "attempt": attempts})
                                break

                            # Best-effort GET /v1/runs/{run_id} to fetch steps and video_url
                            details = {}
                            if run_id:
                                details = await fetch_run_details(run_id)

                            num_steps = details.get("num_of_steps", len(progress_log))
                            video_url = details.get("video_url")

                            outcome = RunOutcome(
                                agent_id=agent_id,
                                run_id=run_id,
                                status=status,
                                result=result_data,
                                error=error_data,
                                num_of_steps=num_steps,
                                started_at=started_at,
                                finished_at=finished_at,
                                duration_s=duration,
                                streaming_url=streaming_url or details.get("streaming_url"),
                                video_url=video_url,
                                start_url=url,
                                final_page_url=(result_data.get("page_url") if isinstance(result_data, dict) else None) or url,
                                progress_log=progress_log
                            )
                            if on_event:
                                await on_event(agent_id, ev)
                            return outcome

                    # If stream ended without COMPLETE event, poll GET /v1/runs/{run_id}
                    if run_id:
                        logger.warning(f"SSE stream ended without COMPLETE for run {run_id}. Polling endpoint.")
                        return await poll_run(run_id, on_event, agent_id, max_seconds=max_seconds)

        except (httpx.ReadTimeout, httpx.ConnectTimeout) as e:
            logger.warning(f"Timeout on agent {agent_id} (attempt {attempts}): {e}")
            if attempts <= max_retries:
                if on_event:
                    await on_event(agent_id, {"type": "RETRY", "reason": "TIMEOUT", "attempt": attempts})
                await asyncio.sleep(2)
                continue
            return RunOutcome(
                agent_id=agent_id,
                run_id=run_id,
                status="TIMEOUT",
                error={"category": "SYSTEM_FAILURE", "message": str(e)},
                duration_s=round(time.time() - start_time, 2)
            )
        except Exception as e:
            logger.error(f"Unexpected error in run_agent {agent_id}: {e}", exc_info=True)
            if attempts <= max_retries:
                await asyncio.sleep(2)
                continue
            return RunOutcome(
                agent_id=agent_id,
                run_id=run_id,
                status="FAILED",
                error={"category": "UNKNOWN", "message": str(e)},
                duration_s=round(time.time() - start_time, 2)
            )

    return RunOutcome(
        agent_id=agent_id,
        run_id=run_id,
        status="FAILED",
        error={"category": "AGENT_FAILURE", "message": "Max retries exceeded"}
    )
