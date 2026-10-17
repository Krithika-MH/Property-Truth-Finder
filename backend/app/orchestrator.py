import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable, Awaitable
from urllib.parse import urlparse

from app.config import settings
from app.models import (
    ListingData, BuilderData, RERARecord,
    Report, Finding, Evidence, AgentRun, Metrics,
    ProgressItem, RunOutcome
)
from app.tinyfish import run_agent, cancel_run, get_now_ist_str
from app.agents import (
    AGENT_L_GOAL, AGENT_L_FALLBACK_GOAL, AGENT_L_SCHEMA, parse_agent_l_result,
    build_agent_d_url, AGENT_D_GOAL, AGENT_D_SCHEMA,
    build_agent_b_goal, AGENT_B_SCHEMA, parse_agent_b_result,
    build_agent_r_goal, AGENT_R_SCHEMA, parse_agent_r_result
)
from app.portals import infer_state_from_rera, get_portal_adapter
from app.normalize import extract_project_hints_from_url, KNOWN_BUILDER_DOMAINS
from app.compare import build_comparison_and_findings
from app.explain import explain_investigation
from app.store import save_investigation, record_event, get_investigation


logger = logging.getLogger(__name__)

# Global semaphore for TinyFish concurrent runs
SEMAPHORE = asyncio.Semaphore(settings.MAX_CONCURRENT_RUNS)

LIMITATIONS_STATEMENT = (
    "This report compares information published on a listing, a builder website and a RERA portal at the time shown. "
    "A successful RERA search does not prove that every detail is true, that the individual seller owns the flat, "
    "or that the property is free of legal issues. Not verified does not mean something is wrong, only that we could "
    "not confirm it. Before paying any amount, consider independent legal verification of title, approvals and "
    "encumbrances. This is an information aid, not legal advice or a guarantee."
)

AGGREGATOR_DOMAINS = {
    "magicbricks.com", "99acres.com", "housing.com", "nobroker.in", "nobroker.com",
    "commonfloor.com", "squareyards.com", "proptiger.com", "makaan.com",
    "anarock.com", "olx.in", "quikr.com", "justdial.com", "wikipedia.org",
    "facebook.com", "instagram.com", "youtube.com", "linkedin.com", "twitter.com", "x.com"
}

def rank_builder_candidates(results: List[Dict[str, Any]], builder_name: str, project_name: str, locality: str = "") -> Optional[str]:
    """
    Ranks search results per PRD Section 4.6 to find the official builder domain.
    Rejects aggregators, applies weighted scoring, and enforces a score threshold of at least 2.
    """
    if not results:
        return None

    clean_builder = (builder_name or "").lower().split()
    clean_proj = (project_name or "").lower()
    clean_loc = (locality or "").lower()

    scored = []
    for item in results:
        url = item.get("url", "")
        title = (item.get("title", "")).lower()
        snippet = (item.get("snippet", "")).lower()

        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
        except Exception:
            continue

        # Reject aggregator domains
        if any(agg in domain for agg in AGGREGATOR_DOMAINS):
            continue

        # Reject search engine internal paths
        if "duckduckgo.com" in domain or "google." in domain or "bing.com" in domain:
            continue

        score = 0
        # +3 if domain contains token of builder name
        if any(token in domain for token in clean_builder if len(token) > 2 and token not in ("n/a", "none")):
            score += 3
        # +3 if domain contains project name token
        if any(token in domain for token in clean_proj.split() if len(token) > 3 and token not in ("n/a", "none")):
            score += 3
        # +2 if title contains project name
        if clean_proj and clean_proj in title:
            score += 2
        # +1 if snippet mentions locality
        if clean_loc and clean_loc in snippet:
            score += 1
        # +1 if URL path contains "project" or slug
        if "project" in parsed.path.lower() or (clean_proj and clean_proj.replace(" ", "-") in parsed.path.lower()):
            score += 1

        scored.append((score, url))

    if not scored:
        return None

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_url = scored[0]
    return best_url if best_score >= 2 else None


