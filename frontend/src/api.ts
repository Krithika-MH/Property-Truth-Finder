import { useState, useEffect, useRef } from 'react';
import { Report, SampleListing, ListingData, Finding, AgentRun } from './types';

export const API_BASE = '/api';

export async function fetchHealth(): Promise<{
  status: string;
  tinyfish_key_present: boolean;
  llm_key_present: boolean;
  mock_mode: boolean;
}> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchSamples(): Promise<SampleListing[]> {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) return [];
  return res.json();
}

export async function createInvestigation(params: {
  listing_url: string;
  builder_url?: string;
  manual?: ListingData;
}): Promise<{ id: string; mode: 'LIVE' | 'REPLAY' | 'MOCK' }> {
  const res = await fetch(`${API_BASE}/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to start investigation');
  }
  return res.json();
}

export async function fetchInvestigationReport(id: string): Promise<Report> {
  const res = await fetch(`${API_BASE}/investigations/${id}`);
  if (!res.ok) throw new Error('Investigation not found');
  return res.json();
}

export async function cancelInvestigation(id: string): Promise<void> {
  await fetch(`${API_BASE}/investigations/${id}/cancel`, { method: 'POST' });
}

export async function rerunInvestigation(id: string, builder_url?: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/investigations/${id}/rerun`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ builder_url }),
  });
  if (!res.ok) throw new Error('Failed to re-run investigation');
  return res.json();
}

export async function startDemoReplay(): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/demo/replay`);
  if (!res.ok) throw new Error('Failed to initiate demo replay');
  return res.json();
}

export interface ActivityFeedItem {
  id: string;
  agentId: string;
  agentLabel: string;
  purpose: string;
  ts: string;
  isRetry?: boolean;
  isError?: boolean;
}

export interface UseInvestigationStreamReturn {
  currentStage: string;
  agents: Record<string, AgentRun>;
  feed: ActivityFeedItem[];
  listingData: ListingData | null;
  reportReadyId: string | null;
  error: string | null;
  isConnected: boolean;
}

export function useInvestigationStream(investigationId: string | undefined): UseInvestigationStreamReturn {
  const [currentStage, setCurrentStage] = useState<string>('LISTING');
  const [agents, setAgents] = useState<Record<string, AgentRun>>({
    L: { agent_id: 'L', label: 'Listing Extractor', state: 'PENDING', steps: 0, duration_s: 0, start_url: '', progress: [] },
    D: { agent_id: 'D', label: 'Builder Discovery', state: 'PENDING', steps: 0, duration_s: 0, start_url: '', progress: [] },
    B: { agent_id: 'B', label: 'Builder Investigator', state: 'PENDING', steps: 0, duration_s: 0, start_url: '', progress: [] },
    R: { agent_id: 'R', label: 'Karnataka RERA Investigator', state: 'PENDING', steps: 0, duration_s: 0, start_url: '', progress: [] },
  });
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [listingData, setListingData] = useState<ListingData | null>(null);
  const [reportReadyId, setReportReadyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const feedCounterRef = useRef<number>(0);

  useEffect(() => {
    if (!investigationId) return;

    const sseUrl = `${API_BASE}/investigations/${investigationId}/events`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    // Stage changes
    es.addEventListener('stage.changed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.stage) setCurrentStage(data.stage);
      } catch (err) {}
    });

    // Agent started
    es.addEventListener('agent.started', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const { agent_id, label, start_url } = data;
        setAgents((prev) => ({
          ...prev,
          [agent_id]: {
            ...(prev[agent_id] || { progress: [] }),
            agent_id,
            label: label || prev[agent_id]?.label || agent_id,
            state: 'RUNNING',
            start_url: start_url || prev[agent_id]?.start_url || '',
          },
        }));
      } catch (err) {}
    });

    // Streaming URL arrived
    es.addEventListener('agent.streaming_url', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const { agent_id, run_id, streaming_url } = data;
        setAgents((prev) => ({
          ...prev,
          [agent_id]: {
            ...(prev[agent_id] || { progress: [] }),
            run_id,
            streaming_url,
          },
        }));
      } catch (err) {}
    });

    // Agent progress
    es.addEventListener('agent.progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const { agent_id, purpose, ts } = data;
        feedCounterRef.current += 1;

        setFeed((prev) => [
          ...prev,
          {
            id: `item-${feedCounterRef.current}`,
            agentId: agent_id,
            agentLabel: agents[agent_id]?.label || agent_id,
            purpose,
            ts: ts || new Date().toLocaleTimeString(),
          },
        ]);

        setAgents((prev) => {
          const current = prev[agent_id] || { agent_id, label: agent_id, state: 'RUNNING', steps: 0, duration_s: 0, start_url: '', progress: [] };
          return {
            ...prev,
            [agent_id]: {
              ...current,
              steps: current.steps + 1,
              progress: [...current.progress, { ts, purpose }],
            },
          };
        });
      } catch (err) {}
    });

    // Agent retry
    es.addEventListener('agent.retry', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        feedCounterRef.current += 1;
        setFeed((prev) => [
          ...prev,
          {
            id: `item-${feedCounterRef.current}`,
            agentId: data.agent_id,
            agentLabel: data.agent_id,
            purpose: `Retry triggered: ${data.reason} (Attempt ${data.attempt})`,
            ts: new Date().toLocaleTimeString(),
            isRetry: true,
          },
        ]);
      } catch (err) {}
    });

    // Agent completed
    es.addEventListener('agent.completed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const { agent_id, state, steps, duration_s, error: errDetail } = data;
        setAgents((prev) => ({
          ...prev,
          [agent_id]: {
            ...(prev[agent_id] || { progress: [] }),
            state: state || 'COMPLETED',
            steps: steps ?? prev[agent_id]?.steps ?? 0,
            duration_s: duration_s ?? prev[agent_id]?.duration_s ?? 0,
            error: errDetail ? JSON.stringify(errDetail) : undefined,
          },
        }));
      } catch (err) {}
    });

    // Extraction ready
    es.addEventListener('extraction.ready', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.listing) setListingData(data.listing);
      } catch (err) {}
    });

    // Report ready
    es.addEventListener('report.ready', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.report_id) {
          setReportReadyId(data.report_id);
          es.close();
        }
      } catch (err) {}
    });

    // Investigation failed
    es.addEventListener('investigation.failed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setError(data.message || 'Investigation failed');
        es.close();
      } catch (err) {}
    });

    return () => {
      es.close();
    };
  }, [investigationId]);

  return {
    currentStage,
    agents,
    feed,
    listingData,
    reportReadyId,
    error,
    isConnected,
  };
}
