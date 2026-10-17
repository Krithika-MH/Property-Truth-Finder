# Property Truth Finder 🔍
### *Verify before you pay.*
An evidence-first property due-diligence platform powered by **TinyFish Web Agents**.

Built for the **Ignite With Bangalore Hackathon** (Track: *Problem Statement 1 — Best Use of the TinyFish Platform*).

---

## 🏆 The Problem: The Real Estate Trust Gap
Buying a home is the biggest financial transaction of an Indian family's life, yet buyers are routinely asked to pay non-refundable booking amounts based on listing portal claims alone. Listings often feature:
- Unclear or missing RERA registration numbers
- Possession dates conflicting by 6–18 months against government filings
- Super built-up area marketed without disclosing carpet area or loading factors
- Luxury amenities promised in marketing that are only planned for future phases

**Property Truth Finder** solves this by dispatching autonomous **TinyFish Web Agents** to cross-verify the listing across three independent online sources: the **listing portal**, the **builder's official website**, and the **Karnataka RERA portal (rera.karnataka.gov.in)**.

---

## 🚀 Where TinyFish Fits in the Stack

```
 Browser (React 18 SPA)
 | POST /api/investigations {listing_url, builder_url?} <--- SSE: /api/investigations/{id}/events
 v
 FastAPI Backend Orchestrator (Asyncio) --------------------------------------------------------+
 | Stage 1 Agent L --> TinyFish run-sse on listing URL -> ListingData                          |
 | Stage 2 Discovery --> builder URL (user override or TinyFish search-engine run)             |
 | Stage 3 Agent B (builder site) || Agent R (K-RERA portal) run in PARALLEL                    |
 | Stage 4 Comparison engine (deterministic Python) -> Findings + Evidence ledger              |
 | Stage 5 LLM explanation layer (JSON out, validated) -> Report                               |
 | Real-time Event Bus: forwards STARTED / STREAMING_URL / PROGRESS / COMPLETE to UI           |
 | Store: In-memory + ./data/investigations/{id}.json                                          |
 +---------------------------------------------------------------------------------------------+
   |                                            |                                       |
   v                                            v                                       v
 TinyFish Web Agent API               Anthropic Claude / LLM                     Recorded Run Replay
 (agent.tinyfish.ai/v1/run-sse)       (Explanation & Checklist only)            (Deterministic Backup)
```

1. **TinyFish is the Core Execution Engine**: The LLM *never* browses and *never* invents facts from memory. TinyFish autonomously controls real web browsers to navigate menus, type into government search forms, handle popups, and extract typed schema objects.
2. **Live Mission Control Streams**: Each agent exposes a live iframe viewport (`streaming_url`) and step-by-step `PROGRESS` telemetry directly to the user.
3. **Deterministic Python Comparison Engine**: Status verdicts (`MATCHED`, `MISMATCH`, `NOT_VERIFIED`) are strictly computed in Python code—never by generative guesswork.
4. **Evidence-First Ledger**: Every reported fact links to an immutable evidence record linking source URL, exact extracted value, IST timestamp, and TinyFish run ID.

---

## 🛠️ Tech Stack
- **Web Agent Layer**: TinyFish Web Agent API (`POST /v1/automation/run-sse`, `lite` and `stealth` profiles)
- **Backend**: Python 3.12, FastAPI, Uvicorn, httpx (async streaming SSE), Pydantic v2, RapidFuzz, python-dateutil, pytest
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion
- **Persistence**: In-memory event bus + JSON file ledger (`./data/investigations/`)
- **Deployment**: Render Web Service (unified backend serving `frontend/dist`) / Docker

---

## ⚡ Quickstart & Local Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Clone and Configure
```bash
git clone https://github.com/krithika/property-truth-finder.git
cd property-truth-finder
```

Copy the environment template:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```ini
# TinyFish account MUST be created via the hackathon referral link
TINYFISH_API_KEY=your_tinyfish_key_here
TINYFISH_BASE_URL=https://agent.tinyfish.ai
TINYFISH_MOCK=0 # Set to 1 for offline fixture development
MAX_CONCURRENT_RUNS=3
INVESTIGATION_TIMEOUT_SECONDS=600

# LLM Explanation Layer
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_API_KEY=your_anthropic_key_here
```

