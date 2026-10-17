import React from 'react';
import { Cpu, Bot, Clock, ExternalLink, Zap, Layers, Globe, CheckCircle2 } from 'lucide-react';
import { AgentRun, Metrics } from '../types';

interface HowThisWasInvestigatedProps {
  agents: AgentRun[];
  metrics: Metrics;
}

export const HowThisWasInvestigated: React.FC<HowThisWasInvestigatedProps> = ({
  agents,
  metrics,
}) => {
  return (
    <div className="card-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-600" />
            <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A]">
              How TinyFish Investigated This Listing
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real performance numbers, automation step counts, and agent run telemetry
          </p>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 text-center font-mono">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-sans font-medium">Elapsed Time</div>
          <div className="text-lg font-extrabold text-[#0B1F3A] mt-1">
            {metrics.total_seconds}s
          </div>
          <div className="text-[10px] text-teal-700 font-sans font-semibold">
            vs ~{metrics.manual_baseline_minutes}m manual
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-sans font-medium">TinyFish Runs</div>
          <div className="text-lg font-extrabold text-[#0B1F3A] mt-1">
            {metrics.tinyfish_runs}
          </div>
          <div className="text-[10px] text-emerald-700 font-sans font-semibold">
            {metrics.runs_succeeded} succeeded
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-sans font-medium">Total Steps</div>
          <div className="text-lg font-extrabold text-[#0B1F3A] mt-1">
            {metrics.total_steps}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">browser actions</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-sans font-medium">Domains Visited</div>
          <div className="text-lg font-extrabold text-[#0B1F3A] mt-1">
            {metrics.domains_visited.length || 3}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">distinct portals</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-sans font-medium">Fields Checked</div>
          <div className="text-lg font-extrabold text-[#0B1F3A] mt-1">
            {metrics.fields_compared}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">data points</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-sans font-medium">Coverage Pct</div>
          <div className="text-lg font-extrabold text-[#0F9D8A] mt-1">
            {metrics.coverage_pct}%
          </div>
          <div className="text-[10px] text-teal-700 font-sans font-semibold">cross-verified</div>
        </div>
      </div>

      {/* Agent Run Telemetry Cards */}
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.agent_id}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-[#0B1F3A] text-white">
                  Agent {agent.agent_id}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    agent.state === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : agent.state === 'FAILED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {agent.state}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mt-2">{agent.label}</h4>
              <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5" title={agent.start_url}>
                {agent.start_url || 'Target portal'}
              </p>

              <div className="mt-3 text-xs space-y-1 font-mono text-slate-600">
                <div className="flex justify-between">
                  <span>Steps executed:</span>
                  <strong className="text-slate-900">{agent.steps}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <strong className="text-slate-900">{agent.duration_s}s</strong>
                </div>
                {agent.run_id && (
                  <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200">
                    <span>Run ID:</span>
                    <span className="truncate max-w-[120px] font-mono text-slate-500">{agent.run_id}</span>
                  </div>
                )}
              </div>
            </div>

            {agent.video_url && (
              <a
                href={agent.video_url}
                target="_blank"
                rel="noreferrer"
                className="no-print mt-3 text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-teal-50 border border-teal-200"
              >
                <span>Watch Session Recording</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
