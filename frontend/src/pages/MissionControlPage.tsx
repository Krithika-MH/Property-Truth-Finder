import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  X, ArrowRight, ShieldCheck, Globe, Building2,
  Clock, CheckCircle2, AlertTriangle, Layers, Eye
} from 'lucide-react';
import { useInvestigationStream, cancelInvestigation } from '../api';
import { ModeRibbon } from '../components/ModeRibbon';
import { Stepper } from '../components/Stepper';
import { AgentPane } from '../components/AgentPane';
import { ActivityFeed } from '../components/ActivityFeed';

export const MissionControlPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'L' | 'B' | 'R'>('L');

  const {
    currentStage,
    agents,
    feed,
    listingData,
    reportReadyId,
    error,
    isConnected,
  } = useInvestigationStream(id);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // When report is ready, auto-navigate or show transition toast
  useEffect(() => {
    if (reportReadyId) {
      const timeout = setTimeout(() => {
        navigate(`/report/${reportReadyId}`);
      }, 900);
      return () => clearTimeout(timeout);
    }
  }, [reportReadyId, navigate]);

  const handleCancel = async () => {
    if (id) {
      await cancelInvestigation(id);
    }
  };

  // Determine mode
  const mode = id?.startsWith('replay') ? 'REPLAY' : 'MOCK'; // Or LIVE

  // Tally live counters
  const agentValues = Object.values(agents);
  const runsLaunched = agentValues.filter((a) => a.state !== 'PENDING').length;
  const totalSteps = agentValues.reduce((acc, a) => acc + (a.steps || 0), 0);
  const sourcesVisited = new Set(agentValues.map((a) => a.start_url).filter(Boolean)).size || 1;

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      {/* Mode Ribbon */}
      <ModeRibbon mode={mode} />

      {/* Header */}
      <div className="bg-[#0B1F3A] text-white px-4 sm:px-6 py-4 border-b border-[#14325C] shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-teal-400">
                  Mission Control &bull; Live Due Diligence
                </span>
                <span className="text-[11px] font-mono text-slate-400">#{id}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white truncate max-w-md sm:max-w-xl">
                {listingData?.listing_title || listingData?.project_name || (
                  <span className="text-slate-400 italic font-normal">
                    Agent L reading property listing metadata...
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Live Elapsed Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14325C] border border-slate-700 font-mono text-xs text-slate-200">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</span>
            </div>

            {/* View Report button if ready */}
            {reportReadyId ? (
              <button
                onClick={() => navigate(`/report/${reportReadyId}`)}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all animate-bounce"
              >
                <span>Report Ready &rarr;</span>
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 hover:border-rose-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Stepper (20%), Center Browser Panes (55%), Right Feed (25%) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Rail: 5-Stage Stepper */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <Stepper currentStage={currentStage} />

          {/* Quick Listing Info Card once extracted */}
          {listingData && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Extracted Listing Info</span>
              </div>
              <div className="font-mono text-slate-700 space-y-1">
                <p><strong>Project:</strong> {listingData.project_name || 'N/A'}</p>
                <p><strong>Builder:</strong> {listingData.builder_name || 'N/A'}</p>
                <p><strong>Price:</strong> {listingData.price_text || 'N/A'}</p>
                <p><strong>Area:</strong> {listingData.area_value} {listingData.area_unit} ({listingData.area_type})</p>
                <p><strong>Possession:</strong> {listingData.possession_text || 'N/A'}</p>
                <p className="truncate"><strong>RERA:</strong> {listingData.rera_numbers?.[0] || 'None'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Center: 3 Agent Panes */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          {/* Mobile Tabs */}
          <div className="flex lg:hidden rounded-xl bg-slate-200 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('L')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'L' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Listing (L)
            </button>
            <button
              onClick={() => setActiveTab('B')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'B' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Builder (B)
            </button>
            <button
              onClick={() => setActiveTab('R')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'R' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              RERA (R)
            </button>
          </div>

          {/* Desktop Stack or Mobile Active View */}
          <div className="space-y-4">
            <div className={activeTab === 'L' ? 'block' : 'hidden lg:block'}>
              <AgentPane
                agent={agents.L}
                title="Listing Portal Browser"
                icon={<Globe className="w-4 h-4" />}
              />
            </div>
            <div className={activeTab === 'B' ? 'block' : 'hidden lg:block'}>
              <AgentPane
                agent={agents.B}
                title="Official Builder Portal"
                icon={<Building2 className="w-4 h-4" />}
              />
            </div>
            <div className={activeTab === 'R' ? 'block' : 'hidden lg:block'}>
              <AgentPane
                agent={agents.R}
                title="Karnataka RERA Portal"
                icon={<ShieldCheck className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* Right Rail: Activity Feed */}
        <div className="lg:col-span-3 h-[420px] lg:h-auto">
          <ActivityFeed items={feed} />
        </div>
      </div>

      {/* Bottom Live Counters Strip */}
      <footer className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-4 text-center font-mono text-xs">
          <div>
            <span className="text-slate-500 font-sans block text-[11px]">Runs Launched</span>
            <strong className="text-sm font-bold text-slate-900">{runsLaunched} / 4</strong>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-slate-500 font-sans block text-[11px]">Browser Steps</span>
            <strong className="text-sm font-bold text-slate-900">{totalSteps}</strong>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-slate-500 font-sans block text-[11px]">Sources Visited</span>
            <strong className="text-sm font-bold text-slate-900">{sourcesVisited} domains</strong>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-slate-500 font-sans block text-[11px]">Stream Status</span>
            <strong className="text-sm font-bold text-teal-600 flex items-center justify-center gap-1 font-sans">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              {isConnected ? 'Connected' : 'Syncing'}
            </strong>
          </div>
        </div>
      </footer>
    </div>
  );
};