class InvestigationOrchestrator:
    def __init__(self, investigation_id: str, listing_url: str, builder_url: Optional[str] = None, manual_data: Optional[ListingData] = None, mode: str = "LIVE"):
        self.id = investigation_id
        self.listing_url = listing_url
        self.builder_url = builder_url
        self.manual_data = manual_data
        self.mode = mode
        self.is_cancelled = False
        self.active_agent_runs: Dict[str, AgentRun] = {}
        self.raw_event_log: List[Dict[str, Any]] = []
        self.start_time = time.time()

    async def emit_event(self, event_name: str, data: Any):
        """Emits an event to the store and in-memory event bus."""
        event_record = {"event": event_name, "data": data, "ts": datetime.now().strftime("%H:%M:%S")}
        self.raw_event_log.append(event_record)
        record_event(self.id, event_name, data)

    async def _handle_tinyfish_callback(self, agent_id: str, ev: Dict[str, Any]):
        """Callback fed directly into the SSE stream contract."""
        ev_type = ev.get("type")
        ar = self.active_agent_runs.get(agent_id)

        if ev_type == "STARTED":
            if ar:
                ar.run_id = ev.get("run_id")
                ar.state = "RUNNING"
            await self.emit_event("agent.started", {
                "agent_id": agent_id,
                "label": ar.label if ar else agent_id,
                "start_url": ev.get("start_url", ""),
                "ts": datetime.now().strftime("%H:%M:%S")
            })

        elif ev_type == "STREAMING_URL":
            if ar:
                ar.streaming_url = ev.get("streaming_url")
            await self.emit_event("agent.streaming_url", {
                "agent_id": agent_id,
                "run_id": ev.get("run_id"),
                "streaming_url": ev.get("streaming_url")
            })

        elif ev_type == "PROGRESS":
            purpose = ev.get("purpose", "")
            ts = ev.get("ts", datetime.now().strftime("%H:%M:%S"))
            if ar:
                ar.steps += 1
                ar.progress.append(ProgressItem(ts=ts, purpose=purpose))
            await self.emit_event("agent.progress", {
                "agent_id": agent_id,
                "purpose": purpose,
                "ts": ts
            })

        elif ev_type == "RETRY":
            await self.emit_event("agent.retry", {
                "agent_id": agent_id,
                "reason": ev.get("reason"),
                "attempt": ev.get("attempt")
            })

        elif ev_type == "COMPLETE":
            status = ev.get("status", "COMPLETED")
            if ar:
                ar.state = status
            await self.emit_event("agent.completed", {
                "agent_id": agent_id,
                "state": status,
                "steps": ar.steps if ar else 0,
                "duration_s": round(time.time() - self.start_time, 2),
                "error": ev.get("error")
            })

    async def run(self) -> Report:
        """Executes the full staged pipeline with fault-tolerant fallbacks."""
        report_mode = "MOCK" if settings.is_mock_mode else self.mode
        await self.emit_event("investigation.started", {"id": self.id, "listing_url": self.listing_url, "mode": report_mode})

        # Initialize Agent Tracking
        self.active_agent_runs["L"] = AgentRun(agent_id="L", label="Listing Extractor", state="PENDING", start_url=self.listing_url)
        self.active_agent_runs["D"] = AgentRun(agent_id="D", label="Builder Discovery", state="PENDING")
        self.active_agent_runs["B"] = AgentRun(agent_id="B", label="Builder Investigator", state="PENDING")
        self.active_agent_runs["R"] = AgentRun(agent_id="R", label="Karnataka RERA Investigator", state="PENDING")

        listing_data: Optional[ListingData] = self.manual_data
        builder_data: Optional[BuilderData] = None
        rera_record: Optional[RERARecord] = None
        chosen_builder_url: Optional[str] = self.builder_url

        try:
            # -------------------------------------------------------------
            # STAGE 1: LISTING
            # -------------------------------------------------------------
            await self.emit_event("stage.changed", {"stage": "LISTING", "ts": datetime.now().strftime("%H:%M:%S")})

            if not listing_data:
                async with SEMAPHORE:
                    outcome_l = await run_agent(
                        agent_id="L",
                        url=self.listing_url,
                        goal=AGENT_L_GOAL,
                        schema=AGENT_L_SCHEMA,
                        stealth=True,
                        max_seconds=150,
                        on_event=self._handle_tinyfish_callback,
                        fallback_goal=AGENT_L_FALLBACK_GOAL
                    )
                self.active_agent_runs["L"].steps = outcome_l.num_of_steps
                self.active_agent_runs["L"].duration_s = outcome_l.duration_s
                self.active_agent_runs["L"].streaming_url = outcome_l.streaming_url
                self.active_agent_runs["L"].video_url = outcome_l.video_url
                self.active_agent_runs["L"].state = outcome_l.status

                if outcome_l.status == "COMPLETED" and outcome_l.result:
                    listing_data = parse_agent_l_result(outcome_l.result, fallback_url=self.listing_url)
                else:
                    listing_data = ListingData(
                        page_url=self.listing_url,
                        blocked=True,
                        blocked_reason="Listing extraction failed or page access restricted."
                    )

            # Clean up dummy "N/A" or "null" strings
            if listing_data:
                for attr in ("project_name", "builder_name", "locality", "city", "listing_title", "config_bhk"):
                    val = getattr(listing_data, attr, None)
                    if isinstance(val, str) and val.strip().lower() in ("n/a", "none", "null", "unknown", "not stated", ">no title visible on access denied page"):
                        setattr(listing_data, attr, None)

            # Recover project identity from URL hints if missing or blocked (Scenario S8)
            hints = extract_project_hints_from_url(self.listing_url)
            if listing_data:
                if not listing_data.project_name and hints.get("project_name"):
                    listing_data.project_name = hints["project_name"]
                if not listing_data.builder_name and hints.get("builder_name"):
                    listing_data.builder_name = hints["builder_name"]
                if not listing_data.locality and hints.get("locality"):
                    listing_data.locality = hints["locality"]
                if not listing_data.city and hints.get("city"):
                    listing_data.city = hints["city"]
                if not listing_data.config_bhk and hints.get("config_bhk"):
                    listing_data.config_bhk = hints["config_bhk"]
                if not listing_data.listing_title:
                    listing_data.listing_title = f"{listing_data.project_name} in {listing_data.locality}, {listing_data.city}".strip(", ")
                if not listing_data.rera_numbers and hints.get("rera_numbers"):
                    listing_data.rera_numbers = hints["rera_numbers"]
                if not listing_data.area_value and hints.get("area_value"):
                    listing_data.area_value = hints["area_value"]
                    listing_data.area_unit = hints.get("area_unit", "sq ft")
                    listing_data.area_type = hints.get("area_type", "super built-up")
                if not listing_data.price_text and hints.get("price_text"):
                    listing_data.price_text = hints["price_text"]
                    listing_data.price_inr = hints.get("price_inr", 0.0)
                if not listing_data.possession_text and hints.get("possession_text"):
                    listing_data.possession_text = hints["possession_text"]
            
            await self.emit_event("extraction.ready", {"listing": listing_data.model_dump()})

            if self.is_cancelled:
                return self._finalize_cancelled_report(listing_data)

            # -------------------------------------------------------------
            # STAGE 2: DISCOVERY
            # -------------------------------------------------------------
            await self.emit_event("stage.changed", {"stage": "DISCOVERY", "ts": datetime.now().strftime("%H:%M:%S")})

            if not chosen_builder_url and listing_data and listing_data.project_name:
                d_url = build_agent_d_url(listing_data.project_name, listing_data.builder_name or "")
                self.active_agent_runs["D"].start_url = d_url
                async with SEMAPHORE:
                    outcome_d = await run_agent(
                        agent_id="D",
                        url=d_url,
                        goal=AGENT_D_GOAL,
                        schema=AGENT_D_SCHEMA,
                        stealth=False,
                        max_seconds=90,
                        on_event=self._handle_tinyfish_callback
                    )
                self.active_agent_runs["D"].steps = outcome_d.num_of_steps
                self.active_agent_runs["D"].duration_s = outcome_d.duration_s
                self.active_agent_runs["D"].state = outcome_d.status
                
                results = (outcome_d.result or {}).get("results", []) if isinstance(outcome_d.result, dict) else []
                chosen_builder_url = rank_builder_candidates(results, listing_data.builder_name or "", listing_data.project_name or "", listing_data.locality or "")

                # If rank_builder_candidates didn't match, check known official builder domains
                if not chosen_builder_url:
                    b_token = (listing_data.builder_name or "").lower().split()[0] if listing_data.builder_name else ""
                    if b_token in KNOWN_BUILDER_DOMAINS:
                        chosen_builder_url = KNOWN_BUILDER_DOMAINS[b_token]

            # -------------------------------------------------------------
            # STAGE 3: INVESTIGATE (B and R in parallel)
            # -------------------------------------------------------------
            await self.emit_event("stage.changed", {"stage": "INVESTIGATE", "ts": datetime.now().strftime("%H:%M:%S")})

            async def run_b() -> Optional[BuilderData]:
                if not chosen_builder_url:
                    self.active_agent_runs["B"].state = "FAILED"
                    self.active_agent_runs["B"].error = "BUILDER_SITE_NOT_FOUND"
                    return None
                
                self.active_agent_runs["B"].start_url = chosen_builder_url
                b_goal = build_agent_b_goal(
                    listing_data.project_name or "",
                    listing_data.builder_name or "",
                    listing_data.locality or "",
                    listing_data.city or ""
                )
                async with SEMAPHORE:
                    outcome_b = await run_agent(
                        agent_id="B",
                        url=chosen_builder_url,
                        goal=b_goal,
                        schema=AGENT_B_SCHEMA,
                        stealth=False,
                        max_seconds=240,
                        on_event=self._handle_tinyfish_callback
                    )
                self.active_agent_runs["B"].steps = outcome_b.num_of_steps
                self.active_agent_runs["B"].duration_s = outcome_b.duration_s
                self.active_agent_runs["B"].streaming_url = outcome_b.streaming_url
                self.active_agent_runs["B"].video_url = outcome_b.video_url
                self.active_agent_runs["B"].state = outcome_b.status
                if outcome_b.status == "COMPLETED" and outcome_b.result:
                    return parse_agent_b_result(outcome_b.result, fallback_url=chosen_builder_url)
                return BuilderData(found_project_page=False, blocked=True, blocked_reason="Builder page could not be accessed")

            async def run_r() -> Optional[RERARecord]:
                primary_rera = listing_data.rera_numbers[0] if (listing_data and listing_data.rera_numbers) else ""
                state_code = infer_state_from_rera(primary_rera, listing_data.city if listing_data else "")
                adapter = get_portal_adapter(state_code)
                r_start_url = adapter.get("search_url") or adapter.get("start_url", "https://rera.karnataka.gov.in/projectSearch")
                self.active_agent_runs["R"].start_url = r_start_url


                r_goal = build_agent_r_goal(
                    rera_no=primary_rera,
                    project_name=listing_data.project_name or "",
                    district_guess=listing_data.locality or "Bengaluru",
                    builder_name=listing_data.builder_name or ""
                )
                async with SEMAPHORE:
                    outcome_r = await run_agent(
                        agent_id="R",
                        url=r_start_url,
                        goal=r_goal,
                        schema=AGENT_R_SCHEMA,
                        stealth=True,
                        max_seconds=300,
                        on_event=self._handle_tinyfish_callback
                    )
                self.active_agent_runs["R"].steps = outcome_r.num_of_steps
                self.active_agent_runs["R"].duration_s = outcome_r.duration_s
                self.active_agent_runs["R"].streaming_url = outcome_r.streaming_url
                self.active_agent_runs["R"].video_url = outcome_r.video_url
                self.active_agent_runs["R"].state = outcome_r.status
                if outcome_r.status == "COMPLETED" and outcome_r.result:
                    return parse_agent_r_result(outcome_r.result, fallback_url=r_start_url)
                return RERARecord(blocked=True, blocked_reason="Portal access blocked or timed out")

            # Execute B and R concurrently
            builder_data, rera_record = await asyncio.gather(run_b(), run_r(), return_exceptions=False)

            if self.is_cancelled:
                return self._finalize_cancelled_report(listing_data)

            # -------------------------------------------------------------
            # STAGE 4: COMPARE
            # -------------------------------------------------------------
            await self.emit_event("stage.changed", {"stage": "COMPARE", "ts": datetime.now().strftime("%H:%M:%S")})

            findings, evidence_ledger = build_comparison_and_findings(
                listing=listing_data or ListingData(page_url=self.listing_url),
                builder=builder_data,
                rera=rera_record,
                agent_l_id=self.active_agent_runs["L"].run_id or "run-l",
                agent_b_id=self.active_agent_runs["B"].run_id or "run-b",
                agent_r_id=self.active_agent_runs["R"].run_id or "run-r"
            )

            for finding in findings:
                await self.emit_event("finding.ready", {"finding": finding.model_dump()})

            # -------------------------------------------------------------
            # STAGE 5: REPORT & EXPLAIN
            # -------------------------------------------------------------
            await self.emit_event("stage.changed", {"stage": "REPORT", "ts": datetime.now().strftime("%H:%M:%S")})

            summary, explained_findings, buyer_checklist, banned_hits = await explain_investigation(
                findings=findings,
                evidence=evidence_ledger
            )

            # Compute real metrics strictly from actual run results
            total_duration = round(time.time() - self.start_time, 2)
            runs_list = list(self.active_agent_runs.values())
            tinyfish_runs = sum(1 for r in runs_list if r.state in ("COMPLETED", "FAILED", "RUNNING"))
            runs_succeeded = sum(1 for r in runs_list if r.state == "COMPLETED")
            total_steps = sum(r.steps for r in runs_list)

            domains = set()
            for r in runs_list:
                if r.start_url:
                    try:
                        domains.add(urlparse(r.start_url).netloc)
                    except Exception:
                        pass
            if chosen_builder_url:
                try:
                    domains.add(urlparse(chosen_builder_url).netloc)
                except Exception:
                    pass

            # Fields compared count
            all_rows = [row for f in explained_findings for row in f.rows]
            fields_compared = sum(1 for row in all_rows if sum(1 for val in [row.listing_value, row.builder_value, row.rera_value] if val and val not in ("N/A", "Not checked", "Not stated", "Not available")) >= 2)
            fields_verified = sum(1 for row in all_rows if row.verdict == "MATCHED")
            coverage_pct = round((fields_verified / fields_compared * 100), 1) if fields_compared > 0 else 0.0

            metrics = Metrics(
                total_seconds=total_duration,
                tinyfish_runs=tinyfish_runs,
                runs_succeeded=runs_succeeded,
                total_steps=total_steps,
                domains_visited=list(domains),
                fields_compared=fields_compared,
                fields_verified=fields_verified,
                coverage_pct=coverage_pct,
                manual_baseline_minutes=settings.MANUAL_BASELINE_MINUTES
            )

            report = Report(
                id=self.id,
                created_at=get_now_ist_str(),
                listing_url=self.listing_url,
                mode=report_mode,
                listing=listing_data,
                builder=builder_data,
                rera=rera_record,
                builder_site_url=chosen_builder_url,
                findings=explained_findings,

                evidence=evidence_ledger,
                agents=runs_list,
                metrics=metrics,
                summary=summary,
                buyer_checklist=buyer_checklist,
                limitations_text=LIMITATIONS_STATEMENT,
                banned_phrase_hits=banned_hits
            )

            save_investigation(self.id, report.model_dump())
            await self.emit_event("report.ready", {"report_id": self.id})

            # Save recording for replay demo if in LIVE mode
            if report_mode == "LIVE":
                try:
                    rec_dir = Path(__file__).resolve().parent.parent / "fixtures" / "recordings"
                    rec_dir.mkdir(parents=True, exist_ok=True)
                    rec_file = rec_dir / f"{self.id}.json"
                    with open(rec_file, "w", encoding="utf-8") as rf:
                        json.dump({
                            "report": report.model_dump(),
                            "events": self.raw_event_log
                        }, rf, indent=2, ensure_ascii=False)
                    logger.info(f"Recorded live investigation to {rec_file}")
                except Exception as e:
                    logger.error(f"Failed to record live run: {e}")

            return report

        except Exception as e:
            logger.error(f"Investigation pipeline encountered fatal error: {e}", exc_info=True)
            await self.emit_event("investigation.failed", {"message": str(e)})
            raise

    def _finalize_cancelled_report(self, listing_data: Optional[ListingData]) -> Report:
        """Returns a gracefully cancelled Report object."""
        return Report(
            id=self.id,
            created_at=get_now_ist_str(),
            listing_url=self.listing_url,
            mode=self.mode,
            listing=listing_data,
            agents=list(self.active_agent_runs.values()),
            summary="Investigation was cancelled by the user.",
            limitations_text=LIMITATIONS_STATEMENT
        )

    async def cancel(self):
        self.is_cancelled = True
        for agent_id, ar in self.active_agent_runs.items():
            if ar.run_id and ar.state in ("PENDING", "RUNNING"):
                await cancel_run(ar.run_id)
                ar.state = "CANCELLED"
