# Architecture & Deep Dive: Property Truth Finder

## 1. Overview
Property Truth Finder reconciles Indian real estate listings against builder sites and government RERA portals using autonomous TinyFish web agents.

```
+------------------------------------------------------------------------------------------------+
|                                    REACT 18 SINGLE PAGE APP                                     |
|  - Landing Page: URL input, sample chips, manual entry fallback                                |
|  - Mission Control: 3 live TinyFish viewports (iframes), stage stepper, activity feed          |
|  - Report View: Verification Coverage ring, 4 finding cards, cross-source matrix, checklist    |
|  - /how-it-works: Architecture breakdown, agent registry, live telemetry                      |
+------------------------------------------------------------------------------------------------+
                                           |                      ^
                                POST /api/investigations          | SSE /api/investigations/{id}/events
                                           v                      |
+------------------------------------------------------------------------------------------------+
|                               FASTAPI ASYNCHRONOUS ORCHESTRATOR                                |
|                                                                                                |
|   1. STAGE LISTING (Agent L)                                                                   |
|      - Run TinyFish on listing URL with stealth profile                                        |
|      - Extracts: project name, builder, RERA ID, price, area, possession, amenities            |
|                                                                                                |
|   2. STAGE DISCOVERY (Agent D)                                                                 |
|      - Run TinyFish on DuckDuckGo search: "{project} {builder} official website"               |
|      - Backend heuristic ranker rejects aggregator domains (Magicbricks, 99acres)              |
|      - Scores builder domain (+3 builder name, +2 project title, +1 locality)                  |
|                                                                                                |
|   3. STAGE INVESTIGATE (Parallel Agents B & R via asyncio.gather)                              |
|      - Agent B: Explores builder portal, extracts floor plans, amenity status, declared RERA   |
|      - Agent R: Opens rera.karnataka.gov.in, searches RERA ID, parses sanctioned completion    |
|                                                                                                |
|   4. STAGE COMPARE (Deterministic Python in compare.py)                                        |
|      - Check A: RERA registration (number exact match, name & promoter fuzzy scores >= 85)     |
|      - Check B: Builder identity (developer entity, location containment, phase normalization) |
|      - Check C: Amenities evidence ladder (supported vs planned vs unlisted)                   |
|      - Check D: Price, area (carpet vs super built-up trap), possession date tolerance         |
|                                                                                                |
|   5. STAGE REPORT (explain.py + store.py)                                                      |
|      - Cites evidence IDs [E#]                                                                 |
|      - Scans for banned words (fraud, scam, safe to buy); replaces with template fallbacks     |
|      - Computes verification coverage % and saves run telemetry                                |
+------------------------------------------------------------------------------------------------+
```

---

## 2. TinyFish Web Agent Integration
- **Endpoint**: `POST https://agent.tinyfish.ai/v1/automation/run-sse`
- **Authentication**: `X-API-Key: $TINYFISH_API_KEY`
- **Stream Processing**: Raw `httpx.AsyncClient` streaming without SDK dependencies.
- **Event Handling**:
  - `STARTED`: Captures `run_id` for tracking and cancellation.
  - `STREAMING_URL`: Forwards live browser iframe URL to UI panes.
  - `PROGRESS`: Pushes purpose string into monospace activity feed with IST timestamp.
  - `COMPLETE`: Extracts typed JSON and triggers completion transitions.
- **Stream Resilience**: If the SSE stream drops prematurely, the backend polls `GET /v1/runs/{run_id}` every 3 seconds until a terminal state is reached.
- **Stealth Escalation**: If bot challenges or CAPTCHAs are detected, the agent automatically retries with `browser_profile="stealth"`.

---

## 3. Comparison Engine & Integrity Rules
The LLM is completely isolated from verdict calculations:
- `MATCHED`: Two or more sources agree within strict mathematical tolerances.
- `MISMATCH`: Two sources state conflicting values beyond tolerance.
- `NOT_VERIFIED`: Insufficient evidence or uncontactable source (e.g. `SITE_BLOCKED`, `NO_RERA_IN_LISTING`, `NOT_COMPARABLE_MEASURE`).

Every finding with status `MATCHED` or `MISMATCH` is backed by at least two immutable `Evidence` ledger entries linking the exact source URL, retrieved value, timestamp, and run ID.
