import React, { useState } from 'react';
import { ExternalLink, Globe, Bot, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { AgentRun } from '../types';

interface AgentPaneProps {
  agent: AgentRun;
  title: string;
  icon?: React.ReactNode;
}

export const AgentPane: React.FC<AgentPaneProps> = ({ agent, title, icon }) => {
  const [iframeError, setIframeError] = useState(false);
  const latestPurpose = agent.progress?.length > 0 ? agent.progress[agent.progress.length - 1].purpose : '';

  const isRunning = agent.state === 'RUNNING';
  const isCompleted = agent.state === 'COMPLETED';
  const isFailed = agent.state === 'FAILED' || agent.state === 'CANCELLED';

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-[380px] sm:h-[420px]">
      {/* Header */}
      <div className="bg-[#0B1F3A] text-white px-4 py-3 flex items-center justify-between border-b border-[#14325C] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#14325C] text-[#14B8A6]">
            {icon || <Globe className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">{title}</h4>
              {/* Status Dot */}
              <span className="flex items-center gap-1.5 text-[11px] font-medium">
                {isRunning && (
                  <span className="flex items-center gap-1 text-teal-400">
                    <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-ping"></span>
                    Live
                  </span>
                )}
                {isCompleted && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Done
                  </span>
                )}
                {isFailed && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Failed
                  </span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[190px] sm:max-w-xs font-mono">
              {agent.start_url || 'Target initialized'}
            </p>
          </div>
        </div>

        {/* Counters & External Link */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden sm:flex flex-col items-end text-slate-300 text-[11px]">
            <span>{agent.steps} steps</span>
            <span>{agent.duration_s ? `${agent.duration_s}s` : 'active'}</span>
          </div>

          {agent.streaming_url && (
            <a
              href={agent.streaming_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-[#14325C] hover:bg-[#1D457D] text-slate-200 hover:text-white transition-colors"
              title="Open live view in new tab"
            >
              <ExternalLink className="w-4 h-4 text-teal-400" />
            </a>
          )}
        </div>
      </div>

      {/* Main Viewport: Iframe or Styled Placeholder */}
      <div className="relative flex-1 bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
        {agent.streaming_url && !iframeError ? (
          <iframe
            src={agent.streaming_url}
            title={`${title} live stream`}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts"
            onError={() => setIframeError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-[#14B8A6]">
              {isRunning ? (
                <Loader2 className="w-7 h-7 animate-spin text-[#14B8A6]" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : (
                <Bot className="w-7 h-7 text-slate-400" />
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
              {isRunning ? 'TinyFish Web Agent Active' : isCompleted ? 'Task Completed' : 'Agent Ready'}
            </p>

            <p className="text-xs text-slate-300 italic mb-3 font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 w-full text-left">
              &gt; {latestPurpose || 'Awaiting initial automation step...'}
            </p>

            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span>Steps executed: <strong className="text-white font-mono">{agent.steps}</strong></span>
              <span>&bull;</span>
              <span>Status: <strong className="text-white uppercase">{agent.state}</strong></span>
            </div>
          </div>
        )}

        {/* Bottom Purpose Ticker Caption */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-sm border-t border-slate-800 px-3 py-1.5 flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse shrink-0"></span>
          <span className="truncate font-mono">
            {latestPurpose || `Autonomous browser executing navigation on ${title}...`}
          </span>
        </div>
      </div>
    </div>
  );
};
