from typing import Literal, List, Optional, Any, Dict
from pydantic import BaseModel, Field

Status = Literal["MATCHED", "MISMATCH", "NOT_VERIFIED"]
Attention = Literal["INFO", "ATTENTION", "HIGH"]
SourceType = Literal["LISTING", "BUILDER", "RERA", "PORTAL2", "USER"]

class ListingData(BaseModel):
    project_name: Optional[str] = None
    builder_name: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = None
    config_bhk: Optional[str] = None
    price_text: Optional[str] = None
    price_inr: Optional[float] = None
    area_value: Optional[float] = None
    area_unit: Optional[str] = None
    area_type: Optional[str] = None
    possession_text: Optional[str] = None
    possession_ym: Optional[str] = None
    rera_numbers: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    listed_by: Optional[str] = None
    listing_title: Optional[str] = None
    page_url: Optional[str] = None
    blocked: bool = False
    blocked_reason: Optional[str] = None

class BuilderConfig(BaseModel):
    label: Optional[str] = None
    area_value: Optional[float] = None
    area_unit: Optional[str] = None
    area_type: Optional[str] = None
    price_text: Optional[str] = None
    price_inr: Optional[float] = None

class BuilderAmenity(BaseModel):
    name: str
    status: Optional[str] = None  # e.g. "available", "under construction", "planned"

class BuilderData(BaseModel):
    site_url: Optional[str] = None
    page_url: Optional[str] = None
    project_name: Optional[str] = None
    developer_name: Optional[str] = None
    location_text: Optional[str] = None
    configs: List[BuilderConfig] = Field(default_factory=list)
    price_from_inr: Optional[float] = None
    possession_text: Optional[str] = None
    possession_ym: Optional[str] = None
    status_text: Optional[str] = None
    amenities: List[BuilderAmenity] = Field(default_factory=list)
    rera_numbers: List[str] = Field(default_factory=list)
    found_project_page: bool = True
    blocked: bool = False
    blocked_reason: Optional[str] = None

class RERAUnitArea(BaseModel):
    label: Optional[str] = None
    carpet_sqm: Optional[float] = None
    carpet_area_text: Optional[str] = None

class RERARecord(BaseModel):
    found: bool = False
    search_performed: bool = False
    searched_by: Optional[str] = None
    page_url: Optional[str] = None
    registration_no: Optional[str] = None
    project_name: Optional[str] = None
    promoter_name: Optional[str] = None
    location_text: Optional[str] = None
    district: Optional[str] = None
    taluk: Optional[str] = None
    proposed_completion_ym: Optional[str] = None
    proposed_completion_text: Optional[str] = None
    registered_on: Optional[str] = None
    registered_on_text: Optional[str] = None
    status_text: Optional[str] = None
    unit_areas: List[RERAUnitArea] = Field(default_factory=list)
    blocked: bool = False
    blocked_reason: Optional[str] = None

class Evidence(BaseModel):
    id: str  # E1, E2, ...
    source_type: SourceType
    source_name: str
    url: Optional[str] = None
    retrieved_at: str  # ISO string in IST (+05:30)
    field: str
    value: Any
    agent_id: str
    run_id: Optional[str] = None
    note: Optional[str] = None

class ComparisonRow(BaseModel):
    field: str
    listing_value: Optional[str] = None
    builder_value: Optional[str] = None
    rera_value: Optional[str] = None
    verdict: Status
    note: Optional[str] = None
    evidence_ids: List[str] = Field(default_factory=list)

class Finding(BaseModel):
    check_id: Literal["A", "B", "C", "D"]
    title: str
    status: Status
    reason_code: Optional[str] = None
    attention: Attention
    headline: str
    explanation: str
    rows: List[ComparisonRow] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    buyer_questions: List[str] = Field(default_factory=list)

class ProgressItem(BaseModel):
    ts: str
    purpose: str

class AgentRun(BaseModel):
    agent_id: str
    label: str
    state: str  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, TIMEOUT
    run_id: Optional[str] = None
    streaming_url: Optional[str] = None
    video_url: Optional[str] = None
    steps: int = 0
    duration_s: float = 0.0
    start_url: str = ""
    error: Optional[str] = None
    progress: List[ProgressItem] = Field(default_factory=list)

class Metrics(BaseModel):
    total_seconds: float = 0.0
    tinyfish_runs: int = 0
    runs_succeeded: int = 0
    total_steps: int = 0
    domains_visited: List[str] = Field(default_factory=list)
    fields_compared: int = 0
    fields_verified: int = 0
    coverage_pct: float = 0.0
    manual_baseline_minutes: int = 45

class Report(BaseModel):
    id: str
    created_at: str
    listing_url: str
    mode: Literal["LIVE", "REPLAY", "MOCK"]
    listing: Optional[ListingData] = None
    builder: Optional[BuilderData] = None
    rera: Optional[RERARecord] = None
    builder_site_url: Optional[str] = None

    findings: List[Finding] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)
    agents: List[AgentRun] = Field(default_factory=list)
    metrics: Metrics = Field(default_factory=Metrics)
    summary: str = ""
    buyer_checklist: List[str] = Field(default_factory=list)
    limitations_text: str = ""
    banned_phrase_hits: List[str] = Field(default_factory=list)

class RunOutcome(BaseModel):
    agent_id: str
    run_id: Optional[str] = None
    status: str  # COMPLETED, FAILED, CANCELLED, TIMEOUT
    result: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    num_of_steps: int = 0
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration_s: float = 0.0
    streaming_url: Optional[str] = None
    video_url: Optional[str] = None
    start_url: str = ""
    final_page_url: Optional[str] = None
    progress_log: List[ProgressItem] = Field(default_factory=list)

class InvestigationCreateRequest(BaseModel):
    listing_url: str
    builder_url: Optional[str] = None
    manual: Optional[ListingData] = None
