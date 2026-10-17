export type Status = 'MATCHED' | 'MISMATCH' | 'NOT_VERIFIED';
export type Attention = 'INFO' | 'ATTENTION' | 'HIGH';
export type SourceType = 'LISTING' | 'BUILDER' | 'RERA' | 'PORTAL2' | 'USER';

export interface ListingData {
  project_name?: string;
  builder_name?: string;
  locality?: string;
  city?: string;
  config_bhk?: string;
  price_text?: string;
  price_inr?: number;
  area_value?: number;
  area_unit?: string;
  area_type?: string;
  possession_text?: string;
  possession_ym?: string;
  rera_numbers?: string[];
  amenities?: string[];
  listed_by?: string;
  listing_title?: string;
  page_url?: string;
  blocked?: boolean;
  blocked_reason?: string;
}

export interface BuilderConfig {
  label?: string;
  area_value?: number;
  area_unit?: string;
  area_type?: string;
  price_text?: string;
  price_inr?: number;
}

export interface BuilderAmenity {
  name: string;
  status?: string;
}

export interface BuilderData {
  site_url?: string;
  page_url?: string;
  project_name?: string;
  developer_name?: string;
  location_text?: string;
  configs?: BuilderConfig[];
  price_from_inr?: number;
  possession_text?: string;
  possession_ym?: string;
  status_text?: string;
  amenities?: BuilderAmenity[];
  rera_numbers?: string[];
  found_project_page?: boolean;
  blocked?: boolean;
  blocked_reason?: string;
}

export interface RERAUnitArea {
  label?: string;
  carpet_sqm?: number;
  carpet_area_text?: string;
}

export interface RERARecord {
  found: boolean;
  search_performed: boolean;
  searched_by?: string;
  page_url?: string;
  registration_no?: string;
  project_name?: string;
  promoter_name?: string;
  location_text?: string;
  district?: string;
  taluk?: string;
  proposed_completion_ym?: string;
  proposed_completion_text?: string;
  registered_on?: string;
  registered_on_text?: string;
  status_text?: string;
  unit_areas?: RERAUnitArea[];
  blocked?: boolean;
  blocked_reason?: string;
}

export interface Evidence {
  id: string; // E1, E2...
  source_type: SourceType;
  source_name: string;
  url?: string;
  retrieved_at: string;
  field: string;
  value: any;
  agent_id: string;
  run_id?: string;
  note?: string;
}

export interface ComparisonRow {
  field: string;
  listing_value?: string;
  builder_value?: string;
  rera_value?: string;
  verdict: Status;
  note?: string;
  evidence_ids: string[];
}

export interface Finding {
  check_id: 'A' | 'B' | 'C' | 'D';
  title: string;
  status: Status;
  reason_code?: string;
  attention: Attention;
  headline: string;
  explanation: string;
  rows: ComparisonRow[];
  evidence_ids: string[];
  buyer_questions: string[];
}

export interface ProgressItem {
  ts: string;
  purpose: string;
}

export interface AgentRun {
  agent_id: string;
  label: string;
  state: string; // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, TIMEOUT
  run_id?: string;
  streaming_url?: string;
  video_url?: string;
  steps: number;
  duration_s: number;
  start_url: string;
  error?: string;
  progress: ProgressItem[];
}

export interface Metrics {
  total_seconds: number;
  tinyfish_runs: number;
  runs_succeeded: number;
  total_steps: number;
  domains_visited: string[];
  fields_compared: number;
  fields_verified: number;
  coverage_pct: number;
  manual_baseline_minutes: number;
}

export interface Report {
  id: string;
  created_at: string;
  listing_url: string;
  mode: 'LIVE' | 'REPLAY' | 'MOCK';
  listing?: ListingData;
  builder?: BuilderData;
  rera?: RERARecord;
  builder_site_url?: string;

  findings: Finding[];
  evidence: Evidence[];
  agents: AgentRun[];
  metrics: Metrics;
  summary: string;
  buyer_checklist: string[];
  limitations_text: string;
  banned_phrase_hits: string[];
}

export interface SampleListing {
  id: string;
  name: string;
  description: string;
  url: string;
  expected_status: Status;
  tag: string;
}