> **Mandatory Referral Account Notice**: The TinyFish account must be registered exclusively through the official hackathon referral link:
> `https://agent.tinyfish.ai/sign-up?ref=v1.dXNlcl8zSm10b3psUVhEaXI4NjZGMGdkeW1FZERodlo.eBDpjwv2_p8hsOOjeI7KLbQ2ONxk_zQnDMkV-uyWRPk`

### 3. Run Backend
```bash
cd backend
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Run Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` requests to port 8000.

---

## 🧪 Automated Testing
Run the complete unit, banned-phrase, evidence-integrity, and scenario test suite:
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```
**Test Coverage**:
- `test_phase0.py`: Health sanity and Phase 0 `/api/tinyfish/selftest` connectivity.
- `test_unit_and_scenarios.py`: Money parsing (`1.25 Cr`, `85 Lac`), area square-meter conversions, possession parsing, fuzzy name scoring, amenity evidence ladder, banned-phrase filtering, and evidence ledger referential integrity.
- `test_scenarios_s1_s8.py`: End-to-end execution of scenarios S1 through S8 from PRD Appendix D.
- `test_api_endpoints.py`: REST routes, SSE event contract, cancellation, and SPA routing fallback.

---

## 🚢 Deploying to Render
The repository includes a ready-to-use `render.yaml` blueprint.

1. Create a **Web Service** on Render pointing to your repository.
2. Set Build Command:
   ```bash
   pip install -r backend/requirements.txt && npm --prefix frontend ci && npm --prefix frontend run build
   ```
3. Set Start Command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend
   ```
4. Set Environment Variables:
   - `TINYFISH_API_KEY`: Your key from the hackathon account
   - `TINYFISH_MOCK`: `0`
   - `LLM_API_KEY`: Your LLM key
5. Health Check Path: `/api/health`

---

## 🎤 3-Minute Hackathon Demo Script (PRD Section 10.2)

| Time | What you say and do |
| :--- | :--- |
| **0:00 – 0:30** | **The Trust Gap**: *"Buying a flat is the biggest purchase of your life, but buyers are asked to pay lakhs based on an advertisement alone. We built Property Truth Finder to eliminate this trust gap using TinyFish autonomous web agents."* |
| **0:30 – 0:50** | **Start Investigation**: Click one of the Bengaluru sample chips on the landing page (e.g. *Brigade Cosmopolis* or *Sobha Neopolis*) and click **"Investigate this listing"**. |
| **0:50 – 1:50** | **Mission Control**: *"TinyFish is the execution layer. These are real browsers."* Point out the live agent viewports: Agent L extracting listing claims, Agent B finding the builder's official project page, and Agent R querying the Karnataka RERA portal in parallel. Point out the live monospace activity feed and live step counters. |
| **1:50 – 2:35** | **Audit Report & Evidence Drawer**: Show the **Verification Coverage ring** (e.g., 7 of 12 fields cross-checked). Show one **MATCHED** finding and one **MISMATCH** finding. Click **"View evidence"** to open the side drawer displaying the exact raw text, timestamp, and TinyFish run ID. Highlight the **Carpet vs Super Built-up area insight** (`NOT_COMPARABLE_MEASURE`). |
| **2:35 – 2:55** | **Buyer Checklist & Metrics**: Show the interactive buyer questions to ask the builder before paying a booking deposit. Highlight the real metrics strip: *4 runs, 28 browser steps, 3 domains, 48s elapsed vs ~45 minutes manual effort*. |
| **2:55 – 3:00** | **Limitation & Close**: Point to the prominent amber limitation banner: *"We do not say a property is safe. We show what is verified, what conflicts, and what still needs proof."* |

---

## 🔒 Non-Negotiable Rules & Compliance
- **Honest Uncertainty**: Only three statuses exist: `MATCHED`, `MISMATCH`, and `NOT_VERIFIED`. Blocked pages, CAPTCHAs, or missing search results are strictly reported as `NOT_VERIFIED` with reason codes—never fabricated as mismatches.
- **Banned Language Filter**: Accusatory phrases (*fraud, scam, illegal, cheat, safe to buy, guaranteed*) are blocked by backend regex filters with deterministic template fallbacks.
- **Read-Only Agents**: Agent safety preamble strictly forbids logging in, submitting forms with personal data, or clicking sales lead-capture buttons.
- **Zero Hallucination**: AI only synthesizes structured evidence citing `[E#]` evidence IDs and cannot alter status verdicts.

---

## 📄 License & Ownership
Created by **M. Krithika** for the Ignite With Bangalore Hackathon (October 2026).
Powered by **TinyFish Web Agents**.
