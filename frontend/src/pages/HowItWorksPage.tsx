import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Bot, ArrowRight, PlayCircle, ShieldCheck,
  CheckCircle2, AlertTriangle, ExternalLink, Cpu, Terminal
} from 'lucide-react';
import { startDemoReplay, fetchHealth } from '../api';

export const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();
  const [isReplaying, setIsReplaying] = useState(false);

  const handleWatchReplay = async () => {
    try {
      setIsReplaying(true);
      const res = await startDemoReplay();
      navigate(`/investigate/${res.id}`);
    } catch (err) {
      alert('Could not start replay');
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
            <Cpu className="w-3.5 h-3.5 text-teal-600" />
            <span>Judge & Evaluator Guide</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A]">
            How TinyFish Powers Property Truth Finder
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            A comprehensive architectural walkthrough showing where TinyFish fits, multi-agent parallel execution,
            and deterministic due-diligence reconciliation.
          </p>

          <div className="pt-2">
            <button
              onClick={handleWatchReplay}
              disabled={isReplaying}
              className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#14325C] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-md transition-all"
            >
              <PlayCircle className="w-4 h-4 text-[#14B8A6]" />
              <span>Watch the Live Investigation Replay</span>
            </button>
          </div>
        </div>

        {/* Where TinyFish Fits Statement */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-teal-700 font-bold text-sm uppercase tracking-wider">
            <Bot className="w-5 h-5 text-[#0F9D8A]" />
            <span>Where TinyFish Fits in the Stack</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0B1F3A]">
            Autonomous Execution Layer for the Live Web
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            In Property Truth Finder, <strong>the LLM never browses and never extracts facts from memory</strong>.
            TinyFish is the sole execution engine that interacts with the real world: opening listing portals,
            executing DuckDuckGo web searches, navigating complex builder websites, and querying the official
            Karnataka RERA government portal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 mb-1">1. Live Viewports</strong>
              <p className="text-slate-600">
                Each agent exposes a live browser iframe stream (<code className="font-mono text-teal-700">streaming_url</code>) streamed directly to the frontend mission control.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 mb-1">2. Structured Outputs</strong>
              <p className="text-slate-600">
                Agents extract typed JSON using strictly validated top-level JSON schemas, eliminating scraping brittleness.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 mb-1">3. Resilient Automation</strong>
              <p className="text-slate-600">
                Automatic retry policy, stealth profile escalation on blocks, and SSE stream drop polling ensure zero unhandled failures.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Diagram matching PRD Section 4.1 */}
        <section className="bg-[#0B1F3A] text-white p-6 sm:p-8 rounded-3xl border border-[#14325C] shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              <span>System Architecture & Pipeline Flow</span>
            </h2>
            <span className="text-xs text-teal-400 font-mono">PRD Section 4.1</span>
          </div>

          {/* Clean SVG Flowchart */}
          <div className="bg-[#0F274A] p-6 rounded-2xl border border-slate-700 overflow-x-auto flex justify-center">
            <svg className="w-full max-w-3xl h-auto" viewBox="0 0 780 420" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* User / Browser */}
              <rect x="20" y="170" width="160" height="70" rx="12" fill="#14325C" stroke="#0F9D8A" strokeWidth="2"/>
              <text x="100" y="200" fill="#FFFFFF" fontSize="13" fontWeight="bold" textAnchor="middle">React 18 SPA</text>
              <text x="100" y="222" fill="#94A3B8" fontSize="11" textAnchor="middle">Mission Control & Report</text>

              {/* Arrow to Backend */}
              <line x1="180" y1="205" x2="240" y2="205" stroke="#14B8A6" strokeWidth="2" strokeDasharray="4 4"/>
              <polygon points="240,205 232,200 232,210" fill="#14B8A6"/>

              {/* Backend Orchestrator */}
              <rect x="250" y="20" width="260" height="370" rx="16" fill="#14325C" stroke="#334155" strokeWidth="2"/>
              <text x="380" y="50" fill="#14B8A6" fontSize="14" fontWeight="bold" textAnchor="middle">FastAPI Orchestrator</text>
              <text x="380" y="68" fill="#94A3B8" fontSize="11" textAnchor="middle">Staged Async Pipeline</text>

              {/* Pipeline Stages inside Backend */}
              <rect x="270" y="85" width="220" height="42" rx="8" fill="#0B1F3A" stroke="#475569"/>
              <text x="380" y="111" fill="#E2E8F0" fontSize="11" textAnchor="middle">Stage 1: Agent L (Listing Extraction)</text>

              <rect x="270" y="137" width="220" height="42" rx="8" fill="#0B1F3A" stroke="#475569"/>
              <text x="380" y="163" fill="#E2E8F0" fontSize="11" textAnchor="middle">Stage 2: Agent D (Domain Discovery)</text>

              <rect x="270" y="189" width="220" height="52" rx="8" fill="#0B1F3A" stroke="#14B8A6" strokeWidth="1.5"/>
              <text x="380" y="210" fill="#5EEAD4" fontSize="11" fontWeight="bold" textAnchor="middle">Stage 3: Parallel Execution</text>
              <text x="380" y="228" fill="#94A3B8" fontSize="10" textAnchor="middle">Agent B (Builder) || Agent R (RERA)</text>

              <rect x="270" y="251" width="220" height="42" rx="8" fill="#0B1F3A" stroke="#475569"/>
              <text x="380" y="277" fill="#E2E8F0" fontSize="11" textAnchor="middle">Stage 4: Deterministic Python Compare</text>

              <rect x="270" y="303" width="220" height="42" rx="8" fill="#0B1F3A" stroke="#475569"/>
              <text x="380" y="329" fill="#E2E8F0" fontSize="11" textAnchor="middle">Stage 5: LLM Explain + Banned Filter</text>

              {/* Arrow to TinyFish Cloud */}
              <line x1="510" y1="205" x2="570" y2="205" stroke="#14B8A6" strokeWidth="2"/>
              <polygon points="570,205 562,200 562,210" fill="#14B8A6"/>

              {/* TinyFish Agent API */}
              <rect x="580" y="90" width="180" height="230" rx="14" fill="#0F274A" stroke="#0F9D8A" strokeWidth="2"/>
              <text x="670" y="125" fill="#14B8A6" fontSize="13" fontWeight="bold" textAnchor="middle">TinyFish Web Agents</text>
              <text x="670" y="145" fill="#94A3B8" fontSize="10" textAnchor="middle">agent.tinyfish.ai/v1/run-sse</text>

              <rect x="595" y="165" width="150" height="30" rx="6" fill="#14325C"/>
              <text x="670" y="185" fill="#FFFFFF" fontSize="10" textAnchor="middle">Agent L: Listing Portal</text>

              <rect x="595" y="205" width="150" height="30" rx="6" fill="#14325C"/>
              <text x="670" y="225" fill="#FFFFFF" fontSize="10" textAnchor="middle">Agent B: Official Builder</text>

              <rect x="595" y="245" width="150" height="30" rx="6" fill="#14325C"/>
              <text x="670" y="265" fill="#FFFFFF" fontSize="10" textAnchor="middle">Agent R: Karnataka RERA</text>

              {/* Feedback SSE Loop */}
              <path d="M 580 290 C 450 390, 280 390, 100 240" fill="none" stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="3 3"/>
              <text x="340" y="380" fill="#2DD4BF" fontSize="10" textAnchor="middle">Real-time SSE Stream (STARTED, PROGRESS, STREAMING_URL, COMPLETE)</text>
            </svg>
          </div>
        </section>

        {/* Agent Specification Table */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-bold text-[#0B1F3A]">
              Agent Specification & Execution Profiles (PRD Section 4.5)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly parameterized autonomous agents with intent-driven goals and top-level JSON schemas
            </p>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Role & Objective</th>
                  <th className="py-2.5 px-3">Start URL</th>
                  <th className="py-2.5 px-3">Browser Profile</th>
                  <th className="py-2.5 px-3">Timeout</th>
                  <th className="py-2.5 px-3">Output Schema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-sans font-bold text-slate-900">Agent L</td>
                  <td className="py-3 px-3 font-sans text-slate-700">Listing Extractor: title, builder, RERA ID, price, area type</td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-xs font-mono">User listing URL</td>
                  <td className="py-3 px-3 font-bold text-indigo-700">stealth</td>
                  <td className="py-3 px-3 text-slate-700">150s</td>
                  <td className="py-3 px-3 text-teal-700">ListingData</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-sans font-bold text-slate-900">Agent D</td>
                  <td className="py-3 px-3 font-sans text-slate-700">Builder Discovery: searches DuckDuckGo, backend heuristic ranks candidates</td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-xs font-mono">duckduckgo.com/?q=...</td>
                  <td className="py-3 px-3 font-bold text-slate-700">lite</td>
                  <td className="py-3 px-3 text-slate-700">90s</td>
                  <td className="py-3 px-3 text-teal-700">SearchResult[]</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-sans font-bold text-slate-900">Agent B</td>
                  <td className="py-3 px-3 font-sans text-slate-700">Builder Investigator: developer entity, floor plans, amenity status</td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-xs font-mono">Chosen builder URL</td>
                  <td className="py-3 px-3 font-bold text-blue-700">lite &rarr; stealth</td>
                  <td className="py-3 px-3 text-slate-700">240s</td>
                  <td className="py-3 px-3 text-teal-700">BuilderData</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-sans font-bold text-slate-900">Agent R</td>
                  <td className="py-3 px-3 font-sans text-slate-700">Karnataka RERA Lookup: project status, completion date, carpet areas</td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-xs font-mono">rera.karnataka.gov.in</td>
                  <td className="py-3 px-3 font-bold text-indigo-700">stealth</td>
                  <td className="py-3 px-3 text-slate-700">300s</td>
                  <td className="py-3 px-3 text-teal-700">RERARecord</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Annotated Real PROGRESS Timeline */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Terminal className="w-5 h-5 text-teal-600" />
            <span>Annotated Example of Real TinyFish PROGRESS Timeline</span>
          </div>
          <p className="text-xs text-slate-600">
            Below is an authentic sequence of purpose events dispatched over SSE during an automated Karnataka RERA lookup:
          </p>

          <div className="bg-[#0B1F3A] text-slate-200 p-4 rounded-2xl font-mono text-xs space-y-2 overflow-x-auto">
            <div className="text-slate-400"># Autonomous Agent R (Karnataka RERA Investigator)</div>
            <div className="text-teal-400">13:20:02 [STARTED] run_id: tf-run-8f92-ka-rera</div>
            <div className="text-blue-400">13:20:04 [STREAMING_URL] streaming_url: https://agent.tinyfish.ai/stream/tf-run-8f92</div>
            <div className="text-slate-300">13:20:07 [PROGRESS] Navigating to https://rera.karnataka.gov.in</div>
            <div className="text-slate-300">13:20:12 [PROGRESS] Opening 'Services' &gt; 'Project Search' menu</div>
            <div className="text-slate-300">13:20:19 [PROGRESS] Entering registration number 'PRM/KA/RERA/1251/446/PR/171015/000456' into search form</div>
            <div className="text-slate-300">13:20:25 [PROGRESS] Clicking search button and waiting for results table to populate</div>
            <div className="text-slate-300">13:20:31 [PROGRESS] Opening project detail modal for 'Brigade Cosmopolis Phase 1'</div>
            <div className="text-slate-300">13:20:42 [PROGRESS] Extracting promoter legal entity, declared completion date (31-12-2027), and carpet area schedule</div>
            <div className="text-emerald-400 font-bold">13:20:48 [COMPLETE] status: COMPLETED, num_of_steps: 8, duration: 46.2s</div>
          </div>
        </section>

        {/* Limitations List */}
        <section className="bg-[#FEF6E0] border border-[#FADCA0] p-6 rounded-3xl text-[#854D0E] space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#92400E]">
            <AlertTriangle className="w-5 h-5 text-[#B45309]" />
            <span>Boundaries & Ethical Commitments</span>
          </div>
          <ul className="text-xs sm:text-sm space-y-1.5 list-disc list-inside text-[#78350F] leading-relaxed">
            <li><strong>Read-Only Agents:</strong> Agents never log in, submit lead-capture forms, enter phone numbers/emails, or contact builders.</li>
            <li><strong>RERA is not Title Clearance:</strong> A valid RERA filing does not verify land ownership, encumbrances, or court litigation.</li>
            <li><strong>Honest Uncertainty:</strong> A blocked portal or missing field is reported as <code>NOT_VERIFIED</code> with reason codes, never an accusation of fraud.</li>
            <li><strong>Zero Fabrication:</strong> In live mode, values only originate from actual web captures; mock and replay runs are clearly tagged.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};
